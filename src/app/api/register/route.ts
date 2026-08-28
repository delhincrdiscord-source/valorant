import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { duoRegistrationSchema } from "@/lib/validation";
import { rankToValue } from "@/lib/constants";
import { teamName } from "@/lib/pairing";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const WINDOW = 15 * 60 * 1000; // 15 min
const HOUR = 60 * 60 * 1000; // 1 hour
const MAX_BODY_BYTES = 50_000;

export async function POST(req: Request) {
  // Registration must be open.
  const settings = await getSettings();
  if (!settings.registrationOpen) {
    return NextResponse.json(
      { error: "Registration is currently closed." },
      { status: 403 },
    );
  }

  // Reject oversized bodies (DoS guard) before parsing.
  let text: string;
  try {
    text = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request too large." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = duoRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    // Honeypot tripped — pretend success so bots don't learn anything.
    const honeypotTripped = parsed.error.issues.some((i) =>
      i.path.includes("website"),
    );
    if (honeypotTripped) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    return NextResponse.json(
      { error: "Please check the form.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const [p1, p2] = [data.player1, data.player2];
  const [p1Key, p2Key] = [
    p1.riotId.toLowerCase(),
    p2.riotId.toLowerCase(),
  ];

  // ── Rate limiting ─────────────────────────────────────────────
  // Per-IP cap stops bulk spam; per-identity caps stop the same person
  // re-submitting (even if they spoof/rotate IPs).
  const ip = clientIp(req);
  const checks: [string, number, number][] = [
    [`ip:${ip}`, 3, WINDOW],
    [`discord:${p1.discordUserId}`, 1, HOUR],
    [`discord:${p2.discordUserId}`, 1, HOUR],
    [`riot:${p1Key}`, 1, HOUR],
    [`riot:${p2Key}`, 1, HOUR],
  ];
  for (const [key, max, windowMs] of checks) {
    const result = await rateLimit(key, max, windowMs);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: `Too many registrations. Try again in ${Math.ceil(result.retryAfterSec / 60)} minute(s).`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(result.retryAfterSec) },
        },
      );
    }
  }

  // ── Duplicate check (friendly message) ────────────────────────
  // Case-insensitive via riotIdKey; Discord IDs are numeric/exact.
  const existing = await prisma.player.findFirst({
    where: {
      OR: [
        { riotIdKey: { in: [p1Key, p2Key] } },
        { discordUserId: { in: [p1.discordUserId, p2.discordUserId] } },
      ],
    },
    select: { riotId: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: `${existing.riotId} is already registered.` },
      { status: 409 },
    );
  }

  // ── Create the team + both players atomically ─────────────────
  try {
    const finalName =
      data.teamName && data.teamName.length > 0
        ? data.teamName
        : teamName(p1.riotId, p2.riotId);

    const team = await prisma.$transaction(async (tx) => {
      return tx.team.create({
        data: {
          name: finalName,
          combinedRankValue: rankToValue(p1.currentRank) + rankToValue(p2.currentRank),
          players: {
            create: [
              {
                discordUsername: p1.discordUsername,
                discordUserId: p1.discordUserId,
                riotId: p1.riotId,
                riotIdKey: p1Key,
                currentRank: p1.currentRank,
                peakRank: p1.peakRank,
                region: p1.region,
                agentRole: p1.agentRole,
                rulesAgreed: true,
                rankValue: rankToValue(p1.currentRank),
                peakRankValue: rankToValue(p1.peakRank),
                status: "paired",
              },
              {
                discordUsername: p2.discordUsername,
                discordUserId: p2.discordUserId,
                riotId: p2.riotId,
                riotIdKey: p2Key,
                currentRank: p2.currentRank,
                peakRank: p2.peakRank,
                region: p2.region,
                agentRole: p2.agentRole,
                rulesAgreed: true,
                rankValue: rankToValue(p2.currentRank),
                peakRankValue: rankToValue(p2.peakRank),
                status: "paired",
              },
            ],
          },
        },
        include: {
          players: {
            select: { id: true, riotId: true, discordUsername: true },
          },
        },
      });
    });

    await sendWebhook(team.name, team.players);

    return NextResponse.json(
      { ok: true, team: { name: team.name, players: team.players } },
      { status: 201 },
    );
  } catch (e) {
    // Unique constraints on Riot ID key / Discord user ID mean one
    // registration per player. The friendly pre-check above catches the
    // common case; this is the race-condition backstop.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "You are already registered." },
        { status: 409 },
      );
    }
    console.error("register error", e);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}

async function sendWebhook(
  teamName: string,
  players: { riotId: string; discordUsername: string }[],
) {
  const webhookUrl = process.env.DISCORD_REGISTRATION_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Never auto-mention anyone from submitted IDs — that would let a
        // malicious form submission spam/harass Discord users.
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: "New team registration",
            color: 0xe94560,
            fields: [
              { name: "Team", value: teamName, inline: false },
              {
                name: "Player 1",
                value: `${players[0]?.riotId ?? "—"} (@${players[0]?.discordUsername ?? "—"})`,
                inline: true,
              },
              {
                name: "Player 2",
                value: `${players[1]?.riotId ?? "—"} (@${players[1]?.discordUsername ?? "—"})`,
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (!response.ok) {
      console.error("Discord registration notification failed", response.status);
    }
  } catch (error) {
    console.error("Discord registration notification error", error);
  }
}

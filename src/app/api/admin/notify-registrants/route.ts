import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CHUNK_SIZE = 75; // safely under Discord's 2000-char / 200-mention caps
const WEBHOOK_URL = process.env.DISCORD_REGISTRATION_WEBHOOK_URL;

export async function POST() {
  if (!WEBHOOK_URL) {
    return NextResponse.json(
      { error: "DISCORD_REGISTRATION_WEBHOOK_URL is not configured." },
      { status: 500 },
    );
  }

  const players = await prisma.player.findMany({
    where: { discordUserId: { not: null } },
    select: { discordUserId: true },
  });

  const userIds = players
    .map((p) => p.discordUserId)
    .filter((id): id is string => Boolean(id));

  if (userIds.length === 0) {
    return NextResponse.json({
      message: "No players with Discord IDs to notify.",
    });
  }

  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
    chunks.push(userIds.slice(i, i + CHUNK_SIZE));
  }

  try {
    for (let i = 0; i < chunks.length; i++) {
      const mentions = chunks[i].map((id) => `<@${id}>`).join(" ");
      const content =
        i === 0
          ? `⚠️ Registration is now closed! Thanks to all ${userIds.length} registered players. ${mentions}`
          : mentions;

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowed_mentions: { parse: ["users"] },
          content,
        }),
      });
      if (!response.ok) {
        console.error(
          "Discord registrant notification failed",
          response.status,
        );
        return NextResponse.json(
          { error: "Failed to send the notification." },
          { status: 502 },
        );
      }
    }
  } catch (error) {
    console.error("Discord registrant notification error", error);
    return NextResponse.json(
      { error: "Failed to send the notification." },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: `Notified ${userIds.length} players.` });
}

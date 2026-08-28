import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  reportMatch,
  resetMatch,
  getMatchFormat,
  validateSeriesScore,
  type BracketData,
} from "@/lib/bracket";

const reportSchema = z.object({
  score1: z.number().int().min(0).max(999),
  score2: z.number().int().min(0).max(999),
});

async function loadBracket(): Promise<BracketData | null> {
  const t = await prisma.tournament.findUnique({
    where: { id: "main" },
    select: { data: true },
  });
  return (t?.data as BracketData | null) ?? null;
}

// POST — report a result for a single match: { score1, score2 }.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId < 0) {
    return NextResponse.json({ error: "Invalid match id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Scores must be whole numbers (0–999)." },
      { status: 400 },
    );
  }

  const data = await loadBracket();
  if (!data) {
    return NextResponse.json(
      { error: "No bracket has been generated yet." },
      { status: 409 },
    );
  }

  // Enforce the series format: BO3 for regular matches, BO5 for the grand final.
  const format = getMatchFormat(data, matchId);
  const seriesError = validateSeriesScore(
    format,
    parsed.data.score1,
    parsed.data.score2,
  );
  if (seriesError) {
    return NextResponse.json({ error: seriesError }, { status: 400 });
  }

  try {
    const updated = await reportMatch(
      data,
      matchId,
      parsed.data.score1,
      parsed.data.score2,
    );
    await prisma.tournament.update({
      where: { id: "main" },
      data: { data: updated as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // The engine throws for illegal updates (match not ready, locked, etc.).
    const message =
      err instanceof Error ? err.message : "Could not update this match.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE — undo a match's result (e.g. a mistyped score).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId < 0) {
    return NextResponse.json({ error: "Invalid match id." }, { status: 400 });
  }

  const data = await loadBracket();
  if (!data) {
    return NextResponse.json(
      { error: "No bracket has been generated yet." },
      { status: 409 },
    );
  }

  try {
    const updated = await resetMatch(data, matchId);
    await prisma.tournament.update({
      where: { id: "main" },
      data: { data: updated as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not reset this match.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

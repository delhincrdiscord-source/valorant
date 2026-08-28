import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createBracket, type SeedTeam } from "@/lib/bracket";
import { getSettings } from "@/lib/settings";
import { sendBracketNotification } from "@/lib/bracket-notification";

// POST — generate (or re-generate) the double-elimination bracket from the
// current teams. Regenerating discards any reported results.
export async function POST() {
  // Rank teams strongest → weakest and persist seed 1..n. This is the only
  // place seeds are assigned (duos self-form at registration), so the bracket
  // and the /players page stay consistent.
  const teams = await prisma.team.findMany({
    orderBy: { combinedRankValue: "desc" },
    select: { id: true, name: true },
  });

  if (teams.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 teams. Register more duos first." },
      { status: 400 },
    );
  }

  await prisma.$transaction(
    teams.map((t, i) =>
      prisma.team.update({ where: { id: t.id }, data: { seed: i + 1 } }),
    ),
  );

  // Participant identity in the bracket is the team name, so names must be
  // unique or the engine would merge two teams into one participant.
  const seen = new Set<string>();
  const seedTeams: SeedTeam[] = teams.map((t, i) => {
    let name = t.name;
    while (seen.has(name)) name = `${t.name} (${i + 1})`;
    seen.add(name);
    return { id: t.id, name, seed: i + 1 };
  });

  const settings = await getSettings();
  const data = await createBracket(seedTeams, settings.tournamentName);

  await prisma.tournament.update({
    where: { id: "main" },
    data: { status: "active", data: data as unknown as Prisma.InputJsonValue },
  });

  await sendBracketNotification(data, settings.tournamentName, teams.length);

  return NextResponse.json({
    ok: true,
    message: `Bracket generated for ${teams.length} teams.`,
    teamCount: teams.length,
  });
}

// DELETE — clear the bracket so pairs can be re-rolled. Also unpublishes it.
export async function DELETE() {
  await prisma.tournament.update({
    where: { id: "main" },
    data: { status: "pending", data: Prisma.DbNull },
  });
  await prisma.setting.update({
    where: { id: "global" },
    data: { bracketPublished: false },
  });
  return NextResponse.json({ ok: true, message: "Bracket cleared." });
}

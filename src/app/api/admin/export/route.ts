import { prisma } from "@/lib/prisma";

// CSV export of all registrations for the organizer.
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  // Escape for CSV: wrap in quotes and double any internal quotes.
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: { createdAt: "asc" },
    include: { team: { select: { name: true, seed: true } } },
  });

  const header = [
    "Discord",
    "Riot ID",
    "Current Rank",
    "Peak Rank",
    "Region",
    "Role",
    "Rules Agreed",
    "Team",
    "Seed",
    "Registered At",
  ];

  const rows = players.map((p) =>
    [
      p.discordUsername,
      p.riotId,
      p.currentRank,
      p.peakRank,
      p.region,
      p.agentRole,
      p.rulesAgreed ? "yes" : "no",
      p.team?.name ?? "",
      p.team?.seed ?? "",
      p.createdAt.toISOString(),
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = [header.map(csvCell).join(","), ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrations.csv"`,
    },
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Public roster. Team membership is only revealed once the organizer publishes
// pairings; until then we just show who has registered.
export async function GET() {
  const settings = await getSettings();

  const players = await prisma.player.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      discordUsername: true,
      riotId: true,
      currentRank: true,
      peakRank: true,
      region: true,
      agentRole: true,
      teamId: settings.pairingsPublished,
      team: settings.pairingsPublished
        ? { select: { id: true, name: true, seed: true } }
        : false,
    },
  });

  return NextResponse.json({
    count: players.length,
    pairingsPublished: settings.pairingsPublished,
    players,
  });
}

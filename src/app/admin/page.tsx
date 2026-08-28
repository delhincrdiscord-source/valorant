import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { listMatches, type BracketData } from "@/lib/bracket";
import AdminControls from "@/components/admin/AdminControls";
import MatchReporter from "@/components/admin/MatchReporter";
import PlayerTable, { type AdminPlayer } from "@/components/admin/PlayerTable";
import BracketView from "@/components/BracketView";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [settings, players, teamCount, tournament] = await Promise.all([
    getSettings(),
    prisma.player.findMany({
      orderBy: { createdAt: "asc" },
      include: { team: { select: { id: true, name: true } } },
    }),
    prisma.team.count(),
    prisma.tournament.findUnique({ where: { id: "main" }, select: { data: true } }),
  ]);

  const adminPlayers: AdminPlayer[] = players.map((p) => ({
    id: p.id,
    discordUsername: p.discordUsername,
    riotId: p.riotId,
    currentRank: p.currentRank,
    peakRank: p.peakRank,
    region: p.region,
    agentRole: p.agentRole,
    rankValue: p.rankValue,
    teamName: p.team?.name ?? null,
    teamId: p.team?.id ?? null,
  }));

  const bracketData = (tournament?.data as BracketData | null) ?? null;
  const hasBracket = bracketData != null;
  const matches = bracketData ? listMatches(bracketData) : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="heading text-3xl text-val-light">Organizer dashboard</h1>
        <p className="mt-1 text-val-muted">{settings.tournamentName}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="order-2 lg:order-1">
          <PlayerTable players={adminPlayers} />
        </div>
        <div className="order-1 lg:order-2">
          <AdminControls
            settings={{
              registrationOpen: settings.registrationOpen,
              pairingsPublished: settings.pairingsPublished,
              bracketPublished: settings.bracketPublished,
              tournamentName: settings.tournamentName,
            }}
            teamCount={teamCount}
            hasBracket={hasBracket}
          />
        </div>
      </div>

      {hasBracket && matches.length > 0 && (
        <div className="mt-6">
          <MatchReporter matches={matches} />
        </div>
      )}

      {hasBracket && bracketData && (
        <div className="mt-6">
          <h2 className="heading mb-3 text-lg text-val-light">
            Bracket preview
          </h2>
          <div className="overflow-x-auto rounded-lg border border-val-navy-light bg-val-darker/40 p-2 sm:p-4">
            <BracketView data={bracketData} />
          </div>
        </div>
      )}
    </div>
  );
}

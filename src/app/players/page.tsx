import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function RankBadge({ rank }: { rank: string }) {
  return (
    <span className="inline-flex items-center rounded border border-val-navy-light bg-gradient-to-b from-val-navy to-val-darker px-2.5 py-0.5 text-xs text-val-light shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.4)]">
      {rank}
    </span>
  );
}

export default async function PlayersPage() {
  const settings = await getSettings();
  const players = await prisma.player.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      team: settings.pairingsPublished
        ? { select: { id: true, name: true, seed: true, combinedRankValue: true } }
        : false,
    },
  });

  const showTeams = settings.pairingsPublished;

  // Group into teams when published.
  const teams = new Map<
    string,
    { name: string; seed: number | null; members: typeof players }
  >();
  const unpaired: typeof players = [];
  if (showTeams) {
    for (const p of players) {
      if (p.team) {
        const t = teams.get(p.team.id) ?? {
          name: p.team.name,
          seed: p.team.seed,
          members: [] as typeof players,
        };
        t.members.push(p);
        teams.set(p.team.id, t);
      } else {
        unpaired.push(p);
      }
    }
  }
  const sortedTeams = [...teams.values()].sort(
    (a, b) => (a.seed ?? 999) - (b.seed ?? 999),
  );

  return (
    <div>
      <div className="anim-rise mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading text-3xl text-val-light">Players</h1>
          <p className="mt-1 text-val-muted">
            {players.length} registered
            {showTeams && ` · ${sortedTeams.length} teams`}
          </p>
        </div>
        <Link
          href="/"
          className="press heading rounded border border-val-navy-light px-4 py-2 text-sm text-val-light hover:border-val-teal/60 hover:bg-val-navy"
        >
          Register
        </Link>
      </div>

      {players.length === 0 && (
        <div className="anim-pop rounded-lg border border-val-navy-light bg-val-navy/40 p-10 text-center text-val-muted">
          No one has registered yet. Be the first!
        </div>
      )}

      {/* Team view */}
      {showTeams && sortedTeams.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTeams.map((t, i) => (
            <div
              key={i}
              style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
              className="clip-notch card-lift anim-rise rounded-lg border border-val-navy-light bg-val-navy/40 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="heading text-val-light">{t.name}</h3>
                {t.seed != null && (
                  <span className="heading text-xs text-val-teal">
                    Seed {t.seed}
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {t.members.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-val-light">{p.riotId}</p>
                      <p className="truncate text-xs text-val-muted">
                        @{p.discordUsername} · {p.region}
                      </p>
                    </div>
                    <RankBadge rank={p.currentRank} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Flat roster (either not published, or the leftover unpaired players) */}
      {(!showTeams || unpaired.length > 0) && players.length > 0 && (
        <div className="anim-fade mt-6 overflow-x-auto rounded-lg border border-val-navy-light">
          {showTeams && (
            <p className="border-b border-val-navy-light bg-val-navy/40 px-4 py-2 text-sm text-val-muted">
              Unassigned players
            </p>
          )}
          <table className="w-full text-left text-sm">
            <thead className="bg-val-navy/60 text-val-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Riot ID</th>
                <th className="px-4 py-2 font-medium">Discord</th>
                <th className="px-4 py-2 font-medium">Rank</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">Peak</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">Region</th>
                <th className="hidden px-4 py-2 font-medium md:table-cell">Role</th>
              </tr>
            </thead>
            <tbody>
              {(showTeams ? unpaired : players).map((p, i) => (
                <tr
                  key={p.id}
                  className={i % 2 ? "bg-val-darker/40" : "bg-transparent"}
                >
                  <td className="px-4 py-2 text-val-light">{p.riotId}</td>
                  <td className="px-4 py-2 text-val-muted">@{p.discordUsername}</td>
                  <td className="px-4 py-2">
                    <RankBadge rank={p.currentRank} />
                  </td>
                  <td className="hidden px-4 py-2 text-val-muted sm:table-cell">
                    {p.peakRank}
                  </td>
                  <td className="hidden px-4 py-2 text-val-muted sm:table-cell">
                    {p.region}
                  </td>
                  <td className="hidden px-4 py-2 text-val-muted md:table-cell">
                    {p.agentRole}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getStandings, type BracketData } from "@/lib/bracket";
import BracketView from "@/components/BracketView";

export const dynamic = "force-dynamic";

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="anim-pop rounded-lg border border-val-navy-light bg-val-navy/40 p-10 text-center">
      <h2 className="heading text-xl text-val-light">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-val-muted">{body}</p>
      <Link
        href="/players"
        className="press heading mt-5 inline-block rounded border border-val-navy-light px-4 py-2 text-sm text-val-light hover:border-val-teal/60 hover:bg-val-navy"
      >
        View players
      </Link>
    </div>
  );
}

export default async function BracketPage() {
  const [settings, tournament] = await Promise.all([
    getSettings(),
    prisma.tournament.findUnique({
      where: { id: "main" },
      select: { data: true },
    }),
  ]);

  const data = (tournament?.data as BracketData | null) ?? null;
  const published = settings.bracketPublished && data != null;

  const standings = published && data ? await getStandings(data) : [];
  const champion = standings.find((s) => s.rank === 1)?.name ?? null;
  const runnerUp = standings.find((s) => s.rank === 2)?.name ?? null;

  return (
    <div>
      <div className="anim-rise mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading text-3xl text-val-light">Bracket</h1>
          <p className="mt-1 text-val-muted">{settings.tournamentName}</p>
        </div>
        <Link
          href="/players"
          className="press heading rounded border border-val-navy-light px-4 py-2 text-sm text-val-light hover:border-val-teal/60 hover:bg-val-navy"
        >
          Players
        </Link>
      </div>

      {!published ? (
        <EmptyState
          title="Bracket not published yet"
          body="The double-elimination bracket will appear here once the organizer generates and publishes it. Check back after registration closes."
        />
      ) : (
        <div className="space-y-6">
          {champion && (
            <div className="clip-notch anim-pop rounded-lg border border-val-teal/40 bg-gradient-to-r from-val-teal/10 to-transparent p-5">
              <p className="heading text-shimmer inline-block text-xs tracking-widest">
                Champion
              </p>
              <p className="heading mt-1 text-2xl text-val-light">{champion}</p>
              {runnerUp && (
                <p className="mt-1 text-sm text-val-muted">
                  Runner-up: <span className="text-val-light">{runnerUp}</span>
                </p>
              )}
            </div>
          )}

          <div className="anim-fade d-2 overflow-x-auto rounded-lg border border-val-navy-light bg-val-darker/40 p-2 sm:p-4">
            <BracketView data={data!} />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminMatch } from "@/lib/bracket";

function Side({
  name,
  score,
  isWinner,
}: {
  name: string | null;
  score: number | null;
  isWinner: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 ${
        isWinner ? "text-val-teal" : "text-val-light"
      }`}
    >
      <span className="truncate">{name ?? <em className="text-val-muted">TBD / bye</em>}</span>
      {score != null && <span className="tabular-nums text-val-muted">{score}</span>}
    </div>
  );
}

function MatchCard({
  match,
  disabled,
  onReport,
  onReset,
  busy,
}: {
  match: AdminMatch;
  disabled: boolean;
  onReport: (id: number, s1: number, s2: number) => void;
  onReset: (id: number) => void;
  busy: boolean;
}) {
  const [s1, setS1] = useState<string>(
    match.opponent1.score != null ? String(match.opponent1.score) : "",
  );
  const [s2, setS2] = useState<string>(
    match.opponent2.score != null ? String(match.opponent2.score) : "",
  );

  const canReport =
    match.reportable && s1.trim() !== "" && s2.trim() !== "" && !disabled;

  return (
    <div className="rounded-lg border border-val-navy-light bg-val-darker/60 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-val-muted">
        <span>
          {match.bracket} · R{match.round} · M{match.order}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
              match.format === "BO5"
                ? "border-val-red/50 bg-val-red/10 text-val-red"
                : "border-val-teal/40 bg-val-teal/10 text-val-teal"
            }`}
          >
            {match.format}
          </span>
          {match.completed && <span className="text-val-teal">Final</span>}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        <Side {...match.opponent1} />
        <Side {...match.opponent2} />
      </div>

      {match.reportable && (
        <div className="mt-3 flex items-center gap-2">
          <input
            inputMode="numeric"
            value={s1}
            onChange={(e) => setS1(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-14 rounded border border-val-navy-light bg-val-darker px-2 py-1 text-center text-sm text-val-light focus:border-val-teal focus:outline-none"
            placeholder="0"
            aria-label={`${match.opponent1.name} score`}
          />
          <span className="text-val-muted">–</span>
          <input
            inputMode="numeric"
            value={s2}
            onChange={(e) => setS2(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-14 rounded border border-val-navy-light bg-val-darker px-2 py-1 text-center text-sm text-val-light focus:border-val-teal focus:outline-none"
            placeholder="0"
            aria-label={`${match.opponent2.name} score`}
          />
          <button
            disabled={!canReport}
            onClick={() => onReport(match.id, Number(s1), Number(s2))}
            className="heading rounded bg-val-red px-3 py-1 text-xs text-white hover:bg-val-red-dark disabled:opacity-40"
          >
            {busy ? "…" : match.completed ? "Update" : "Report"}
          </button>
          {match.completed && (
            <button
              disabled={disabled}
              onClick={() => onReset(match.id)}
              className="rounded px-2 py-1 text-xs text-val-muted hover:text-val-red disabled:opacity-40"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MatchReporter({ matches }: { matches: AdminMatch[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function send(id: number, method: "POST" | "DELETE", body?: object) {
    setErr(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/match/${id}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? "Could not update the match.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setErr("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  const disabled = busyId !== null || pending;

  // Group by bracket for readability.
  const groups = matches.reduce<Record<string, AdminMatch[]>>((acc, m) => {
    (acc[m.bracket] ??= []).push(m);
    return acc;
  }, {});

  return (
    <section className="rounded-lg border border-val-navy-light bg-val-navy/40 p-5">
      <h2 className="heading text-lg text-val-light">Score reporting</h2>
      <p className="mt-1 text-xs text-val-muted">
        Enter final series scores — BO3 (first to 2) for regular matches, BO5
        (first to 3) for the grand final. The winner advances and the loser
        drops to the losers bracket automatically.
      </p>

      {err && (
        <div className="mt-3 rounded border border-val-red/50 bg-val-red/10 px-3 py-2 text-sm text-val-red">
          {err}
        </div>
      )}

      <div className="mt-4 space-y-5">
        {Object.entries(groups).map(([bracket, list]) => (
          <div key={bracket}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-val-muted">
              {bracket}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  disabled={disabled}
                  busy={busyId === m.id}
                  onReport={(id, a, b) => send(id, "POST", { score1: a, score2: b })}
                  onReset={(id) => send(id, "DELETE")}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

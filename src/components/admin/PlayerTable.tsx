"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type AdminPlayer = {
  id: string;
  discordUsername: string;
  riotId: string;
  currentRank: string;
  peakRank: string;
  region: string;
  agentRole: string;
  rankValue: number;
  teamName: string | null;
  teamId: string | null;
};

export default function PlayerTable({ players }: { players: AdminPlayer[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function remove(id: string, label: string) {
    if (
      !window.confirm(
        `Delete ${label}? If they're on a team, the whole team is removed. This can't be undone.`,
      )
    )
      return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/players/${id}`, { method: "DELETE" });
      if (res.ok) startTransition(() => router.refresh());
    } finally {
      setDeleting(null);
    }
  }

  const filtered = query
    ? players.filter((p) =>
        `${p.discordUsername} ${p.riotId} ${p.region} ${p.currentRank} ${p.teamName ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : players;

  return (
    <section className="rounded-lg border border-val-navy-light bg-val-navy/40 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="heading text-lg text-val-light">
          Registrations ({players.length})
        </h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="rounded border border-val-navy-light bg-val-darker px-3 py-1.5 text-sm text-val-light focus:border-val-teal focus:outline-none"
        />
      </div>

      {players.length === 0 ? (
        <p className="py-6 text-center text-sm text-val-muted">
          No registrations yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-val-muted">
              <tr className="border-b border-val-navy-light">
                <th className="px-2 py-2 font-medium">Riot ID</th>
                <th className="px-2 py-2 font-medium">Discord</th>
                <th className="px-2 py-2 font-medium">Rank</th>
                <th className="hidden px-2 py-2 font-medium sm:table-cell">Peak</th>
                <th className="hidden px-2 py-2 font-medium sm:table-cell">Region</th>
                <th className="hidden px-2 py-2 font-medium md:table-cell">Role</th>
                <th className="px-2 py-2 font-medium">Team</th>
                <th className="px-2 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-val-navy-light/40 last:border-0"
                >
                  <td className="px-2 py-2 text-val-light">{p.riotId}</td>
                  <td className="px-2 py-2 text-val-muted">
                    @{p.discordUsername}
                  </td>
                  <td className="px-2 py-2 text-val-muted">{p.currentRank}</td>
                  <td className="hidden px-2 py-2 text-val-muted sm:table-cell">
                    {p.peakRank}
                  </td>
                  <td className="hidden px-2 py-2 text-val-muted sm:table-cell">
                    {p.region}
                  </td>
                  <td className="hidden px-2 py-2 text-val-muted md:table-cell">
                    {p.agentRole}
                  </td>
                  <td className="px-2 py-2 text-val-muted">
                    {p.teamName ?? "—"}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => remove(p.id, p.riotId)}
                      disabled={deleting === p.id}
                      className="rounded px-2 py-1 text-xs text-val-red hover:bg-val-red/10 disabled:opacity-50"
                    >
                      {deleting === p.id ? "…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

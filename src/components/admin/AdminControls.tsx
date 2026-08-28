"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

type Settings = {
  registrationOpen: boolean;
  pairingsPublished: boolean;
  bracketPublished: boolean;
  tournamentName: string;
};

function Toggle({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 transition-colors duration-200 hover:bg-val-navy-light/20 px-2 rounded-lg">
      <div>
        <p className="text-sm font-semibold text-val-light tracking-wide">{label}</p>
        <p className="text-xs text-val-muted/80">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`press relative h-7 w-13 shrink-0 rounded-full border p-0.5 transition-all duration-300 ease-out focus:outline-none disabled:opacity-40 cursor-pointer ${
          checked
            ? "border-val-teal/60 bg-gradient-to-r from-val-teal-dark to-val-teal shadow-[0_0_15px_rgba(18,226,196,0.4)]"
            : "border-val-navy-light/80 bg-val-darker shadow-inner"
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) ${
            checked
              ? "translate-x-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              : "translate-x-0 bg-val-muted/70"
          }`}
        />
      </button>
    </div>
  );
}

export default function AdminControls({
  settings: initialSettings,
  teamCount,
  hasBracket,
}: {
  settings: Settings;
  teamCount: number;
  hasBracket: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  // Keep local state in sync when server re-renders initialSettings
  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  async function patchSettings(patch: Partial<Settings>) {
    setMsg(null);
    setBusy("settings");
    // Optimistic UI update to eliminate switch glitching / flickering
    const prevSettings = { ...settings };
    setSettings((prev) => ({ ...prev, ...patch }));

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      startTransition(() => router.refresh());
    } catch {
      // Rollback on failure
      setSettings(prevSettings);
      setMsg({ kind: "err", text: "Failed to update setting." });
    } finally {
      setBusy(null);
    }
  }

  async function post(url: string, label: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setMsg(null);
    setBusy(label);
    try {
      const res = await fetch(url, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: json.error ?? "Action failed." });
        return;
      }
      setMsg({ kind: "ok", text: json.message ?? "Done." });
      startTransition(() => router.refresh());
    } catch {
      setMsg({ kind: "err", text: "Network error." });
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const disabled = busy !== null || pending;

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            msg.kind === "ok"
              ? "border-val-teal/50 bg-val-teal/10 text-val-teal"
              : "border-val-red/50 bg-val-red/10 text-val-red"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Registration + publish toggles */}
      <section className="registration-panel scan-beam clip-notch rounded-xl border border-val-navy-light/80 bg-val-navy/60 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-val-navy-light/60 pb-3 mb-2">
          <h2 className="heading text-lg text-val-light">Event controls</h2>
          <span className="dot-ping h-2 w-2 rounded-full bg-val-teal" />
        </div>
        <div className="divide-y divide-val-navy-light/50">
          <Toggle
            label="Registration open"
            desc="Allow new players to sign up."
            checked={settings.registrationOpen}
            disabled={disabled}
            onChange={(v) => patchSettings({ registrationOpen: v })}
          />
          <Toggle
            label="Publish pairings"
            desc="Show teams on the public Players page."
            checked={settings.pairingsPublished}
            disabled={disabled || teamCount === 0}
            onChange={(v) => patchSettings({ pairingsPublished: v })}
          />
          <Toggle
            label="Publish bracket"
            desc="Show the bracket on the public Bracket page."
            checked={settings.bracketPublished}
            disabled={disabled || !hasBracket}
            onChange={(v) => patchSettings({ bracketPublished: v })}
          />
        </div>
      </section>

      {/* Actions */}
      <section className="registration-panel scan-beam clip-notch rounded-xl border border-val-navy-light/80 bg-val-navy/60 p-6 shadow-2xl">
        <h2 className="heading border-b border-val-navy-light/60 pb-3 mb-4 text-lg text-val-light">Run the tournament</h2>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              disabled={disabled || teamCount < 2}
              onClick={() =>
                post(
                  "/api/admin/bracket",
                  "bracket",
                  hasBracket
                    ? "Re-generate the bracket? All reported scores will be reset."
                    : "Generate the double-elimination bracket from the current teams? Teams are locked afterwards.",
                )
              }
              className="press heading clip-notch rounded-sm border border-val-teal/60 bg-val-teal/15 px-5 py-2.5 text-xs text-val-teal backdrop-blur hover:bg-val-teal/25 hover:shadow-[0_0_20px_rgba(18,226,196,0.35)] disabled:opacity-40 cursor-pointer"
            >
              {busy === "bracket"
                ? "Generating…"
                : hasBracket
                  ? "Re-generate bracket"
                  : "Generate bracket"}
            </button>
            <span className="text-xs font-semibold text-val-muted">
              {teamCount} teams registered
            </span>
            {hasBracket && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-val-teal">
                <span className="h-1.5 w-1.5 rounded-full bg-val-teal shadow-[0_0_6px_#12e2c4]" />
                Bracket ready
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <a
          href="/api/admin/export"
          className="heading rounded border border-val-navy-light px-4 py-2 text-sm text-val-light hover:bg-val-navy"
        >
          Export CSV
        </a>
        <button
          onClick={logout}
          className="text-sm text-val-muted hover:text-val-red"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

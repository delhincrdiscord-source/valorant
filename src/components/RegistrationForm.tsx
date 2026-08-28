"use client";

import { useState } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  duoRegistrationSchema,
  type DuoRegistrationInput,
} from "@/lib/validation";
import { RANKS, REGIONS, ROLES } from "@/lib/constants";

const inputClass =
  "field-anim min-h-11 w-full rounded-sm border border-val-navy-light bg-val-darker/80 px-3 py-2.5 text-sm text-val-light placeholder:text-val-muted/50 focus:border-val-teal focus:outline-none";
const labelClass = "heading mb-1.5 block text-[10px] text-val-muted";
const errorClass = "mt-1 text-xs text-val-red";

type Prefix = "player1" | "player2";

function PlayerFields({
  prefix,
  title,
  register,
  errors,
}: {
  prefix: Prefix;
  title: string;
  register: UseFormRegister<DuoRegistrationInput>;
  errors: FieldErrors<DuoRegistrationInput>;
}) {
  const errs = errors[prefix];
  return (
    <div className="rounded border border-val-navy-light/70 bg-val-darker/40 p-4">
      <p className="heading mb-3 text-xs text-val-teal">{title}</p>
      <div className="space-y-4">
        <div>
          <label htmlFor={`${prefix}-discordUsername`} className={labelClass}>
            Discord username
          </label>
          <input
            id={`${prefix}-discordUsername`}
            placeholder="yourname or YourName#1234"
            className={inputClass}
            {...register(`${prefix}.discordUsername`)}
          />
          {errs?.discordUsername && (
            <p className={errorClass}>{errs.discordUsername.message}</p>
          )}
        </div>

        <div>
          <label htmlFor={`${prefix}-discordUserId`} className={labelClass}>
            Discord user ID
          </label>
          <input
            id={`${prefix}-discordUserId`}
            inputMode="numeric"
            placeholder="Right-click your profile and Copy User ID"
            className={inputClass}
            {...register(`${prefix}.discordUserId`)}
          />
          <p className="mt-1 text-[11px] text-val-muted">
            Enable Developer Mode in Discord, then right-click your profile and
            copy your user ID.
          </p>
          {errs?.discordUserId && (
            <p className={errorClass}>{errs.discordUserId.message}</p>
          )}
        </div>

        <div>
          <label htmlFor={`${prefix}-riotId`} className={labelClass}>
            Riot ID
          </label>
          <input
            id={`${prefix}-riotId`}
            placeholder="Phoenix#NA1"
            className={inputClass}
            {...register(`${prefix}.riotId`)}
          />
          {errs?.riotId && <p className={errorClass}>{errs.riotId.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${prefix}-currentRank`} className={labelClass}>
              Current rank
            </label>
            <select
              id={`${prefix}-currentRank`}
              defaultValue=""
              className={inputClass}
              {...register(`${prefix}.currentRank`)}
            >
              <option value="" disabled>
                Select rank
              </option>
              {RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errs?.currentRank && (
              <p className={errorClass}>{errs.currentRank.message}</p>
            )}
          </div>

          <div>
            <label htmlFor={`${prefix}-peakRank`} className={labelClass}>
              Peak rank
            </label>
            <select
              id={`${prefix}-peakRank`}
              defaultValue=""
              className={inputClass}
              {...register(`${prefix}.peakRank`)}
            >
              <option value="" disabled>
                Select rank
              </option>
              {RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errs?.peakRank && (
              <p className={errorClass}>{errs.peakRank.message}</p>
            )}
          </div>

          <div>
            <label htmlFor={`${prefix}-region`} className={labelClass}>
              Region / server
            </label>
            <select
              id={`${prefix}-region`}
              defaultValue=""
              className={inputClass}
              {...register(`${prefix}.region`)}
            >
              <option value="" disabled>
                Select region
              </option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errs?.region && <p className={errorClass}>{errs.region.message}</p>}
          </div>

          <div>
            <label htmlFor={`${prefix}-agentRole`} className={labelClass}>
              Role preference
            </label>
            <select
              id={`${prefix}-agentRole`}
              defaultValue=""
              className={inputClass}
              {...register(`${prefix}.agentRole`)}
            >
              <option value="" disabled>
                Select role
              </option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errs?.agentRole && (
              <p className={errorClass}>{errs.agentRole.message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegistrationForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ teamName: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DuoRegistrationInput>({
    resolver: zodResolver(duoRegistrationSchema),
    defaultValues: { rulesAgreed: false as unknown as true, website: "" },
  });

  async function onSubmit(values: DuoRegistrationInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(json.error ?? "Registration failed. Try again.");
        return;
      }
      setDone({ teamName: json.team?.name ?? values.teamName ?? "Your team" });
      reset();
    } catch {
      setServerError("Network error. Check your connection and try again.");
    }
  }

  if (done) {
    return (
      <div className="clip-notch anim-pop rounded-lg border border-val-teal/40 bg-val-navy/60 p-6 text-center">
        <h3 className="heading text-xl text-val-teal">Team&apos;s in!</h3>
        <p className="mt-2 text-val-light">
          <span className="font-semibold">{done.teamName}</span> is registered
          for the skirmish.
        </p>
        <p className="mt-1 text-sm text-val-muted">
          Teams are seeded by the organizers once registration closes. Watch the{" "}
          <a href="/players" className="text-val-teal hover:underline">
            Players
          </a>{" "}
          page.
        </p>
        <button
          onClick={() => window.location.assign("/players")}
          className="press heading mt-4 rounded bg-val-navy-light px-4 py-2 text-sm text-val-light hover:bg-val-navy"
        >
          View registered teams
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="reveal-children space-y-4">
      {/* Honeypot: hidden from users, tempting to bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <PlayerFields
        prefix="player1"
        title="Player 1 — You"
        register={register}
        errors={errors}
      />
      <PlayerFields
        prefix="player2"
        title="Player 2 — Your duo"
        register={register}
        errors={errors}
      />

      <div>
        <label htmlFor="teamName" className={labelClass}>
          Team name <span className="normal-case text-val-muted/60">(optional)</span>
        </label>
        <input
          id="teamName"
          placeholder="Auto-generated from your Riot IDs if blank"
          maxLength={32}
          className={inputClass}
          {...register("teamName")}
        />
        {errors.teamName && <p className={errorClass}>{errors.teamName.message}</p>}
      </div>

      <div className="flex items-start gap-3 rounded-sm border border-val-navy-light/60 bg-val-darker/45 p-3">
        <input
          id="rulesAgreed"
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-val-red"
          {...register("rulesAgreed")}
        />
        <label htmlFor="rulesAgreed" className="text-sm text-val-light">
          Both players agree to the tournament rules and code of conduct, and
          confirm our Riot IDs and ranks are accurate.
        </label>
      </div>
      {errors.rulesAgreed && (
        <p className={errorClass}>{errors.rulesAgreed.message}</p>
      )}

      {serverError && (
        <div className="rounded border border-val-red/50 bg-val-red/10 px-3 py-2 text-sm text-val-red">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="press btn-3d-red sheen heading clip-notch min-h-12 w-full rounded-sm px-4 py-3 text-sm text-white disabled:opacity-60"
      >
        {isSubmitting ? "Submitting…" : "Register your duo"}
      </button>
    </form>
  );
}

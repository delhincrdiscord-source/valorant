import Link from "next/link";
import RegistrationForm from "@/components/RegistrationForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();

  return (
    <div className="home-layout grid items-start gap-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)] lg:gap-10 xl:gap-16">
      {/* Intro / hero */}
      <section className="hero-panel scan-beam relative overflow-hidden border border-val-navy-light/80 px-5 py-7 sm:px-8 sm:py-10 lg:min-h-[670px] lg:px-10 lg:py-12">
        <div className="hero-reticle" aria-hidden="true" />
        <div className="relative z-10">
          <div className="anim-rise flex flex-wrap items-center gap-3">
            <p className="heading event-kicker inline-flex items-center gap-2 text-[11px] text-val-teal">
              <span className="dot-ping h-1.5 w-1.5 rounded-full bg-val-teal" />
              Community Event
            </p>
            <span className="h-px w-10 bg-val-navy-light" />
            <p className="heading text-[10px] text-val-muted">TDM / Double Elimination</p>
          </div>
          <h1 className="hero-title heading anim-rise d-1 mt-5 max-w-3xl text-[clamp(2.6rem,9vw,5.7rem)] leading-[0.88] text-val-light">
            {settings.tournamentName}
          </h1>
          <p className="anim-rise d-2 mt-6 max-w-xl text-sm leading-7 text-val-muted sm:text-base">
          Bring your{" "}
          <span className="text-val-light font-semibold">duo</span> and register
          together. We seed every 2-player team into a{" "}
          <span className="text-val-light font-semibold">double-elimination bracket</span>{" "}
          of custom Team Deathmatch. No pairing roulette —{" "}
          <span className="text-val-light font-semibold">you pick your teammate</span>.
          </p>

          <ul className="reveal-children mt-8 grid gap-px overflow-hidden border border-val-navy-light/70 bg-val-navy-light/70 sm:grid-cols-3">
          {[
            ["01", "Register your duo", "One form, both players — Riot IDs, ranks, Discord."],
            ["02", "Get seeded", "We rank teams by combined rank once sign-ups close."],
            ["03", "Compete", "Check the bracket and play your matches."],
          ].map(([n, title, desc]) => (
            <li key={n} className="step-item bg-val-darker/90 p-4">
              <div className="mb-5 flex items-center justify-between">
                <span className="heading text-xs text-val-red font-bold">{n}</span>
                <span className="step-line h-px w-7 bg-val-navy-light" />
              </div>
              <p className="heading text-xs text-val-light">{title}</p>
              <p className="mt-1 text-xs leading-5 text-val-muted">{desc}</p>
            </li>
          ))}
          </ul>

          <div className="anim-rise d-5 mt-7 flex flex-wrap gap-3 text-sm">
            <Link
              href="/players"
              className="press btn-3d-red heading clip-notch inline-flex min-h-11 items-center justify-center px-6 py-2.5 text-xs text-white"
            >
              View players
            </Link>
            <Link
              href="/bracket"
              className="press heading clip-notch inline-flex min-h-11 items-center justify-center border border-val-teal/40 bg-val-navy/80 px-6 py-2.5 text-xs text-val-teal backdrop-blur hover:border-val-teal hover:bg-val-navy hover:shadow-[0_0_20px_rgba(18,226,196,0.3)]"
            >
              View bracket
            </Link>
          </div>
        </div>
      </section>

      {/* Registration card container with 3D background elements */}
      <div className="relative lg:sticky lg:top-24">
        {/* Animated glowing background backplate & 3D geometry */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-val-red/30 via-transparent to-val-teal/30 blur-2xl opacity-60 animate-pulse pointer-events-none" />
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full border border-val-red/20 bg-val-red/5 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full border border-val-teal/20 bg-val-teal/5 blur-xl pointer-events-none" />

        <section className="registration-panel scan-beam clip-notch anim-slide-right d-2 border border-val-navy-light bg-val-navy/50 p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-val-navy-light/70 pb-5">
          <div>
            <p className="heading text-[10px] text-val-red">Player entry</p>
            <h2 className="heading mt-1 text-2xl text-val-light">Lock in</h2>
          </div>
          <span className="heading text-[10px] text-val-muted">2V2 / 001</span>
        </div>
        <div className="mb-5 flex items-center gap-2 text-sm">
          <span
            className={`dot-ping inline-block h-2 w-2 rounded-full ${
              settings.registrationOpen ? "bg-val-teal" : "bg-val-red"
            }`}
            style={
              settings.registrationOpen
                ? undefined
                : ({ "--ping-color": "rgba(255,70,85,0.55)" } as React.CSSProperties)
            }
          />
          <span className={settings.registrationOpen ? "text-val-teal" : "text-val-red"}>
            {settings.registrationOpen
              ? "Registration is open"
              : "Registration is closed"}
          </span>
        </div>

        {settings.registrationOpen ? (
          <RegistrationForm />
        ) : (
          <div className="rounded border border-val-navy-light bg-val-darker/60 p-6 text-center text-val-muted">
            <p>
              Sign-ups are closed right now. Follow the Discord announcements for
              the next window, and check the{" "}
              <Link href="/bracket" className="text-val-teal hover:underline">
                bracket
              </Link>{" "}
              once teams are set.
            </p>
          </div>
        )}
      </section>
    </div>
    </div>
  );
}

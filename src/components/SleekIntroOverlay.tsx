"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SleekIntroOverlay() {
  const [stage, setStage] = useState<"active" | "fading" | "hidden">("active");

  useEffect(() => {
    // 1.2s reveal timer
    const timer = setTimeout(() => {
      setStage("fading");
      setTimeout(() => setStage("hidden"), 600);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  if (stage === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-[#070b10] transition-all duration-700 ease-out ${
        stage === "fading" ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
    >
      {/* Subtle radial crimson background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,70,85,0.25)_0%,transparent_65%)]" />

      {/* Sleek logo expand animation */}
      <div className="relative flex flex-col items-center justify-center">
        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-val-red/50 bg-val-darker p-1 shadow-[0_0_30px_rgba(255,70,85,0.5)] anim-pop">
          <Image
            src="/valorant-logo.png"
            alt="Valorant Logo"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="mt-4 overflow-hidden">
          <p className="heading text-xs tracking-[0.3em] text-val-light opacity-90 anim-rise d-1">
            VALORANT <span className="text-val-red">2V2</span>
          </p>
        </div>
      </div>
    </div>
  );
}

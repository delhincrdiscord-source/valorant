"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import type { BracketData } from "@/lib/bracket";

// Minimal shape of the global the vendored bundle installs on `window`.
// (brackets-viewer ships as a browser script, not an importable module.)
type ViewerData = {
  stages: unknown[];
  matches: unknown[];
  matchGames: unknown[];
  participants: unknown[];
};
type ViewerConfig = {
  selector?: string;
  clear?: boolean;
  participantOriginPlacement?: "none" | "before" | "after";
  showSlotsOrigin?: boolean;
  showLowerBracketSlotsOrigin?: boolean;
  highlightParticipantOnHover?: boolean;
};
declare global {
  interface Window {
    bracketsViewer?: {
      render: (data: ViewerData, config?: ViewerConfig) => void | Promise<void>;
    };
  }
}

const ROOT_ID = "brackets-viewer-root";

export default function BracketView({ data }: { data: BracketData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const draw = useCallback(async () => {
    const viewer = window.bracketsViewer;
    const el = containerRef.current;
    if (!viewer || !el) return;

    // The viewer appends DOM into the root; wipe it first so re-renders (React
    // Strict Mode double-invoke, client-side nav, data changes) don't stack.
    el.innerHTML = "";
    try {
      await viewer.render(
        {
          // brackets-manager dump → brackets-viewer ViewerData mapping.
          stages: data.stage,
          matches: data.match,
          matchGames: data.match_game,
          participants: data.participant,
        },
        {
          selector: `#${ROOT_ID}`,
          clear: true,
          // Prefix the seed (e.g. "#1 Team X") so byes/seeding read clearly.
          participantOriginPlacement: "before",
        },
      );
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [data]);

  // Redraw whenever the script becomes ready or the data changes.
  useEffect(() => {
    if (ready) void draw();
  }, [ready, draw]);

  return (
    <div>
      {/* Third-party stylesheet (React 19 hoists & dedupes by href). */}
      <link
        rel="stylesheet"
        href="/vendor/brackets-viewer/brackets-viewer.min.css"
      />
      <Script
        src="/vendor/brackets-viewer/brackets-viewer.min.js"
        strategy="afterInteractive"
        // onReady fires on load *and* on every remount/navigation.
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />

      {failed && (
        <p className="rounded border border-val-red/50 bg-val-red/10 px-3 py-2 text-sm text-val-red">
          The bracket couldn&apos;t be rendered. Try refreshing the page.
        </p>
      )}

      {/* The viewer requires the `brackets-viewer` class for its styles to
          apply, and manages this element's children itself — React never
          renders into it. */}
      <div
        id={ROOT_ID}
        ref={containerRef}
        className="brackets-viewer"
        suppressHydrationWarning
      />
    </div>
  );
}

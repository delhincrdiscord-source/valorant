import React from "react";
import { ImageResponse } from "next/og";
import { listMatches, type AdminMatch, type BracketData } from "./bracket";

// Layout constants (unscaled units; the whole canvas is scaled down at the end
// if it exceeds the ImageResponse size limits).
const MATCH_W = 330;
const MATCH_H = 70;
const ROW_GAP = 26;
const RH = MATCH_H + ROW_GAP;
const COL_GAP = 92;
const PAD = 46;
const BLOCK_GAP = 84;
const HEADER_H = 172;
const FOOTER_H = 58;
const MAX_W = 3200;
const MAX_H = 3200;

const C = {
  bg: "#0f1923",
  panel: "#18232e",
  border: "#2a3a4a",
  line: "#42586e",
  text: "#ece8e1",
  muted: "#8b9bad",
  teal: "#12e2c4",
  red: "#ff4655",
  orange: "#ff9f43",
} as const;

const GROUPS: Record<
  string,
  { label: string; color: string }
> = {
  Winners: { label: "Winners bracket", color: C.teal },
  Losers: { label: "Losers bracket", color: C.orange },
  "Grand Final": { label: "Grand Final · BO5", color: C.red },
};

interface Column {
  round: number;
  matches: AdminMatch[];
}

function buildColumns(bracket: string, matches: AdminMatch[]): Column[] {
  const byRound = new Map<number, AdminMatch[]>();
  for (const m of matches) {
    const arr = byRound.get(m.round) ?? [];
    arr.push(m);
    byRound.set(m.round, arr);
  }
  return [...byRound.keys()]
    .sort((a, b) => a - b)
    .map((round) => ({
      round,
      matches: byRound.get(round)!.sort((a, b) => a.order - b.order),
    }));
}

/**
 * Vertical center of each match box per column, using the standard bracket
 * "slot" rule: match i in column c is fed by matches 2i and 2i+1 in column
 * c-1, so its center is the midpoint of its two children. Column 0 is spaced
 * evenly.
 */
function computeCenters(cols: Column[]): number[][] {
  const centers: number[][] = [];
  for (let c = 0; c < cols.length; c++) {
    const n = cols[c].matches.length;
    const arr: number[] = [];
    for (let i = 0; i < n; i++) {
      if (c === 0) {
        arr.push(MATCH_H / 2 + i * RH);
      } else {
        const prev = centers[c - 1];
        const a = prev[2 * i];
        const b = prev[2 * i + 1];
        arr.push(
          a != null && b != null ? (a + b) / 2 : (a ?? b ?? MATCH_H / 2 + i * RH),
        );
      }
    }
    centers.push(arr);
  }
  return centers;
}

function groupHeight(cols: Column[]): number {
  const k = cols[0]?.matches.length ?? 0;
  return k === 0 ? 0 : (k - 1) * RH + MATCH_H;
}

const colX = (c: number) => PAD + c * (MATCH_W + COL_GAP);

function shortName(name: string | null, max = 24): string {
  if (!name) return "TBD";
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function MatchBox({
  x,
  y,
  match,
  color,
  s,
}: {
  x: number;
  y: number;
  match: AdminMatch;
  color: string;
  s: number;
}) {
  const P = (n: number) => Math.round(n * s);
  const row = (opp: AdminMatch["opponent1"]) => (
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: P(13),
          color: opp.isWinner ? C.teal : C.text,
          fontWeight: opp.isWinner ? 700 : 400,
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0,
        }}
      >
        {shortName(opp.name)}
      </span>
      <span
        style={{
          fontSize: P(13),
          fontWeight: 700,
          color: opp.score != null && opp.isWinner ? C.teal : C.muted,
          marginLeft: 10,
        }}
      >
        {opp.score ?? ""}
      </span>
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        left: P(x),
        top: P(y),
        width: P(MATCH_W),
        height: P(MATCH_H),
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {row(match.opponent1)}
      <div style={{ height: 1, background: C.border, margin: "0 8px" }} />
      {row(match.opponent2)}
    </div>
  );
}

function renderGroup(
  bracket: string,
  cols: Column[],
  centers: number[][],
  top: number,
  s: number,
): React.ReactNode[] {
  const P = (n: number) => Math.round(n * s);
  const color = GROUPS[bracket]?.color ?? C.teal;
  const nodes: React.ReactNode[] = [];

  // Block banner.
  nodes.push(
    <div
      key={`${bracket}-banner`}
      style={{
        position: "absolute",
        left: P(PAD),
        top: P(top - 62),
        fontSize: P(16),
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: "uppercase",
        color,
      }}
    >
      {GROUPS[bracket]?.label ?? bracket}
    </div>,
  );

  for (let c = 0; c < cols.length; c++) {
    const x = colX(c);
    const col = cols[c];

    // Round label.
    nodes.push(
      <div
        key={`${bracket}-r${c}-label`}
        style={{
          position: "absolute",
          left: P(x),
          top: P(top - 30),
          fontSize: P(12),
          fontWeight: 700,
          color: C.muted,
          textTransform: "uppercase",
        }}
      >
        {c === 0 && bracket === "Grand Final" ? "" : `Round ${col.round}`}
      </div>,
    );

    // Match boxes.
    col.matches.forEach((m, i) => {
      nodes.push(
        <MatchBox
          key={`${bracket}-m${m.id}`}
          x={x}
          y={top + centers[c][i] - MATCH_H / 2}
          match={m}
          color={color}
          s={s}
        />,
      );
    });

    // Elbows connecting this column to the previous one.
    if (c === 0) continue;
    const midX = colX(c - 1) + MATCH_W + COL_GAP / 2;
    const nextLeft = colX(c - 1) + MATCH_W + COL_GAP;
    for (let i = 0; i < col.matches.length; i++) {
      const cy = top + centers[c][i];
      const yA = centers[c - 1][2 * i] != null ? top + centers[c - 1][2 * i] : null;
      const yB =
        centers[c - 1][2 * i + 1] != null ? top + centers[c - 1][2 * i + 1] : null;

      if (yA != null) {
        nodes.push(
          <div
            key={`${bracket}-h-a-${c}-${i}`}
            style={{
              position: "absolute",
              left: P(colX(c - 1) + MATCH_W),
              top: P(yA),
              width: P(COL_GAP / 2),
              height: 2,
              background: C.line,
            }}
          />,
        );
      }
      if (yB != null) {
        nodes.push(
          <div
            key={`${bracket}-h-b-${c}-${i}`}
            style={{
              position: "absolute",
              left: P(colX(c - 1) + MATCH_W),
              top: P(yB),
              width: P(COL_GAP / 2),
              height: 2,
              background: C.line,
            }}
          />,
        );
      }
      if (yA != null && yB != null) {
        nodes.push(
          <div
            key={`${bracket}-v-${c}-${i}`}
            style={{
              position: "absolute",
              left: P(midX),
              top: P(Math.min(yA, yB)),
              width: 2,
              height: P(Math.abs(yB - yA)),
              background: C.line,
            }}
          />,
        );
      }
      nodes.push(
        <div
          key={`${bracket}-h-c-${c}-${i}`}
          style={{
            position: "absolute",
            left: P(midX),
            top: P(cy),
            width: P(COL_GAP / 2),
            height: 2,
            background: C.line,
          }}
        />,
      );
    }
  }

  return nodes;
}

function renderGrandFinal(
  matches: AdminMatch[],
  top: number,
  s: number,
): React.ReactNode[] {
  const P = (n: number) => Math.round(n * s);
  const nodes: React.ReactNode[] = [];
  const color = C.red;

  nodes.push(
    <div
      key="gf-banner"
      style={{
        position: "absolute",
        left: P(PAD),
        top: P(top - 62),
        fontSize: P(16),
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: "uppercase",
        color,
      }}
    >
      Grand Final · BO5
    </div>,
  );

  const sorted = [...matches].sort((a, b) => a.order - b.order);
  sorted.forEach((m, i) => {
    if (i === 0) {
      nodes.push(
        <div
          key="gf-label"
          style={{
            position: "absolute",
            left: P(PAD),
            top: P(top - 30),
            fontSize: P(12),
            fontWeight: 700,
            color: C.muted,
            textTransform: "uppercase",
          }}
        >
          {sorted.length > 1 ? "Grand Final" : ""}
        </div>,
      );
    } else {
      nodes.push(
        <div
          key="gf-reset-label"
          style={{
            position: "absolute",
            left: P(PAD),
            top: P(top + i * RH - 30),
            fontSize: P(12),
            fontWeight: 700,
            color: C.muted,
            textTransform: "uppercase",
          }}
        >
          Bracket reset
        </div>,
      );
    }
    nodes.push(
      <MatchBox
        key={`gf-m${m.id}`}
        x={PAD}
        y={top + i * RH}
        match={m}
        color={color}
        s={s}
      />,
    );
  });

  return nodes;
}

/** Renders the bracket as a PNG. Exported for smoke-testing/dev tooling. */
export async function renderFixtureImage(
  data: BracketData,
  tournamentName: string,
  teamCount: number,
) {
  const matches = listMatches(data);
  const winners = matches.filter((m) => m.bracket === "Winners");
  const losers = matches.filter((m) => m.bracket === "Losers");
  const grandFinal = matches.filter((m) => m.bracket === "Grand Final");

  const wbCols = buildColumns("Winners", winners);
  const lbCols = buildColumns("Losers", losers);
  const wbCenters = computeCenters(wbCols);
  const lbCenters = computeCenters(lbCols);

  const wbH = groupHeight(wbCols);
  const lbH = groupHeight(lbCols);
  const gfH = Math.max(0, grandFinal.length - 1) * RH + (grandFinal.length > 0 ? MATCH_H : 0);

  const wbFirstY = PAD + HEADER_H;
  const lbFirstY = wbFirstY + wbH + BLOCK_GAP;
  const contentH = wbH + BLOCK_GAP + lbH;
  const gfTop = wbFirstY + contentH / 2 - gfH / 2;

  const maxCols = Math.max(wbCols.length, lbCols.length, grandFinal.length > 0 ? 1 : 0);
  const naturalW =
    PAD * 2 + maxCols * (MATCH_W + COL_GAP) + (grandFinal.length > 0 ? MATCH_W + COL_GAP : 0);
  const naturalH =
    PAD +
    HEADER_H +
    contentH +
    FOOTER_H +
    PAD +
    (grandFinal.length > 0 ? Math.max(0, gfTop - (wbFirstY + contentH)) : 0);

  const s = Math.min(1, MAX_W / naturalW, MAX_H / naturalH);
  const width = Math.round(naturalW * s);
  const height = Math.round(naturalH * s);
  const P = (n: number) => Math.round(n * s);

  const body: React.ReactNode[] = [];

  // Header (kept in normal flow with explicit margins since every bracket
  // element below is absolutely positioned in the global coordinate space).
  body.push(
    <div
      key="header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginLeft: P(PAD),
        marginRight: P(PAD),
        marginTop: P(PAD),
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ color: C.red, fontSize: 22, fontWeight: 700, textTransform: "uppercase" }}>
          Tournament fixture
        </div>
        <div style={{ marginTop: 10, fontSize: 48, fontWeight: 800, color: C.text }}>
          {tournamentName}
        </div>
      </div>
      <div style={{ color: C.teal, fontSize: 24, fontWeight: 700 }}>{`${teamCount} teams`}</div>
    </div>,
  );

  // Bracket blocks.
  if (wbCols.length > 0) {
    body.push(...renderGroup("Winners", wbCols, wbCenters, wbFirstY, s));
  }
  if (lbCols.length > 0) {
    body.push(...renderGroup("Losers", lbCols, lbCenters, lbFirstY, s));
  }
  if (grandFinal.length > 0) {
    body.push(...renderGrandFinal(grandFinal, gfTop, s));
  }

  // Footer.
  body.push(
    <div
      key="footer"
      style={{
        position: "absolute",
        left: P(PAD),
        top: P(PAD + HEADER_H + contentH + 12),
        display: "flex",
        justifyContent: "space-between",
        width: P(naturalW - PAD * 2),
        color: C.muted,
        fontSize: 14,
      }}
    >
      <span>Double elimination · Matches BO3 (first to 2) · Grand final BO5 (first to 3)</span>
      <span>Generated {new Date().toISOString().replace("T", " ").slice(0, 16)} UTC</span>
    </div>,
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          background: C.bg,
          color: C.text,
          fontFamily: "sans-serif",
        }}
      >
        {body}
      </div>
    ),
    { width, height },
  );
}

export async function sendBracketNotification(
  data: BracketData,
  tournamentName: string,
  teamCount: number,
): Promise<void> {
  const webhookUrl = process.env.DISCORD_BRACKET_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const image = await renderFixtureImage(data, tournamentName, teamCount);
    const imageBytes = await image.arrayBuffer();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    const form = new FormData();

    form.append(
      "payload_json",
      JSON.stringify({
        embeds: [
          {
            title: `${tournamentName} bracket`,
            description: `The double-elimination bracket has been generated for **${teamCount} teams**.`,
            color: 0xe94560,
            url: siteUrl ? `${siteUrl}/bracket` : undefined,
            image: { url: "attachment://fixture.png" },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    );
    form.append("files[0]", new Blob([imageBytes], { type: "image/png" }), "fixture.png");

    const response = await fetch(webhookUrl, { method: "POST", body: form });
    if (!response.ok) {
      console.error("Discord bracket notification failed", response.status);
    }
  } catch (error) {
    console.error("Discord bracket notification error", error);
  }
}

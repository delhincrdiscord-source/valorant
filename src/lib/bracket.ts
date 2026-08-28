// Double-elimination bracket logic, built on `brackets-manager`.
//
// We don't ship a custom storage adapter. Instead we run the manager against an
// in-memory database, then dump the whole dataset to the `Tournament.data`
// JSONB column. Every mutation is: load JSON → hydrate → mutate → dump → save.
// That keeps the (well-tested) bracket engine and Postgres cleanly separated.

import { BracketsManager } from "brackets-manager";
import { InMemoryDatabase } from "brackets-memory-db";

// The shape of `InMemoryDatabase.data` — 6 arrays. `brackets-manager` doesn't
// export this type, so we mirror it. `unknown[]` is fine: we only ever pass it
// straight back into `setData`, never index into it here.
export interface BracketData {
  participant: unknown[];
  stage: unknown[];
  group: unknown[];
  round: unknown[];
  match: unknown[];
  match_game: unknown[];
}

// Group numbering is stable in brackets-manager for a double-elimination stage:
// group 1 = winners bracket, 2 = losers bracket, 3 = grand final.
export const GROUP = { WINNERS: 1, LOSERS: 2, GRAND_FINAL: 3 } as const;

// Match.status values we care about (from brackets-model's Status enum).
export const STATUS = {
  LOCKED: 0,
  WAITING: 1,
  READY: 2,
  RUNNING: 3,
  COMPLETED: 4,
  ARCHIVED: 5,
  CANCELLED: 6,
} as const;

const STAGE_ID = 0;
const TOURNAMENT_ID = 0;

/** A team ready to be seeded, ordered however the caller likes. */
export interface SeedTeam {
  id: string;
  name: string;
  seed: number;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Seed numbers (1-indexed) in *bracket-slot* order for a power-of-two size.
 * e.g. 8 → [1,8,4,5,2,7,3,6], which is the standard tournament arrangement
 * where seed 1 and seed 2 can only meet in the final. Placing our teams into
 * these slots (and byes into the surplus slots) means byes fall on the top
 * seeds — exactly what you want.
 */
function standardSlots(size: number): number[] {
  let pairings = [1, 2];
  while (pairings.length < size) {
    const sum = pairings.length * 2 + 1;
    const next: number[] = [];
    for (const s of pairings) {
      next.push(s);
      next.push(sum - s);
    }
    pairings = next;
  }
  return pairings;
}

/**
 * Build the seeding array for `create.stage`. Teams are placed by their `seed`
 * (1 = strongest) into standard bracket slots; empty slots become `null` byes.
 * brackets-manager requires a power-of-two count, so we pad up to it.
 */
function buildSeeding(teams: SeedTeam[]): (string | null)[] {
  const ordered = [...teams].sort((a, b) => a.seed - b.seed);
  const size = Math.max(2, nextPow2(ordered.length));
  return standardSlots(size).map((seedNo) =>
    seedNo <= ordered.length ? ordered[seedNo - 1].name : null,
  );
}

function hydrate(data: BracketData | null): {
  db: InMemoryDatabase;
  manager: BracketsManager;
} {
  const db = new InMemoryDatabase();
  if (data) db.setData(data as never);
  const manager = new BracketsManager(db);
  return { db, manager };
}

const TABLES = [
  "participant",
  "stage",
  "group",
  "round",
  "match",
  "match_game",
] as const;

async function dump(db: InMemoryDatabase): Promise<BracketData> {
  // Read every table through the public `select` API (the `data` field is
  // protected) and deep-clone so the result is a plain, JSON-serializable
  // object safe to store in the Postgres JSONB column.
  const out: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    out[table] = ((await db.select(table)) as unknown[] | null) ?? [];
  }
  return JSON.parse(JSON.stringify(out)) as BracketData;
}

/**
 * Create a fresh double-elimination stage from paired teams and return the
 * dataset to persist. Names must be unique (we use team names as participants);
 * callers should guarantee that.
 */
export async function createBracket(
  teams: SeedTeam[],
  tournamentName: string,
): Promise<BracketData> {
  const { db, manager } = hydrate(null);
  await manager.create.stage({
    tournamentId: TOURNAMENT_ID,
    name: tournamentName,
    type: "double_elimination",
    seeding: buildSeeding(teams),
    settings: {
      // Our `buildSeeding` already arranges teams into standard bracket slots
      // with byes on the top seeds, so we keep the order verbatim (`natural`)
      // and must NOT enable `balanceByes` — it would redistribute the byes.
      seedOrdering: ["natural"],
      grandFinal: "double", // allow a bracket reset if the LB team wins game 1
    },
  });
  return await dump(db);
}

/**
 * Report a single match result and return the updated dataset. The winner
 * advances in the winners bracket, the loser drops to the losers bracket, and
 * the grand final (with reset) is handled by the engine.
 */
export async function reportMatch(
  data: BracketData,
  matchId: number,
  score1: number,
  score2: number,
): Promise<BracketData> {
  const { db, manager } = hydrate(data);
  // brackets-manager infers the loser from the winner's `result`.
  if (score1 === score2) {
    await manager.update.match({
      id: matchId,
      opponent1: { score: score1, result: "draw" },
      opponent2: { score: score2, result: "draw" },
    });
  } else if (score1 > score2) {
    await manager.update.match({
      id: matchId,
      opponent1: { score: score1, result: "win" },
      opponent2: { score: score2 },
    });
  } else {
    await manager.update.match({
      id: matchId,
      opponent1: { score: score1 },
      opponent2: { score: score2, result: "win" },
    });
  }
  return await dump(db);
}

/** Undo a reported result (e.g. a typo), returning the updated dataset. */
export async function resetMatch(
  data: BracketData,
  matchId: number,
): Promise<BracketData> {
  const { db, manager } = hydrate(data);
  await manager.reset.matchResults(matchId);
  return await dump(db);
}

export interface FinalStanding {
  rank: number;
  name: string;
}

/** Final standings, available once the grand final is complete. */
export async function getStandings(
  data: BracketData,
): Promise<FinalStanding[]> {
  const { manager } = hydrate(data);
  try {
    const standings = await manager.get.finalStandings(STAGE_ID);
    return standings.map((s) => ({ rank: s.rank, name: s.name }));
  } catch {
    // finalStandings throws until the bracket is complete.
    return [];
  }
}

// --- Read helpers for the admin score-reporting UI --------------------------
//
// These read the raw dataset directly (no manager needed) to produce a flat,
// display-friendly match list. Kept in this module so the brackets-manager
// data shapes stay in one place.

const BRACKET_LABEL: Record<number, string> = {
  [GROUP.WINNERS]: "Winners",
  [GROUP.LOSERS]: "Losers",
  [GROUP.GRAND_FINAL]: "Grand Final",
};

// Display order for the flattened match list.
const BRACKET_ORDER: Record<string, number> = {
  Winners: 0,
  Losers: 1,
  "Grand Final": 2,
};

interface RawParticipant {
  id: number;
  name: string;
}
interface RawGroup {
  id: number;
  number: number;
}
interface RawRound {
  id: number;
  number: number;
  group_id: number;
}
interface RawOpponent {
  id: number | null;
  score?: number;
  result?: "win" | "loss" | "draw";
}
interface RawMatch {
  id: number;
  status: number;
  round_id: number;
  group_id: number;
  number: number;
  opponent1: RawOpponent | null;
  opponent2: RawOpponent | null;
}

export interface MatchSide {
  name: string | null; // null = bye / not yet decided
  score: number | null;
  isWinner: boolean;
}

export interface AdminMatch {
  id: number;
  bracket: string; // "Winners" | "Losers" | "Grand Final"
  round: number;
  order: number;
  opponent1: MatchSide;
  opponent2: MatchSide;
  status: number;
  /** Both sides are real teams and the match isn't already archived. */
  reportable: boolean;
  completed: boolean;
  /** Series format: BO3 everywhere, BO5 for the grand final. */
  format: "BO3" | "BO5";
}

function side(op: RawOpponent | null, names: Map<number, string>): MatchSide {
  if (!op || op.id == null) {
    return { name: null, score: null, isWinner: false };
  }
  return {
    name: names.get(op.id) ?? `#${op.id}`,
    score: op.score ?? null,
    isWinner: op.result === "win",
  };
}

/** Flatten the dataset into an ordered, display-ready match list. */
export function listMatches(data: BracketData): AdminMatch[] {
  const names = new Map<number, string>(
    (data.participant as RawParticipant[]).map((p) => [p.id, p.name]),
  );
  const groupNumber = new Map<number, number>(
    (data.group as RawGroup[]).map((g) => [g.id, g.number]),
  );
  const roundNumber = new Map<number, number>(
    (data.round as RawRound[]).map((r) => [r.id, r.number]),
  );

  return (data.match as RawMatch[])
    .map((m) => {
      const o1 = side(m.opponent1, names);
      const o2 = side(m.opponent2, names);
      const bothReal = o1.name != null && o2.name != null;
      const grandFinal = groupNumber.get(m.group_id) === GROUP.GRAND_FINAL;
      return {
        id: m.id,
        bracket: BRACKET_LABEL[groupNumber.get(m.group_id) ?? 0] ?? "Bracket",
        round: roundNumber.get(m.round_id) ?? 0,
        order: m.number,
        opponent1: o1,
        opponent2: o2,
        status: m.status,
        reportable: bothReal && m.status !== STATUS.ARCHIVED,
        completed: m.status === STATUS.COMPLETED,
        format: grandFinal ? "BO5" : "BO3",
      } satisfies AdminMatch;
    })
    .sort((a, b) => {
      // Group order: Winners, Losers, Grand Final — then round, then match no.
      const bg = (BRACKET_ORDER[a.bracket] ?? 9) - (BRACKET_ORDER[b.bracket] ?? 9);
      if (bg !== 0) return bg;
      if (a.round !== b.round) return a.round - b.round;
      return a.order - b.order;
    });
}

/**
 * Series format for a match, derived from its group. Grand final (incl. the
 * bracket-reset match) is BO5; everything else is BO3.
 */
export function getMatchFormat(
  data: BracketData,
  matchId: number,
): "BO3" | "BO5" {
  const match = (data.match as RawMatch[]).find((m) => m.id === matchId);
  if (!match) return "BO3";
  const group = (data.group as RawGroup[]).find((g) => g.id === match.group_id);
  return group?.number === GROUP.GRAND_FINAL ? "BO5" : "BO3";
}

/**
 * Validate an aggregate BO3/BO5 score. Returns an error message or `null` if
 * the score is a valid series win (winner must have exactly the series target
 * games; draws are impossible in a best-of).
 */
export function validateSeriesScore(
  format: "BO3" | "BO5",
  score1: number,
  score2: number,
): string | null {
  const target = format === "BO5" ? 3 : 2;
  if (score1 === score2) {
    return `A ${format} match can't end in a draw.`;
  }
  const winner = Math.max(score1, score2);
  if (winner !== target) {
    return `${format} matches are won by the first team to ${target} games (e.g. ${target}-0 or ${target}-${target - 1}).`;
  }
  return null;
}


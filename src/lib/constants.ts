// Shared constants for the Valorant 2v2 skirmish.
// Used by the registration form (dropdowns), the API validation (Zod), and the
// rank-balanced pairing algorithm.

/**
 * Valorant rank -> numeric strength, used to build balanced teams.
 * Iron 1 = 1 ... Radiant = 25.
 */
export const RANKS = [
  "Iron 1",
  "Iron 2",
  "Iron 3",
  "Bronze 1",
  "Bronze 2",
  "Bronze 3",
  "Silver 1",
  "Silver 2",
  "Silver 3",
  "Gold 1",
  "Gold 2",
  "Gold 3",
  "Platinum 1",
  "Platinum 2",
  "Platinum 3",
  "Diamond 1",
  "Diamond 2",
  "Diamond 3",
  "Ascendant 1",
  "Ascendant 2",
  "Ascendant 3",
  "Immortal 1",
  "Immortal 2",
  "Immortal 3",
  "Radiant",
] as const;

export type Rank = (typeof RANKS)[number];

/** Map a rank label to its 1-25 strength value. */
export const RANK_VALUE: Record<Rank, number> = RANKS.reduce(
  (acc, rank, i) => {
    acc[rank] = i + 1;
    return acc;
  },
  {} as Record<Rank, number>,
);

/** Safe lookup — returns 0 for an unknown label. */
export function rankToValue(rank: string): number {
  return (RANK_VALUE as Record<string, number>)[rank] ?? 0;
}

/** Regions / servers players can pick. */
export const REGIONS = [
  "NA",
  "EU",
  "APAC",
  "KR",
  "BR",
  "LATAM",
  "ME",
] as const;

export type Region = (typeof REGIONS)[number];

/** Agent role preference. */
export const ROLES = [
  "Duelist",
  "Initiator",
  "Controller",
  "Sentinel",
  "Flex / No preference",
] as const;

export type Role = (typeof ROLES)[number];

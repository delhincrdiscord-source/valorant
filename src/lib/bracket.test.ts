import { describe, it, expect } from "vitest";
import {
  createBracket,
  reportMatch,
  resetMatch,
  listMatches,
  getStandings,
  getMatchFormat,
  validateSeriesScore,
  type SeedTeam,
  type BracketData,
} from "./bracket";

function teams(n: number): SeedTeam[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1,
  }));
}

describe("createBracket", () => {
  it("gives byes to the top seeds for a non-power-of-two count", async () => {
    const data = await createBracket(teams(6), "Cup");
    const wbR1 = listMatches(data).filter(
      (m) => m.bracket === "Winners" && m.round === 1,
    );
    // 6 teams → 8 slots → 2 byes, and they must land on the strongest seeds.
    const byes = wbR1.filter(
      (m) => m.opponent1.name === null || m.opponent2.name === null,
    );
    expect(byes).toHaveLength(2);
    const teamWithBye = byes.map((m) => m.opponent1.name ?? m.opponent2.name);
    expect(teamWithBye).toContain("Team 1");
    expect(teamWithBye).toContain("Team 2");
  });

  it("produces a valid double-elimination structure", async () => {
    const data = await createBracket(teams(8), "Cup");
    const ms = listMatches(data);
    expect(ms.some((m) => m.bracket === "Winners")).toBe(true);
    expect(ms.some((m) => m.bracket === "Losers")).toBe(true);
    expect(ms.some((m) => m.bracket === "Grand Final")).toBe(true);
  });
});

describe("reportMatch", () => {
  it("advances the winner and survives a JSON roundtrip", async () => {
    let data = await createBracket(teams(4), "Cup");
    // Roundtrip through JSON like the Postgres JSONB column would.
    data = JSON.parse(JSON.stringify(data));

    const first = listMatches(data).find((m) => m.reportable && !m.completed)!;
    expect(first).toBeDefined();

    data = await reportMatch(data, first.id, 13, 7);
    const after = listMatches(data).find((m) => m.id === first.id)!;
    expect(after.completed).toBe(true);
    expect(after.opponent1.isWinner).toBe(true);
    expect(after.opponent1.score).toBe(13);
    expect(after.opponent2.score).toBe(7);
  });

  it("plays a full 6-team event through to final standings", async () => {
    let data = await createBracket(teams(6), "Cup");

    let guard = 0;
    while (guard++ < 60) {
      const next = listMatches(data).find((m) => m.reportable && !m.completed);
      if (!next) break;
      // Lower seed number (stronger) wins.
      const s1 = Number(next.opponent1.name?.replace("Team ", "") ?? 99);
      const s2 = Number(next.opponent2.name?.replace("Team ", "") ?? 99);
      data = await reportMatch(data, next.id, s1 < s2 ? 13 : 6, s1 < s2 ? 6 : 13);
    }

    const standings = await getStandings(data);
    expect(standings.length).toBeGreaterThan(0);
    // The overall winner should be rank 1.
    expect(standings[0].rank).toBe(1);
  });
});

describe("resetMatch", () => {
  it("undoes a reported result", async () => {
    let data = await createBracket(teams(4), "Cup");
    const first = listMatches(data).find((m) => m.reportable && !m.completed)!;
    data = await reportMatch(data, first.id, 13, 5);
    expect(listMatches(data).find((m) => m.id === first.id)!.completed).toBe(
      true,
    );

    data = await resetMatch(data, first.id);
    expect(listMatches(data).find((m) => m.id === first.id)!.completed).toBe(
      false,
    );
  });
});

describe("getMatchFormat", () => {
  function dataWithGroups(): BracketData {
    return {
      participant: [],
      stage: [],
      group: [
        { id: 1, number: 1 }, // winners
        { id: 2, number: 2 }, // losers
        { id: 3, number: 3 }, // grand final
      ],
      round: [],
      match: [
        { id: 10, group_id: 1, round_id: 1, number: 1, status: 2, opponent1: null, opponent2: null },
        { id: 11, group_id: 2, round_id: 2, number: 1, status: 2, opponent1: null, opponent2: null },
        { id: 12, group_id: 3, round_id: 3, number: 1, status: 2, opponent1: null, opponent2: null },
      ],
      match_game: [],
    };
  }

  it("labels regular matches BO3 and grand final matches BO5", () => {
    const data = dataWithGroups();
    expect(getMatchFormat(data, 10)).toBe("BO3");
    expect(getMatchFormat(data, 11)).toBe("BO3");
    expect(getMatchFormat(data, 12)).toBe("BO5");
  });

  it("defaults unknown matches to BO3", () => {
    expect(getMatchFormat(dataWithGroups(), 999)).toBe("BO3");
  });
});

describe("validateSeriesScore", () => {
  it("accepts valid BO3 results", () => {
    expect(validateSeriesScore("BO3", 2, 0)).toBeNull();
    expect(validateSeriesScore("BO3", 2, 1)).toBeNull();
    expect(validateSeriesScore("BO3", 0, 2)).toBeNull();
    expect(validateSeriesScore("BO3", 1, 2)).toBeNull();
  });

  it("rejects BO3 draws and wrong thresholds", () => {
    expect(validateSeriesScore("BO3", 1, 1)).not.toBeNull();
    expect(validateSeriesScore("BO3", 3, 0)).not.toBeNull();
    expect(validateSeriesScore("BO3", 2, 2)).not.toBeNull();
  });

  it("accepts valid BO5 results", () => {
    expect(validateSeriesScore("BO5", 3, 0)).toBeNull();
    expect(validateSeriesScore("BO5", 3, 1)).toBeNull();
    expect(validateSeriesScore("BO5", 3, 2)).toBeNull();
    expect(validateSeriesScore("BO5", 2, 3)).toBeNull();
  });

  it("rejects BO5 draws and wrong thresholds", () => {
    expect(validateSeriesScore("BO5", 2, 2)).not.toBeNull();
    expect(validateSeriesScore("BO5", 4, 1)).not.toBeNull();
    expect(validateSeriesScore("BO5", 2, 1)).not.toBeNull();
  });
});

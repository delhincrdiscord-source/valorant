import { describe, it, expect } from "vitest";
import { duoRegistrationSchema } from "./validation";

const VALID_PLAYER = {
  discordUsername: "player1",
  discordUserId: "123456789012345678",
  riotId: "Phoenix#NA1",
  currentRank: "Gold 2",
  peakRank: "Gold 3",
  region: "NA",
  agentRole: "Duelist",
};

const VALID = {
  player1: VALID_PLAYER,
  player2: {
    ...VALID_PLAYER,
    discordUsername: "player2",
    discordUserId: "234567890123456789",
    riotId: "Jett#EU2",
  },
  rulesAgreed: true,
  website: "",
};

describe("duoRegistrationSchema", () => {
  it("accepts a valid duo with distinct players", () => {
    expect(duoRegistrationSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects the same Riot ID in both players, case-insensitively", () => {
    const result = duoRegistrationSchema.safeParse({
      ...VALID,
      player2: { ...VALID.player2, riotId: "phoenix#na1" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain("Riot ID");
    }
  });

  it("rejects the same Discord user ID in both players", () => {
    const result = duoRegistrationSchema.safeParse({
      ...VALID,
      player2: {
        ...VALID.player2,
        discordUserId: "123456789012345678",
        riotId: "Jett#EU2",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a peak rank below the current rank for a player", () => {
    const result = duoRegistrationSchema.safeParse({
      ...VALID,
      player1: { ...VALID.player1, currentRank: "Immortal 1", peakRank: "Gold 3" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed Discord user ID", () => {
    const result = duoRegistrationSchema.safeParse({
      ...VALID,
      player2: {
        ...VALID.player2,
        discordUserId: "<script>alert(1)</script>",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a team name containing newlines/control chars", () => {
    const result = duoRegistrationSchema.safeParse({
      ...VALID,
      teamName: "Sk\r\nipt Team",
    });
    expect(result.success).toBe(false);
  });

  it("allows a blank or absent team name (falls back to auto name)", () => {
    expect(duoRegistrationSchema.safeParse(VALID).success).toBe(true);
    expect(
      duoRegistrationSchema.safeParse({ ...VALID, teamName: "" }).success,
    ).toBe(true);
  });

  it("requires rulesAgreed to be true", () => {
    const result = duoRegistrationSchema.safeParse({
      ...VALID,
      rulesAgreed: false,
    });
    expect(result.success).toBe(false);
  });
});

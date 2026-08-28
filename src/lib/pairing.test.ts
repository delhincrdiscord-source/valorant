import { describe, it, expect } from "vitest";
import { teamName } from "./pairing";

describe("teamName", () => {
  it("builds a name from the Riot handle portions", () => {
    expect(teamName("Player0#NA1", "Player1#NA1")).toBe("Player0 + Player1");
  });

  it("falls back to the raw input when there is no tag", () => {
    expect(teamName("Raze", "Breach")).toBe("Raze + Breach");
  });
});

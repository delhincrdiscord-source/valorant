// Shared validation for duo registration — used by the client form (React Hook
// Form resolver) and the server route handler so rules can't be bypassed.
import { z } from "zod";
import { RANKS, REGIONS, ROLES, rankToValue } from "./constants";

// Riot ID format: "GameName#TAG" — 3-16 char name, 3-5 char tag.
// Riot allows a fairly wide range of unicode in names; keep it permissive but
// bounded, and require the #TAG shape.
const RIOT_ID = /^.{3,16}#[A-Za-z0-9]{3,5}$/;

// No control characters / newlines — player input may end up in team names,
// CSV exports, bracket participant names, and Discord embeds.
const NO_CONTROL_CHARS = /^[^\u0000-\u001f\u007f]*$/;

/** The per-player fields, reused for Player 1 and Player 2. */
const playerFieldsSchema = z
  .object({
    discordUsername: z
      .string()
      .trim()
      .min(2, "Discord username is too short")
      .max(37, "Discord username is too long") // new-style names max 32; allow legacy name#0000
      .regex(
        /^[^\s@#:]{2,32}(#[0-9]{4})?$/,
        "Enter a Discord username (e.g. player or Player#1234)",
      ),
    discordUserId: z
      .string()
      .trim()
      .regex(/^\d{17,20}$/, "Enter a Discord user ID (17-20 digits)"),
    riotId: z
      .string()
      .trim()
      .regex(RIOT_ID, "Riot ID must look like Name#TAG (e.g. Phoenix#NA1)"),
    currentRank: z.enum(RANKS, {
      errorMap: () => ({ message: "Select a current rank" }),
    }),
    peakRank: z.enum(RANKS, {
      errorMap: () => ({ message: "Select a peak rank" }),
    }),
    region: z.enum(REGIONS, {
      errorMap: () => ({ message: "Select a region" }),
    }),
    agentRole: z.enum(ROLES, {
      errorMap: () => ({ message: "Select a role preference" }),
    }),
  })
  .refine((d) => rankToValue(d.peakRank) >= rankToValue(d.currentRank), {
    message: "Peak rank can't be lower than current rank",
    path: ["peakRank"],
  });

export type PlayerFields = z.infer<typeof playerFieldsSchema>;

export const duoRegistrationSchema = z
  .object({
    player1: playerFieldsSchema,
    player2: playerFieldsSchema,
    // Optional — falls back to an auto name ("Handle1 + Handle2") if blank.
    teamName: z
      .string()
      .trim()
      .max(32, "Team name must be 32 characters or fewer")
      .regex(NO_CONTROL_CHARS, "Team name contains invalid characters")
      .optional(),
    rulesAgreed: z.literal(true, {
      errorMap: () => ({ message: "You must agree to the rules" }),
    }),
    // Honeypot — must stay empty. Real users never see this field.
    website: z.string().max(0).optional(),
  })
  .refine(
    (d) => d.player1.riotId.toLowerCase() !== d.player2.riotId.toLowerCase(),
    {
      message: "Both players can't have the same Riot ID",
      path: ["player2", "riotId"],
    },
  )
  .refine(
    (d) => d.player1.discordUserId !== d.player2.discordUserId,
    {
      message: "Both players can't have the same Discord user ID",
      path: ["player2", "discordUserId"],
    },
  );

export type DuoRegistrationInput = z.infer<typeof duoRegistrationSchema>;

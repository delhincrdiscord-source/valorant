// Dev/ops utility: wipe all event data back to a clean, ready-to-run state.
//
//   npm run db:reset
//
// Deletes every player + team, clears the bracket, and resets the toggles to
// their defaults (registration OPEN, nothing published). Keeps the singleton
// Setting/Tournament rows. Run this before your real event if you've been
// testing with sample data.
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    // Detach players from teams first so the FK is clear, then delete both.
    prisma.player.updateMany({ data: { teamId: null, status: "registered" } }),
    prisma.team.deleteMany({}),
    prisma.player.deleteMany({}),
    prisma.tournament.update({
      where: { id: "main" },
      data: { status: "pending", data: Prisma.DbNull },
    }),
    prisma.setting.update({
      where: { id: "global" },
      data: {
        registrationOpen: true,
        pairingsPublished: false,
        bracketPublished: false,
      },
    }),
  ]);
  console.log("Reset complete: no players/teams, no bracket, registration open.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

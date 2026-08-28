// Seed the singleton Setting row. Idempotent — safe to run repeatedly.
// Run with: npm run db:seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const setting = await prisma.setting.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      tournamentName: "Valorant 2v2 Skirmish",
      registrationOpen: true,
      pairingsPublished: false,
      bracketPublished: false,
    },
  });

  const tournament = await prisma.tournament.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main", name: "Valorant 2v2 Skirmish", status: "pending" },
  });

  console.log("Seeded Setting:", setting.id, "| Tournament:", tournament.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

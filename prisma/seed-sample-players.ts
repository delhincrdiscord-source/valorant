// Dev utility: insert sample players grouped into duo teams so you can
// smoke-test the bracket without hand-entering registrations.
//
//   npm run db:seed:players
//
// Idempotent — re-running skips players whose Riot ID already exists.
// Safe to delete before a real event (or just clear players/teams from /admin).
import { PrismaClient } from "@prisma/client";
import { rankToValue } from "../src/lib/constants";

const prisma = new PrismaClient();

// [discordUsername, discordUserId, riotId, currentRank, peakRank, region, role]
type SamplePlayer = [string, string, string, string, string, string, string];

// Six teams, two players each.
const SAMPLE: SamplePlayer[] = [
  ["phoenixmain", "111111111111111111", "Phoenix#NA1", "Radiant", "Radiant", "NA", "Duelist"],
  ["jettdiff", "222222222222222222", "Jett#EU2", "Immortal 3", "Radiant", "EU", "Duelist"],
  ["sagewall", "333333333333333333", "Sage#NA3", "Ascendant 1", "Immortal 1", "NA", "Sentinel"],
  ["omensmoke", "444444444444444444", "Omen#APAC", "Diamond 2", "Ascendant 2", "APAC", "Controller"],
  ["sovadart", "555555555555555555", "Sova#KR11", "Platinum 1", "Diamond 1", "KR", "Initiator"],
  ["reynadismiss", "666666666666666666", "Reyna#BR22", "Gold 3", "Platinum 2", "BR", "Duelist"],
  ["kjturret", "777777777777777777", "Killjoy#EU5", "Silver 2", "Gold 1", "EU", "Sentinel"],
  ["cyphercam", "888888888888888888", "Cypher#NA9", "Bronze 3", "Silver 3", "NA", "Sentinel"],
  ["breachflash", "999999999999999999", "Breach#LAT", "Iron 3", "Bronze 2", "LATAM", "Initiator"],
  ["astragrav", "121212121212121212", "Astra#ME1", "Immortal 1", "Immortal 2", "ME", "Controller"],
  ["neonrun", "232323232323232323", "Neon#AP3", "Diamond 3", "Ascendant 3", "APAC", "Duelist"],
  ["skyebird", "343434343434343434", "Skye#EU7", "Gold 1", "Gold 3", "EU", "Initiator"],
];

const TEAM_NAMES = [
  "Top Shelf",
  "Wall of Sages",
  "Dart & Smoke",
  "Reina of Fire",
  "Iron to Bronze",
  "Neon Overdrive",
];

const PLAYER = (p: SamplePlayer) => ({
  discordUsername: p[0],
  discordUserId: p[1],
  riotId: p[2],
  riotIdKey: p[2].toLowerCase(),
  currentRank: p[3],
  peakRank: p[4],
  region: p[5],
  agentRole: p[6],
  rulesAgreed: true,
  rankValue: rankToValue(p[3]),
  peakRankValue: rankToValue(p[4]),
  status: "paired",
});

async function main() {
  const existing = await prisma.player.count();
  if (existing > 0) {
    console.log(`Skipping: ${existing} players already in the database.`);
    return;
  }

  for (let i = 0; i < SAMPLE.length; i += 2) {
    const a = SAMPLE[i];
    const b = SAMPLE[i + 1];
    await prisma.team.create({
      data: {
        name: TEAM_NAMES[i / 2],
        combinedRankValue: rankToValue(a[3]) + rankToValue(b[3]),
        players: { create: [PLAYER(a), PLAYER(b)] },
      },
    });
  }

  const teams = await prisma.team.count();
  const total = await prisma.player.count();
  console.log(`Seeded ${teams} sample teams (${total} players).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

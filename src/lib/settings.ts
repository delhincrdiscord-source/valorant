// Helpers for the singleton Setting row (id = "global").
import { prisma } from "./prisma";

export async function getSettings() {
  return prisma.setting.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });
}

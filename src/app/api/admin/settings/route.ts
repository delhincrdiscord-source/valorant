import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const patchSchema = z.object({
  registrationOpen: z.boolean().optional(),
  pairingsPublished: z.boolean().optional(),
  bracketPublished: z.boolean().optional(),
  tournamentName: z.string().trim().min(1).max(80).optional(),
});

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings." }, { status: 422 });
  }

  await getSettings(); // ensure the row exists
  const updated = await prisma.setting.update({
    where: { id: "global" },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

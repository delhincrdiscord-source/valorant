import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Delete a registration (spam / duplicate / withdrawal). Deleting one member
// of a team removes the whole team so we never leave a 1-player squad behind.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const player = await prisma.player.findUnique({
      where: { id },
      select: { teamId: true },
    });
    if (!player) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }

    if (player.teamId) {
      await prisma.$transaction([
        prisma.player.deleteMany({ where: { teamId: player.teamId } }),
        prisma.team.delete({ where: { id: player.teamId } }),
      ]);
    } else {
      await prisma.player.delete({ where: { id } });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }
}

import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getSession } from "@/lib/session";

// Constant-time compare of two secrets (hash to fixed length first so we never
// leak length information via the comparison).
function secretsMatch(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(req: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: "Admin password is not configured on the server." },
      { status: 500 },
    );
  }

  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const submitted = typeof body.password === "string" ? body.password : "";
  if (!submitted || !secretsMatch(submitted, adminPassword)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const session = await getSession();
  session.isAdmin = true;
  session.loginAt = Date.now();
  await session.save();

  return NextResponse.json({ ok: true });
}

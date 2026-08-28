import type { SessionOptions } from "iron-session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  isAdmin?: boolean;
  loginAt?: number;
}

const password = process.env.SESSION_SECRET;
if (!password || password.length < 32) {
  // Fail loud in dev; in prod the deploy env must set this.
  console.warn(
    "SESSION_SECRET is missing or shorter than 32 chars — admin sessions will not be secure.",
  );
}

export const sessionOptions: SessionOptions = {
  password: password ?? "insecure-dev-only-secret-change-me-please-32chars",
  cookieName: "val_admin_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

/** Session bound to the Next.js cookie store (route handlers / server components). */
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

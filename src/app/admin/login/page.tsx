"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Login failed.");
        setLoading(false);
        return;
      }
      const target = from.startsWith("/admin") ? from : "/admin";
      window.location.href = target;
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="heading text-2xl text-val-light">Organizer login</h1>
      <p className="mt-1 text-sm text-val-muted">
        Enter the admin password to manage the tournament.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-val-light">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-val-navy-light bg-val-darker px-3 py-2 text-val-light focus:border-val-teal focus:outline-none"
          />
        </div>
        {error && (
          <div className="rounded border border-val-red/50 bg-val-red/10 px-3 py-2 text-sm text-val-red">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="heading w-full rounded bg-val-red px-4 py-2 text-white hover:bg-val-red-dark disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

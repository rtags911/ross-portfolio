"use client";

import { useActionState } from "react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";

import { login, type LoginState } from "../actions";

export default function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });

  return (
    <div className="admin-root flex min-h-svh items-center justify-center bg-black px-4 text-white">
      <form action={action} className="w-full max-w-sm space-y-5 rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <div>
          <h1 className="font-anton text-2xl tracking-wide">Admin</h1>
          <p className="mt-1 text-sm text-white/60">Enter your admin password to edit the site.</p>
        </div>

        {!configured && (
          <p className="rounded border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
            No password is set yet. Add <code>ADMIN_PASSWORD=your-password</code> (8+ characters) to{" "}
            <code>.env.local</code> in the project folder, then restart <code>npm run dev</code>.
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-white/80">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "login-error" : undefined}
          />
          {state.error && (
            <p id="login-error" role="alert" className="text-sm text-red-300">
              {state.error}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Checking…" : "Log in"}
        </Button>
      </form>
    </div>
  );
}

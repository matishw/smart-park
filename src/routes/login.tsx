import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CircleParking, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import ta9Icon from "@/assets/ta9.svg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Parking Registration" },
      {
        name: "description",
        content: "Sign in with your username and password to register or release a parking space.",
      },
      { property: "og:title", content: "Sign In — Parking Registration" },
      {
        property: "og:description",
        content: "Username and password sign in for the parking registration app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const usernameError =
    username.trim().length === 0
      ? "Username is required."
      : username.trim().length < 4
        ? "Username must be at least 4 characters."
        : null;
  const passwordError =
    password.length === 0
      ? "Password is required."
      : password.length < 4
        ? "Password must be at least 4 characters."
        : null;
  const valid = !usernameError && !passwordError;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username: username.trim(), password }),
      });
      const data = (await res.json()) as {
        success: boolean;
        message?: string;
        access_token?: string;
        refresh_token?: string;
      };
      if (!data.success || !data.access_token || !data.refresh_token) {
        toast.error(data.message ?? "Incorrect username or password.");
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (error) {
        toast.error("Could not start your session. Please try again.");
        return;
      }
      toast.success("Signed in successfully.");
      void navigate({ to: "/" });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mx-auto flex items-center justify-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
            <CircleParking className="size-8" />
          </div>
          <img src={ta9Icon} alt="TA9 logo" className="h-9 w-auto" />
        </div>
        <h1 className="mt-5 text-center text-3xl font-bold tracking-tight text-foreground">
          Sign in
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Use your username and password.
        </p>

        <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched(true)}
              className="h-11 rounded-xl"
            />
            {touched && usernameError && (
              <p className="text-xs font-medium text-destructive">{usernameError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(true)}
                className="h-11 rounded-xl pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {touched && passwordError && (
              <p className="text-xs font-medium text-destructive">{passwordError}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !valid}
            className="h-12 w-full rounded-xl text-base"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="font-semibold text-primary-strong underline">
            Sign up
          </Link>
        </p>

        <Link
          to="/"
          className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Google sign in
        </Link>
      </div>
    </main>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CircleParking, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ta9Icon from "@/assets/ta9.svg";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — Parking Registration" },
      {
        name: "description",
        content: "Create a parking registration account with your email, name, username and password.",
      },
      { property: "og:title", content: "Create Account — Parking Registration" },
      {
        property: "og:description",
        content: "Sign up to register and release parking spaces.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const errors = {
    email: !form.email.trim()
      ? "Email is required."
      : !emailOk(form.email.trim())
        ? "Enter a valid email address."
        : null,
    firstName: !form.firstName.trim() ? "First name is required." : null,
    lastName: !form.lastName.trim() ? "Last name is required." : null,
    username: !form.username.trim()
      ? "Username is required."
      : form.username.trim().length < 4
        ? "Username must be at least 4 characters."
        : null,
    password: !form.password
      ? "Password is required."
      : form.password.length < 4
        ? "Password must be at least 4 characters."
        : null,
  };
  const valid = Object.values(errors).every((e) => e === null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signup",
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          username: form.username.trim(),
          password: form.password,
        }),
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (!data.success) {
        toast.error(data.message ?? "Could not create your account.");
        return;
      }
      toast.success("Account created successfully.", {
        description: "You can now sign in with your username and password.",
      });
      void navigate({ to: "/login" });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const field = (
    id: keyof typeof form,
    label: string,
    type = "text",
    autoComplete?: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={form[id]}
        onChange={set(id)}
        onBlur={() => setTouched(true)}
        className="h-11 rounded-xl"
      />
      {touched && errors[id] && (
        <p className="text-xs font-medium text-destructive">{errors[id]}</p>
      )}
    </div>
  );

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
          Create account
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          All fields are required.
        </p>

        <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4" noValidate>
          {field("email", "Email", "email", "email")}
          {field("firstName", "First name", "text", "given-name")}
          {field("lastName", "Last name", "text", "family-name")}
          {field("username", "Username", "text", "username")}

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={set("password")}
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
            {touched && errors.password && (
              <p className="text-xs font-medium text-destructive">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !valid}
            className="h-12 w-full rounded-xl text-base"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : "Sign up"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary-strong underline">
            Sign in
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

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, CircleParking, LogOut } from "lucide-react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

type Space = {
  space: number;
  occupied: boolean;
  name: string | null;
  mine: boolean;
};

const TOTAL = 6;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Parking Registration — Claim Your Space" },
      {
        name: "description",
        content:
          "Sign in with Google and register the parking space you parked in. Live availability of all six spaces, reset daily at 20:00.",
      },
      { property: "og:title", content: "Parking Registration — Claim Your Space" },
      {
        property: "og:description",
        content: "See which parking spaces are free and register yours in one tap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState<number | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const res = await fetch("/api/parking", {
          headers: { Accept: "application/json", ...(await authHeaders()) },
        });
        const data = (await res.json()) as { spaces?: Space[]; isAdmin?: boolean };
        setSpaces(data.spaces ?? []);
        setIsAdmin(!!data.isAdmin);
      } catch {
        toast.error("Could not load parking spaces.");
      } finally {
        setLoading(false);
      }
    },
    [authHeaders],
  );

  useEffect(() => {
    if (!authReady || !session) return;
    void load(true);
    const id = setInterval(() => void load(), 10000);
    return () => clearInterval(id);
  }, [load, authReady, session]);

  const signIn = async () => {
    setSigningIn(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setSigningIn(false);
      toast.error("Could not sign in with Google.");
      return;
    }
    if (result.redirected) return;
    setSigningIn(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSpaces(null);
  };

  const confirm = async () => {
    if (pending == null) return;
    setSaving(true);
    try {
      const res = await fetch("/api/parking", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ space: pending }),
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) {
        toast.success("Parking space successfully registered.", {
          description: `Space ${pending} is now yours for today.`,
        });
      } else {
        toast.error(data.message ?? "This parking space has already been taken.", {
          description: "Please choose another parking space.",
        });
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
      setPending(null);
      void load();
    }
  };

  const release = async (space: number) => {
    setReleasing(space);
    try {
      const res = await fetch("/api/parking", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) {
        toast.success(`Space ${space} released.`, {
          description: "It is now available for everyone.",
        });
      } else {
        toast.error(data.message ?? "Could not release your space.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setReleasing(null);
      void load();
    }
  };

  const resetAll = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/parking?all=1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) {
        toast.success("All parking spaces are available again.");
      } else {
        toast.error(data.message ?? "Could not reset parking spaces.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setResetting(false);
      void load();
    }
  };

  const mySpace = spaces?.find((s) => s.mine)?.space ?? null;
  const meta = (session?.user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (typeof meta["full_name"] === "string" && meta["full_name"]) ||
    (typeof meta["name"] === "string" && meta["name"]) ||
    session?.user.email ||
    "";

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
            <CircleParking className="size-8" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
            Parking Registration
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with Google to register or release your parking space.
          </p>
          <Button
            onClick={() => void signIn()}
            disabled={signingIn}
            className="mt-8 h-12 w-full rounded-xl text-base"
          >
            {signingIn ? <Loader2 className="size-5 animate-spin" /> : "Continue with Google"}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <header className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
            <CircleParking className="size-8" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
            Available Parking Spaces
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tap the space where you parked. Resets every day at 20:00.
          </p>
        </header>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
            className="gap-2 text-muted-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            Available:{" "}
            <span className="text-base font-bold text-primary-strong">
              {spaces ? spaces.filter((s) => !s.occupied).length : "—"} / {TOTAL}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void load(true)}
            className="gap-2 text-primary-strong hover:bg-primary-soft"
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm">Loading parking spaces…</p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4">
            {(spaces ?? []).map((s) =>
              s.mine ? (
                <button
                  key={s.space}
                  onClick={() => void release(s.space)}
                  disabled={releasing === s.space}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-primary bg-primary-soft py-8 shadow-md transition-all active:scale-95 disabled:opacity-60"
                >
                  <span className="text-4xl font-bold tracking-tight text-primary-strong">
                    {s.space}
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-primary-strong">
                    {releasing === s.space ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Yours · tap to release"
                    )}
                  </span>
                </button>
              ) : s.occupied ? (
                <div
                  key={s.space}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-muted py-8 opacity-80"
                >
                  <span className="text-4xl font-bold tracking-tight text-muted-foreground line-through">
                    {s.space}
                  </span>
                  <span className="mt-1 max-w-[90%] truncate text-sm font-medium text-muted-foreground">
                    {s.name || "Occupied"}
                  </span>
                </div>
              ) : (
                <button
                  key={s.space}
                  onClick={() => {
                    if (mySpace != null) {
                      toast.error(`You already registered space ${mySpace}.`, {
                        description: "Tap your space to release it first.",
                      });
                      return;
                    }
                    setPending(s.space);
                  }}
                  disabled={mySpace != null}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-primary/25 bg-primary-soft py-8 shadow-sm transition-all active:scale-95 hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-primary/25 disabled:hover:shadow-sm"
                >
                  <span className="text-4xl font-bold tracking-tight text-primary-strong">
                    {s.space}
                  </span>
                  <span className="mt-1 text-sm font-medium text-primary-strong/70">Available</span>
                </button>
              ),
            )}
          </div>
        )}
      </div>

      <AlertDialog open={pending != null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you parked in space {pending}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark space {pending} as occupied for everyone until today's reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirm();
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Yes, confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

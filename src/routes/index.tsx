import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, CircleParking } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Space = { space: number; occupied: boolean; name: string | null };

const NAME_KEY = "parking:name";

const TOTAL = 6;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Parking Registration — Claim Your Space" },
      {
        name: "description",
        content:
          "Register the parking space you parked in. See live availability of all six spaces, reset daily at 20:00.",
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
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch("/api/parking", { headers: { Accept: "application/json" } });
      const data = (await res.json()) as { spaces?: Space[] };
      setSpaces(data.spaces ?? []);
    } catch {
      toast.error("Could not load parking spaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) ?? "");
  }, []);

  useEffect(() => {
    void load(true);
    const id = setInterval(() => void load(), 10000);
    return () => clearInterval(id);
  }, [load]);

  const confirm = async () => {
    if (pending == null) return;
    setSaving(true);
    try {
      const res = await fetch("/api/parking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space: pending, name: name.trim() }),
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) {
        localStorage.setItem(NAME_KEY, name.trim());
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

        <div className="mt-6 space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-foreground">
            Your name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              localStorage.setItem(NAME_KEY, e.target.value);
            }}
            placeholder="e.g. Dana Levi"
            maxLength={40}
            className="h-12 rounded-xl text-base"
          />
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
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
              s.occupied ? (
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
                    if (!name.trim()) {
                      toast.error("Please enter your name first.");
                      return;
                    }
                    setPending(s.space);
                  }}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-primary/25 bg-primary-soft py-8 shadow-sm transition-all active:scale-95 hover:border-primary hover:shadow-md"
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

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
  const [available, setAvailable] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch("/api/parking", { headers: { Accept: "application/json" } });
      const data = (await res.json()) as { available?: number[] };
      setAvailable(data.available ?? []);
    } catch {
      toast.error("Could not load parking spaces.");
    } finally {
      setLoading(false);
    }
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
        body: JSON.stringify({ space: pending }),
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) {
        toast.success("Parking space successfully registered.", {
          description: `Space ${pending} is now yours for today.`,
        });
      } else {
        toast.error("This parking space has already been taken.", {
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

        <div className="mt-7 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            Available:{" "}
            <span className="text-base font-bold text-primary-strong">
              {available?.length ?? "—"} / {TOTAL}
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
        ) : available && available.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-4">
            {available.map((space) => (
              <button
                key={space}
                onClick={() => setPending(space)}
                className="rounded-2xl border-2 border-primary/25 bg-primary-soft py-9 text-4xl font-bold tracking-tight text-primary-strong shadow-sm transition-all active:scale-95 hover:border-primary hover:shadow-md"
              >
                {space}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-base font-semibold text-foreground">All spaces are taken</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything frees up again at 20:00.
            </p>
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

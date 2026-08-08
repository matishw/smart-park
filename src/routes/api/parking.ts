import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const ALL_SPACES = [126, 127, 155, 212, 217, 239] as const;

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function getClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

type AuthUser = { id: string; name: string; email: string };

const ADMIN_EMAILS = ["matishw@gmail.com"];

async function getUser(request: Request): Promise<AuthUser | null> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await getClient().auth.getUser(token);
  if (error || !data.user) return null;
  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta["full_name"] === "string" && meta["full_name"]) ||
    (typeof meta["name"] === "string" && meta["name"]) ||
    data.user.email ||
    "Unknown";
  return {
    id: data.user.id,
    name: String(name).slice(0, 40),
    email: (data.user.email ?? "").toLowerCase(),
  };
}

export const Route = createFileRoute("/api/parking")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const supabase = await getAdmin();
        const { data, error } = await supabase
          .from("parking_reservations")
          .select("space, name, owner_key");
        if (error) return json({ error: error.message }, 500);
        const user = await getUser(request);
        const ownerKey = user?.id ?? "";
        const rows = data ?? [];
        const occupied = new Map(rows.map((r) => [r.space, r]));
        const mine = ownerKey ? rows.find((r) => r.owner_key === ownerKey) : undefined;
        return json({
          available: ALL_SPACES.filter((s) => !occupied.has(s)),
          mySpace: mine?.space ?? null,
          isAdmin: !!user && ADMIN_EMAILS.includes(user.email),
          spaces: ALL_SPACES.map((s) => ({
            space: s,
            occupied: occupied.has(s),
            name: occupied.get(s)?.name ?? null,
            mine: !!ownerKey && occupied.get(s)?.owner_key === ownerKey,
          })),
        });
      },
      POST: async ({ request }) => {
        const user = await getUser(request);
        if (!user) return json({ success: false, message: "Please sign in with Google." }, 401);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ success: false, message: "Invalid request body." }, 400);
        }
        const space = Number((body as { space?: unknown })?.space);
        if (!Number.isInteger(space) || !ALL_SPACES.includes(space as (typeof ALL_SPACES)[number])) {
          return json({ success: false, message: "Invalid parking space." }, 400);
        }

        const supabase = await getAdmin();

        const { data: existing } = await supabase
          .from("parking_reservations")
          .select("space")
          .eq("owner_key", user.id)
          .maybeSingle();
        if (existing) {
          return json(
            {
              success: false,
              message: `You already registered space ${existing.space}. Release it first.`,
            },
            409,
          );
        }

        // The unique constraint on `space` makes this atomic: only the first
        // concurrent insert succeeds, the rest fail with code 23505.
        const { error } = await supabase
          .from("parking_reservations")
          .insert({ space, name: user.name, owner_key: user.id });
        if (error) {
          if (error.code === "23505") {
            return json(
              {
                success: false,
                message: error.message.includes("owner_key")
                  ? "You already registered a parking space."
                  : "Parking space already occupied.",
              },
              409,
            );
          }
          return json({ success: false, message: error.message }, 500);
        }
        return json({ success: true });
      },
      DELETE: async ({ request }) => {
        const user = await getUser(request);
        if (!user) return json({ success: false, message: "Please sign in with Google." }, 401);

        const supabase = await getAdmin();

        const url = new URL(request.url);
        if (url.searchParams.get("all") === "1") {
          if (!ADMIN_EMAILS.includes(user.email)) {
            return json({ success: false, message: "Not allowed." }, 403);
          }
          const { error: resetError } = await supabase
            .from("parking_reservations")
            .delete()
            .not("id", "is", null);
          if (resetError) return json({ success: false, message: resetError.message }, 500);
          return json({ success: true, reset: true });
        }


        const { data, error } = await supabase
          .from("parking_reservations")
          .delete()
          .eq("owner_key", user.id)
          .select("space");
        if (error) return json({ success: false, message: error.message }, 500);
        if (!data || data.length === 0) {
          return json({ success: false, message: "You have no registered space." }, 404);
        }
        return json({ success: true, space: data[0]!.space });
      },
    },
  },
});

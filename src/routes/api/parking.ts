import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const ALL_SPACES = [126, 127, 155, 212, 217, 239] as const;

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

export const Route = createFileRoute("/api/parking")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = getClient();
        const { data, error } = await supabase.from("parking_reservations").select("space");
        if (error) return json({ error: error.message }, 500);
        const occupied = new Set((data ?? []).map((r) => r.space));
        return json({ available: ALL_SPACES.filter((s) => !occupied.has(s)) });
      },
      POST: async ({ request }) => {
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

        const supabase = getClient();
        // The unique constraint on `space` makes this atomic: only the first
        // concurrent insert succeeds, the rest fail with code 23505.
        const { error } = await supabase.from("parking_reservations").insert({ space });
        if (error) {
          if (error.code === "23505") {
            return json({ success: false, message: "Parking space already occupied." }, 409);
          }
          return json({ success: false, message: error.message }, 500);
        }
        return json({ success: true });
      },
    },
  },
});

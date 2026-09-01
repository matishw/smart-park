import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const Route = createFileRoute("/api/auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ success: false, message: "Invalid request body." }, 400);
        }

        const action = str(body["action"]);
        const username = str(body["username"]).toLowerCase();
        const password = typeof body["password"] === "string" ? body["password"] : "";

        if (username.length < 4 || password.length < 4) {
          return json(
            { success: false, message: "Username and password must be at least 4 characters." },
            400,
          );
        }

        const admin = await getAdmin();

        if (action === "signup") {
          const email = str(body["email"]).toLowerCase();
          const firstName = str(body["firstName"]);
          const lastName = str(body["lastName"]);

          if (!emailOk(email)) return json({ success: false, message: "Invalid email." }, 400);
          if (!firstName || !lastName) {
            return json({ success: false, message: "First and last name are required." }, 400);
          }

          const { data: taken } = await admin
            .from("profiles")
            .select("id")
            .ilike("username", username)
            .maybeSingle();
          if (taken) return json({ success: false, message: "Username is already taken." }, 409);

          const { data: created, error: createError } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: `${firstName} ${lastName}`, username },
          });
          if (createError || !created.user) {
            const msg = createError?.message ?? "Could not create account.";
            return json(
              {
                success: false,
                message: /already/i.test(msg) ? "This email is already registered." : msg,
              },
              400,
            );
          }

          const { error: profileError } = await admin.from("profiles").insert({
            id: created.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
            username,
          });
          if (profileError) {
            await admin.auth.admin.deleteUser(created.user.id);
            return json(
              {
                success: false,
                message:
                  profileError.code === "23505"
                    ? "Username is already taken."
                    : profileError.message,
              },
              409,
            );
          }
          return json({ success: true });
        }

        if (action === "login") {
          const { data: profile } = await admin
            .from("profiles")
            .select("email")
            .ilike("username", username)
            .maybeSingle();
          const invalid = json(
            { success: false, message: "Incorrect username or password." },
            401,
          );
          if (!profile) return invalid;

          const { data, error } = await getClient().auth.signInWithPassword({
            email: profile.email,
            password,
          });
          if (error || !data.session) return invalid;

          return json({
            success: true,
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }

        return json({ success: false, message: "Unknown action." }, 400);
      },
    },
  },
});

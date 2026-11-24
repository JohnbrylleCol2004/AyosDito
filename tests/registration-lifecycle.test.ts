import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { finishRegistration } from "../src/lib/auth/registration-lifecycle.ts";

function signupHarness(automaticSession: boolean) {
  const storage = new Map<string, string>();
  const requests: string[] = [];
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "resident@example.test",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-11-24T00:00:00Z",
  };
  const client = createClient("https://auth.example.test", "test-public-key", {
    auth: {
      flowType: "pkce",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
      storageKey: "registration-test",
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
        removeItem: (key) => {
          storage.delete(key);
        },
      },
    },
    global: {
      fetch: async (input) => {
        const url = String(input);
        requests.push(url);
        if (url.includes("/signup"))
          return Response.json(
            automaticSession
              ? {
                  user,
                  access_token: "test-access-token",
                  refresh_token: "test-refresh-token",
                  token_type: "bearer",
                  expires_in: 3600,
                }
              : user,
          );
        if (url.includes("/logout")) return new Response(null, { status: 204 });
        throw new Error(
          `Unexpected mocked auth request: ${new URL(url).pathname}`,
        );
      },
    },
  });
  return { client, storage, requests };
}

test("email confirmation retains the SDK signup PKCE verifier until callback exchange", async () => {
  const { client, storage, requests } = signupHarness(false);
  const { data, error } = await client.auth.signUp({
    email: "resident@example.test",
    password: "A unique passphrase!",
    options: { emailRedirectTo: "https://ayos.example.test/auth/callback" },
  });
  assert.equal(error, null);
  assert.equal(data.session, null);
  const verifiers = [...storage.entries()].filter(([key]) =>
    key.includes("code-verifier"),
  );
  assert.ok(verifiers.length > 0, "the real SDK stored a signup verifier");
  await finishRegistration(client.auth, data.session);
  for (const [key, value] of verifiers)
    assert.equal(
      storage.get(key),
      value,
      "confirmation still has its original PKCE verifier",
    );
  assert.equal(requests.filter((url) => url.includes("/logout")).length, 0);
});

test("automatic signup sessions are ended once and their SDK credentials are removed", async () => {
  const { client, storage, requests } = signupHarness(true);
  const { data, error } = await client.auth.signUp({
    email: "resident@example.test",
    password: "A unique passphrase!",
  });
  assert.equal(error, null);
  assert.ok(data.session);
  assert.ok(storage.has("registration-test"));
  await finishRegistration(client.auth, data.session);
  assert.equal(requests.filter((url) => url.includes("/logout")).length, 1);
  assert.equal(storage.has("registration-test"), false);
  assert.equal(
    [...storage.keys()].some((key) => key.includes("code-verifier")),
    false,
  );
});

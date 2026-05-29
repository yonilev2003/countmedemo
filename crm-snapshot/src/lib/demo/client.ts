// Mock Supabase client for demo mode. Implements just enough of the
// API surface that our app touches: auth.getUser, from().<chain>, channel(),
// storage.from(...).<minimal>.

import { DemoQueryBuilder } from "./query-builder";
import { DEMO_USER_ID } from "./mode";
import { demoStore } from "./store";

const FAKE_USER = {
  id: DEMO_USER_ID,
  email: "dana@countme.app",
  app_metadata: {},
  user_metadata: {
    full_name: "דנה כהן (אתה)",
  },
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

function fakeAuth() {
  return {
    async getUser() {
      return { data: { user: FAKE_USER }, error: null };
    },
    async getSession() {
      return { data: { session: { user: FAKE_USER, access_token: "demo" } }, error: null };
    },
    async signInWithOAuth() {
      return { data: { url: "/dashboard", provider: "google" }, error: null };
    },
    async signOut() {
      return { error: null };
    },
    async exchangeCodeForSession() {
      return { data: { user: FAKE_USER, session: null }, error: null };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
  };
}

function fakeStorage() {
  return {
    from(bucket: string) {
      return {
        async upload(path: string, _data: unknown) {
          return { data: { path: `${bucket}/${path}` }, error: null };
        },
        async createSignedUrl(path: string) {
          return { data: { signedUrl: `/demo-asset/${path}` }, error: null };
        },
        async remove(_paths: string[]) {
          return { data: null, error: null };
        },
      };
    },
  };
}

function fakeChannel() {
  return {
    on() {
      return this;
    },
    subscribe() {
      return this;
    },
    unsubscribe() {
      return Promise.resolve();
    },
  };
}

export function createDemoClient() {
  return {
    auth: fakeAuth(),
    storage: fakeStorage(),
    from(table: string) {
      return new DemoQueryBuilder(table);
    },
    channel(_name: string) {
      return fakeChannel();
    },
    removeChannel() {
      return Promise.resolve();
    },
    /** Escape hatch for code that needs to peek at the data. */
    _store: demoStore,
  };
}

export type DemoClient = ReturnType<typeof createDemoClient>;

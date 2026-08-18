/**
 * Chat-route wiring test (RAG audit #20, 2026-08-18, task 5).
 *
 * Verifies, against a MOCKED Anthropic client (no real network/API-key
 * needed), that:
 *   1. EITAN_TOOLS — including the new search_knowledge/read_knowledge and
 *      the 3 client-graph tools — are actually registered on the request
 *      sent to Claude.
 *   2. The system prompt carries exactly 3 cached blocks, the 3rd being the
 *      knowledge-vault TOC, each with an ephemeral cache_control breakpoint.
 *   3. The knowledge tools degrade to an honest message (never throw, never
 *      break the chat) when Supabase isn't configured/reachable — which is
 *      the actual state of this repo right now (migration authored but not
 *      applied), so this exercises the real condition, not a simulated one.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
  class MockAPIError extends Error {}

  class MockAnthropic {
    static APIError = MockAPIError;
    static calls: Record<string, unknown>[] = [];
    messages: { stream: (params: Record<string, unknown>) => unknown };

    constructor() {
      this.messages = {
        stream: (params: Record<string, unknown>) => {
          MockAnthropic.calls.push(params);
          return {
            // No streamed text deltas needed — this test only inspects the
            // request the route sent, not the rendered reply.
            [Symbol.asyncIterator]: async function* () {},
            finalMessage: async () => ({
              content: [{ type: "text", text: "תשובה לדוגמה" }],
              usage: {
                input_tokens: 10,
                output_tokens: 5,
                cache_creation_input_tokens: 0,
                cache_read_input_tokens: 0,
              },
              stop_reason: "end_turn",
            }),
          };
        },
      };
    }
  }

  return { default: MockAnthropic };
});

import Anthropic from "@anthropic-ai/sdk";
import { POST } from "@/app/api/chat/route";
import { EITAN_TOOLS, searchKnowledge, readKnowledge } from "@/lib/agent/tools";
import { makePersona } from "../helpers/persona-factory";

const MockAnthropicClass = Anthropic as unknown as { calls: Record<string, unknown>[] };

function makeRequest(body: unknown, ip: string): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body: JSON.stringify(body),
  });
}

describe("chat route — tools + knowledge TOC wiring", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.AUTH_GATING_ENABLED = "false";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    MockAnthropicClass.calls.length = 0;
  });

  it("registers EITAN_TOOLS (incl. the RAG audit #20 tools) on the request sent to Claude", async () => {
    const persona = makePersona();
    const res = await POST(makeRequest({ message: "שלום", history: [], persona }, "1.1.1.1"));
    expect(res.status).toBe(200);
    await res.text(); // drain the stream so the handler runs to completion

    expect(MockAnthropicClass.calls.length).toBeGreaterThanOrEqual(1);
    const firstCall = MockAnthropicClass.calls[0] as { tools?: { name: string }[] };
    const toolNames = (firstCall.tools ?? []).map((t) => t.name);
    for (const name of [
      "get_form_value",
      "get_tax_estimate",
      "get_upcoming_deadlines",
      "get_ceiling_status",
      "search_knowledge",
      "read_knowledge",
      "top_customers",
      "expense_breakdown_by_category",
      "open_receivables_by_customer",
    ]) {
      expect(toolNames).toContain(name);
    }
    expect(firstCall.tools?.length).toBe(EITAN_TOOLS.length);
  });

  it("sends 3 cached system blocks, the 3rd being the knowledge TOC with an ephemeral cache_control", async () => {
    const persona = makePersona();
    const res = await POST(makeRequest({ message: "שלום", history: [], persona }, "2.2.2.2"));
    await res.text();

    const firstCall = MockAnthropicClass.calls[0] as {
      system?: { text: string; cache_control?: { type: string } }[];
    };
    expect(firstCall.system).toHaveLength(3);
    const [instructions, personaSnapshot, tocBlock] = firstCall.system!;
    expect(instructions.cache_control).toEqual({ type: "ephemeral" });
    expect(personaSnapshot.cache_control).toEqual({ type: "ephemeral" });
    expect(tocBlock.cache_control).toEqual({ type: "ephemeral" });
    expect(tocBlock.text).toContain("מאגר ידע");
    expect(tocBlock.text).toContain("search_knowledge");
  });
});

describe("knowledge tools — graceful degradation (no Supabase configured)", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('search_knowledge returns the honest "not available yet" message instead of throwing', async () => {
    const result = await searchKnowledge("מה זה עוסק פטור");
    expect(JSON.parse(result)).toEqual(
      expect.objectContaining({ error: "הידע עוד לא זמין" }),
    );
  });

  it("read_knowledge returns the same degradation message", async () => {
    const result = await readKnowledge(["some-id"]);
    expect(JSON.parse(result)).toEqual(
      expect.objectContaining({ error: "הידע עוד לא זמין" }),
    );
  });

  it("read_knowledge rejects an empty id list before ever touching Supabase", async () => {
    const result = await readKnowledge([]);
    expect(JSON.parse(result)).toEqual({ error: "לא סופקו מזהים" });
  });

  it("search_knowledge rejects an empty query before ever touching Supabase", async () => {
    const result = await searchKnowledge("   ");
    expect(JSON.parse(result)).toEqual({ error: "שאילתה ריקה" });
  });
});

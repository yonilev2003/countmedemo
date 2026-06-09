import Anthropic from "@anthropic-ai/sdk";

/**
 * Pipe an Anthropic message stream to the client as our own SSE protocol:
 * text deltas as `data:` chunks, then "[DONE]"; errors surface as a final
 * "[ERROR] <Hebrew message>" chunk so the client can display them.
 */
export function anthropicSSEResponse(
  startStream: () => ReturnType<Anthropic.Messages["stream"]>,
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const anthropicStream = startStream();
        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            enqueue(event.delta.text);
          }
        }
        enqueue("[DONE]");
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Anthropic.APIError
            ? `שגיאה מה-API: ${err.message}`
            : "אירעה שגיאה בלתי צפויה. נסי שוב.";
        enqueue(`[ERROR] ${msg}`);
        enqueue("[DONE]");
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

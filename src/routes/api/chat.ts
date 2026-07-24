import { chat, toServerSentEventsResponse } from "@tanstack/ai";
import { openaiText } from "@tanstack/ai-openai";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Check for API key
        if (!process.env.OPENAI_API_KEY) {
          return new Response(
            JSON.stringify({
              error: "OPENAI_API_KEY not configured",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const body = await request.json();

        try {
          // Create a streaming chat response. `chat()` reads the AG-UI
          // `threadId` for devtools correlation when available.
          const stream = chat({
            adapter: openaiText("gpt-5.5"),
            messages: body.messages,
          });

          // Convert stream to HTTP response
          return toServerSentEventsResponse(stream);
        } catch (error) {
          return new Response(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : "An error occurred",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});

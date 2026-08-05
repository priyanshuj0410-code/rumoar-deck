/**
 * The wire format between the streaming routes and the client: one JSON object per line.
 *
 * Chosen over raw SSE because these streams carry structured events (a text delta, a
 * finished style, a terminal error), not just text, and NDJSON survives a proxy that
 * buffers without corrupting anything.
 */
export type StreamEvent =
  | { t: "text"; v: string }
  | { t: "status"; v: string }
  | { t: "style"; style: unknown }
  | { t: "done"; payload?: unknown }
  | { t: "error"; message: string };

export function encodeEvent(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

/** Reads an NDJSON body, invoking `onEvent` for each complete line. */
export async function readEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // The last element is either empty or a partial line; keep it for the next chunk.
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        onEvent(JSON.parse(trimmed) as StreamEvent);
      } catch {
        // Ignore a malformed line rather than abandoning the rest of the stream.
      }
    }
  }

  const tail = buffer.trim();
  if (tail) {
    try {
      onEvent(JSON.parse(tail) as StreamEvent);
    } catch {
      /* see above */
    }
  }
}

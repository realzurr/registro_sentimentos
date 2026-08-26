type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function addSecurityHeaders(response: Response, isHttps: boolean): Response {
  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return response;

    const headers = new Headers(response.headers);
    if (!headers.has("content-security-policy")) {
      headers.set(
        "content-security-policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; frame-ancestors 'none';",
      );
    }
    headers.set("x-content-type-options", "nosniff");
    headers.set("x-frame-options", "DENY");
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
    if (isHttps && !headers.has("strict-transport-security")) {
      headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return response;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const handler = await getServerEntry();
    const response = await handler.fetch(request, env, ctx);
    const isHttps = request.url.startsWith("https:");
    return addSecurityHeaders(response, isHttps);
  },
};

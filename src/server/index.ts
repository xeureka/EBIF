import { app, type ServerEnv } from "./app";

type AppExecutionContext = Parameters<typeof app.fetch>[2];

type WorkerEnv = ServerEnv["Bindings"];

export default {
  async fetch(request: Request, env: WorkerEnv, ctx?: AppExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route /api/* requests to Hono
    if (url.pathname.startsWith("/api")) {
      return app.fetch(request, env, ctx);
    }

    // Serve static assets and single-page-application fallback from Cloudflare Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return app.fetch(request, env, ctx);
  },
};

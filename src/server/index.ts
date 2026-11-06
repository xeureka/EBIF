import { app } from "./app";

type AppExecutionContext = Parameters<typeof app.fetch>[2];

interface WorkerEnv {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  TRUSTED_ORIGINS?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  SITE_URL?: string;
}

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

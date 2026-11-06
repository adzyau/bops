import type { Instrumentation } from "next";

/**
 * Runs once when the server starts, before it takes requests. A hosted server (BOPS_DATABASE_URL)
 * loads the user's saved state from Postgres here. The Mac app loads the signed-in user's state from
 * Bops Cloud as soon as the Keychain gives their key (authStatus, which then starts Bops Cloud's
 * tunnel); a self-hosted install reads its file at module init. A computer's Bops runner (BOPS_RUNNER=1)
 * loads it from Bops Cloud too, on the key in its file, and then starts what it runs (runner-start.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }
}

/**
 * An unexpected error in a route or page: to Bops' usage events (lib/server/analytics.ts), message
 * and paths scrubbed, when they're on. The route's pattern goes with it, never the path asked for.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, _request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { captureServerException } = await import("./lib/server/analytics");
  captureServerException(err, context.routePath);
};

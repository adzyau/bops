import { readFileSync } from "node:fs";

/**
 * The Node half of instrumentation.ts's register(), in a file of its own so the edge build of
 * instrumentation.ts never bundles what only Node can load (pg needs fs).
 */
export async function registerNode() {
  // The build this server runs, as it was when it started (app/api/health): if the app's files are
  // replaced while it runs, the Mac app sees it's an old server and starts a new one.
  try {
    (globalThis as unknown as { __bopsBuild?: string | null }).__bopsBuild = readFileSync(`${process.cwd()}/.next/BUILD_ID`, "utf8").trim() || null;
  } catch {}
  // A computer's Bops runner (lib/server/runner.ts): no window starts its loops, so it starts the few it runs itself.
  if (process.env.BOPS_RUNNER === "1") {
    const { startRunner } = await import("./lib/server/runner-start");
    void startRunner().catch((e: Error) => console.error(`[runner] ${e.message}`));
    return;
  }
  if (process.env.BOPS_DATABASE_URL) {
    const { hydrateState } = await import("./lib/server/store");
    await hydrateState();
    return;
  }
  const [{ loadOrgoKey }, { authStatus }, { startCloud }] = await Promise.all([
    import("./lib/server/orgo-auth"),
    import("./lib/server/orgo-sign-in"),
    import("./lib/server/cloud-tunnel"),
  ]);
  void loadOrgoKey()
    .then(() => authStatus())
    .then(() => startCloud())
    .catch((e: Error) => console.warn(`[start] ${e.message}`));
}

import { defineConfig } from "@playwright/test";

const PORT = 4321;

const config = defineConfig({
  testDir: "./src/tests",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: "pnpm exec astro build && pnpm exec astro preview --port 4321",
    url: `http://localhost:${PORT}/reserve/`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});

export default config;

import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const externalBaseURL = process.env.E2E_BASE_URL?.trim();
const trustedOidcToken = process.env.VERCEL_TRUSTED_OIDC_TOKEN?.trim();
const localBaseURL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  ...(isCI ? { workers: 4 } : {}),
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [
        ["github"],
        ["junit", { outputFile: "test-results/e2e-junit.xml" }],
      ]
    : "html",
  use: {
    baseURL: externalBaseURL || localBaseURL,
    ...(externalBaseURL && trustedOidcToken
      ? {
          extraHTTPHeaders: {
            "x-vercel-trusted-oidc-idp-token": trustedOidcToken,
          },
        }
      : {}),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-390",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  ...(externalBaseURL
    ? {}
    : {
        webServer: {
          command: isCI ? "npm run build && npm run start" : "npm run dev",
          url: localBaseURL,
          reuseExistingServer: !isCI,
          timeout: 180_000,
        },
      }),
});

import { expect, test } from "@playwright/test";

test("web manifest keeps the canonical Casa con Criterio masterbrand", async ({ request }) => {
  const response = await request.get("/brand/site.webmanifest");
  expect(response.ok()).toBe(true);

  const manifest = await response.json();
  expect(manifest.name).toBe("Casa con Criterio");
  expect(manifest.short_name).toBe("Casa con Criterio");
  expect(manifest.start_url).toBe("/");
});

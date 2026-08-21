import { expect, test } from "@playwright/test";

test("GitDB archive is written only after session end confirmation", async ({ page }) => {
  const writes: Array<{ url: string; body: string | null }> = [];
  await page.route("**/api/archive", async (route) => {
    const request = route.request();
    writes.push({ url: request.url(), body: request.postData() });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ archived: true }),
    });
  });

  await page.goto("/session/create?auth=1&archiveTest=1");
  await page.getByLabel("세션 이름").fill("분수의 덧셈");
  await page.getByRole("button", { name: "세션 시작" }).click();
  expect(writes).toHaveLength(0);

  await page.getByRole("button", { name: "세션 종료" }).click();
  await expect(page.getByRole("dialog", { name: "세션 종료" })).toBeVisible();
  expect(writes).toHaveLength(0);
  await page.getByRole("button", { name: "종료하고 보관" }).click();

  await expect(page.getByRole("status")).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]?.body).toContain("분수의 덧셈");
  await page.screenshot({ path: "test-results/archive-success.png", fullPage: true });
});

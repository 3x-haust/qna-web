import { expect, test } from "@playwright/test";

test("archive returns home immediately while GitDB writes in background", async ({
  page,
}) => {
  const writes: Array<{ url: string; body: string | null }> = [];
  const archiveRequested = Promise.withResolvers<void>();
  const archiveResponse = Promise.withResolvers<void>();
  await page.route("**/api/archive", async (route) => {
    const request = route.request();
    writes.push({ url: request.url(), body: request.postData() });
    archiveRequested.resolve();
    await archiveResponse.promise;
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ accepted: true }),
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

  await archiveRequested.promise;
  await expect(page).toHaveURL("/home");
  expect(writes).toHaveLength(1);
  expect(writes[0]?.body).toContain("분수의 덧셈");
  archiveResponse.resolve();
  await page.screenshot({
    path: "test-results/archive-immediate-home.png",
    fullPage: true,
  });
});

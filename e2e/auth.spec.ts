import { expect, test } from "@playwright/test";

test("Mirim popup login reaches authenticated home", async ({ page }) => {
  let authorizeRequests = 0;
  let requestedScopes = "";
  await page.context().route("**/api/mirim/api/v1/oauth/authorize?*", async (route) => {
    authorizeRequests += 1;
    const authorizationUrl = new URL(route.request().url());
    const state = authorizationUrl.searchParams.get("state");
    requestedScopes = authorizationUrl.searchParams.get("scope") ?? "";
    await route.fulfill({
      status: 302,
      headers: {
        location: `/auth/callback?code=authorization-code&state=${state}`,
      },
    });
  });
  await page.context().route("**/api/mirim/api/v1/oauth/token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        data: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
        },
      }),
    });
  });
  await page.context().route("**/api/mirim/api/v1/user", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        data: {
          id: "teacher",
          email: "teacher@e-mirim.hs.kr",
          nickname: "김미림 선생님",
          role: "TEACHER",
        },
      }),
    });
  });

  await page.goto("http://localhost:3210/");
  await page.getByRole("button", { name: "미림마이스터고 로그인" }).dblclick();

  await expect(page).toHaveURL(/\/home$/, { timeout: 10_000 });
  expect(authorizeRequests).toBe(1);
  expect(requestedScopes.split(",")).toContain("role");
  await expect(page.getByTestId("session-empty")).toBeVisible();
  await page.getByRole("link", { name: "QnA 홈" }).click();
  await expect(page).toHaveURL("http://localhost:3210/");
  await expect(page.getByTestId("session-empty")).toBeVisible();
  await page.screenshot({ path: "test-results/auth-success.png", fullPage: true });
});

test("OAuth denial renders a recoverable Korean error", async ({ page }) => {
  await page.goto("/auth/callback?error=access_denied");

  await expect(page.locator("section[role='alert']")).toContainText(
    "로그인을 완료하지 못했습니다",
  );
  await expect(page.getByRole("link", { name: "홈으로 돌아가기" })).toBeVisible();
  await page.screenshot({ path: "test-results/auth-error.png", fullPage: true });
});

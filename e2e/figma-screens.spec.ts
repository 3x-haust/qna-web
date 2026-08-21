import { expect, test } from "@playwright/test";

const green = "rgb(0, 129, 86)";
const background = "rgb(46, 46, 46)";

test("logged-out home matches the Figma landmarks", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("app-shell")).toHaveCSS("background-color", background);
  await expect(page.getByRole("img", { name: "QnA" })).toBeVisible();
  const mark = page.getByTestId("qna-mark");
  await expect(mark).toBeVisible();
  const markBox = await mark.boundingBox();
  expect(markBox && markBox.width / markBox.height).toBeGreaterThan(1.4);
  await expect(page.getByRole("button", { name: "미림마이스터고 로그인" })).toHaveCSS(
    "background-color",
    green,
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "학생 참여" })).toHaveAttribute(
    "href",
    "/join",
  );
  await page.screenshot({ path: "test-results/home-guest.png" });
});

test("logged-in home matches the Figma landmarks", async ({ page }) => {
  await page.goto("/home?auth=1");

  await expect(
    page.locator("header").getByRole("link", { name: "세션 만들기" }),
  ).toBeVisible();
  await expect(page.getByTestId("session-empty")).toBeVisible();
  await page.screenshot({ path: "test-results/home-authenticated.png" });
});

test("home remains usable at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("img", { name: "QnA" })).toBeVisible();
  await expect(page.getByRole("button", { name: "미림마이스터고 로그인" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: "test-results/home-mobile.png" });
});

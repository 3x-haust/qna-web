import { expect, test } from "@playwright/test";

test("archive returns home immediately while GitDB writes in background", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "mirim_oauth_tokens",
      JSON.stringify({
        access_token: "teacher-access-token",
        refresh_token: "teacher-refresh-token",
        expires_in: 3600,
        issued_at: new Date().toISOString(),
      }),
    );
    window.localStorage.setItem(
      "mirim_oauth_user",
      JSON.stringify({
        id: "teacher-user-42",
        email: "teacher@e-mirim.hs.kr",
        nickname: "김미림 선생님",
        role: "TEACHER",
      }),
    );
  });
  const writes: Array<{ url: string; body: string | null }> = [];
  const archiveRequested = Promise.withResolvers<void>();
  const archiveResponse = Promise.withResolvers<void>();
  await page.route("**/api/archive", async (route) => {
    const request = route.request();
    expect(request.headers().authorization).toBe(
      "Bearer teacher-access-token",
    );
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
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "세션 종료" })).toHaveCount(0);
  await page.getByRole("button", { name: "세션 종료" }).click();
  await page.getByRole("radio", { name: "Private" }).check();
  await page.getByRole("radio", { name: "Encrypted" }).check();
  expect(writes).toHaveLength(0);
  await page.getByRole("button", { name: "종료하고 보관" }).click();

  await archiveRequested.promise;
  await expect(page).toHaveURL("/home");
  expect(writes).toHaveLength(1);
  expect(writes[0]?.body).toContain("분수의 덧셈");
  expect(JSON.parse(writes[0]?.body ?? "{}").teacherId).toBe(
    undefined,
  );
  expect(JSON.parse(writes[0]?.body ?? "{}")).toMatchObject({
    teacher: {
      id: "teacher-user-42",
      nickname: "김미림 선생님",
      email: "teacher@e-mirim.hs.kr",
    },
    settings: {
      visibility: "private",
      encryption: "encrypted",
    },
    session: {
      teacherId: "teacher-user-42",
      title: "분수의 덧셈",
    },
  });
  archiveResponse.resolve();
  await page.screenshot({
    path: "test-results/archive-immediate-home.png",
    fullPage: true,
  });
});

test("home archive button loads a session and reopens it", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "mirim_oauth_tokens",
      JSON.stringify({
        access_token: "teacher-access-token",
        refresh_token: "teacher-refresh-token",
        expires_in: 3600,
        issued_at: new Date().toISOString(),
      }),
    );
    window.localStorage.setItem(
      "mirim_oauth_user",
      JSON.stringify({
        id: "teacher-user-42",
        email: "teacher@e-mirim.hs.kr",
        nickname: "김미림 선생님",
        role: "TEACHER",
      }),
    );
  });
  await page.route("**/api/archive**", async (route) => {
    expect(route.request().headers().authorization).toBe(
      "Bearer teacher-access-token",
    );
    const url = new URL(route.request().url());
    if (url.searchParams.has("sessionId")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          archive: {
            session: {
              id: "archived-session",
              teacherId: "teacher-user-42",
              title: "프로그래밍",
              phase: "ended",
              seq: 3,
              endedAt: "2026-08-28T01:00:00.000Z",
              processedCommandIds: [],
              questions: [
                {
                  id: "question-1",
                  participantId: "student-1",
                  authorName: "김학생",
                  text: "클로저가 무엇인가요?",
                  createdSeq: 1,
                  likedBy: ["student-2", "student-3"],
                },
              ],
            },
            teacher: {
              id: "teacher-user-42",
              nickname: "김미림 선생님",
              email: "teacher@e-mirim.hs.kr",
            },
            settings: { visibility: "private", encryption: "encrypted" },
            questionAuthors: {
              "question-1": {
                id: "student-1",
                nickname: "김학생",
                email: "student@e-mirim.hs.kr",
              },
            },
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        archives: [
          {
            sessionId: "archived-session",
            title: "프로그래밍",
            endedAt: "2026-08-28T01:00:00.000Z",
            questionCount: 1,
            teacherNickname: "김미림 선생님",
            location: { visibility: "private", encryption: "encrypted" },
          },
        ],
      }),
    });
  });
  let signalingAttempts = 0;
  await page.route("**/api/signaling/sessions", async (route) => {
    signalingAttempts += 1;
    await route.fulfill(
      signalingAttempts === 1
        ? {
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "relay unavailable" }),
          }
        : {
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ code: "ABC234", hostToken: "host-token" }),
          },
    );
  });
  await page.route("**/api/signaling/sessions/ABC234/joins/next?**", async (route) => {
    await route.fulfill({ status: 204 });
  });

  await page.goto("/home");
  await page.getByRole("link", { name: "아카이브 보기" }).click();
  await expect(page).toHaveURL("/archive");
  await expect(page.getByRole("heading", { name: "프로그래밍" })).toBeVisible();
  await expect(page.getByText("질문 1개")).toBeVisible();
  await page.getByRole("button", { name: "다시 열기" }).click();

  await expect(page).toHaveURL("/session/create?reopened=1");
  await page.getByRole("button", { name: "세션 연결 다시 시도" }).click();
  await expect(page.getByRole("heading", { name: "프로그래밍" })).toBeVisible();
  await expect(page.getByText("클로저가 무엇인가요?")).toBeVisible();
  await expect(page.getByTestId("question-vote-count")).toHaveText("2");
});

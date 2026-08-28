import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";

async function authenticateTeacher(context: BrowserContext) {
  await context.addInitScript(() => {
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
}

async function armComposerMotion(page: Page) {
  await page.evaluate(() => {
    const startViewTransition = document.startViewTransition.bind(document);
    const motion = Promise.withResolvers<number[]>();
    (
      globalThis as typeof globalThis & {
        __qnaComposerMotion?: Promise<number[]>;
      }
    ).__qnaComposerMotion = motion.promise;
    document.startViewTransition = (update) => {
      const transition = startViewTransition(update);
      void transition.ready.then(() => {
        motion.resolve(
          document
            .getAnimations()
            .map((animation) =>
              Number(animation.effect?.getTiming().duration ?? 0),
            ),
        );
      });
      return transition;
    };
  });
}

async function readComposerMotion(page: Page) {
  const durations = await page.evaluate(
    () =>
      (
        globalThis as typeof globalThis & {
          __qnaComposerMotion?: Promise<number[]>;
        }
      ).__qnaComposerMotion,
  );
  if (!durations) {
    throw new Error("question composer motion was not started");
  }
  return durations;
}

test("teacher is authoritative over a relayed session", async ({ browser }) => {
  const teacherContext = await browser.newContext();
  const linkedStudentContext = await browser.newContext();
  const codedStudentContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const identityStudentContext = await browser.newContext();
  await authenticateTeacher(teacherContext);
  await identityStudentContext.route(
    "**/api/mirim/api/v1/oauth/authorize**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<title>Mirim OAuth test</title><main>Login required</main>",
      });
    },
  );
  await teacherContext.grantPermissions(["clipboard-read", "clipboard-write"]);
  await linkedStudentContext.addInitScript(() => {
    window.localStorage.setItem(
      "mirim_oauth_tokens",
      JSON.stringify({
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        issued_at: new Date().toISOString(),
      }),
    );
    window.localStorage.setItem(
      "mirim_oauth_user",
      JSON.stringify({
        id: "student-1",
        email: "student@e-mirim.hs.kr",
        nickname: "김학생",
        role: "STUDENT",
      }),
    );
  });
  const teacher = await teacherContext.newPage();
  const linkedStudent = await linkedStudentContext.newPage();
  const codedStudent = await codedStudentContext.newPage();
  const identityStudent = await identityStudentContext.newPage();
  const linkedStudentErrors: string[] = [];
  const teacherErrors: string[] = [];
  let archivedRecord: unknown;
  const archiveCaptured = Promise.withResolvers<void>();
  await teacher.route("**/api/archive", async (route) => {
    archivedRecord = JSON.parse(route.request().postData() ?? "{}");
    archiveCaptured.resolve();
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ accepted: true }),
    });
  });
  linkedStudent.on("pageerror", (error) => linkedStudentErrors.push(error.message));
  teacher.on("pageerror", (error) => teacherErrors.push(error.message));

  await teacher.goto("/session/create");
  await teacher.getByLabel("세션 이름").fill("분수의 덧셈");
  await teacher.getByRole("button", { name: "세션 시작" }).click();
  await expect(teacher.getByLabel("세션 코드")).toHaveCount(0);
  await teacher.getByRole("button", { name: "공유" }).click();
  await expect(teacher.getByLabel("세션 코드")).toHaveValue(/^[A-HJ-NP-Z2-9]{6}$/);
  await expect(teacher.getByLabel("참여 링크")).toHaveValue(/\/join\?code=[A-HJ-NP-Z2-9]{6}$/);
  const code = await teacher.getByLabel("세션 코드").inputValue();
  const inviteUrl = await teacher.getByLabel("참여 링크").inputValue();
  await teacher.screenshot({
    path: "test-results/teacher-share-modal.png",
    fullPage: true,
  });
  await teacher.getByRole("button", { name: "참여 링크 복사" }).click();
  await expect(teacher.getByRole("status")).toHaveText("참여 링크를 복사했습니다");
  await teacher.getByRole("button", { name: "닫기" }).click();

  await linkedStudent.goto(inviteUrl);

  await codedStudent.goto("/join");
  await codedStudent.getByLabel("세션 코드").fill(code);
  await codedStudent.getByRole("button", { name: "세션 참여" }).click();

  await expect(teacher.getByText("2명 참여 중")).toBeVisible();
  await expect(codedStudent.getByText("연결됨")).toHaveCount(0);

  await identityStudent.goto(inviteUrl);
  await expect(teacher.getByText("3명 참여 중")).toBeVisible();
  await identityStudent.getByLabel("질문 작성", { exact: true }).focus();
  const realNameButton = identityStudent.getByRole("button", { name: "실명" });
  await expect(realNameButton).toBeEnabled();
  const loginPopupPromise = identityStudent.waitForEvent("popup");
  await realNameButton.click();
  const loginPopup = await loginPopupPromise;
  await expect(loginPopup).toHaveTitle("Mirim OAuth test");
  await identityStudent.screenshot({
    path: "test-results/identity-login-trigger.png",
    fullPage: true,
  });
  await loginPopup.close();
  await identityStudentContext.close();

  const sessionActions = teacher.getByTestId("teacher-session-actions");
  await expect(sessionActions.getByRole("button", { name: "공유" })).toBeVisible();
  await expect(
    sessionActions.getByRole("button", { name: "세션 종료" }),
  ).toBeVisible();
  const shareBox = await sessionActions
    .getByRole("button", { name: "공유" })
    .boundingBox();
  const endBox = await sessionActions
    .getByRole("button", { name: "세션 종료" })
    .boundingBox();
  expect(shareBox).not.toBeNull();
  expect(endBox).not.toBeNull();
  expect(
    Math.abs(
      (shareBox?.y ?? 0) +
        (shareBox?.height ?? 0) / 2 -
        ((endBox?.y ?? 0) + (endBox?.height ?? 0) / 2),
    ),
  ).toBeLessThanOrEqual(1);
  await teacher.screenshot({
    path: "test-results/teacher-session-actions.png",
    fullPage: true,
  });

  await expect(linkedStudent.getByTestId("question-composer")).toHaveAttribute(
    "data-expanded",
    "false",
  );
  await linkedStudent.screenshot({
    path: "test-results/question-composer-compact.png",
    fullPage: true,
  });
  await expect(linkedStudent.getByLabel("질문 작성", { exact: true })).toHaveCSS(
    "overflow-y",
    "hidden",
  );
  await armComposerMotion(linkedStudent);
  await linkedStudent.getByLabel("질문 작성", { exact: true }).focus();
  const expandMotionDurations = await readComposerMotion(linkedStudent);
  expect(expandMotionDurations.some((duration) => duration >= 300)).toBe(true);
  await expect(linkedStudent.getByTestId("question-composer")).toHaveAttribute(
    "data-expanded",
    "true",
  );
  await expect(linkedStudent.getByLabel("질문 작성", { exact: true })).toHaveCSS(
    "outline-style",
    "none",
  );
  await expect(
    linkedStudent.getByTestId("question-composer-surface"),
  ).toHaveCSS("border-color", "rgb(38, 210, 154)");
  const overLimitQuestion = [
    ..."가".repeat(9).split(""),
  ].map(() => "가".repeat(19)).concat("가".repeat(20)).join("\n");
  expect(overLimitQuestion).toHaveLength(200);
  await linkedStudent
    .getByLabel("질문 작성", { exact: true })
    .fill(overLimitQuestion);
  await expect(linkedStudent.getByTestId("question-remaining-count")).toHaveText("-40");
  await expect(linkedStudent.getByTestId("question-remaining-count")).toHaveCSS(
    "color",
    "rgb(255, 155, 155)",
  );
  await expect(linkedStudent.getByRole("button", { name: "보내기" })).toBeDisabled();
  await expect(linkedStudent.getByTestId("question-composer")).toHaveCSS(
    "min-height",
    "248px",
  );
  const expandedBox = await linkedStudent.getByTestId("question-composer").boundingBox();
  expect(expandedBox?.height).toBeGreaterThan(248);
  expect(
    await linkedStudent.getByLabel("질문 작성", { exact: true }).evaluate(
      (textarea) => textarea.scrollHeight <= textarea.clientHeight,
    ),
  ).toBe(true);
  await armComposerMotion(linkedStudent);
  await linkedStudent.getByRole("heading", { name: "분수의 덧셈" }).click();
  const collapseMotionDurations = await readComposerMotion(linkedStudent);
  expect(collapseMotionDurations.some((duration) => duration >= 300)).toBe(true);
  await expect(linkedStudent.getByTestId("question-composer")).toHaveAttribute(
    "data-expanded",
    "false",
  );
  const compactBox = await linkedStudent.getByTestId("question-composer").boundingBox();
  expect(compactBox?.height).toBe(98);
  await linkedStudent.getByLabel("질문 작성", { exact: true }).focus();
  await linkedStudent.getByRole("button", { name: "김학생" }).click();
  await linkedStudent
    .getByLabel("질문 작성", { exact: true })
    .fill("1/2 + 1/3이 왜 5/6인가요?");
  await linkedStudent.screenshot({
    path: "test-results/question-composer-expanded.png",
    fullPage: true,
  });
  await linkedStudent.getByRole("button", { name: "보내기" }).click();
  expect(linkedStudentErrors).toEqual([]);
  expect(teacherErrors).toEqual([]);
  await expect(teacher.getByRole("textbox", { name: "질문 작성" })).toHaveCount(0);
  await expect(
    teacher
      .getByTestId("question-feed")
      .locator("article")
      .filter({ hasText: "1/2 + 1/3이 왜 5/6인가요?" }),
  ).toHaveCount(1);
  await expect(teacher.getByText("김학생")).toBeVisible();
  await expect(
    codedStudent
      .getByTestId("question-feed")
      .locator("article")
      .filter({ hasText: "1/2 + 1/3이 왜 5/6인가요?" }),
  ).toHaveCount(1);

  const codedStudentVote = codedStudent.getByRole("button", {
    name: "1/2 + 1/3이 왜 5/6인가요? 추천",
  });
  await codedStudentVote.click();
  await expect(codedStudentVote).toHaveAttribute("aria-pressed", "true");
  await expect(codedStudentVote).toHaveCSS("background-color", "rgb(0, 129, 86)");
  await codedStudent.screenshot({
    path: "test-results/question-vote-active.png",
    fullPage: true,
  });
  await expect(teacher.getByTestId("question-vote-count")).toHaveText("1");

  await linkedStudent.getByLabel("질문 작성", { exact: true }).focus();
  await linkedStudent.getByTestId("question-remaining-count").click();
  await expect(linkedStudent.getByTestId("question-composer")).toHaveAttribute(
    "data-expanded",
    "true",
  );
  await linkedStudent.screenshot({
    path: "test-results/question-composer-inside-click.png",
    fullPage: true,
  });
  await linkedStudent.getByRole("heading", { name: "분수의 덧셈" }).click();
  await expect(linkedStudent.getByTestId("question-composer")).toHaveAttribute(
    "data-expanded",
    "false",
  );

  await teacher.screenshot({ path: "test-results/p2p-teacher.png", fullPage: true });
  await linkedStudent.screenshot({ path: "test-results/p2p-student.png", fullPage: true });
  await teacher.getByRole("button", { name: "세션 종료" }).click();
  await teacher.getByRole("button", { name: "종료하고 보관" }).click();
  await archiveCaptured.promise;
  expect(archivedRecord).toMatchObject({
    teacher: {
      id: "teacher-user-42",
      nickname: "김미림 선생님",
      email: "teacher@e-mirim.hs.kr",
    },
    questionAuthors: {
      "question-1": {
        id: "student-1",
        nickname: "김학생",
        email: "student@e-mirim.hs.kr",
      },
    },
    session: {
      questions: [
        expect.objectContaining({
          id: "question-1",
          likedBy: expect.arrayContaining([expect.any(String)]),
        }),
      ],
    },
  });
  await teacherContext.close();
  await linkedStudentContext.close();
  await codedStudentContext.close();
});

test("questions work through HTTP when WebRTC is unavailable", async ({ browser }) => {
  const teacherContext = await browser.newContext();
  const studentContext = await browser.newContext();
  await authenticateTeacher(teacherContext);
  const disableWebRtc = () => {
    Object.defineProperty(globalThis, "RTCPeerConnection", {
      configurable: true,
      value: undefined,
    });
  };
  await Promise.all([
    teacherContext.addInitScript(disableWebRtc),
    studentContext.addInitScript(disableWebRtc),
  ]);
  const teacher = await teacherContext.newPage();
  const student = await studentContext.newPage();
  const teacherErrors: string[] = [];
  const studentErrors: string[] = [];
  teacher.on("pageerror", (error) => teacherErrors.push(error.message));
  student.on("pageerror", (error) => studentErrors.push(error.message));

  await teacher.goto("/session/create");
  await teacher.getByLabel("세션 이름").fill("HTTP relay");
  await teacher.getByRole("button", { name: "세션 시작" }).click();
  await teacher.getByRole("button", { name: "공유" }).click();
  const inviteUrl = await teacher.getByLabel("참여 링크").inputValue();
  await teacher.getByRole("button", { name: "닫기" }).click();

  await student.goto(inviteUrl);

  await expect(teacher.getByText("1명 참여 중")).toBeVisible();
  await expect(student.getByRole("heading", { name: "HTTP relay" })).toBeVisible();
  await student
    .getByLabel("질문 작성", { exact: true })
    .fill("WebRTC 없이도 보이나요?");
  await student.getByRole("button", { name: "보내기" }).click();

  await expect(
    teacher
      .getByTestId("question-feed")
      .locator("article")
      .filter({ hasText: "WebRTC 없이도 보이나요?" }),
  ).toHaveCount(1);
  await expect(
    student
      .getByTestId("question-feed")
      .locator("article")
      .filter({ hasText: "WebRTC 없이도 보이나요?" }),
  ).toHaveCount(1);
  await expect(teacher.getByText("1명 참여 중")).toBeVisible();
  expect(teacherErrors).toEqual([]);
  expect(studentErrors).toEqual([]);

  await Promise.all([teacherContext.close(), studentContext.close()]);
});

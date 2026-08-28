import { describe, expect, it } from "vitest";

import { createSession } from "@/domain/session";
import { SignalingStore } from "@/signaling/signaling-store";

describe("six-character session signaling", () => {
  it("relays queued student commands to the authoritative host in order", async () => {
    const store = new SignalingStore();
    const host = store.createSession();
    const join = store.requestJoin(host.code);
    const pendingJoin = await store.waitForJoin(host.code, host.hostToken);
    const first = {
      commandId: "command-1",
      kind: "question.submit" as const,
      text: "첫 질문",
      anonymous: true,
      authorName: "익명",
    };
    const second = {
      commandId: "command-2",
      kind: "question.vote.toggle" as const,
      questionId: "question-1",
    };

    expect(host.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(pendingJoin.id).toBe(join.id);

    store.publishCommand(host.code, join.id, join.joinToken, first);
    store.publishCommand(host.code, join.id, join.joinToken, second);

    await expect(
      store.waitForCommand(host.code, join.id, host.hostToken),
    ).resolves.toEqual(first);
    await expect(
      store.waitForCommand(host.code, join.id, host.hostToken),
    ).resolves.toEqual(second);
  });

  it("relays the latest authoritative snapshot to the joined student", async () => {
    const store = new SignalingStore();
    const host = store.createSession();
    const join = store.requestJoin(host.code);
    const snapshot = createSession("session-1", "teacher", "HTTP relay");

    store.publishSnapshot(
      host.code,
      join.id,
      host.hostToken,
      snapshot,
    );

    await expect(
      store.waitForSnapshot(host.code, join.id, join.joinToken),
    ).resolves.toEqual(snapshot);
  });

  it("supports more than one student in the same session", async () => {
    const store = new SignalingStore();
    const host = store.createSession();
    const first = store.requestJoin(host.code);
    const second = store.requestJoin(host.code);

    await expect(store.waitForJoin(host.code, host.hostToken)).resolves.toMatchObject({
      id: first.id,
    });
    await expect(store.waitForJoin(host.code, host.hostToken)).resolves.toMatchObject({
      id: second.id,
    });
  });

  it("rejects unknown and unauthorized session access", () => {
    const store = new SignalingStore();
    const host = store.createSession();
    const join = store.requestJoin(host.code);
    const command = {
      commandId: "command-1",
      kind: "question.submit" as const,
      text: "질문",
      anonymous: true,
      authorName: "익명",
    };
    const snapshot = createSession("session-1", "teacher", "HTTP relay");

    expect(() => store.requestJoin("ABC234")).toThrow("세션을 찾을 수 없습니다");
    expect(() => store.waitForJoin(host.code, "wrong-token")).toThrow(
      "세션 호스트 권한이 없습니다",
    );
    expect(() =>
      store.publishCommand(host.code, join.id, "wrong-token", command),
    ).toThrow("세션 참가자 권한이 없습니다");
    expect(() =>
      store.publishSnapshot(host.code, join.id, "wrong-token", snapshot),
    ).toThrow("세션 호스트 권한이 없습니다");
  });
});

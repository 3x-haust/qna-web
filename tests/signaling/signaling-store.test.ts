import { describe, expect, it } from "vitest";

import { SignalingStore } from "@/signaling/signaling-store";

describe("six-character session signaling", () => {
  it("exchanges one peer offer and answer without exposing SDP as an invite", async () => {
    const store = new SignalingStore();
    const host = store.createSession();
    const join = store.requestJoin(host.code);
    const pendingJoin = await store.waitForJoin(host.code, host.hostToken);

    expect(host.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(pendingJoin.id).toBe(join.id);

    const offerPromise = store.waitForOffer(host.code, join.id, join.joinToken);
    store.publishOffer(host.code, join.id, host.hostToken, "private-offer");
    await expect(offerPromise).resolves.toBe("private-offer");

    const answerPromise = store.waitForAnswer(host.code, join.id, host.hostToken);
    store.publishAnswer(host.code, join.id, join.joinToken, "private-answer");
    await expect(answerPromise).resolves.toBe("private-answer");
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

    expect(() => store.requestJoin("ABC234")).toThrow("세션을 찾을 수 없습니다");
    expect(() => store.waitForJoin(host.code, "wrong-token")).toThrow(
      "세션 호스트 권한이 없습니다",
    );
  });
});

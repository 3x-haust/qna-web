import { describe, expect, it } from "vitest";

import { decodeSignal, encodeSignal } from "@/rtc/signal";

describe("manual WebRTC signaling codec", () => {
  it("round-trips a versioned offer", () => {
    const offer = {
      version: 1 as const,
      kind: "offer" as const,
      sessionId: "session-1",
      connectionId: "connection-1",
      nonce: "nonce-1",
      description: { type: "offer" as const, sdp: "v=0\r\n" },
    };

    expect(decodeSignal(encodeSignal(offer))).toEqual(offer);
  });

  it.each(["", "not-json", "{}", '{"version":2}'])("rejects malformed input %s", (value) => {
    expect(() => decodeSignal(value)).toThrow("유효하지 않은 연결 코드");
  });
});

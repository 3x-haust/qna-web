import { describe, expect, it } from "vitest";

import { HostRuntime } from "@/rtc/runtime";

describe("external-network WebRTC discovery", () => {
  it("configures public STUN discovery when creating a host offer", async () => {
    const originalPeerConnection = Object.getOwnPropertyDescriptor(
      globalThis,
      "RTCPeerConnection",
    );
    let receivedConfiguration: RTCConfiguration | undefined;
    const listeners = new Map<string, EventListener>();

    class FakeDataChannel {
      readonly readyState = "connecting";

      addEventListener(): void {}
    }

    class FakePeerConnection {
      readonly iceGatheringState = "gathering";
      localDescription: RTCSessionDescriptionInit | null = null;

      constructor(configuration?: RTCConfiguration) {
        receivedConfiguration = configuration;
      }

      createDataChannel(): FakeDataChannel {
        return new FakeDataChannel();
      }

      createOffer(): Promise<RTCSessionDescriptionInit> {
        return Promise.resolve({ type: "offer", sdp: "test-offer" });
      }

      setLocalDescription(
        description: RTCSessionDescriptionInit,
      ): Promise<void> {
        this.localDescription = description;
        const candidateEvent = new Event("icecandidate");
        Object.defineProperty(candidateEvent, "candidate", {
          value: {
            candidate:
              "candidate:1 1 udp 1677729535 203.0.113.10 50000 typ srflx",
          },
        });
        listeners.get("icecandidate")?.(candidateEvent);
        return Promise.resolve();
      }

      addEventListener(type: string, listener: EventListener): void {
        listeners.set(type, listener);
      }

      removeEventListener(type: string): void {
        listeners.delete(type);
      }
    }

    Object.defineProperty(globalThis, "RTCPeerConnection", {
      configurable: true,
      value: FakePeerConnection,
    });

    try {
      const runtime = new HostRuntime("session-1", () => undefined);
      const offer = await runtime.createOffer();

      expect(offer).toBeTypeOf("string");
      expect(receivedConfiguration?.iceServers).toEqual([
        { urls: "stun:stun.cloudflare.com:3478" },
      ]);
    } finally {
      if (originalPeerConnection) {
        Object.defineProperty(
          globalThis,
          "RTCPeerConnection",
          originalPeerConnection,
        );
      } else {
        Reflect.deleteProperty(globalThis, "RTCPeerConnection");
      }
    }
  });
});

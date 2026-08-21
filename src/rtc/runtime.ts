import type { SessionState } from "@/domain/session";
import { decodeSignal, encodeSignal } from "@/rtc/signal";

type WireMessage =
  | { kind: "snapshot"; session: SessionState }
  | {
      kind: "question.submit";
      commandId: string;
      text: string;
      anonymous: boolean;
      authorName: string;
    }
  | { kind: "question.vote.toggle"; commandId: string; questionId: string };

type HostPeer = {
  connectionId: string;
  nonce: string;
  peer: RTCPeerConnection;
  channel: RTCDataChannel;
};

function waitForIce(peer: RTCPeerConnection): Promise<void> {
  if (peer.iceGatheringState === "complete") {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      peer.removeEventListener("icegatheringstatechange", onChange);
      reject(new Error("연결 정보를 모으는 데 시간이 오래 걸립니다"));
    }, 10_000);
    const onChange = () => {
      if (peer.iceGatheringState === "complete") {
        window.clearTimeout(timeout);
        peer.removeEventListener("icegatheringstatechange", onChange);
        resolve();
      }
    };
    peer.addEventListener("icegatheringstatechange", onChange);
  });
}

function send(channel: RTCDataChannel, message: WireMessage): void {
  if (channel.readyState !== "open") {
    throw new Error("학생과 아직 연결되지 않았습니다");
  }
  channel.send(JSON.stringify(message));
}

export class HostRuntime {
  readonly peers = new Map<string, HostPeer>();

  constructor(
    private readonly sessionId: string,
    private readonly onMessage: (message: WireMessage, connectionId: string) => void,
  ) {}

  async createOffer(): Promise<string> {
    const connectionId = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    const peer = new RTCPeerConnection({ iceServers: [] });
    const channel = peer.createDataChannel("qna.v1", { ordered: true });
    channel.addEventListener("message", (event) => {
      this.onMessage(JSON.parse(String(event.data)) as WireMessage, connectionId);
    });
    this.peers.set(connectionId, { connectionId, nonce, peer, channel });
    await peer.setLocalDescription(await peer.createOffer());
    await waitForIce(peer);
    if (!peer.localDescription) {
      throw new Error("학생 연결 정보를 만들지 못했습니다");
    }
    return encodeSignal({
      version: 1,
      kind: "offer",
      sessionId: this.sessionId,
      connectionId,
      nonce,
      description: peer.localDescription,
    });
  }

  async acceptAnswer(value: string): Promise<RTCDataChannel> {
    const answer = decodeSignal(value);
    if (answer.kind !== "answer" || answer.sessionId !== this.sessionId) {
      throw new Error("이 질의의 응답 코드가 아닙니다");
    }
    const peer = this.peers.get(answer.connectionId);
    if (!peer || peer.nonce !== answer.nonce) {
      throw new Error("만료되었거나 이미 사용한 연결 응답입니다");
    }
    await peer.peer.setRemoteDescription(answer.description);
    await this.waitForOpen(peer.channel);
    return peer.channel;
  }

  broadcast(session: SessionState): void {
    for (const { channel } of this.peers.values()) {
      if (channel.readyState === "open") {
        send(channel, { kind: "snapshot", session });
      }
    }
  }

  close(): void {
    for (const { channel, peer } of this.peers.values()) {
      channel.close();
      peer.close();
    }
    this.peers.clear();
  }

  private waitForOpen(channel: RTCDataChannel): Promise<void> {
    if (channel.readyState === "open") {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("학생 연결 시간이 초과되었습니다")), 10_000);
      channel.addEventListener(
        "open",
        () => {
          window.clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
    });
  }
}

export class StudentRuntime {
  private peer: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;

  constructor(
    private readonly onMessage: (message: WireMessage) => void,
    private readonly onConnected: () => void = () => undefined,
  ) {}

  async acceptOffer(value: string): Promise<string> {
    const offer = decodeSignal(value);
    if (offer.kind !== "offer") {
      throw new Error("올바른 세션 연결 정보가 아닙니다");
    }
    const peer = new RTCPeerConnection({ iceServers: [] });
    this.peer = peer;
    peer.addEventListener(
      "datachannel",
      (event) => {
        this.channel = event.channel;
        event.channel.addEventListener("open", this.onConnected, { once: true });
        event.channel.addEventListener("message", (message) => {
          this.onMessage(JSON.parse(String(message.data)) as WireMessage);
        });
      },
      { once: true },
    );
    await peer.setRemoteDescription(offer.description);
    await peer.setLocalDescription(await peer.createAnswer());
    await waitForIce(peer);
    if (!peer.localDescription) {
      throw new Error("세션 연결 응답을 만들지 못했습니다");
    }
    return encodeSignal({
      version: 1,
      kind: "answer",
      sessionId: offer.sessionId,
      connectionId: offer.connectionId,
      nonce: offer.nonce,
      description: peer.localDescription,
    });
  }

  sendQuestion(
    text: string,
    anonymous: boolean,
    authorName: string,
    commandId: string,
  ): void {
    if (!this.channel) {
      throw new Error("교사와 아직 연결되지 않았습니다");
    }
    send(this.channel, {
      kind: "question.submit",
      commandId,
      text,
      anonymous,
      authorName,
    });
  }

  toggleVote(questionId: string): void {
    if (!this.channel) {
      throw new Error("교사와 아직 연결되지 않았습니다");
    }
    send(this.channel, {
      kind: "question.vote.toggle",
      commandId: crypto.randomUUID(),
      questionId,
    });
  }

  isConnected(): boolean {
    return this.channel?.readyState === "open";
  }

  close(): void {
    this.channel?.close();
    this.peer?.close();
  }
}

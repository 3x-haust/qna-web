import { z } from "zod";

export type SignalEnvelope = {
  version: 1;
  kind: "offer" | "answer";
  sessionId: string;
  connectionId: string;
  nonce: string;
  description: RTCSessionDescriptionInit;
};

const descriptionSchema = z.object({
  type: z.enum(["offer", "answer", "pranswer", "rollback"]),
  sdp: z.string().optional(),
});

const signalSchema = z.object({
  version: z.literal(1),
  kind: z.enum(["offer", "answer"]),
  sessionId: z.string().min(1),
  connectionId: z.string().min(1),
  nonce: z.string().min(1),
  description: descriptionSchema,
});

export function encodeSignal(signal: SignalEnvelope): string {
  return JSON.stringify(signalSchema.parse(signal));
}

export function decodeSignal(value: string): SignalEnvelope {
  try {
    return signalSchema.parse(JSON.parse(value));
  } catch {
    throw new Error("유효하지 않은 연결 코드입니다");
  }
}

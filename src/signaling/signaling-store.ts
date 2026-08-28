import { randomInt, randomUUID } from "node:crypto";

import type { SessionState } from "@/domain/session";
import type { RelayCommand } from "@/signaling/relay-schema";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

type JoinRecord = {
  id: string;
  joinToken: string;
  commands: RelayCommand[];
  snapshot?: SessionState;
  commandWaiters: Array<Waiter<RelayCommand>>;
  snapshotWaiters: Array<Waiter<SessionState>>;
};

type SessionRecord = {
  code: string;
  hostToken: string;
  expiresAt: number;
  joins: Map<string, JoinRecord>;
  pendingJoinIds: string[];
  joinWaiters: Array<Waiter<{ id: string }>>;
};

type Waiter<T> = {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  cleanup: () => void;
};

export class SignalingStore {
  readonly #sessions = new Map<string, SessionRecord>();

  createSession(): { code: string; hostToken: string } {
    this.#removeExpiredSessions();

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const code = createCode();
      if (!this.#sessions.has(code)) {
        const hostToken = createToken();
        this.#sessions.set(code, {
          code,
          hostToken,
          expiresAt: Date.now() + SESSION_TTL_MS,
          joins: new Map(),
          pendingJoinIds: [],
          joinWaiters: [],
        });
        return { code, hostToken };
      }
    }

    throw new Error("세션 코드를 생성할 수 없습니다");
  }

  requestJoin(code: string): { id: string; joinToken: string } {
    const session = this.#getSession(code);
    const join: JoinRecord = {
      id: randomUUID(),
      joinToken: createToken(),
      commands: [],
      commandWaiters: [],
      snapshotWaiters: [],
    };

    session.joins.set(join.id, join);
    const waiter = session.joinWaiters.shift();
    if (waiter) {
      waiter.cleanup();
      waiter.resolve({ id: join.id });
    } else {
      session.pendingJoinIds.push(join.id);
    }

    return { id: join.id, joinToken: join.joinToken };
  }

  waitForJoin(code: string, hostToken: string, signal?: AbortSignal): Promise<{ id: string }> {
    const session = this.#getHostSession(code, hostToken);
    const pendingJoinId = session.pendingJoinIds.shift();
    if (pendingJoinId) {
      return Promise.resolve({ id: pendingJoinId });
    }

    return waitForEvent(session.joinWaiters, signal);
  }

  publishCommand(
    code: string,
    joinId: string,
    joinToken: string,
    command: RelayCommand,
  ): void {
    const join = this.#getJoinForPeer(code, joinId, joinToken);
    const waiter = join.commandWaiters.shift();
    if (waiter) {
      waiter.cleanup();
      waiter.resolve(command);
    } else {
      join.commands.push(command);
    }
  }

  waitForCommand(
    code: string,
    joinId: string,
    hostToken: string,
    signal?: AbortSignal,
  ): Promise<RelayCommand> {
    const session = this.#getHostSession(code, hostToken);
    const join = this.#getJoin(session, joinId);
    const command = join.commands.shift();
    if (command) {
      return Promise.resolve(command);
    }

    return waitForEvent(join.commandWaiters, signal);
  }

  publishSnapshot(
    code: string,
    joinId: string,
    hostToken: string,
    snapshot: SessionState,
  ): void {
    const session = this.#getHostSession(code, hostToken);
    const join = this.#getJoin(session, joinId);
    if (join.snapshot && join.snapshot.seq >= snapshot.seq) {
      return;
    }
    if (join.snapshotWaiters.length > 0) {
      resolveWaiters(join.snapshotWaiters, snapshot);
    } else {
      join.snapshot = snapshot;
    }
  }

  waitForSnapshot(
    code: string,
    joinId: string,
    joinToken: string,
    signal?: AbortSignal,
  ): Promise<SessionState> {
    const join = this.#getJoinForPeer(code, joinId, joinToken);
    if (join.snapshot) {
      const snapshot = join.snapshot;
      join.snapshot = undefined;
      return Promise.resolve(snapshot);
    }

    return waitForEvent(join.snapshotWaiters, signal);
  }

  deleteSession(code: string, hostToken: string): void {
    const session = this.#getHostSession(code, hostToken);
    this.#sessions.delete(session.code);
  }

  #getSession(code: string): SessionRecord {
    const session = this.#sessions.get(code);
    if (!session || session.expiresAt <= Date.now()) {
      if (session) {
        this.#sessions.delete(code);
      }
      throw new Error("세션을 찾을 수 없습니다");
    }

    return session;
  }

  #getHostSession(code: string, hostToken: string): SessionRecord {
    const session = this.#getSession(code);
    if (session.hostToken !== hostToken) {
      throw new Error("세션 호스트 권한이 없습니다");
    }

    return session;
  }

  #getJoinForPeer(code: string, joinId: string, joinToken: string): JoinRecord {
    const session = this.#getSession(code);
    const join = this.#getJoin(session, joinId);
    if (join.joinToken !== joinToken) {
      throw new Error("세션 참가자 권한이 없습니다");
    }

    return join;
  }

  #getJoin(session: SessionRecord, joinId: string): JoinRecord {
    const join = session.joins.get(joinId);
    if (!join) {
      throw new Error("참가 요청을 찾을 수 없습니다");
    }

    return join;
  }

  #removeExpiredSessions(): void {
    const now = Date.now();
    for (const session of this.#sessions.values()) {
      if (session.expiresAt <= now) {
        this.#sessions.delete(session.code);
      }
    }
  }

}

function createCode(): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

function createToken(): string {
  return randomUUID();
}

function waitForEvent<T>(waiters: Array<Waiter<T>>, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) {
    return Promise.reject(new Error("요청이 취소되었습니다"));
  }

  return new Promise<T>((resolve, reject) => {
    const waiter: Waiter<T> = {
      resolve,
      reject,
      cleanup: () => {
        signal?.removeEventListener("abort", abort);
      },
    };
    const abort = (): void => {
      removeWaiter(waiters, waiter);
      reject(new Error("요청이 취소되었습니다"));
    };

    waiters.push(waiter);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function resolveWaiters<T>(waiters: Array<Waiter<T>>, value: T): void {
  const pending = waiters.splice(0);
  for (const waiter of pending) {
    waiter.cleanup();
    waiter.resolve(value);
  }
}

function removeWaiter<T>(waiters: Array<Waiter<T>>, waiter: Waiter<T>): void {
  const index = waiters.indexOf(waiter);
  if (index >= 0) {
    waiters.splice(index, 1);
  }
}

declare global {
  var __qnaSignalingStore: SignalingStore | undefined;
}

const globalSignalingStore = globalThis.__qnaSignalingStore ?? new SignalingStore();
globalThis.__qnaSignalingStore = globalSignalingStore;

export { globalSignalingStore as signalingStore };

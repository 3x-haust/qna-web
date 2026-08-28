export type SessionState = {
  id: string;
  teacherId: string;
  title: string;
  phase: "live" | "ended";
  seq: number;
  endedAt?: string;
  questions: Array<{
    id: string;
    participantId: string;
    authorName: string;
    text: string;
    createdSeq: number;
    likedBy: string[];
  }>;
  processedCommandIds: string[];
};

export type ClientCommand =
  | {
      commandId: string;
      kind: "question.submit";
      participantId: string;
      text: string;
      anonymous: boolean;
      authorName: string;
    }
  | {
      commandId: string;
      kind: "question.vote.toggle";
      participantId: string;
      questionId: string;
    };

export function createSession(
  id: string,
  teacherId: string,
  title: string,
): SessionState {
  return {
    id,
    teacherId,
    title,
    phase: "live",
    seq: 0,
    questions: [],
    processedCommandIds: [],
  };
}

export function reopenSession(
  archived: SessionState,
  id: string,
  teacherId: string,
): SessionState {
  return {
    id,
    teacherId,
    title: archived.title,
    phase: "live",
    seq: archived.seq,
    questions: archived.questions,
    processedCommandIds: [],
  };
}

export function reduceHostCommand(
  state: SessionState,
  command: ClientCommand,
): SessionState {
  if (state.phase === "ended") {
    throw new Error("종료된 질의에는 질문을 보낼 수 없습니다");
  }
  if (state.processedCommandIds.includes(command.commandId)) {
    return state;
  }
  if (command.kind === "question.submit") {
    const text = command.text.trim();
    const authorName = command.anonymous ? "익명" : command.authorName.trim();
    if (text.length === 0 || text.length > 160) {
      throw new Error("질문은 1자 이상 160자 이하여야 합니다");
    }
    if (authorName.length === 0 || authorName.length > 40) {
      throw new Error("이름은 1자 이상 40자 이하여야 합니다");
    }
    const nextSeq = state.seq + 1;
    return {
      ...state,
      seq: nextSeq,
      questions: [
        ...state.questions,
        {
          id: `question-${nextSeq}`,
          participantId: command.participantId,
          authorName,
          text,
          createdSeq: nextSeq,
          likedBy: [],
        },
      ],
      processedCommandIds: [...state.processedCommandIds, command.commandId],
    };
  }

  const questionExists = state.questions.some(
    (question) => question.id === command.questionId,
  );
  if (!questionExists) throw new Error("질문을 찾을 수 없습니다");
  const nextSeq = state.seq + 1;
  return {
    ...state,
    seq: nextSeq,
    questions: state.questions.map((question) =>
      question.id === command.questionId
        ? {
            ...question,
            likedBy: question.likedBy.includes(command.participantId)
              ? question.likedBy.filter(
                  (participantId) => participantId !== command.participantId,
                )
              : [...question.likedBy, command.participantId],
          }
        : question,
    ),
    processedCommandIds: [...state.processedCommandIds, command.commandId],
  };
}

export function endSession(state: SessionState, endedAt = new Date().toISOString()): SessionState {
  if (state.phase === "ended") {
    return state;
  }
  return {
    ...state,
    phase: "ended",
    endedAt,
    seq: state.seq + 1,
  };
}

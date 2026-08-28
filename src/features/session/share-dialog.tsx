"use client";

import {
  CodeField,
  Dialog,
  DialogActions,
  DialogOverlay,
  Label,
} from "@/features/session/session-controls";
import { Field, PrimaryButton } from "@/ui/primitives";

export function ShareDialog({
  code,
  inviteUrl,
  onClose,
  onError,
  onNotice,
}: {
  readonly code: string;
  readonly inviteUrl: string;
  readonly onClose: () => void;
  readonly onError: (message: string) => void;
  readonly onNotice: (message: string) => void;
}) {
  const copyText = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      onNotice(message);
    } catch {
      onError("클립보드에 복사하지 못했습니다");
    }
  };

  return (
    <DialogOverlay
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <Dialog open aria-label="세션 공유">
        <h2>학생 초대</h2>
        <Label>
          세션 코드
          <CodeField readOnly value={code} />
        </Label>
        <PrimaryButton
          type="button"
          onClick={() => void copyText(code, "세션 코드를 복사했습니다")}
        >
          세션 코드 복사
        </PrimaryButton>
        <Label>
          참여 링크
          <Field readOnly value={inviteUrl} />
        </Label>
        <PrimaryButton
          type="button"
          onClick={() => void copyText(inviteUrl, "참여 링크를 복사했습니다")}
        >
          참여 링크 복사
        </PrimaryButton>
        <DialogActions>
          <PrimaryButton type="button" onClick={onClose}>
            닫기
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </DialogOverlay>
  );
}

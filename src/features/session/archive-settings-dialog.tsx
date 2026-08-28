"use client";

import { useEffect, useRef, useState } from "react";

import type { ArchiveSettings } from "@/archive/archive-rows";
import {
  ArchiveOptions,
  Dialog,
  DialogActions,
  OptionChoice,
  OptionGroup,
} from "@/features/session/session-controls";
import { PrimaryButton } from "@/ui/primitives";

export function ArchiveSettingsDialog({
  onArchive,
  onCancel,
}: {
  readonly onArchive: (settings: ArchiveSettings) => void;
  readonly onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [settings, setSettings] = useState<ArchiveSettings>({
    visibility: "public",
    encryption: "plain",
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
      <Dialog
        ref={dialogRef}
        aria-label="세션 종료"
        onCancel={(event) => {
          event.preventDefault();
          onCancel();
        }}
      >
        <h2>세션 종료</h2>
        <p>현재 학생 질문을 세션 기록으로 보관합니다.</p>
        <ArchiveOptions>
          <OptionGroup>
            <legend>저장소 공개 범위</legend>
            <OptionChoice>
              <input
                type="radio"
                name="archive-visibility"
                value="public"
                checked={settings.visibility === "public"}
                onChange={() =>
                  setSettings((current) => ({
                    ...current,
                    visibility: "public",
                  }))
                }
              />
              <span>Public</span>
              <small>누구나 볼 수 있는 공개 저장소에 보관합니다.</small>
            </OptionChoice>
            <OptionChoice>
              <input
                type="radio"
                name="archive-visibility"
                value="private"
                checked={settings.visibility === "private"}
                onChange={() =>
                  setSettings((current) => ({
                    ...current,
                    visibility: "private",
                  }))
                }
              />
              <span>Private</span>
              <small>접근 권한이 필요한 비공개 저장소에 보관합니다.</small>
            </OptionChoice>
          </OptionGroup>
          <OptionGroup>
            <legend>데이터 저장 방식</legend>
            <OptionChoice>
              <input
                type="radio"
                name="archive-encryption"
                value="plain"
                checked={settings.encryption === "plain"}
                onChange={() =>
                  setSettings((current) => ({
                    ...current,
                    encryption: "plain",
                  }))
                }
              />
              <span>Plain</span>
              <small>질문 기록을 저장소에서 바로 확인할 수 있습니다.</small>
            </OptionChoice>
            <OptionChoice>
              <input
                type="radio"
                name="archive-encryption"
                value="encrypted"
                checked={settings.encryption === "encrypted"}
                onChange={() =>
                  setSettings((current) => ({
                    ...current,
                    encryption: "encrypted",
                  }))
                }
              />
              <span>Encrypted</span>
              <small>질문 기록을 암호화해 안전하게 보관합니다.</small>
            </OptionChoice>
          </OptionGroup>
        </ArchiveOptions>
        <DialogActions>
          <PrimaryButton type="button" onClick={onCancel}>
            취소
          </PrimaryButton>
          <PrimaryButton type="button" onClick={() => onArchive(settings)}>
            종료하고 보관
          </PrimaryButton>
        </DialogActions>
      </Dialog>
  );
}

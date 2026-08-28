import type { MirimUser } from "mirim-oauth-react";

import type { ArchiveIdentity } from "@/archive/archive-rows";

export function archiveIdentityFromUser(
  user: MirimUser | null,
): ArchiveIdentity {
  if (!user) throw new Error("로그인이 필요합니다");
  if (!user.nickname || !user.email) {
    throw new Error("닉네임과 이메일 정보를 확인하지 못했습니다");
  }
  return {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
  };
}

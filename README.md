# QnA

교사가 실시간 세션을 열고 학생들이 질문과 추천을 남길 수 있는 교실용 Q&A 서비스입니다.

교사 브라우저가 세션의 상태를 관리하며, 학생과 교사는 Next.js Route Handler의 HTTP long-poll relay로 연결됩니다. 별도의 TURN이나 실시간 외부 서비스는 필요하지 않습니다. 세션이 끝나면 질문 기록을 공개 GitHub 저장소의 GitDB 형식으로 보관할 수 있습니다.

## 주요 기능

- 6자리 코드 또는 공유 링크로 세션 참여
- 익명 및 실명 질문
- 학생 질문 추천
- 교사 중심의 실시간 질문 목록
- Mirim OAuth 로그인
- 종료된 세션의 GitDB 아카이브

## 기술 스택

- Next.js
- TypeScript
- React
- Zustand
- styled-components
- HTTP long polling
- GitDB

## 로컬 실행

요구 사항:

- Bun
- Node.js를 실행할 수 있는 환경

```bash
bun install
cp .env.example .env.local
bun run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

환경 변수는 `.env.example`을 기준으로 설정합니다. OAuth를 사용하려면 Mirim OAuth 클라이언트 정보가 필요하며, 세션 아카이브를 사용하려면 GitHub 저장소 정보와 쓰기 권한이 있는 토큰이 필요합니다. 지정한 GitDB 저장소가 없으면 첫 아카이브 시 public 저장소와 GitDB 구조를 자동으로 생성합니다.

## 확인

```bash
bun run lint
bun run typecheck
bun test
bun run build
```

브라우저 E2E 테스트:

```bash
bun run test:e2e
```

## 배포

별도의 전용 배포 서비스는 필요하지 않습니다. Node.js 기반 Next.js 애플리케이션을 실행할 수 있는 호스팅 환경이면 배포할 수 있습니다.

```bash
bun install --frozen-lockfile
bun run build
bun run start
```

배포 환경에는 `.env.example`에 있는 환경 변수를 등록하고, 애플리케이션이 사용하는 포트로 HTTP 트래픽을 연결하면 됩니다.

이 프로젝트는 Route Handler와 메모리 기반 HTTP relay를 사용하므로 정적 사이트나 여러 개의 독립된 서버리스 인스턴스로 배포할 수 없습니다. 실행 중인 세션과 relay 메시지는 한 서버 프로세스의 메모리에 저장되므로 기본 배포는 장시간 실행되는 단일 Next.js 인스턴스를 사용해야 합니다. 여러 인스턴스로 확장하려면 relay 저장소를 Redis 같은 공유 저장소로 교체해야 합니다.

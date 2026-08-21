# 환경 설정

로컬에서는 `.env.example`을 `.env.local`로 복사한 뒤 값을 채운다.

## Mirim OAuth

- `NEXT_PUBLIC_MIRIM_CLIENT_ID`: Mirim OAuth에 등록한 공개 웹 클라이언트 ID
- `NEXT_PUBLIC_MIRIM_REDIRECT_URI`: 등록한 callback URL과 완전히 같은 값
- `NEXT_PUBLIC_MIRIM_SCOPES`: `email,nickname,profileImageUrl,role`
- `MIRIM_CLIENT_ID`: Route Handler가 authorize/token 요청에 강제로 주입할 client ID
- `MIRIM_CLIENT_SECRET`: Mirim OAuth에서 발급한 비공개 client secret
- `MIRIM_REDIRECT_URI`: Route Handler가 강제로 주입할 등록 callback URL
- `MIRIM_OAUTH_SERVER_URL`: 기본값 `https://api-auth.mmhs.app`

`mirim-oauth-react`는 브라우저에서 PKCE popup 로그인을 수행하지만 token 교환은 `/api/mirim` Route Handler를 거친다. Route Handler가 브라우저 요청의 secret 값을 버리고 `MIRIM_CLIENT_SECRET`을 주입한다. 따라서 secret은 브라우저 번들에 포함되지 않는다.

## GitDB와 GitHub

- `GITDB_GITHUB_OWNER`: 보관 저장소 소유자
- `GITDB_GITHUB_REPO`: 완료된 질의를 저장할 전용 저장소, 기본값 `qna-archive`
- `GITDB_GITHUB_BRANCH`: 기본값 `main`
- `GITDB_GITHUB_PREFIX`: 기본값 `gitdb/v1`
- `GITDB_GITHUB_TOKEN`: 저장소 쓰기용 fine-grained personal access token

GitHub fine-grained personal access token은 다음처럼 만든다.

1. Repository access를 `Only select repositories`로 제한하고 보관 저장소 하나만 선택한다.
2. Repository permissions에서 `Contents: Read and write`를 허용한다.
3. `Metadata: Read` 기본 권한을 유지한다.

지정한 저장소가 없으면 첫 archive 시 서버가 public 저장소를 만든 뒤 GitDB manifest와 `session_archives` 테이블을 초기화한다. 저장소 자동 생성을 사용하려면 token에 repository creation 권한이 필요하다. 세션 제목, 질문, 작성자 이름을 포함한 archive payload는 암호화하지 않으며 누구나 저장소에서 읽을 수 있다.

토큰은 반드시 `GITDB_GITHUB_TOKEN`처럼 `NEXT_PUBLIC_` 접두사 없이 저장한다. 브라우저는 종료된 session snapshot만 `/api/archive`로 보내고, Route Handler가 서버 환경변수의 token으로 GitHub에 기록한다. token과 Mirim secret은 브라우저 JavaScript, localStorage, sessionStorage에 전달되지 않는다.

archive는 GitDB의 정식 plaintext 구조인 `gitdb/v1/manifest.json`, `gitdb/v1/log/*.json`, `gitdb/v1/snapshot.json`, `gitdb/v1/session_archives/{schema.json,pages.json,pages/*.json,indexes.json}`에 저장한다. mutation log와 manifest가 원본 기록이며 page snapshot은 사람이 읽을 수 있는 현재 테이블 상태다.

## 실시간 세션 signaling

6자리 세션 코드는 self-hosted Next.js 서버 프로세스의 메모리 signaling 저장소에서 최대 2시간 유지한다. 질문과 답변 데이터는 signaling 서버에 저장하지 않고 WebRTC DataChannel로만 전달한다.

운영에서는 `next start` 단일 인스턴스를 reverse proxy 뒤에서 실행한다. 서버 재시작 시 진행 중인 초대 코드가 만료된다. 여러 Next.js 인스턴스로 확장하려면 signaling 저장소를 공유 저장소로 교체해야 한다.

"use client";

import { MirimOAuthProvider, useMirimOAuth, type MirimUser } from "mirim-oauth-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type AuthValue = {
  user: MirimUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => undefined,
  logout: async () => undefined,
});

const subscribeToClient = () => () => undefined;

export function postLoginDestination(pathname: string): "/home" | null {
  return pathname === "/join" ? null : "/home";
}

function MirimAuthAdapter({ children }: { children: ReactNode }) {
  const oauth = useMirimOAuth();
  const router = useRouter();
  const loginPromise = useRef<Promise<void> | null>(null);
  const hasStoredSession =
    window.localStorage.getItem("mirim_oauth_tokens") !== null &&
    window.localStorage.getItem("mirim_oauth_user") !== null;

  const login = useCallback(() => {
    if (loginPromise.current) return loginPromise.current;
    const operation = (async () => {
      if (window.localStorage.getItem("qna:e2e-auth") === "teacher") {
        window.localStorage.setItem("qna:mock-user", "김미림 선생님");
        const destination = postLoginDestination(window.location.pathname);
        if (destination) router.replace(`${destination}?auth=1`);
        return;
      }
      await oauth.logIn();
      const destination = postLoginDestination(window.location.pathname);
      if (destination) router.replace(destination);
    })();
    loginPromise.current = operation;
    operation.then(
      () => {
        loginPromise.current = null;
      },
      () => {
        loginPromise.current = null;
      },
    );
    return operation;
  }, [oauth, router]);

  const logout = useCallback(async () => {
    await oauth.logOut();
    router.replace("/");
  }, [oauth, router]);

  const value = useMemo<AuthValue>(
    () => ({
      user: oauth.currentUser,
      isLoggedIn: oauth.isLoggedIn,
      isLoading: oauth.isLoading || (!oauth.isLoggedIn && hasStoredSession),
      login,
      logout,
    }),
    [hasStoredSession, login, logout, oauth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          isLoggedIn: false,
          isLoading: true,
          login: async () => undefined,
          logout: async () => undefined,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <MirimOAuthProvider
      clientId={process.env.NEXT_PUBLIC_MIRIM_CLIENT_ID ?? ""}
      clientSecret=""
      redirectUri={`${window.location.origin}/auth/callback`}
      oauthServerUrl={
        `${window.location.origin}/api/mirim`
      }
      scopes={
        process.env.NEXT_PUBLIC_MIRIM_SCOPES ?? "email,nickname,profileImageUrl,role"
      }
      storage={window.localStorage}
    >
      <MirimAuthAdapter>{children}</MirimAuthAdapter>
    </MirimOAuthProvider>
  );
}

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}

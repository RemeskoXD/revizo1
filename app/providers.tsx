"use client";

import { useEffect } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { RevizoneRoleChrome } from "@/components/RevizoneRoleChrome";

function SessionAuthGuards() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session?.user?.blocked) {
      void signOut({ callbackUrl: "/login?error=blocked" });
      return;
    }
    if (session?.user?.revisionAuthExpired) {
      void signOut({ callbackUrl: "/login?error=revision_auth" });
    }
  }, [session?.user?.blocked, session?.user?.revisionAuthExpired, status]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionAuthGuards />
      <RevizoneRoleChrome />
      {children}
    </SessionProvider>
  );
}

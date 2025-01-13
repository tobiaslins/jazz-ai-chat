"use client";

import { JazzProvider, useOnboardingAuth } from "jazz-react";
import { ChatAccount } from "./schema";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <JazzAndAuth>{children}</JazzAndAuth>;
}

function JazzAndAuth({ children }: { children: React.ReactNode }) {
  const [auth] = useOnboardingAuth();
  return (
    <>
      <JazzProvider
        auth={auth}
        AccountSchema={ChatAccount}
        peer="wss://cloud.jazz.tools/?key=me@tobi.sh"
      >
        {children}
      </JazzProvider>
    </>
  );
}
// Register the Account schema so `useAccount` returns our custom `MyAppAccount`
declare module "jazz-react" {
  interface Register {
    Account: ChatAccount;
  }
}

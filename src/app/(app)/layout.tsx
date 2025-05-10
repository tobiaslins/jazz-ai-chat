"use client";

import { JazzProvider } from "jazz-react";
import { ChatAccount } from "./schema";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <JazzAndAuth>{children}</JazzAndAuth>;
}

function JazzAndAuth({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JazzProvider
        sync={{ peer: "wss://cloud.jazz.tools/?key=me@tobi.sh-ai-chat" }}
        AccountSchema={ChatAccount}
      >
        {children}
      </JazzProvider>
    </>
  );
}
declare module "jazz-react" {
  interface Register {
    Account: ChatAccount;
  }
}

"use client";

import { JazzProvider } from "jazz-react";
import { ChatAccount } from "./schema";
import ChatLayout from "./chat-layout";

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
        experimental_enableSSR
        sync={{ peer: "wss://cloud.jazz.tools/?key=me@tobi.sh-ai-chat" }}
        AccountSchema={ChatAccount}
      >
        <ChatLayout>{children}</ChatLayout>
      </JazzProvider>
    </>
  );
}

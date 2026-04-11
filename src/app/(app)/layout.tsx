"use client";

import JazzProviderClient from "@/components/jazz-provider-client";
import { StorageResetControl } from "@/components/storage-reset-control";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <JazzProviderClient>
      <StorageResetControl />
      {children}
    </JazzProviderClient>
  );
}

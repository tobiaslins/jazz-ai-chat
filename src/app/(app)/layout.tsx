"use client";

import JazzProviderClient from "@/components/jazz-provider-client";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <JazzProviderClient>{children}</JazzProviderClient>;
}

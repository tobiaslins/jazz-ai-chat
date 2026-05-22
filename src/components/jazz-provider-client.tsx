"use client";

import { JazzProvider, } from "@/lib/jazz-react-client";
import {  jazzClientConfig } from "@/lib/jazz-client-config";


export default function JazzProviderClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  console.log(jazzClientConfig)
 
  return (
    <JazzProvider config={jazzClientConfig}>{children}</JazzProvider>
  );
}

'use client'

import "./globals.css";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>TON Connect Demo</title>
      </head>
      <body>
        <TonConnectUIProvider manifestUrl="https://blush-official-ptarmigan-737.mypinata.cloud/ipfs/QmYA4oqsDhmZ5RzFVBF6LGMFLSS4VfwhA9fpYjr1HQLYy8">
          {children}
        </TonConnectUIProvider>
      </body>
    </html>
  );
}
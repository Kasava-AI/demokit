"use client";

import { DemoKitNextProvider } from "@demokit-ai/next/client";
import { fixtures } from "@/lib/fixtures";
import { demokitSource } from "@/lib/demokit-config";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitNextProvider
      fixtures={fixtures}
      cookieName="ecommerce-demo-mode"
      source={demokitSource}
      // apiKey={process.env.NEXT_PUBLIC_DEMOKIT_API_KEY}
      // cloudUrl={process.env.NEXT_PUBLIC_DEMOKIT_API_URL}
    >
      {children}
    </DemoKitNextProvider>
  );
}

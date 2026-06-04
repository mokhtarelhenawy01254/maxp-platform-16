import React from "react";

const StorefrontStartupFallback: React.FC = () => (
  <div
    className="storefront-shell flex min-h-screen flex-col bg-background"
    aria-busy="true"
  >
    <header className="sticky top-0 z-50 h-20 w-full border-b border-border/50 bg-background/95">
      <div className="container flex h-full items-center justify-between px-4 md:px-6">
        <div className="h-8 w-8 rounded bg-muted animate-pulse md:hidden" />
        <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        <div className="hidden items-center gap-4 md:flex">
          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-4">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    </header>

    <main className="flex-1">
      <div className="h-[50vh] min-h-[400px] w-full bg-muted animate-pulse" />
      <div className="container px-4 py-16 md:px-6">
        <div className="mb-8 h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-4">
              <div className="aspect-[3/4] w-full rounded-lg bg-muted animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  </div>
);

export default StorefrontStartupFallback;

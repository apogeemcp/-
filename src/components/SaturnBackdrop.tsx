"use client";

import dynamic from "next/dynamic";

const SaturnScene = dynamic(() => import("@/components/SaturnScene").then((m) => m.SaturnScene), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-void" />,
});

export function SaturnBackdrop({
  className = "absolute inset-0",
  variant = "hero",
}: {
  className?: string;
  variant?: "hero" | "full";
}) {
  return <SaturnScene className={className} variant={variant} />;
}

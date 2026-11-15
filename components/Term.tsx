import type { ReactNode } from "react";
import { GLOSSARY } from "@/lib/format";

// Jargon with its definition one hover or one Tab away.
export default function Term({ id, children }: { id: string; children: ReactNode }) {
  const tip = GLOSSARY[id];
  if (!tip) return <>{children}</>;
  return (
    <span className="term" data-tip={tip} tabIndex={0}>
      {children}
    </span>
  );
}

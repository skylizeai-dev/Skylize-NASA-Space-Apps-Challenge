import { Suspense } from "react";
import Dashboard from "@/components/Dashboard";
import { DashboardSkeleton } from "@/app/page";

export default function HomeV4() {
  return (
    <Suspense fallback={<DashboardSkeleton base="/v4" />}>
      <Dashboard base="/v4" />
    </Suspense>
  );
}

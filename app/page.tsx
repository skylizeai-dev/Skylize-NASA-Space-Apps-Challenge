import { Suspense } from "react";
import Dashboard from "@/components/Dashboard";
import TopBar from "@/components/TopBar";

// The dashboard reads its state from the URL, so it renders inside Suspense.
// The fallback is a skeleton of the real layout, never a blank screen.
function DashboardSkeleton() {
  return (
    <>
      <TopBar />
      <main
        aria-busy="true"
        aria-label="Loading evidence"
        className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]"
      >
        <div className="skeleton h-[420px]" />
        <div className="flex flex-col gap-6">
          <div className="skeleton h-40" />
          <div className="skeleton h-44" />
          <div className="skeleton h-36" />
          <div className="skeleton h-36" />
        </div>
        <div className="skeleton hidden h-[420px] xl:block" />
      </main>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

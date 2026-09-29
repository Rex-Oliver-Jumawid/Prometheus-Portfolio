import { LoadingState } from "@/components/shared/loading-state";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl p-6 lg:p-10">
      <LoadingState label="Loading workspace" />
    </div>
  );
}

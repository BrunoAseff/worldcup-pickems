function LoadingBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function ProtectedLoading() {
  return (
    <div className="px-5 md:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-360 space-y-6">
        <div className="space-y-2 pt-2 md:pt-3">
          <LoadingBlock className="h-10 w-56" />
          <LoadingBlock className="h-4 w-full max-w-2xl" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,39rem)_minmax(0,46rem)]">
          <div className="space-y-3">
            <LoadingBlock className="h-7 w-32" />
            <LoadingBlock className="h-72 w-full" />
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <LoadingBlock className="h-11 w-28" />
              <LoadingBlock className="h-11 w-28" />
              <LoadingBlock className="h-11 w-28" />
            </div>
            <div className="space-y-3">
              <LoadingBlock className="h-40 w-full" />
              <LoadingBlock className="h-40 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type AppLoadingProps = {
  inline?: boolean;
  message?: string;
};

export default function AppLoading({
  inline = false,
  message = "Loading your workspace...",
}: AppLoadingProps) {
  return (
    <div
      className={`flex items-center justify-center ${
        inline
          ? "min-h-[200px]"
          : "min-h-screen bg-gray-50 dark:bg-gray-950"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5">
        <>
          <img
            className="h-8 w-[154px] dark:hidden"
            src="/images/logo/logo-admin.svg"
            alt="UniSell"
            width={154}
            height={32}
          />
          <img
            className="hidden h-8 w-[154px] dark:block"
            src="/images/logo/logo-admin-dark.svg"
            alt="UniSell"
            width={154}
            height={32}
          />
        </>
        <div className="flex items-center gap-2.5 text-sm font-medium text-gray-500 dark:text-gray-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-violet-600 dark:border-gray-700 dark:border-t-violet-400" aria-hidden="true" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}

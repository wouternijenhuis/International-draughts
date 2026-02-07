export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-lg">
        <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-300 mb-4">
          You are offline
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-6">
          Some features require an internet connection. You can still play against local AI opponents.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 
                     transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

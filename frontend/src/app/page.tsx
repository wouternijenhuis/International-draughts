export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold text-primary-700 dark:text-primary-400 mb-4">
          International Draughts
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
          Play the classic 10×10 board game against AI opponents of varying difficulty.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 
                       focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
                       transition-colors font-medium"
            aria-label="Start a new game"
          >
            Play Now
          </button>
          <button
            className="px-6 py-3 border border-primary-600 text-primary-600 dark:text-primary-400
                       dark:border-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950
                       focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
                       transition-colors font-medium"
            aria-label="Learn how to play"
          >
            How to Play
          </button>
        </div>
      </div>
    </div>
  );
}

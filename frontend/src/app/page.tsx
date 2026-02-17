import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="text-center max-w-lg">
        {/* Logo / Board icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 shadow-lg flex items-center justify-center">
            <div className="grid grid-cols-3 gap-0.5 p-2">
              {[0,1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className={`w-3 h-3 rounded-full ${i % 2 === 0 ? 'bg-amber-200' : 'bg-gray-800'}`} />
              ))}
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          International Draughts
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Play the classic 10×10 board game against AI opponents of varying difficulty.
          Master captures, king promotions, and strategic play.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href="/play?setup=true"
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 
                       focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2
                       transition-colors font-medium text-lg inline-flex items-center justify-center shadow-md"
            aria-label="Start a new game"
          >
            ♟ Play Now
          </Link>
          <Link
            href="/learn"
            className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                       focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2
                       transition-colors font-medium text-lg inline-flex items-center justify-center shadow-md"
            aria-label="Learn how to play with interactive tutorial"
          >
            🎓 Learn
          </Link>
          <Link
            href="/tutorial"
            className="px-8 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                       rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800
                       focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2
                       transition-colors font-medium text-lg inline-flex items-center justify-center"
            aria-label="Quick rules reference"
          >
            📖 Rules
          </Link>
        </div>

        {/* Quick info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="text-2xl mb-2">🎓</div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">Learning Mode</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Interactive tutorial with hints, undo/redo, and move feedback</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">AI Opponents</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Easy, Medium, Hard, and Expert difficulty levels</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="text-2xl mb-2">⏱</div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">Timed Mode</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Blitz, Rapid, and Classical time controls</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">Track Progress</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Glicko-2 rating and game statistics</p>
          </div>
        </div>

        {/* Footer links */}
        <nav className="mt-12 flex justify-center gap-6 text-sm text-gray-500 dark:text-gray-400" aria-label="Footer navigation">
          <Link href="/login" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Register
          </Link>
          <Link href="/profile" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Profile
          </Link>
        </nav>
      </div>
    </div>
  );
}

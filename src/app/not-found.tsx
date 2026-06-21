import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-6xl font-bold text-zinc-200 dark:text-zinc-800 mb-4">404</p>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
        Page not found
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-sm">
        This page doesn&apos;t exist or was moved. Check the URL or head back home.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-full bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
      >
        Back to home
      </Link>
    </div>
  )
}

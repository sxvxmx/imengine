import { useQuery } from '@tanstack/react-query'
import { getCount } from '../api'

interface HeaderProps {
  onNavigateGraph: () => void
  onNavigateGallery: () => void
  currentPage: 'graph' | 'gallery'
}

export function Header({ onNavigateGraph, onNavigateGallery, currentPage }: HeaderProps) {
  const { data: count } = useQuery({
    queryKey: ['count'],
    queryFn: getCount,
    refetchInterval: 10_000,
  })

  return (
    <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm px-6 h-14 shrink-0">
      <div className="flex items-center gap-8">
        <h1 className="text-sm font-semibold tracking-tight">
          <span className="text-sky-400">im</span>engine
        </h1>
        <nav className="flex items-center gap-1 text-sm">
          <button
            onClick={onNavigateGraph}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentPage === 'graph'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Graph
          </button>
          <button
            onClick={onNavigateGallery}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentPage === 'gallery'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Gallery
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
        <span>{count?.count ?? '—'} images indexed</span>
      </div>
    </header>
  )
}

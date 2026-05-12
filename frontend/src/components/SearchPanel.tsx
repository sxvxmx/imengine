import { useState, type FormEvent } from 'react'

interface SearchPanelProps {
  onSearch: (id: string) => void
  isLoading: boolean
}

export function SearchPanel({ onSearch, isLoading }: SearchPanelProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) {
      onSearch(trimmed)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="image-search" className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
        Search by ID
      </label>
      <div className="flex gap-2">
        <input
          id="image-search"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste image ID…"
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500 transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm text-neutral-300 transition-colors"
          aria-label="Search for similar images"
        >
          {isLoading ? (
            <span className="block w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          )}
        </button>
      </div>
    </form>
  )
}

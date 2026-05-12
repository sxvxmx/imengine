import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'

interface UploadZoneProps {
  onUpload: (file: File) => void
  isLoading: boolean
}

export function UploadZone({ onUpload, isLoading }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      onUpload(file)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDrag = (e: DragEvent, over: boolean) => {
    e.preventDefault()
    setDragging(over)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload an image to search"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
      }}
      onDrop={handleDrop}
      onDragOver={(e) => handleDrag(e, true)}
      onDragLeave={(e) => handleDrag(e, false)}
      className={`
        relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed
        px-4 py-8 text-center transition-colors cursor-pointer
        ${dragging
          ? 'border-sky-400 bg-sky-500/10'
          : 'border-neutral-700 bg-neutral-900/50 hover:border-neutral-600'
        }
        ${isLoading ? 'pointer-events-none opacity-50' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
        aria-hidden
      />

      {isLoading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-neutral-400">Indexing & searching…</span>
        </div>
      ) : (
        <>
          <svg
            className="w-8 h-8 text-neutral-500 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-sm text-neutral-400">
            Drop an image or <span className="text-sky-400 underline underline-offset-2">browse</span>
          </span>
          <span className="text-xs text-neutral-600 mt-1">Similar images will appear in the graph</span>
        </>
      )}
    </div>
  )
}

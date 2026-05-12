import { useQuery } from '@tanstack/react-query'
import { fetchRandom } from '../api'

interface ImageGridProps {
  onSelect: (id: string) => void
}

export function ImageGrid({ onSelect }: ImageGridProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['gallery'],
    queryFn: () => fetchRandom(30),
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-6" aria-busy="true" aria-label="Loading images">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-neutral-900 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-500" role="alert">
        <svg className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-sm">Failed to load images</p>
        <p className="text-xs text-neutral-600 mt-1">Make sure the backend server is running</p>
      </div>
    )
  }

  const images = data?.images ?? []

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-500" role="status">
        <svg className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
        <p className="text-sm">No images indexed yet</p>
        <p className="text-xs text-neutral-600 mt-1">Upload an image from the Graph view to start</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-6">
      {images.map((img) => (
        <button
          key={img.id}
          onClick={() => onSelect(img.id)}
          className="group relative aspect-square rounded-lg overflow-hidden bg-neutral-900 focus-visible:outline-offset-2"
          aria-label={`View similar images for ${img.filename}`}
        >
          {img.image_data && (
            <img
              src={`data:image/jpeg;base64,${img.image_data}`}
              alt={img.filename}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <span className="text-[11px] text-neutral-300 truncate block">{img.filename}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

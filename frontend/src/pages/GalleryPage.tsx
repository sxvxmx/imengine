import { ImageGrid } from '../components/ImageGrid'

interface GalleryPageProps {
  onSelect: (id: string) => void
}

export function GalleryPage({ onSelect }: GalleryPageProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-lg font-semibold text-neutral-100">Gallery</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Browse indexed images. Click any image to explore similar ones in the graph.
        </p>
      </div>
      <ImageGrid onSelect={onSelect} />
    </div>
  )
}

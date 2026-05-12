import { useState } from 'react'
import { Header } from './components/Header'
import { GraphPage } from './pages/GraphPage'
import { GalleryPage } from './pages/GalleryPage'

type Page = 'graph' | 'gallery'

export function App() {
  const [page, setPage] = useState<Page>('graph')
  const [focusId, setFocusId] = useState<string | null>(null)

  const handleGallerySelect = (id: string) => {
    setFocusId(id)
    setPage('graph')
  }

  return (
    <div className="h-dvh flex flex-col">
      <Header
        currentPage={page}
        onNavigateGraph={() => setPage('graph')}
        onNavigateGallery={() => setPage('gallery')}
      />
      {page === 'graph' ? (
        <GraphPage focusId={focusId} />
      ) : (
        <GalleryPage onSelect={handleGallerySelect} />
      )}
    </div>
  )
}

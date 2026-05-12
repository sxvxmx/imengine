import { useRef, useState, useEffect, useCallback } from 'react'
import { SimilarityGraph, type GraphHandle } from '../components/SimilarityGraph'
import { UploadZone } from '../components/UploadZone'
import { SearchPanel } from '../components/SearchPanel'
import { NodeInfo } from '../components/NodeInfo'
import { useGraph } from '../hooks/use-graph'
import type { GraphNode } from '../types'

interface GraphPageProps {
  focusId?: string | null
}

export function GraphPage({ focusId }: GraphPageProps) {
  const { state, centerId, loadRandom, loadSimilar, uploadAndSearch } = useGraph()
  const graphRef = useRef<GraphHandle>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [previewNode, setPreviewNode] = useState<GraphNode | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(false)

  const nodes = Array.from(state.nodes.values())
  const links = Array.from(state.links.values())

  useEffect(() => {
    if (focusId) {
      setLoading(true)
      loadSimilar(focusId).finally(() => setLoading(false))
    }
  }, [focusId])

  const handleNodeClick = useCallback(async (id: string) => {
    const node = state.nodes.get(id)
    setSelectedNode(node ?? null)
    setLoading(true)
    await loadSimilar(id)
    setLoading(false)
  }, [state.nodes, loadSimilar])

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleNodeDoubleClick = useCallback((id: string) => {
    const node = state.nodes.get(id)
    if (node) setPreviewNode(node)
  }, [state.nodes])

  const handleSearchById = useCallback(async (id: string) => {
    const node = state.nodes.get(id)
    setSelectedNode(node ?? null)
    setLoading(true)
    await loadSimilar(id)
    setLoading(false)
  }, [state.nodes, loadSimilar])

  const handleUpload = useCallback(async (file: File) => {
    setLoading(true)
    try {
      await uploadAndSearch(file)
    } finally {
      setLoading(false)
    }
  }, [uploadAndSearch])

  const handleLoadRandom = useCallback(async () => {
    setSelectedNode(null)
    setLoading(true)
    try {
      await loadRandom()
    } finally {
      setLoading(false)
    }
  }, [loadRandom])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      switch (e.key) {
        case 'Escape':
          if (previewNode) { setPreviewNode(null); return }
          setSelectedNode(null)
          break
        case '+': case '=': e.preventDefault(); graphRef.current?.zoomIn(); break
        case '-': e.preventDefault(); graphRef.current?.zoomOut(); break
        case '0': e.preventDefault(); graphRef.current?.resetView(); break
        case 'r': case 'R': handleLoadRandom(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [previewNode, handleLoadRandom])

  return (
    <div className="flex-1 flex overflow-hidden">
      {sidebarOpen && (
        <aside className="w-72 lg:w-80 shrink-0 border-r border-neutral-800 bg-neutral-950 flex flex-col overflow-y-auto scrollbar-thin">
          <div className="p-4 space-y-6">
            <UploadZone onUpload={handleUpload} isLoading={loading} />

            <SearchPanel onSearch={handleSearchById} isLoading={loading} />

            <div className="border-t border-neutral-800 pt-5">
              <NodeInfo node={selectedNode} />
            </div>

            <div className="border-t border-neutral-800 pt-5 space-y-3">
              <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Explore</h3>
              <button
                onClick={handleLoadRandom}
                disabled={loading}
                className="w-full px-3 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 rounded-lg text-xs text-neutral-300 transition-colors text-left"
              >
                Load random image
              </button>
              <div className="text-[10px] text-neutral-600 leading-relaxed">
                <p><kbd className="px-1 py-0.5 rounded bg-neutral-800 font-mono">+/-</kbd> Zoom &nbsp;<kbd className="px-1 py-0.5 rounded bg-neutral-800 font-mono">0</kbd> Reset</p>
                <p><kbd className="px-1 py-0.5 rounded bg-neutral-800 font-mono">Esc</kbd> Deselect &nbsp;<kbd className="px-1 py-0.5 rounded bg-neutral-800 font-mono">R</kbd> Random</p>
                <p className="mt-1">Double-click a node to preview</p>
              </div>
            </div>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col relative">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="absolute top-3 left-3 z-10 p-1.5 rounded-md bg-neutral-950/80 border border-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <svg className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        <SimilarityGraph
          ref={graphRef}
          nodes={nodes}
          links={links}
          selectedId={selectedNode?.id ?? null}
          centerId={centerId}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onBackgroundClick={handleBackgroundClick}
          onEmptyStateClick={handleLoadRandom}
        />
      </div>

      {previewNode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPreviewNode(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${previewNode.filename}`}
        >
          <div
            className="max-w-2xl w-full rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {previewNode.imageData && (
              <img
                src={`data:image/jpeg;base64,${previewNode.imageData}`}
                alt={previewNode.filename}
                className="w-full max-h-[70vh] object-contain bg-neutral-950"
              />
            )}
            <div className="p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm text-neutral-200 truncate">{previewNode.filename}</p>
                {previewNode.score !== undefined && (
                  <p className="text-xs text-sky-400 mt-0.5">{(previewNode.score * 100).toFixed(1)}% similarity</p>
                )}
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5 truncate">{previewNode.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPreviewNode(null)
                    handleNodeClick(previewNode.id)
                  }}
                  className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300 transition-colors"
                >
                  Explore in graph
                </button>
                <button
                  onClick={() => setPreviewNode(null)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-300 transition-colors"
                  aria-label="Close preview"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 text-[10px] text-neutral-700 font-mono text-right leading-relaxed pointer-events-none select-none">
        <div>+/- zoom &middot; 0 reset</div>
        <div>Esc deselect &middot; R random</div>
      </div>
    </div>
  )
}

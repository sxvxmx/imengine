import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react'
import type { GraphNode, GraphLink } from '../types'

interface Props {
  nodes: GraphNode[]
  links: GraphLink[]
  selectedId: string | null
  centerId: string | null
  onNodeClick: (id: string) => void
  onNodeDoubleClick?: (id: string) => void
  onBackgroundClick: () => void
  onEmptyStateClick?: () => void
}

export interface GraphHandle {
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
}

const NODE_RADIUS = 32
const NODE_RADIUS_SELECTED = 40
const MIN_SCALE = 0.15
const MAX_SCALE = 4
const DBL_CLICK_MS = 300

export const SimilarityGraph = forwardRef<GraphHandle, Props>(function SimilarityGraph(
  { nodes, links, selectedId, centerId, onNodeClick, onNodeDoubleClick, onBackgroundClick, onEmptyStateClick },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const draggedRef = useRef<Set<string>>(new Set())
  const frameRef = useRef(0)
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const hoveredRef = useRef<string | null>(null)
  const lastClickRef = useRef<{ id: string; time: number } | null>(null)
  const dragRef = useRef<{ active: boolean; nodeId: string | null; sx: number; sy: number; px: number; py: number }>({
    active: false,
    nodeId: null,
    sx: 0,
    sy: 0,
    px: 0,
    py: 0,
  })
  const [dim, setDim] = useState({ w: 800, h: 600 })
  const needsRender = useRef(true)

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setDim({ w: Math.floor(width), h: Math.floor(height) })
      needsRender.current = true
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Image cache
  useEffect(() => {
    const ids = new Set(nodes.map((n) => n.id))
    for (const key of imageCache.current.keys()) {
      if (!ids.has(key)) imageCache.current.delete(key)
    }
    for (const n of nodes) {
      if (imageCache.current.has(n.id) || !n.imageData) continue
      const img = new Image()
      img.src = `data:image/jpeg;base64,${n.imageData}`
      img.onload = () => { needsRender.current = true }
      imageCache.current.set(n.id, img)
    }
  }, [nodes])

  // Compute static layout — only assigns positions to NEW nodes
  useEffect(() => {
    if (nodes.length === 0) {
      positionsRef.current = new Map()
      needsRender.current = true
      return
    }

    const pos = new Map(positionsRef.current)

    for (const n of nodes) {
      if (pos.has(n.id)) continue

      let parentPos = { x: dim.w / 2, y: dim.h / 2 }
      let placed = false

      for (const l of links) {
        const parent = l.source === n.id ? l.target : l.target === n.id ? l.source : null
        if (parent && pos.has(parent)) {
          const pp = pos.get(parent)!
          const angle = Math.random() * Math.PI * 2
          const dist = 90 + (1 - (l.score ?? 0.5)) * 160
          pos.set(n.id, { x: pp.x + Math.cos(angle) * dist, y: pp.y + Math.sin(angle) * dist })
          placed = true
          break
        }
      }

      if (!placed) {
        const angle = Math.random() * Math.PI * 2
        const radius = Math.min(dim.w, dim.h) * 0.25
        pos.set(n.id, { x: dim.w / 2 + Math.cos(angle) * radius, y: dim.h / 2 + Math.sin(angle) * radius })
      }
    }

    // Remove stale entries
    const currentIds = new Set(nodes.map((n) => n.id))
    for (const key of pos.keys()) {
      if (!currentIds.has(key) && !draggedRef.current.has(key)) {
        pos.delete(key)
      }
    }

    positionsRef.current = pos
    needsRender.current = true
  }, [nodes, links, dim.w, dim.h])

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let active = true

    const render = () => {
      if (!active) return
      if (!needsRender.current) {
        frameRef.current = requestAnimationFrame(render)
        return
      }
      needsRender.current = false

      const { w, h } = dim
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h

      const tr = transformRef.current
      const pos = positionsRef.current
      const nodeMap = new Map(nodes.map((n) => [n.id, n]))

      ctx.clearRect(0, 0, w, h)

      ctx.save()
      ctx.translate(tr.x, tr.y)
      ctx.scale(tr.scale, tr.scale)

      // Draw edges
      for (const l of links) {
        const srcPos = pos.get(l.source)
        const tgtPos = pos.get(l.target)
        if (!srcPos || !tgtPos) continue
        const hovered = hoveredRef.current
        const isHighlighted =
          l.source === hovered || l.target === hovered
        const opacity = isHighlighted ? 0.8 : l.score * 0.55 + 0.05
        ctx.beginPath()
        ctx.moveTo(srcPos.x, srcPos.y)
        ctx.lineTo(tgtPos.x, tgtPos.y)
        ctx.strokeStyle = isHighlighted
          ? `rgba(56, 189, 248, ${opacity})`
          : `rgba(148, 163, 184, ${opacity})`
        ctx.lineWidth = isHighlighted
          ? Math.max(0.5, l.score * 3.5)
          : Math.max(0.5, l.score * 2.5)
        ctx.stroke()
      }

      // Draw nodes
      for (const n of nodes) {
        const p = pos.get(n.id)
        if (!p) continue
        const isSelected = n.id === selectedId
        const isHovered = n.id === hoveredRef.current
        const radius = isSelected ? NODE_RADIUS_SELECTED : isHovered ? NODE_RADIUS + 4 : NODE_RADIUS

        if (isSelected) {
          ctx.save()
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius + 8, 0, Math.PI * 2)
          const grad = ctx.createRadialGradient(p.x, p.y, radius, p.x, p.y, radius + 8)
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)')
          grad.addColorStop(1, 'rgba(56, 189, 248, 0)')
          ctx.fillStyle = grad
          ctx.fill()
          ctx.restore()
        }

        if (n.id === centerId && !isSelected) {
          ctx.save()
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius + 6, 0, Math.PI * 2)
          const grad = ctx.createRadialGradient(p.x, p.y, radius, p.x, p.y, radius + 6)
          grad.addColorStop(0, 'rgba(251, 191, 36, 0.2)')
          grad.addColorStop(1, 'rgba(251, 191, 36, 0)')
          ctx.fillStyle = grad
          ctx.fill()
          ctx.restore()
        }

        ctx.save()
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.clip()

        const img = imageCache.current.get(n.id)
        if (img?.complete && img.naturalWidth > 0) {
          const s = Math.max(img.naturalWidth, img.naturalHeight)
          const sc = (radius * 2) / s
          ctx.drawImage(img, p.x - (img.naturalWidth * sc) / 2, p.y - (img.naturalHeight * sc) / 2, img.naturalWidth * sc, img.naturalHeight * sc)
        } else {
          ctx.fillStyle = isHovered ? '#334155' : '#1e293b'
          ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2)
        }
        ctx.restore()

        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.strokeStyle = isSelected
          ? '#38bdf8'
          : isHovered
            ? 'rgba(255,255,255,0.4)'
            : n.id === centerId
              ? '#fbbf24'
              : 'rgba(255,255,255,0.12)'
        ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1
        ctx.stroke()

        const labelScale = Math.max(0.5, Math.min(1, tr.scale))
        ctx.fillStyle = isHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'
        ctx.font = `${Math.round(11 * labelScale)}px ui-monospace, SFMono-Regular, monospace`
        ctx.textAlign = 'center'
        ctx.fillText(n.filename, p.x, p.y + radius + 14 * labelScale)
      }

      ctx.restore()
      frameRef.current = requestAnimationFrame(render)
    }

    frameRef.current = requestAnimationFrame(render)
    return () => { active = false; cancelAnimationFrame(frameRef.current) }
  }, [dim, selectedId, centerId, nodes, links])

  // Hit test
  const hitTest = useCallback(
    (clientX: number, clientY: number): string | null => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return null
      const tr = transformRef.current
      const mx = (clientX - rect.left - tr.x) / tr.scale
      const my = (clientY - rect.top - tr.y) / tr.scale
      const pos = positionsRef.current

      let bestId: string | null = null
      let bestDist = Infinity

      for (const [id, p] of pos) {
        const r = id === selectedId ? NODE_RADIUS_SELECTED : NODE_RADIUS
        const dx = mx - p.x
        const dy = my - p.y
        const dist = dx * dx + dy * dy
        if (dist <= r * r && dist < bestDist) {
          bestDist = dist
          bestId = id
        }
      }
      return bestId
    },
    [selectedId],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const id = hitTest(e.clientX, e.clientY)
      if (id) {
        dragRef.current = { active: true, nodeId: id, sx: e.clientX, sy: e.clientY, px: positionsRef.current.get(id)?.x ?? 0, py: positionsRef.current.get(id)?.y ?? 0 }
      } else {
        dragRef.current = { active: true, nodeId: null, sx: e.clientX, sy: e.clientY, px: transformRef.current.x, py: transformRef.current.y }
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [hitTest],
  )

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Update hover
    const id = hitTest(e.clientX, e.clientY)
    if (hoveredRef.current !== id) {
      hoveredRef.current = id
      needsRender.current = true
    }

    const d = dragRef.current
    if (!d.active) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy

    if (d.nodeId) {
      const p = positionsRef.current.get(d.nodeId)
      if (p) {
        p.x = d.px + dx / transformRef.current.scale
        p.y = d.py + dy / transformRef.current.scale
        draggedRef.current.add(d.nodeId)
        needsRender.current = true
      }
    } else {
      transformRef.current.x = d.px + dx
      transformRef.current.y = d.py + dy
      needsRender.current = true
    }
  }, [hitTest])

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d.active) return

      if (d.nodeId) {
        const moved = Math.abs(e.clientX - d.sx) > 5 || Math.abs(e.clientY - d.sy) > 5
        if (!moved) {
          const now = Date.now()
          if (
            lastClickRef.current &&
            lastClickRef.current.id === d.nodeId &&
            now - lastClickRef.current.time < DBL_CLICK_MS
          ) {
            onNodeDoubleClick?.(d.nodeId)
            lastClickRef.current = null
          } else {
            lastClickRef.current = { id: d.nodeId, time: now }
            onNodeClick(d.nodeId)
          }
        }
      } else {
        const moved = Math.abs(e.clientX - d.sx) > 5 || Math.abs(e.clientY - d.sy) > 5
        if (!moved) onBackgroundClick()
      }

      dragRef.current = { active: false, nodeId: null, sx: 0, sy: 0, px: 0, py: 0 }
    },
    [onNodeClick, onNodeDoubleClick, onBackgroundClick],
  )

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const tr = transformRef.current
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, tr.scale * delta))
    tr.x = mx - (mx - tr.x) * (newScale / tr.scale)
    tr.y = my - (my - tr.y) * (newScale / tr.scale)
    tr.scale = newScale
    needsRender.current = true
  }, [])

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const tr = transformRef.current
      const newScale = Math.min(MAX_SCALE, tr.scale * 1.3)
      tr.x = dim.w / 2 - (dim.w / 2 - tr.x) * (newScale / tr.scale)
      tr.y = dim.h / 2 - (dim.h / 2 - tr.y) * (newScale / tr.scale)
      tr.scale = newScale
      needsRender.current = true
    },
    zoomOut: () => {
      const tr = transformRef.current
      const newScale = Math.max(MIN_SCALE, tr.scale / 1.3)
      tr.x = dim.w / 2 - (dim.w / 2 - tr.x) * (newScale / tr.scale)
      tr.y = dim.h / 2 - (dim.h / 2 - tr.y) * (newScale / tr.scale)
      tr.scale = newScale
      needsRender.current = true
    },
    resetView: () => {
      transformRef.current = { x: 0, y: 0, scale: 1 }
      needsRender.current = true
    },
  }), [dim])

  const hasNodes = nodes.length > 0

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden">
      {!hasNodes && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 z-10 cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label="Load a random image"
          onClick={() => onEmptyStateClick?.()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEmptyStateClick?.() }}
        >
          <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-neutral-400">No images in graph</p>
          <p className="text-xs text-neutral-600 mt-1">Click to load a random image</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        role="application"
        aria-label="Image similarity graph"
      />

      <div className="absolute bottom-4 left-4 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-950/90 backdrop-blur-sm overflow-hidden pointer-events-auto">
          <button
            onClick={() => {
              const tr = transformRef.current
              const newScale = Math.min(MAX_SCALE, tr.scale * 1.3)
              tr.x = dim.w / 2 - (dim.w / 2 - tr.x) * (newScale / tr.scale)
              tr.y = dim.h / 2 - (dim.h / 2 - tr.y) * (newScale / tr.scale)
              tr.scale = newScale
              needsRender.current = true
            }}
            className="px-3 py-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition-colors"
            aria-label="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <div className="w-px h-6 bg-neutral-800" />
          <button
            onClick={() => {
              const tr = transformRef.current
              const newScale = Math.max(MIN_SCALE, tr.scale / 1.3)
              tr.x = dim.w / 2 - (dim.w / 2 - tr.x) * (newScale / tr.scale)
              tr.y = dim.h / 2 - (dim.h / 2 - tr.y) * (newScale / tr.scale)
              tr.scale = newScale
              needsRender.current = true
            }}
            className="px-3 py-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition-colors"
            aria-label="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
          <div className="w-px h-6 bg-neutral-800" />
          <button
            onClick={() => {
              transformRef.current = { x: 0, y: 0, scale: 1 }
              needsRender.current = true
            }}
            className="px-3 py-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition-colors"
            aria-label="Reset view"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          </button>
        </div>
        <div className="text-[11px] text-neutral-600 font-mono pointer-events-auto">
          {nodes.length} nodes · {links.length} edges
        </div>
      </div>
    </div>
  )
})

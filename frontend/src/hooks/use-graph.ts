import { useState, useRef, useCallback } from 'react'
import { fetchRandom, searchSimilar, uploadImage, getImage } from '../api'
import type { GraphNode, GraphLink, ImageResult } from '../types'

function toNode(r: ImageResult): GraphNode {
  return { id: r.id, filename: r.filename, imageData: r.image_data ?? '', score: r.score }
}

function key(a: string, b: string) {
  return a < b ? `${a}--${b}` : `${b}--${a}`
}

interface GraphState {
  nodes: Map<string, GraphNode>
  links: Map<string, GraphLink>
}

const EMPTY: GraphState = { nodes: new Map(), links: new Map() }

export function useGraph() {
  const [state, setState] = useState<GraphState>(EMPTY)
  const [centerId, setCenterId] = useState<string | null>(null)
  const seq = useRef(0)

  const loadRandom = useCallback(async () => {
    const id = ++seq.current
    const res = await fetchRandom(1)
    if (id !== seq.current) return
    const img = res.images[0]
    if (!img?.image_data) return
    const nodes = new Map<string, GraphNode>()
    nodes.set(img.id, { id: img.id, filename: img.filename, imageData: img.image_data })
    setState({ nodes, links: new Map() })
    setCenterId(null)
  }, [])

  const loadSimilar = useCallback(async (queryId: string) => {
    const id = ++seq.current
    try {
      const res = await searchSimilar(queryId)
      if (id !== seq.current) return
      setState(prev => {
        const nodes = new Map(prev.nodes)
        const links = new Map(prev.links)
        for (const r of res.results) {
          if (r.id === queryId) {
            if (!nodes.has(queryId)) nodes.set(queryId, toNode(r))
          } else {
            if (!nodes.has(r.id)) nodes.set(r.id, toNode(r))
            const lk = key(queryId, r.id)
            if (!links.has(lk)) links.set(lk, { source: queryId, target: r.id, score: r.score })
          }
        }
        return { nodes, links }
      })
      setCenterId(queryId)
    } catch {
      const fallback = await getImage(queryId).catch(() => null)
      if (id !== seq.current) return
      if (fallback?.image_data) {
        const nodes = new Map<string, GraphNode>()
        nodes.set(queryId, { id: queryId, filename: fallback.filename, imageData: fallback.image_data })
        setState({ nodes, links: new Map() })
        setCenterId(queryId)
      }
    }
  }, [])

  const uploadAndSearch = useCallback(async (file: File) => {
    const id = ++seq.current
    const data = await uploadImage(file)
    if (id !== seq.current) return
    const nodes = new Map<string, GraphNode>()
    const links = new Map<string, GraphLink>()
    nodes.set(data.id, { id: data.id, filename: data.filename, imageData: data.image_data })
    for (const n of data.neighbors.slice(0, 5)) {
      if (n.id !== data.id) {
        nodes.set(n.id, toNode(n))
        links.set(key(data.id, n.id), { source: data.id, target: n.id, score: n.score })
      }
    }
    setState({ nodes, links })
    setCenterId(data.id)
  }, [])

  return { state, centerId, loadRandom, loadSimilar, uploadAndSearch }
}

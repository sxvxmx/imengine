import type { GraphNode } from '../types'

interface NodeInfoProps {
  node: GraphNode | null
}

export function NodeInfo({ node }: NodeInfoProps) {
  if (!node) {
    return (
      <div className="text-xs text-neutral-600 text-center py-8">
        Click a node to inspect
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Selected Image</h3>

      {node.imageData && (
        <div className="rounded-lg overflow-hidden bg-neutral-900">
          <img
            src={`data:image/jpeg;base64,${node.imageData}`}
            alt={node.filename}
            className="w-full aspect-square object-cover"
          />
        </div>
      )}

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-neutral-500">Filename</span>
          <span className="text-neutral-300 font-mono truncate ml-2 max-w-[180px]">{node.filename}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">ID</span>
          <span className="text-neutral-300 font-mono text-[10px] truncate ml-2 max-w-[180px]">{node.id}</span>
        </div>
        {node.score !== undefined && (
          <div className="flex justify-between">
            <span className="text-neutral-500">Similarity</span>
            <span className="text-sky-400 font-mono">{(node.score * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

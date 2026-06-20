// src\components\dashboard\KnowledgeGraph.tsx
'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import { X, Network, RefreshCw } from 'lucide-react'

interface GraphNode {
  id: string
  label: string
  vault_type: string
  source_title: string | null
  created_at: string
  x?: number
  y?: number
}

interface GraphEdge {
  from_id: string
  to_id: string
  strength: number
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

interface KnowledgeGraphProps {
  onClose: () => void
}

export default function KnowledgeGraph({
  onClose,
}: KnowledgeGraphProps) {
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)

  // ── Fetch graph data ──────────────────────────────────
  const fetchGraph = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/graph')
      const json = await res.json()

      if (json.error) throw new Error(json.error)

      // Assign positions using force-directed layout
      const nodes = assignPositions(
        json.nodes,
        json.edges
      )
      setData({ nodes, edges: json.edges })
    } catch (err) {
      console.error('Graph fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // External system: fetch on mount ✓
  useEffect(() => {
    let isMounted = true

    async function initFetch() {
      setLoading(true)
      try {
        const res = await fetch('/api/graph')
        const json = await res.json()
        if (json.error) throw new Error(json.error)

        if (isMounted) {
          const nodes = assignPositions(json.nodes, json.edges)
          setData({ nodes, edges: json.edges })
        }
      } catch (err) {
        console.error('Graph initial fetch error:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initFetch()

    return () => {
      isMounted = false
    }
  }, []) // Laws of React: An empty array here completely guarantees ONE execution on mount.

  // External system: Canvas draw ✓
  useEffect(() => {
    if (!data || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const W = canvas.offsetWidth
    const H = canvas.offsetHeight

    function draw() {
      if (!ctx || !data) return
      ctx.clearRect(0, 0, W, H)

      // Draw edges
      data.edges.forEach((edge) => {
        const from = data.nodes.find((n) => n.id === edge.from_id)
        const to = data.nodes.find((n) => n.id === edge.to_id)
        if (!from?.x || !to?.x) return

        ctx.beginPath()
        ctx.moveTo(from.x, from.y!)
        ctx.lineTo(to.x, to.y!)
        ctx.strokeStyle = `rgba(127, 119, 221, ${edge.strength * 0.6})`
        ctx.lineWidth = edge.strength * 2
        ctx.stroke()
      })

      // Draw nodes
      data.nodes.forEach((node) => {
        if (!node.x) return

        const isSelected = selected?.id === node.id
        const radius = isSelected ? 10 : 7

        // Node circle
        ctx.beginPath()
        ctx.arc(node.x, node.y!, radius, 0, Math.PI * 2)
        ctx.fillStyle =
          node.vault_type === 'personal'
            ? '#7F77DD'
            : '#378ADD'
        ctx.fill()

        if (isSelected) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.stroke()
        }

        // Label
        ctx.fillStyle = 'rgba(161, 161, 170, 0.9)' // zinc-400
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(
          node.label.slice(0, 20),
          node.x,
          node.y! + radius + 14
        )
      })
    }

    draw()

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [data, selected])

  // Click handler — find clicked node
  function handleCanvasClick(
    e: React.MouseEvent<HTMLCanvasElement>
  ) {
    if (!data || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clicked = data.nodes.find((node) => {
      if (!node.x) return false
      const dist = Math.sqrt(
        (node.x - x) ** 2 + (node.y! - y) ** 2
      )
      return dist < 15
    })

    setSelected(clicked ?? null)
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
            <Network size={12} className="text-white" />
          </div>
          <span className="text-sm font-medium text-white">
            Knowledge graph
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchGraph}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">
                Mapping connections...
              </p>
            </div>
          </div>
        ) : !data || data.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-center p-6">
            <div>
              <Network
                size={32}
                className="text-zinc-700 mx-auto mb-3"
              />
              <p className="text-zinc-500 text-sm font-medium mb-1">
                No connections yet
              </p>
              <p className="text-zinc-600 text-xs max-w-xs">
                Save more notes on similar topics. AI detects connections automatically.
              </p>
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-pointer"
            onClick={handleCanvasClick}
          />
        )}

        {/* Legend */}
        {data && data.nodes.length > 0 && (
          <div className="absolute bottom-4 left-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#7F77DD]" />
              <span className="text-xs text-zinc-500">Personal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#378ADD]" />
              <span className="text-xs text-zinc-500">Work</span>
            </div>
            <span className="text-xs text-zinc-600">
              {data.nodes.length} nodes · {data.edges.length} connections
            </span>
          </div>
        )}
      </div>

      {/* Selected node detail */}
      {selected && (
        <div className="border-t border-zinc-800 p-4 flex-shrink-0">
          <div className="flex items-start justify-between mb-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                selected.vault_type === 'personal'
                  ? 'bg-violet-500/10 text-violet-400'
                  : 'bg-blue-500/10 text-blue-400'
              }`}
            >
              {selected.vault_type}
            </span>
            <span className="text-xs text-zinc-600">
              {new Date(selected.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {selected.label}
          </p>
          {selected.source_title && (
            <p className="text-xs text-zinc-600 mt-1">
              {selected.source_title}
            </p>
          )}

          {/* Connected notes */}
          <div className="mt-3">
            <p className="text-xs text-zinc-600 mb-1.5">
              Connected to:
            </p>
            {data?.edges
              .filter(
                (e) =>
                  e.from_id === selected.id ||
                  e.to_id === selected.id
              )
              .slice(0, 3)
              .map((edge) => {
                const connectedId =
                  edge.from_id === selected.id
                    ? edge.to_id
                    : edge.from_id
                const connected = data.nodes.find(
                  (n) => n.id === connectedId
                )
                if (!connected) return null
                return (
                  <div
                    key={connectedId}
                    className="flex items-center justify-between py-1.5 border-b border-zinc-800 last:border-0"
                  >
                    <p className="text-xs text-zinc-400 flex-1 truncate">
                      {connected.label}
                    </p>
                    <span className="text-xs text-zinc-600 ml-2 flex-shrink-0">
                      {Math.round(edge.strength * 100)}% match
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

// Simple force-directed position assignment
function assignPositions(
  nodes: GraphNode[],
  edges: GraphEdge[]
): GraphNode[] {
  const W = 500
  const H = 400
  const cx = W / 2
  const cy = H / 2

  // Initial random positions
  const positioned = nodes.map((node, i) => ({
    ...node,
    x: cx + Math.cos((i / nodes.length) * Math.PI * 2) * 150,
    y: cy + Math.sin((i / nodes.length) * Math.PI * 2) * 150,
  }))

  // Simple force iterations — pull connected nodes together
  for (let iter = 0; iter < 50; iter++) {
    // Repulsion
    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const dx = positioned[i].x! - positioned[j].x!
        const dy = positioned[i].y! - positioned[j].y!
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = 800 / (dist * dist)
        positioned[i].x! += (dx / dist) * force
        positioned[i].y! += (dy / dist) * force
        positioned[j].x! -= (dx / dist) * force
        positioned[j].y! -= (dy / dist) * force
      }
    }

    // Attraction (connected nodes)
    edges.forEach((edge) => {
      const from = positioned.find((n) => n.id === edge.from_id)
      const to = positioned.find((n) => n.id === edge.to_id)
      if (!from || !to) return

      const dx = to.x! - from.x!
      const dy = to.y! - from.y!
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = dist * 0.05 * edge.strength

      from.x! += (dx / dist) * force
      from.y! += (dy / dist) * force
      to.x! -= (dx / dist) * force
      to.y! -= (dy / dist) * force
    })

    // Boundary clamp
    positioned.forEach((n) => {
      n.x = Math.max(30, Math.min(W - 30, n.x!))
      n.y = Math.max(30, Math.min(H - 30, n.y!))
    })
  }

  return positioned
}
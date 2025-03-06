"use client"

import type React from "react"

import { EdgeLabelRenderer, useReactFlow } from "reactflow"
import { Trash2 } from "lucide-react"

// Helper function to create orthogonal path
const getOrthogonalPath = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: string,
  targetPosition: string,
  sourceNode: any,
  targetNode: any,
  isLoop: boolean,
  sourceHandleId: string | null,
) => {
  // Default path (vertical first, then horizontal)
  let path = ""

  // Special case for loops (when target is above source)
  if (isLoop && targetY < sourceY) {
    // For loops, go right first, then up, then left to the target
    const offset = 50 // Offset to the right
    path = `M${sourceX},${sourceY} L${sourceX + offset},${sourceY} L${sourceX + offset},${targetY - 20} L${targetX},${targetY - 20} L${targetX},${targetY}`
    return path
  }

  // Handle special cases for selection and iteration nodes
  if (sourceNode?.type === "selection") {
    // If coming from left handle (false)
    if (sourcePosition === "left" || sourceHandleId === "false") {
      // Horizontal first, then vertical
      path = `M${sourceX},${sourceY} L${sourceX - 20},${sourceY} L${sourceX - 20},${targetY} L${targetX},${targetY}`
    }
    // If coming from right handle (true)
    else if (sourcePosition === "right" || sourceHandleId === "true") {
      // Horizontal first, then vertical
      path = `M${sourceX},${sourceY} L${sourceX + 20},${sourceY} L${sourceX + 20},${targetY} L${targetX},${targetY}`
    }
    // Default bottom handle
    else {
      path = `M${sourceX},${sourceY} L${sourceX},${sourceY + 20} L${targetX},${sourceY + 20} L${targetX},${targetY}`
    }
  } else if (sourceNode?.type === "iteration") {
    // If coming from bottom handle (false)
    if (sourcePosition === "bottom" || sourceHandleId === "false") {
      path = `M${sourceX},${sourceY} L${sourceX},${sourceY + 20} L${targetX},${sourceY + 20} L${targetX},${targetY}`
    }
    // If coming from right handle (true)
    else if (sourcePosition === "right" || sourceHandleId === "true") {
      // Horizontal first, then vertical
      path = `M${sourceX},${sourceY} L${sourceX + 20},${sourceY} L${sourceX + 20},${targetY} L${targetX},${targetY}`
    } else {
      // Default case
      const midY = (sourceY + targetY) / 2
      path = `M${sourceX},${sourceY} L${sourceX},${midY} L${targetX},${midY} L${targetX},${targetY}`
    }
  }
  // Handle special cases for True/False statement nodes
  else if (sourceNode?.type === "selection" && targetNode?.type === "trueStatement" && sourceHandleId === "true") {
    // True branch from selection node
    path = `M${sourceX},${sourceY} L${sourceX + 20},${sourceY} L${sourceX + 20},${targetY} L${targetX},${targetY}`
  } else if (sourceNode?.type === "selection" && targetNode?.type === "falseStatement" && sourceHandleId === "false") {
    // False branch from selection node
    path = `M${sourceX},${sourceY} L${sourceX - 20},${sourceY} L${sourceX - 20},${targetY} L${targetX},${targetY}`
  } else if (sourceNode?.type === "iteration" && targetNode?.type === "trueStatement" && sourceHandleId === "true") {
    // True branch from iteration node (loop continues)
    path = `M${sourceX},${sourceY} L${sourceX + 20},${sourceY} L${sourceX + 20},${targetY} L${targetX},${targetY}`
  } else if (sourceNode?.type === "iteration" && targetNode?.type === "falseStatement" && sourceHandleId === "false") {
    // False branch from iteration node (exit loop)
    path = `M${sourceX},${sourceY} L${sourceX},${sourceY + 20} L${targetX},${sourceY + 20} L${targetX},${targetY}`
  }
  // Default case - vertical first, then horizontal
  else {
    // Calculate midpoint Y
    const midY = (sourceY + targetY) / 2
    path = `M${sourceX},${sourceY} L${sourceX},${midY} L${targetX},${midY} L${targetX},${targetY}`
  }

  return path
}

// Function to detect if a connection is a loop (going back up)
const isLoopConnection = (sourceNode: any, targetNode: any, sourceY: number, targetY: number, edges: any[]) => {
  // If target is above source, it's potentially a loop
  if (targetY < sourceY) {
    return true
  }

  // Check if there's a path from target to source (indicating a loop)
  const visited = new Set()
  const stack = [targetNode?.id]

  while (stack.length > 0) {
    const currentId = stack.pop()

    if (currentId === sourceNode?.id) {
      return true // Found a path back to source
    }

    if (!visited.has(currentId)) {
      visited.add(currentId)

      // Find all outgoing edges from this node
      const outgoingEdges = edges.filter((edge) => edge.source === currentId)
      for (const edge of outgoingEdges) {
        stack.push(edge.target)
      }
    }
  }

  return false
}

const OrthogonalEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  label,
  selected,
  sourceHandle,
  data,
}: any) => {
  const { setEdges, getNode, getEdges } = useReactFlow()

  // Get source and target nodes
  const sourceNode = getNode(source)
  const targetNode = getNode(target)
  const allEdges = getEdges()

  // Calculate the midpoint for the label
  const labelX = (sourceX + targetX) / 2
  const labelY = (sourceY + targetY) / 2

  // Get the source handle ID from either the sourceHandle prop or data
  const sourceHandleId = sourceHandle || data?.sourceHandleId

  // Determine source position based on handle ID
  let effectiveSourcePosition = sourcePosition
  if (sourceHandleId === "true") {
    if (sourceNode?.type === "selection") {
      // For selection nodes, true can be on either left or right depending on flipped state
      // We'll rely on the sourcePosition to be correct
      effectiveSourcePosition = sourcePosition
    } else if (sourceNode?.type === "iteration") {
      effectiveSourcePosition = "right"
    }
  } else if (sourceHandleId === "false") {
    if (sourceNode?.type === "selection") {
      // For selection nodes, false can be on either left or right depending on flipped state
      // We'll rely on the sourcePosition to be correct
      effectiveSourcePosition = sourcePosition
    } else if (sourceNode?.type === "iteration") {
      effectiveSourcePosition = "bottom"
    }
  }

  // Check if this is a loop connection
  const loop = isLoopConnection(sourceNode, targetNode, sourceY, targetY, allEdges)

  // Get the orthogonal path
  const path = getOrthogonalPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    effectiveSourcePosition,
    targetPosition,
    sourceNode,
    targetNode,
    loop,
    sourceHandleId,
  )

  const onEdgeClick = (evt: React.MouseEvent<SVGGElement, MouseEvent>, id: string) => {
    evt.stopPropagation()
    setEdges((edges) => edges.filter((edge) => edge.id !== id))
  }

  // Default style with gray color
  const defaultStyle = {
    stroke: "#888888",
    strokeWidth: 1.5,
    fill: "none",
    ...style,
  }

  return (
    <>
      <path id={id} className="react-flow__edge-path" d={path} style={defaultStyle} />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: "#f5f5f5",
              padding: "2px 4px",
              borderRadius: "4px",
              fontSize: 12,
              fontWeight: 500,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}

      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px,${(sourceY + targetY) / 2 - 20}px)`,
              pointerEvents: "all",
              cursor: "pointer",
            }}
            className="nodrag nopan"
            onClick={(event) => onEdgeClick(event, id)}
          >
            <div className="bg-red-500 text-white p-1 rounded-full">
              <Trash2 size={16} />
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default OrthogonalEdge


"use client"

import type React from "react"

import { Handle, Position, type NodeProps, useReactFlow } from "reactflow"
import { Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const IterationNode = ({ data, isConnectable, selected, id }: NodeProps) => {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(data.label || "Loop")
  const [trueSlotFilled, setTrueSlotFilled] = useState(false)
  const [falseSlotFilled, setFalseSlotFilled] = useState(false)
  const [isDraggingOverTrue, setIsDraggingOverTrue] = useState(false)
  const [isDraggingOverFalse, setIsDraggingOverFalse] = useState(false)
  const [trueNodeId, setTrueNodeId] = useState<string | null>(null)
  const [falseNodeId, setFalseNodeId] = useState<string | null>(null)
  const [trueSlotType, setTrueSlotType] = useState<"true" | "false" | null>(null)
  const [falseSlotType, setFalseSlotType] = useState<"true" | "false" | null>(null)
  const inputRef = useRef<HTMLDivElement>(null)
  const nodeRef = useRef<HTMLDivElement>(null)
  const trueSlotRef = useRef<HTMLDivElement>(null)
  const falseSlotRef = useRef<HTMLDivElement>(null)
  const { getNodes, setNodes, getEdges, setEdges } = useReactFlow()

  // Update the label when data.label changes
  useEffect(() => {
    setLabel(data.label || "Loop")
  }, [data.label])

  // Check if slots are filled
  useEffect(() => {
    const nodes = getNodes()
    const edges = getEdges()

    // Check if true slot is filled
    const trueConnections = edges.filter((edge) => edge.source === id && edge.sourceHandle === "true")
    setTrueSlotFilled(trueConnections.length > 0)

    // Find the node ID connected to the true slot
    if (trueConnections.length > 0) {
      const connectedNodeId = trueConnections[0].target
      const connectedNode = nodes.find((node) => node.id === connectedNodeId)
      if (connectedNode) {
        setTrueNodeId(connectedNodeId)
        setTrueSlotType(connectedNode.type === "trueStatement" ? "true" : "false")
      } else {
        setTrueNodeId(null)
        setTrueSlotType(null)
      }
    } else {
      setTrueNodeId(null)
      setTrueSlotType(null)
    }

    // Check if false slot is filled
    const falseConnections = edges.filter((edge) => edge.source === id && edge.sourceHandle === "false")
    setFalseSlotFilled(falseConnections.length > 0)

    // Find the node ID connected to the false slot
    if (falseConnections.length > 0) {
      const connectedNodeId = falseConnections[0].target
      const connectedNode = nodes.find((node) => node.id === connectedNodeId)
      if (connectedNode) {
        setFalseNodeId(connectedNodeId)
        setFalseSlotType(connectedNode.type === "trueStatement" ? "true" : "false")
      } else {
        setFalseNodeId(null)
        setFalseSlotType(null)
      }
    } else {
      setFalseNodeId(null)
      setFalseSlotType(null)
    }
  }, [getNodes, getEdges, id])

  // Focus the input when editing starts
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()

      // Place cursor at the end of the text
      const range = document.createRange()
      const selection = window.getSelection()
      range.selectNodeContents(inputRef.current)
      range.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [editing])

  // Add click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editing && nodeRef.current && !nodeRef.current.contains(event.target as Node)) {
        finishEditing()
      }
    }

    if (editing) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [editing])

  const handleClick = () => {
    if (!editing) {
      setEditing(true)
    }
  }

  // Update the finishEditing function to preserve line breaks
  const finishEditing = () => {
    setEditing(false)
    if (inputRef.current) {
      // Use innerHTML instead of textContent to preserve line breaks
      const newLabel = inputRef.current.innerHTML
      setLabel(newLabel)
      data.label = newLabel
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent ReactFlow from handling the keydown event
    e.stopPropagation()

    // Shift+Enter to finish editing
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault()
      finishEditing()
    }
    // Regular Enter to add a new line
    else if (e.key === "Enter") {
      // Don't prevent default to allow the new line to be inserted
      // But still stop propagation to prevent ReactFlow from handling it
    }
  }

  // Handle drag over for the slots
  const handleDragOver = (e: React.DragEvent, slotType: "true" | "false") => {
    e.preventDefault()

    // Get the dragged node type
    const nodeType = e.dataTransfer.getData("application/reactflow/type")

    // Check if a True or False node is being dragged
    const isTrueNode = nodeType === "trueStatement"
    const isFalseNode = nodeType === "falseStatement"

    // Set the dragOver state for the appropriate slot
    if (slotType === "true") {
      setIsDraggingOverTrue(true)
    } else {
      setIsDraggingOverFalse(true)
    }

    // Check if we already have this type in the other slot
    const otherSlotType = slotType === "true" ? falseSlotType : trueSlotType
    const hasDuplicateType = (isTrueNode && otherSlotType === "true") || (isFalseNode && otherSlotType === "false")

    // Allow drop if:
    // 1. We're dragging a True or False statement
    // 2. We don't already have this type in the other slot
    const canDrop = (isTrueNode || isFalseNode) && !hasDuplicateType

    if (canDrop) {
      e.dataTransfer.dropEffect = "link"
    } else {
      e.dataTransfer.dropEffect = "none"
    }
  }

  const handleDragLeave = (slotType: "true" | "false") => {
    if (slotType === "true") {
      setIsDraggingOverTrue(false)
    } else {
      setIsDraggingOverFalse(false)
    }
  }

  // Handle drop on slots
  const handleDrop = (e: React.DragEvent, slotType: "true" | "false") => {
    e.preventDefault()

    // Reset drag over state
    if (slotType === "true") {
      setIsDraggingOverTrue(false)
    } else {
      setIsDraggingOverFalse(false)
    }

    // Get the dragged node information
    const nodeType = e.dataTransfer.getData("application/reactflow/type")

    // Check if we're dragging a True or False statement
    const isCorrectType = nodeType === "trueStatement" || nodeType === "falseStatement"

    // Check if we already have this type in the other slot
    const otherSlotType = slotType === "true" ? falseSlotType : trueSlotType
    const hasDuplicateType =
      (nodeType === "trueStatement" && otherSlotType === "true") ||
      (nodeType === "falseStatement" && otherSlotType === "false")

    if (!isCorrectType || hasDuplicateType) return

    // Update the slot state
    if (slotType === "true") {
      setTrueSlotFilled(true)
      setTrueSlotType(nodeType === "trueStatement" ? "true" : "false")
    } else {
      setFalseSlotFilled(true)
      setFalseSlotType(nodeType === "trueStatement" ? "true" : "false")
    }
  }

  return (
    <div className="relative" ref={nodeRef}>
      <div
        className="shadow-md bg-white border-2 border-gray-300 w-[120px] h-[120px] flex items-center justify-center rotate-45"
        onClick={handleClick}
      >
        <div className="-rotate-45 text-center w-full px-2">
          <div
            ref={inputRef}
            contentEditable={editing}
            suppressContentEditableWarning
            className="font-bold outline-none break-words whitespace-pre-wrap"
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
            dangerouslySetInnerHTML={{ __html: label }}
          ></div>
        </div>
      </div>

      {/* Connection points */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!bg-black !w-2 !h-2 !top-[5px]"
        style={{ transform: "translateX(0) rotate(0deg)" }}
      />

      {/* True slot (Loop) */}
      <div
        ref={trueSlotRef}
        data-slot="true"
        className="absolute -right-32 top-1/3 transform -translate-y-1/2 w-24 h-14 border-2 border-green-300 bg-green-50 rounded-md flex items-center justify-center"
      >
        <div className="font-bold text-green-700">True (Loop)</div>
      </div>

      {/* False slot (Exit) */}
      <div
        ref={falseSlotRef}
        data-slot="false"
        className="absolute bottom-[-44px] -left-[40px] w-24 h-14 border-2 border-red-300 bg-red-50 rounded-md flex items-center justify-center"
      >
        <div className="font-bold text-red-700 whitespace-nowrap">False (Exit)</div>
      </div>

      {/* Hidden handles for connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        isConnectable={isConnectable}
        className="!bg-black !w-2 !h-2 !right-[5px]"
        style={{ transform: "translateY(0) rotate(0deg)" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        isConnectable={isConnectable}
        className="!bg-black !w-2 !h-2 !bottom-[5px]"
        style={{ transform: "translateX(0) rotate(0deg)" }}
      />

      {/* Delete button */}
      {selected && (
        <div
          className="absolute -top-3 -right-3 bg-red-500 text-white p-1 rounded-full cursor-pointer z-10"
          onClick={(e) => {
            e.stopPropagation()
            data.onDelete && data.onDelete()
          }}
        >
          <Trash2 size={16} />
        </div>
      )}
    </div>
  )
}

export default IterationNode


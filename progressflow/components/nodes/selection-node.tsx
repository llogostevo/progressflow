"use client"

import type React from "react"

import { Handle, Position, type NodeProps, useReactFlow } from "reactflow"
import { Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const SelectionNode = ({ data, isConnectable, selected, id }: NodeProps) => {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(data.label || "Decision")
  const inputRef = useRef<HTMLDivElement>(null)
  const nodeRef = useRef<HTMLDivElement>(null)
  const trueSlotRef = useRef<HTMLDivElement>(null)
  const falseSlotRef = useRef<HTMLDivElement>(null)
  const { getNodes, setNodes, getEdges, setEdges } = useReactFlow()

  // Update the label when data.label changes
  useEffect(() => {
    setLabel(data.label || "Decision")
  }, [data.label])

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

      {/* Drop zones (slots) */}
      <div
        ref={trueSlotRef}
        data-slot="true"
        className="absolute -left-32 top-1/2 transform -translate-y-1/2 w-24 h-14 border-2 border-green-300 bg-green-50 rounded-md flex items-center justify-center"
      >
        <div className="font-bold text-green-700">True (If)</div>
      </div>

      <div
        ref={falseSlotRef}
        data-slot="false"
        className="absolute -right-32 top-1/2 transform -translate-y-1/2 w-24 h-14 border-2 border-red-300 bg-red-50 rounded-md flex items-center justify-center"
      >
        <div className="font-bold text-red-700 whitespace-nowrap">False (Else)</div>
      </div>

      {/* Hidden handles for connections */}
      <Handle
        type="source"
        position={Position.Left}
        id="true"
        isConnectable={isConnectable}
        className="!bg-black !w-2 !h-2 !left-[5px]"
        style={{ transform: "translateY(0) rotate(0deg)" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        isConnectable={isConnectable}
        className="!bg-black !w-2 !h-2 !right-[5px]"
        style={{ transform: "translateY(0) rotate(0deg)" }}
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

export default SelectionNode


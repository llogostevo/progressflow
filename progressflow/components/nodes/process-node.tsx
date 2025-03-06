"use client"

import type React from "react"

import { Handle, Position, type NodeProps } from "reactflow"
import { Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const ProcessNode = ({ data, isConnectable, selected }: NodeProps) => {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(data.label || "Process")
  const inputRef = useRef<HTMLDivElement>(null)
  const nodeRef = useRef<HTMLDivElement>(null)

  // Update the label when data.label changes
  useEffect(() => {
    setLabel(data.label || "Process")
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
        className={`shadow-md bg-white border-2 border-gray-300 rounded-md min-w-[120px] min-h-[60px] flex items-center justify-center ${
          selected ? "ring-2 ring-blue-500" : ""
        }`}
        onClick={handleClick}
      >
        <div className="px-4 py-2 text-center">
          <div
            ref={inputRef}
            contentEditable={editing}
            suppressContentEditableWarning
            className="font-bold outline-none whitespace-pre-wrap"
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
            dangerouslySetInnerHTML={{ __html: label }}
          ></div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!bg-black !w-2 !h-2 !top-[5px]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bg-black !w-2 !h-2 !bottom-[5px]"
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

export default ProcessNode


"use client"

import type React from "react"
import { useRef, useState } from "react"
import type { NodeProps } from "../types"
import { DragPreviewImage } from "./drag-preview-image"

interface IterationNodeProps extends NodeProps {
  trueSlotFilled: boolean
  falseSlotFilled: boolean
}

const IterationNode: React.FC<IterationNodeProps> = ({
  id,
  x,
  y,
  trueSlotFilled,
  falseSlotFilled,
  onDragStart,
  onDragEnd,
  children,
}) => {
  const [isDraggingOverTrue, setIsDraggingOverTrue] = useState(false)
  const [isDraggingOverFalse, setIsDraggingOverFalse] = useState(false)
  const trueSlotRef = useRef<HTMLDivElement>(null)
  const falseSlotRef = useRef<HTMLDivElement>(null)

  const handleDragOver = (e: React.DragEvent, slot: "true" | "false") => {
    e.preventDefault()
    e.stopPropagation()
    if (slot === "true") {
      setIsDraggingOverTrue(true)
    } else {
      setIsDraggingOverFalse(true)
    }
  }

  const handleDragLeave = (slot: "true" | "false") => {
    if (slot === "true") {
      setIsDraggingOverTrue(false)
    } else {
      setIsDraggingOverFalse(false)
    }
  }

  return (
    <div
      className="relative"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      draggable
      onDragStart={(e) => onDragStart(e, id)}
      onDragEnd={onDragEnd}
    >
      <DragPreviewImage id={id} />
      <div
        ref={trueSlotRef}
        data-slot="true"
        className={`absolute bottom-[-44px] left-1/2 transform -translate-x-1/2 w-24 h-14 border-2 ${
          trueSlotFilled
            ? "border-solid bg-white"
            : isDraggingOverTrue
              ? "border-dashed border-green-400 bg-green-50/30"
              : "border-dashed border-gray-300 bg-white/30"
        } rounded-md flex items-center justify-center`}
        onDragOver={(e) => handleDragOver(e, "true")}
        onDragLeave={() => handleDragLeave("true")}
      >
        <div className={`text-gray-500 font-medium text-sm ${trueSlotFilled ? "hidden" : ""}`}>Loop Slot</div>
      </div>
      <div
        ref={falseSlotRef}
        data-slot="false"
        className={`absolute -right-28 top-1/2 transform -translate-y-1/2 w-24 h-14 border-2 ${
          falseSlotFilled
            ? "border-solid bg-white"
            : isDraggingOverFalse
              ? "border-dashed border-red-400 bg-red-50/30"
              : "border-dashed border-gray-300 bg-white/30"
        } rounded-md flex items-center justify-center`}
        onDragOver={(e) => handleDragOver(e, "false")}
        onDragLeave={() => handleDragLeave("false")}
      >
        <div className={`text-gray-500 font-medium text-sm ${falseSlotFilled ? "hidden" : ""}`}>Exit Slot</div>
      </div>
      {children}
    </div>
  )
}

export default IterationNode


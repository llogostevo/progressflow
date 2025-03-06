"use client"

import type React from "react"
import { useRef } from "react"

interface SelectionNodeProps {
  trueSlotFilled: boolean
  falseSlotFilled: boolean
  isDraggingOverTrue: boolean
  isDraggingOverFalse: boolean
  handleDragOver: (e: React.DragEvent<HTMLDivElement>, slot: string) => void
  handleDragLeave: (slot: string) => void
}

const SelectionNode: React.FC<SelectionNodeProps> = ({
  trueSlotFilled,
  falseSlotFilled,
  isDraggingOverTrue,
  isDraggingOverFalse,
  handleDragOver,
  handleDragLeave,
}) => {
  const trueSlotRef = useRef<HTMLDivElement>(null)
  const falseSlotRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative w-64 h-24 border border-gray-300 rounded-md flex items-center justify-center">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {/* Your main content here */}
      </div>

      <div
        ref={trueSlotRef}
        data-slot="true"
        className={`absolute -right-28 top-1/2 transform -translate-y-1/2 w-24 h-14 border-2 ${
          trueSlotFilled
            ? "border-solid bg-white"
            : isDraggingOverTrue
              ? "border-dashed border-green-400 bg-green-50/30"
              : "border-dashed border-gray-300 bg-white/30"
        } rounded-md flex items-center justify-center`}
        onDragOver={(e) => handleDragOver(e, "true")}
        onDragLeave={() => handleDragLeave("true")}
      >
        <div className={`text-gray-500 font-medium text-sm ${trueSlotFilled ? "hidden" : ""}`}>True Slot</div>
      </div>

      <div
        ref={falseSlotRef}
        data-slot="false"
        className={`absolute -left-28 top-1/2 transform -translate-y-1/2 w-24 h-14 border-2 ${
          falseSlotFilled
            ? "border-solid bg-white"
            : isDraggingOverFalse
              ? "border-dashed border-red-400 bg-red-50/30"
              : "border-dashed border-gray-300 bg-white/30"
        } rounded-md flex items-center justify-center`}
        onDragOver={(e) => handleDragOver(e, "false")}
        onDragLeave={() => handleDragLeave("false")}
      >
        <div className={`text-gray-500 font-medium text-sm ${falseSlotFilled ? "hidden" : ""}`}>False Slot</div>
      </div>
    </div>
  )
}

export default SelectionNode


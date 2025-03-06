import { type EdgeProps, getBezierPath } from "reactflow"

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path stroke-gray-400"
        d={edgePath}
        markerEnd={markerEnd}
        strokeWidth={2}
      />
      {label && (
        <text
          x={labelX}
          y={labelY}
          className="react-flow__edge-text fill-gray-700 text-xs"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ pointerEvents: "none" }}
        >
          {label}
        </text>
      )}
    </>
  )
}

export default CustomEdge


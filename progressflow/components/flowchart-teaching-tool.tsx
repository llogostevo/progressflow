"use client"

import type React from "react"

import { useCallback, useRef, useState, useEffect, useReducer } from "react"
import ReactFlow, {
  Background,
  type Edge,
  type Node,
  type NodeTypes,
  type EdgeTypes,
  type Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  Panel,
} from "reactflow"
import "reactflow/dist/style.css"
import { toPng } from "html-to-image"

import StartEndNode from "./nodes/start-end-node"
import ProcessNode from "./nodes/process-node"
import InputOutputNode from "./nodes/input-output-node"
import SelectionNode from "./nodes/selection-node"
import IterationNode from "./nodes/iteration-node"
import OrthogonalEdge from "./edges/orthogonal-edge"
import { Download, Trash2, Undo, ZoomIn, ZoomOut, Move, AlertTriangle, X } from "lucide-react"

// Define node types
const nodeTypes: NodeTypes = {
  startEnd: StartEndNode,
  process: ProcessNode,
  inputOutput: InputOutputNode,
  selection: SelectionNode,
  iteration: IterationNode,
}

// Define edge types
const edgeTypes: EdgeTypes = {
  orthogonal: OrthogonalEdge,
}

// Initial nodes
const initialNodes: Node[] = []
const initialEdges: Edge[] = []

// History state type
type HistoryState = {
  past: Array<{ nodes: Node[]; edges: Edge[]; startEndCount: number }>
  present: { nodes: Node[]; edges: Edge[]; startEndCount: number }
  future: Array<{ nodes: Node[]; edges: Edge[]; startEndCount: number }>
}

// Action types for the history reducer
type HistoryAction =
  | { type: "SAVE_HISTORY" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "UPDATE_PRESENT"; payload: { nodes: Node[]; edges: Edge[]; startEndCount: number } }

// History reducer
const historyReducer = (state: HistoryState, action: HistoryAction): HistoryState => {
  switch (action.type) {
    case "SAVE_HISTORY":
      return {
        past: [...state.past, state.present],
        present: { ...state.present },
        future: [],
      }
    case "UNDO":
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        past: state.past.slice(0, state.past.length - 1),
        present: previous,
        future: [state.present, ...state.future],
      }
    case "REDO":
      if (state.future.length === 0) return state
      const next = state.future[0]
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      }
    case "UPDATE_PRESENT":
      return {
        ...state,
        present: action.payload,
      }
    default:
      return state
  }
}

// Custom Modal Component
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 mr-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
          </div>
          <button type="button" className="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-500" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            Delete All
          </button>
        </div>
      </div>
    </div>
  )
}

const FlowchartTeachingTool = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [startEndCount, setStartEndCount] = useState(0)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const { project, zoomIn: rfZoomIn, zoomOut: rfZoomOut, fitView } = useReactFlow()

  // Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Set up history state
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: { nodes: initialNodes, edges: initialEdges, startEndCount: 0 },
    future: [],
  })

  // Update the present state whenever nodes, edges, or startEndCount changes
  useEffect(() => {
    dispatch({
      type: "UPDATE_PRESENT",
      payload: { nodes, edges, startEndCount },
    })
  }, [nodes, edges, startEndCount])

  // Save history before making changes
  const saveHistory = useCallback(() => {
    dispatch({ type: "SAVE_HISTORY" })
  }, [])

  // Undo function
  const undo = useCallback(() => {
    if (history.past.length > 0) {
      dispatch({ type: "UNDO" })
      const previous = history.past[history.past.length - 1]
      setNodes(previous.nodes)
      setEdges(previous.edges)
      setStartEndCount(previous.startEndCount)
    }
  }, [history.past, setNodes, setEdges])

  // Handle connections between nodes
  const onConnect = useCallback(
    (params: Connection) => {
      // Save state before making changes
      saveHistory()

      // Check if the target node already has incoming connections
      const targetNode = nodes.find((node) => node.id === params.target)
      const existingEdgesToTarget = edges.filter((edge) => edge.target === params.target)

      // Allow multiple connections only for startEnd nodes and the top of iteration nodes
      const allowMultipleIncomingConnections =
        targetNode?.type === "startEnd" || (targetNode?.type === "iteration" && params.targetHandle === null)

      // If the node already has connections and doesn't allow multiple, don't add the new connection
      if (existingEdgesToTarget.length > 0 && !allowMultipleIncomingConnections) {
        console.log("Connection not allowed: Node already has an incoming connection")
        return
      }

      // Check if the source node already has outgoing connections from this handle
      const sourceNode = nodes.find((node) => node.id === params.source)
      const existingEdgesFromSourceHandle = edges.filter(
        (edge) => edge.source === params.source && edge.sourceHandle === params.sourceHandle,
      )

      // Only allow one connection per source handle (except for special cases)
      if (existingEdgesFromSourceHandle.length > 0) {
        console.log("Connection not allowed: Source handle already has an outgoing connection")
        return
      }

      // Create a custom edge with the orthogonal type
      // const newEdge: Edge = {
      //   ...params,
      //   type: "orthogonal",
      //   data: {
      //     sourceHandleId: params.sourceHandle,
      //   },
      //   style: { stroke: "#888888" },
      // }
      const newEdge: Edge = {
        id: `${params.source}-${params.target}-${Date.now()}`, // ✅ Unique ID
        source: params.source ?? "unknown-source", // ✅ Ensure valid string
        target: params.target ?? "unknown-target",
        type: "orthogonal",
        sourceHandle: params.sourceHandle ?? null,
        targetHandle: params.targetHandle ?? null,
        data: {
          sourceHandleId: params.sourceHandle ?? null,
        },
        style: { stroke: "#888888" },
      };


      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges, edges, nodes, saveHistory],
  )

  // Handle drag over event
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  // Generate a unique ID
  const getId = useCallback(() => `node_${Math.random().toString(36).substr(2, 9)}`, [])

  // Handle node deletion
  const onNodeDelete = useCallback(
    (nodeId: string) => {
      // Save state before making changes
      saveHistory()

      // Check if it's a startEnd node and decrement the counter if needed
      const nodeToDelete = nodes.find((node) => node.id === nodeId)
      if (nodeToDelete && nodeToDelete.type === "startEnd") {
        setStartEndCount((prev) => Math.max(0, prev - 1))
      }

      setNodes((nds) => nds.filter((node) => node.id !== nodeId))
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    },
    [nodes, setNodes, setEdges, saveHistory],
  )

  // Handle global click event to finish editing
  const onPaneClick = useCallback(() => {
    if (editingNodeId) {
      setEditingNodeId(null)
    }
  }, [editingNodeId, setEditingNodeId])

  // Set a node as being edited
  const setNodeAsEditing = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId)
  }, [])

  // Handle drop event
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      // Save state before making changes
      saveHistory()

      const type = event.dataTransfer.getData("application/reactflow/type")
      const draggedNodeId = event.dataTransfer.getData("application/reactflow/id")

      // Get the position of the drop
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      // Check if we're dropping a node on a slot
      // First check if we're over a Selection or Iteration node
      const targetNode = nodes.find((node) => {
        if (node.type !== "selection" && node.type !== "iteration") return false

        // Check if the drop position is over one of the slots
        const nodeElement = document.querySelector(`[data-id="${node.id}"]`)
        if (!nodeElement) return false

        // Get slots
        const trueSlot = nodeElement.querySelector(`[data-slot="true"]`)
        const falseSlot = nodeElement.querySelector(`[data-slot="false"]`)

        // Check if drop is over a slot
        if (trueSlot) {
          const trueSlotRect = trueSlot.getBoundingClientRect()
          if (
            event.clientX >= trueSlotRect.left &&
            event.clientX <= trueSlotRect.right &&
            event.clientY >= trueSlotRect.top &&
            event.clientY <= trueSlotRect.bottom
          ) {
            // Store the target node and slot information
            event.dataTransfer.setData("application/reactflow/targetNodeId", node.id)
            event.dataTransfer.setData("application/reactflow/targetHandleId", "true")
            return true
          }
        }

        if (falseSlot) {
          const falseSlotRect = falseSlot.getBoundingClientRect()
          if (
            event.clientX >= falseSlotRect.left &&
            event.clientX <= falseSlotRect.right &&
            event.clientY >= falseSlotRect.top &&
            event.clientY <= falseSlotRect.bottom
          ) {
            // Store the target node and slot information
            event.dataTransfer.setData("application/reactflow/targetNodeId", node.id)
            event.dataTransfer.setData("application/reactflow/targetHandleId", "false")
            return true
          }
        }

        return false
      })

      // If we're dropping a True/False statement on a slot
      if (targetNode && (type === "trueStatement" || type === "falseStatement")) {
        // We don't need to create a new node or connection
        // The slot will handle the display of T/F
        return
      }

      // If dragging an existing node (removing from a slot or repositioning)
      if (draggedNodeId) {
        const draggedNode = nodes.find((node) => node.id === draggedNodeId)

        // If the node exists and isn't being dragged to a new slot
        if (draggedNode && !targetNode) {
          // Remove any existing connections to this node
          setEdges((eds) => eds.filter((edge) => edge.target !== draggedNodeId))

          // Update the node's position
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === draggedNodeId) {
                return {
                  ...node,
                  position,
                }
              }
              return node
            }),
          )
          return
        }
      }

      if (!type || !reactFlowInstance || !reactFlowWrapper.current) {
        return
      }

      // Check if dropped on an edge
      const droppedOnEdge = edges.find((edge) => {
        // Get the source and target nodes
        const sourceNode = nodes.find((node) => node.id === edge.source)
        const targetNode = nodes.find((node) => node.id === edge.target)

        if (!sourceNode || !targetNode) return false

        // Get the center points of the source and target nodes
        const sourceX = sourceNode.position.x + (sourceNode.width || 100) / 2
        const sourceY = sourceNode.position.y + (sourceNode.height || 40) / 2
        const targetX = targetNode.position.x + (targetNode.width || 100) / 2
        const targetY = targetNode.position.y + (targetNode.height || 40) / 2

        // Calculate the distance from the drop position to the line segment between source and target
        const lineLength = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2))

        if (lineLength === 0) return false

        // Calculate the projection of the drop position onto the line
        const t =
          ((position.x - sourceX) * (targetX - sourceX) + (position.y - sourceY) * (targetY - sourceY)) /
          (lineLength * lineLength)

        // If t is outside [0, 1], the projection is outside the line segment
        if (t < 0 || t > 1) return false

        // Calculate the closest point on the line segment
        const projectionX = sourceX + t * (targetX - sourceX)
        const projectionY = sourceY + t * (targetY - sourceY)

        // Calculate the distance from the drop position to the closest point
        const distance = Math.sqrt(Math.pow(position.x - projectionX, 2) + Math.pow(position.y - projectionY, 2))

        return distance < 50 // Arbitrary threshold
      })

      let newNode: Node
      const nodeId = getId()

      // Create the new node based on type
      switch (type) {
        case "startEnd":
          // Determine if this should be a Start or End node
          let label = "End"
          if (startEndCount === 0) {
            label = "Start"
          }
          setStartEndCount((prev) => prev + 1)

          newNode = {
            id: nodeId,
            type,
            position,
            data: {
              label,
              onDelete: () => onNodeDelete(nodeId),
              isEditing: false,
              setAsEditing: () => setNodeAsEditing(nodeId),
              stopEditing: () => setEditingNodeId(null),
              isCurrentlyEditing: editingNodeId === nodeId,
            },
          }
          break
        case "process":
          newNode = {
            id: nodeId,
            type,
            position,
            data: {
              label: "Process",
              onDelete: () => onNodeDelete(nodeId),
              isEditing: false,
              setAsEditing: () => setNodeAsEditing(nodeId),
              stopEditing: () => setEditingNodeId(null),
              isCurrentlyEditing: editingNodeId === nodeId,
            },
          }
          break
        case "inputOutput":
          newNode = {
            id: nodeId,
            type,
            position,
            data: {
              label: "Input/Output",
              onDelete: () => onNodeDelete(nodeId),
              isEditing: false,
              setAsEditing: () => setNodeAsEditing(nodeId),
              stopEditing: () => setEditingNodeId(null),
              isCurrentlyEditing: editingNodeId === nodeId,
            },
          }
          break
        case "selection":
          newNode = {
            id: nodeId,
            type,
            position,
            data: {
              label: "Decision",
              onDelete: () => onNodeDelete(nodeId),
              isEditing: false,
              setAsEditing: () => setNodeAsEditing(nodeId),
              stopEditing: () => setEditingNodeId(null),
              isCurrentlyEditing: editingNodeId === nodeId,
              onSlotFilled: (slotType: string, nodeId: string) => {
                console.log(`Slot ${slotType} filled with node ${nodeId}`)
              },
            },
          }
          break
        case "iteration":
          newNode = {
            id: nodeId,
            type,
            position,
            data: {
              label: "Loop",
              onDelete: () => onNodeDelete(nodeId),
              isEditing: false,
              setAsEditing: () => setNodeAsEditing(nodeId),
              stopEditing: () => setEditingNodeId(null),
              isCurrentlyEditing: editingNodeId === nodeId,
              onSlotFilled: (slotType: string, nodeId: string) => {
                console.log(`Slot ${slotType} filled with node ${nodeId}`)
              },
            },
          }
          break
        default:
          return
      }

      setNodes((nds) => [...nds, newNode])

      // If dropped on an edge, create new connections
      if (droppedOnEdge) {
        const { source, target, id: edgeId, data } = droppedOnEdge

        // Remove the original edge
        setEdges((eds) => eds.filter((e) => e.id !== edgeId))

        // Create new edges to connect the new node
        // const newEdges: Edge[] = [
        //   {
        //     id: `${source}-${nodeId}`,
        //     source,
        //     target: nodeId,
        //     type: "orthogonal",
        //     sourceHandle: data?.sourceHandleId,
        //     data: {
        //       sourceHandleId: data?.sourceHandleId,
        //     },
        //     style: { stroke: "#888888" },
        //   },
        //   {
        //     id: `${nodeId}-${target}`,
        //     source: nodeId,
        //     target,
        //     type: "orthogonal",
        //     style: { stroke: "#888888" },
        //   },
        // ]

        const newEdges: Edge[] = [
          {
            id: `${source}-${nodeId}-${Date.now()}`, // ✅ Ensure unique ID
            source: source ?? "unknown-source",
            target: nodeId ?? "unknown-target",
            type: "orthogonal",
            sourceHandle: data?.sourceHandleId ?? null,
            targetHandle: null,
            data: {
              sourceHandleId: data?.sourceHandleId ?? null,
            },
            style: { stroke: "#888888" },
          },
          {
            id: `${nodeId}-${target}-${Date.now()}`,
            source: nodeId ?? "unknown-source",
            target: target ?? "unknown-target",
            type: "orthogonal",
            sourceHandle: null,
            targetHandle: null,
            data: {},
            style: { stroke: "#888888" },
          },
        ];




        setEdges((eds) => [...eds, ...newEdges])
      }
    },
    [
      reactFlowInstance,
      edges,
      nodes,
      setNodes,
      setEdges,
      getId,
      onNodeDelete,
      startEndCount,
      editingNodeId,
      saveHistory,
      setNodeAsEditing,
    ],
  )

  // Handle key down event for deleting nodes
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Check if the target is a contentEditable element
      const target = event.target as HTMLElement
      if (target.isContentEditable) {
        return // Don't handle deletion if we're editing text
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        // Save state before making changes
        saveHistory()

        const selectedNodes = nodes.filter((node) => node.selected)
        const selectedEdges = edges.filter((edge) => edge.selected)

        // Delete selected edges
        if (selectedEdges.length > 0) {
          setEdges((eds) => eds.filter((edge) => !edge.selected))
        }

        if (selectedNodes.length > 0) {
          // Update startEndCount if needed
          const startEndNodesToDelete = selectedNodes.filter((node) => node.type === "startEnd").length
          if (startEndNodesToDelete > 0) {
            setStartEndCount((prev) => Math.max(0, prev - startEndNodesToDelete))
          }

          // Get the connections for each selected node
          const nodesToDelete = new Set(selectedNodes.map((node) => node.id))

          // Find edges connected to the nodes to delete
          const edgesToDelete = edges.filter((edge) => nodesToDelete.has(edge.source) || nodesToDelete.has(edge.target))

          // Create a map of incoming and outgoing connections
          const incomingConnections = new Map<string, string[]>()
          const outgoingConnections = new Map<string, string[]>()

          edges.forEach((edge) => {
            if (!outgoingConnections.has(edge.source)) {
              outgoingConnections.set(edge.source, [])
            }
            outgoingConnections.get(edge.source)?.push(edge.target)

            if (!incomingConnections.has(edge.target)) {
              incomingConnections.set(edge.target, [])
            }
            incomingConnections.get(edge.target)?.push(edge.source)
          })

          // Remove the selected nodes
          setNodes((nds) => nds.filter((node) => !nodesToDelete.has(node.id)))

          // Remove the edges connected to the deleted nodes
          setEdges((eds) => eds.filter((edge) => !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)))

          // Try to reconnect the flow
          selectedNodes.forEach((node) => {
            const incoming = incomingConnections.get(node.id) || []
            const outgoing = outgoingConnections.get(node.id) || []

            // Connect incoming nodes to outgoing nodes
            incoming.forEach((source) => {
              if (!nodesToDelete.has(source)) {
                outgoing.forEach((target) => {
                  if (!nodesToDelete.has(target)) {
                    const newEdge: Edge = {
                      id: `${source}-${target}`,
                      source,
                      target,
                      type: "orthogonal",
                      style: { stroke: "#888888" },
                    }
                    setEdges((eds) => [...eds, newEdge])
                  }
                })
              }
            })
          })
        }
      }
    },
    [nodes, edges, setNodes, setEdges, setStartEndCount, saveHistory],
  )

  // Export flowchart as image
  const exportToImage = () => {
    if (reactFlowWrapper.current) {
      const flowElement = document.querySelector(".react-flow") as HTMLElement

      if (flowElement) {
        // Fix for SVG markers in the exported image
        const svgElements = flowElement.querySelectorAll("svg")
        const canvasWidth = flowElement.offsetWidth
        const canvasHeight = flowElement.offsetHeight

        // Apply specific styles to ensure proper rendering
        svgElements.forEach((svg) => {
          svg.setAttribute("width", svg.getBoundingClientRect().width.toString())
          svg.setAttribute("height", svg.getBoundingClientRect().height.toString())
        })

        // Ensure text doesn't wrap in the exported image
        const textElements = flowElement.querySelectorAll(".font-bold")
        textElements.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.whiteSpace = "nowrap"
          }
        })

        // Use html-to-image with specific settings
        // toPng(flowElement, {
        //   backgroundColor: "#fff",
        //   width: canvasWidth,
        //   height: canvasHeight,
        //   skipFonts: false, // Include fonts to ensure text renders correctly
        //   filter: (node) => {
        //     return !node.classList?.contains("react-flow__panel")
        //   },
        //   style: {
        //     ".react-flow__edge-path": {
        //       strokeWidth: "1.5px",
        //       stroke: "#888888",
        //       fill: "none",
        //     },
        //     ".react-flow__edge": {
        //       strokeLinecap: "square",
        //       strokeLinejoin: "miter",
        //     },
        //     ".font-bold": {
        //       whiteSpace: "nowrap",
        //     },
        //   },
        //   cacheBust: true,
        // })
        toPng(flowElement, {
          backgroundColor: "#fff",
          width: canvasWidth,
          height: canvasHeight,
          skipFonts: false,
          filter: (node) => {
            return !node.classList?.contains("react-flow__panel");
          },
          cacheBust: true,
        })

          .then((dataUrl) => {
            const link = document.createElement("a")
            link.download = "flowchart.png"
            link.href = dataUrl
            link.click()
          })
          .catch((error) => {
            console.error("Error exporting flowchart:", error)
            // Fallback method if the first attempt fails
            try {
              const canvas = document.createElement("canvas")
              canvas.width = canvasWidth
              canvas.height = canvasHeight
              const ctx = canvas.getContext("2d")

              if (ctx) {
                // Fill with white background
                ctx.fillStyle = "#ffffff"
                ctx.fillRect(0, 0, canvas.width, canvas.height)

                // Create an image from the HTML
                const img = new Image()
                img.crossOrigin = "anonymous"

                // Convert to data URL without trying to inline external resources
                const serializer = new XMLSerializer()
                const svgString = serializer.serializeToString(flowElement)
                const svgBlob = new Blob([svgString], { type: "image/svg+xml" })
                const url = URL.createObjectURL(svgBlob)

                img.onload = () => {
                  ctx.drawImage(img, 0, 0)
                  URL.revokeObjectURL(url)

                  // Convert canvas to PNG
                  const pngUrl = canvas.toDataURL("image/png")
                  const downloadLink = document.createElement("a")
                  downloadLink.download = "flowchart.png"
                  downloadLink.href = pngUrl
                  downloadLink.click()
                }

                img.src = url
              }
            } catch (fallbackError) {
              console.error("Fallback export method failed:", fallbackError)
              alert("Failed to export the flowchart. Please try again or use a screenshot tool.")
            }
          })
      }
    }
  }

  // Set up the initial view
  useEffect(() => {
    if (reactFlowInstance) {
      // Set a timeout to allow the component to fully render
      setTimeout(() => {
        // Apply the same view settings as the reset view function
        reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 0.4 })
        reactFlowInstance.fitView({ padding: 2 })
      }, 100)
    }
  }, [reactFlowInstance])

  // Function to clear all nodes and edges
  const clearAll = () => {
    saveHistory()
    setNodes([])
    setEdges([])
    setStartEndCount(0)
  }

  // Function to generate Hello World flowchart
  const generateHelloWorldFlowchart = () => {
    saveHistory()

    // Clear existing flowchart
    setNodes([])
    setEdges([])
    setStartEndCount(0)

    // Create nodes
    const startNode = {
      id: "node_start",
      type: "startEnd",
      position: { x: 0, y: 0 },
      data: { label: "Start", onDelete: () => onNodeDelete("node_start") },
    }

    const printNode = {
      id: "node_print",
      type: "inputOutput",
      position: { x: 0, y: 100 },
      data: { label: 'Print "Hello World"', onDelete: () => onNodeDelete("node_print") },
    }

    const endNode = {
      id: "node_end",
      type: "startEnd",
      position: { x: 0, y: 200 },
      data: { label: "End", onDelete: () => onNodeDelete("node_end") },
    }

    // Create edges
    const edge1 = {
      id: "edge_start_print",
      source: "node_start",
      target: "node_print",
      type: "orthogonal",
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    const edge2 = {
      id: "edge_print_end",
      source: "node_print",
      target: "node_end",
      type: "orthogonal",
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    // Set nodes and edges
    setNodes([startNode, printNode, endNode])
    setEdges([edge1, edge2])
    setStartEndCount(2)

    // Fit view to show the entire flowchart
    setTimeout(() => {
      fitView({ duration: 300, padding: 0.5 })
    }, 100)
  }

  // Function to generate Print 1 to 10 flowchart
  const generatePrintNumbersFlowchart = () => {
    saveHistory()

    // Clear existing flowchart
    setNodes([])
    setEdges([])
    setStartEndCount(0)

    // Create nodes
    const startNode = {
      id: "node_start",
      type: "startEnd",
      position: { x: 0, y: 0 },
      data: { label: "Start", onDelete: () => onNodeDelete("node_start") },
    }

    const initializeNode = {
      id: "node_initialize",
      type: "process",
      position: { x: 0, y: 100 },
      data: { label: "Set i = 1", onDelete: () => onNodeDelete("node_initialize") },
    }

    const loopNode = {
      id: "node_loop",
      type: "iteration",
      position: { x: 0, y: 200 },
      data: { label: "i <= 10?", onDelete: () => onNodeDelete("node_loop") },
    }

    const printNode = {
      id: "node_print",
      type: "inputOutput",
      position: { x: 150, y: 200 },
      data: { label: "Print i", onDelete: () => onNodeDelete("node_print") },
    }

    const incrementNode = {
      id: "node_increment",
      type: "process",
      position: { x: 150, y: 300 },
      data: { label: "i = i + 1", onDelete: () => onNodeDelete("node_increment") },
    }

    const endNode = {
      id: "node_end",
      type: "startEnd",
      position: { x: -150, y: 200 },
      data: { label: "End", onDelete: () => onNodeDelete("node_end") },
    }

    // Create edges
    const edge1 = {
      id: "edge_start_initialize",
      source: "node_start",
      target: "node_initialize",
      type: "orthogonal",
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    const edge2 = {
      id: "edge_initialize_loop",
      source: "node_initialize",
      target: "node_loop",
      type: "orthogonal",
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    const edge3 = {
      id: "edge_loop_print",
      source: "node_loop",
      target: "node_print",
      sourceHandle: "true",
      type: "orthogonal",
      data: { sourceHandleId: "true" },
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    const edge4 = {
      id: "edge_print_increment",
      source: "node_print",
      target: "node_increment",
      type: "orthogonal",
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    const edge5 = {
      id: "edge_increment_loop",
      source: "node_increment",
      target: "node_loop",
      type: "orthogonal",
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    const edge6 = {
      id: "edge_loop_end",
      source: "node_loop",
      target: "node_end",
      sourceHandle: "false",
      type: "orthogonal",
      data: { sourceHandleId: "false" },
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    // Set nodes and edges
    setNodes([startNode, initializeNode, loopNode, printNode, incrementNode, endNode])
    setEdges([edge1, edge2, edge3, edge4, edge5, edge6])
    setStartEndCount(2)

    // Fit view to show the entire flowchart
    setTimeout(() => {
      fitView({ duration: 300, padding: 0.5 })
    }, 100)
  }

  // Function to generate Age Check flowchart
  const generateAgeCheckFlowchart = () => {
    saveHistory()

    // Clear existing flowchart
    setNodes([])
    setEdges([])
    setStartEndCount(0)

    // Create nodes
    const startNode = {
      id: "node_start",
      type: "startEnd",
      position: { x: 0, y: 0 },
      data: { label: "Start", onDelete: () => onNodeDelete("node_start") },
    }

    const inputNode = {
      id: "node_input",
      type: "inputOutput",
      position: { x: 0, y: 100 },
      data: { label: "Input age", onDelete: () => onNodeDelete("node_input") },
    }

    const decisionNode = {
      id: "node_decision",
      type: "selection",
      position: { x: 0, y: 200 },
      data: { label: "age >= 18?", onDelete: () => onNodeDelete("node_decision") },
    }

    const printAdultNode = {
      id: "node_print_adult",
      type: "inputOutput",
      position: { x: 150, y: 200 },
      data: { label: 'Print "Adult"', onDelete: () => onNodeDelete("node_print_adult") },
    }

    const printMinorNode = {
      id: "node_print_minor",
      type: "inputOutput",
      position: { x: -150, y: 200 },
      data: { label: 'Print "Minor"', onDelete: () => onNodeDelete("node_print_minor") },
    }

    const endNode = {
      id: "node_end",
      type: "startEnd",
      position: { x: 0, y: 300 },
      data: { label: "End", onDelete: () => onNodeDelete("node_end") },
    }

    // Create edges
    const edge1 = {
      id: "edge_start_input",
      source: "node_start",
      target: "node_input",
      type: "orthogonal",
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    const edge2 = {
      id: "edge_input_decision",
      source: "node_input",
      target: "node_decision",
      type: "orthogonal",
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    const edge3 = {
      id: "edge_decision_adult",
      source: "node_decision",
      target: "node_print_adult",
      sourceHandle: "true",
      type: "orthogonal",
      data: { sourceHandleId: "true" },
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    const edge4 = {
      id: "edge_decision_minor",
      source: "node_decision",
      target: "node_print_minor",
      sourceHandle: "false",
      type: "orthogonal",
      data: { sourceHandleId: "false" },
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    const edge5 = {
      id: "edge_adult_end",
      source: "node_print_adult",
      target: "node_end",
      type: "orthogonal",
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    const edge6 = {
      id: "edge_minor_end",
      source: "node_print_minor",
      target: "node_end",
      type: "orthogonal",
      style: { stroke: "#888888", strokeWidth: 1.5, fill: "none" },
    }

    // Set nodes and edges
    setNodes([startNode, inputNode, decisionNode, printAdultNode, printMinorNode, endNode])
    setEdges([edge1, edge2, edge3, edge4, edge5, edge6])
    setStartEndCount(2)

    // Fit view to show the entire flowchart
    setTimeout(() => {
      fitView({ duration: 300, padding: 0.5 })
    }, 100)
  }

  // Show delete confirmation modal
  const showDeleteConfirmation = () => {
    setIsDeleteModalOpen(true)
  }

  // Update nodes data when editingNodeId changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isCurrentlyEditing: node.id === editingNodeId,
        },
      })),
    )
  }, [editingNodeId, setNodes])

  // Custom zoom in function
  const handleZoomIn = () => {
    rfZoomIn({ duration: 300 })
  }

  // Custom zoom out function
  const handleZoomOut = () => {
    rfZoomOut({ duration: 300 })
  }

  // Custom fit view function
  const handleFitView = () => {
    fitView({ duration: 300, padding: 0.5 })
  }

  return (
    <div className="w-full h-full" ref={reactFlowWrapper} onKeyDown={onKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: "orthogonal",
          style: {
            stroke: "#888888",
            strokeWidth: 1.5,
            fill: "none",
          },
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.4 }}
        fitViewOptions={{ padding: 0.5 }}
        minZoom={0.2}
        maxZoom={4}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background />
        <Panel position="top-right">
          <div className="flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="flex items-center justify-center bg-white border border-gray-300 p-2 rounded-md w-10 h-10 hover:bg-gray-100 group"
              title="Zoom In"
            >
              <ZoomIn size={18} className="text-gray-700 group-hover:text-gray-900" />
            </button>
            <button
              onClick={handleZoomOut}
              className="flex items-center justify-center bg-white border border-gray-300 p-2 rounded-md w-10 h-10 hover:bg-gray-100 group"
              title="Zoom Out"
            >
              <ZoomOut size={18} className="text-gray-700 group-hover:text-gray-900" />
            </button>
            <button
              onClick={handleFitView}
              className="flex items-center justify-center bg-white border border-gray-300 p-2 rounded-md w-10 h-10 hover:bg-gray-100 group"
              title="Fit View"
            >
              <Move size={18} className="text-gray-700 group-hover:text-gray-900" />
            </button>
            <button
              onClick={undo}
              className="flex items-center justify-center bg-white border border-gray-300 p-2 rounded-md w-10 h-10 hover:bg-gray-100 group"
              title="Undo"
              disabled={history.past.length === 0}
            >
              <Undo
                size={18}
                className={`${history.past.length === 0 ? "text-gray-400" : "text-gray-700 group-hover:text-gray-900"}`}
              />
            </button>
            <button
              onClick={exportToImage}
              className="flex items-center justify-center bg-primary text-primary-foreground p-2 rounded-md w-10 h-10 hover:bg-primary/90 group"
              title="Export as PNG"
            >
              <Download size={18} />
            </button>
            <button
              onClick={showDeleteConfirmation}
              className="flex items-center justify-center bg-destructive text-destructive-foreground p-2 rounded-md w-10 h-10 hover:bg-destructive/90 group"
              title="Clear All Shapes"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </Panel>
        <Panel position="top-left">
          <div className="flex flex-col gap-2 bg-white p-4 rounded-md shadow-md">
            <h3 className="font-bold mb-2">Flowchart Shapes</h3>
            <div className="flex flex-col gap-2">
              <div
                className="border border-gray-300 rounded-md p-2 cursor-move bg-white"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/reactflow/type", "startEnd")
                }}
              >
                Start/End
              </div>
              <div
                className="border border-gray-300 rounded-md p-2 cursor-move bg-white"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/reactflow/type", "process")
                }}
              >
                Process
              </div>
              <div
                className="border border-gray-300 rounded-md p-2 cursor-move bg-white"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/reactflow/type", "inputOutput")
                }}
              >
                Input/Output
              </div>
              <div
                className="border border-gray-300 roundedmd p-2 cursor-move bg-white"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/reactflow/type", "selection")
                }}
              >
                Selection (If/Else)
              </div>
              <div
                className="border border-gray-300 rounded-md p-2 cursor-move bg-white"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/reactflow/type", "iteration")
                }}
              >
                Iteration (Loop)
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>Drag shapes onto the canvas</p>
              <p>Click on text to edit labels</p>
              <p>Press Enter for new line, Shift+Enter to finish editing</p>
              <p>Click outside a shape to stop editing</p>
              <p>Select a node or edge to delete it</p>
              <p>Drop shapes on connections to insert</p>
            </div>

            <div className="mt-6 border-t pt-4">
              <h3 className="font-bold mb-2">Example Flowcharts</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={generateHelloWorldFlowchart}
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-left"
                >
                  Hello World
                </button>
                <button
                  onClick={generatePrintNumbersFlowchart}
                  className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors text-left"
                >
                  Print 1 to 10
                </button>
                <button
                  onClick={generateAgeCheckFlowchart}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-left"
                >
                  Age Check
                </button>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={clearAll}
        title="Clear All Shapes"
        message="This will delete all shapes and connections in your flowchart. This action cannot be undone."
      />
    </div>
  )
}

// Wrap with ReactFlowProvider
export default function FlowchartTeachingToolWithProvider() {
  return (
    <ReactFlowProvider>
      <FlowchartTeachingTool />
    </ReactFlowProvider>
  )
}


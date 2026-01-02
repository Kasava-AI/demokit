'use client'

/**
 * SchemaCanvas Component
 *
 * React Flow-based canvas for visualizing database schema with:
 * - Custom node components for models
 * - Dagre-based auto-layout with clustering
 * - Cardinality indicators on edges
 * - Pan/zoom controls
 */

import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import '@xyflow/react/dist/style.css'

import { SchemaNode } from './SchemaNode'
import { SchemaEdge } from './SchemaEdge'
import type {
  SchemaRelationship,
  SchemaModel,
  SchemaCluster,
} from './SchemaExplorerSheet'

// Node types
const nodeTypes: NodeTypes = {
  schemaNode: SchemaNode,
}

// Edge types
const edgeTypes: EdgeTypes = {
  schemaEdge: SchemaEdge,
}

// Layout constants
const NODE_WIDTH = 180
const NODE_HEIGHT = 80

interface SchemaCanvasProps {
  models: string[]
  relationships: SchemaRelationship[]
  modelSchemas?: Record<string, SchemaModel>
  clusters?: SchemaCluster[]
  selectedModel?: string
  onSelectModel?: (model: string | null) => void
  searchQuery?: string
}

// Create a Dagre graph and calculate layout
function getLayoutedElements(
  models: string[],
  relationships: SchemaRelationship[],
  modelSchemas?: Record<string, SchemaModel>,
  clusters?: SchemaCluster[],
  searchQuery?: string
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  // Use left-to-right layout for ERD-style diagrams
  dagreGraph.setGraph({
    rankdir: 'LR',
    nodesep: 60,
    ranksep: 100,
    marginx: 40,
    marginy: 40,
  })

  // Add nodes to the graph
  models.forEach((model) => {
    const schema = modelSchemas?.[model]
    const fieldCount = schema?.properties
      ? Object.keys(schema.properties).length
      : 0
    // Adjust height based on field count
    const height = Math.max(NODE_HEIGHT, 40 + fieldCount * 8)
    dagreGraph.setNode(model, { width: NODE_WIDTH, height })
  })

  // Add edges to the graph
  relationships.forEach((rel) => {
    dagreGraph.setEdge(rel.source, rel.target)
  })

  // Calculate layout
  dagre.layout(dagreGraph)

  // Create cluster color map
  const clusterColorMap = new Map<string, string>()
  clusters?.forEach((cluster) => {
    cluster.models.forEach((model) => {
      clusterColorMap.set(model, cluster.color)
    })
  })

  // Convert to React Flow nodes
  const nodes: Node[] = models.map((model) => {
    const nodeWithPosition = dagreGraph.node(model)
    const schema = modelSchemas?.[model]
    const clusterColor = clusterColorMap.get(model)
    const isHighlighted =
      searchQuery &&
      model.toLowerCase().includes(searchQuery.toLowerCase())

    return {
      id: model,
      type: 'schemaNode',
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
      data: {
        label: model,
        schema,
        clusterColor,
        isHighlighted,
        fieldCount: schema?.properties
          ? Object.keys(schema.properties).length
          : 0,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }
  })

  // Convert to React Flow edges with cardinality markers
  const edges: Edge[] = relationships.map((rel, index) => {
    // Determine marker based on relationship type
    const markerEnd =
      rel.type === 'one-to-many' || rel.type === 'many-to-many'
        ? { type: MarkerType.ArrowClosed, width: 15, height: 15 }
        : undefined

    const markerStart =
      rel.type === 'many-to-one' || rel.type === 'many-to-many'
        ? { type: MarkerType.ArrowClosed, width: 15, height: 15 }
        : undefined

    return {
      id: `${rel.source}-${rel.target}-${index}`,
      source: rel.source,
      target: rel.target,
      type: 'schemaEdge',
      data: {
        relationType: rel.type,
      },
      markerEnd,
      markerStart,
      style: {
        strokeWidth: 1.5,
      },
    }
  })

  return { nodes, edges }
}

export function SchemaCanvas({
  models,
  relationships,
  modelSchemas,
  clusters,
  selectedModel,
  onSelectModel,
  searchQuery,
}: SchemaCanvasProps) {
  // Calculate layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      getLayoutedElements(
        models,
        relationships,
        modelSchemas,
        clusters,
        searchQuery
      ),
    [models, relationships, modelSchemas, clusters, searchQuery]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when layout changes
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  // Handle node click
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onSelectModel?.(selectedModel === node.id ? null : node.id)
    },
    [onSelectModel, selectedModel]
  )

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    onSelectModel?.(null)
  }, [onSelectModel])

  // Update selected state on nodes
  const nodesWithSelection = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      selected: node.id === selectedModel,
      data: {
        ...node.data,
        isSelected: node.id === selectedModel,
      },
    }))
  }, [nodes, selectedModel])

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'schemaEdge',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          className="bg-background"
        />
        <Controls
          showZoom
          showFitView
          showInteractive={false}
          className="bg-background border rounded-lg shadow-sm"
        />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-muted/50 border rounded-lg"
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  )
}

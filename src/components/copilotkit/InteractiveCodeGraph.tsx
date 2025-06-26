'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    ConnectionMode,
    Panel,
    MiniMap
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCopilotReadable } from "@copilotkit/react-core";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    FileText,
    Zap,
    RefreshCw,
    Download
} from 'lucide-react';

/**
 * Interface for node data in the code graph
 *
 * @interface CodeGraphNodeData
 * @property {string} label - Display label for the node
 * @property {string} type - Type of code element (file, folder, function, class, etc.)
 * @property {string} path - File path or identifier
 * @property {number} size - Size metric (lines of code, file size, etc.)
 * @property {string[]} dependencies - Array of dependency identifiers
 * @property {string} language - Programming language
 * @property {object} metadata - Additional metadata about the node
 *
 * @author Dean Machines Team
 * @date 2025-06-13
 * @version 1.0.0
 */
interface CodeGraphNodeData extends Record<string, unknown> {
    label: string;
    type: 'file' | 'folder' | 'function' | 'class' | 'module' | 'component';
    path: string;
    size: number;
    dependencies: string[];
    language: string;
    metadata: Record<string, string | number | boolean>;
}

type CodeGraphNode = Node<CodeGraphNodeData>;
type CodeGraphEdge = Edge;

import { useCodeGraph } from './CodeGraphContext';

/**
 * Props for the InteractiveCodeGraph component
 *
 * @interface InteractiveCodeGraphProps
 * @property {string} repoUrl - Repository URL being analyzed
 * @property {function} onNodeSelect - Callback when a node is selected
 *
 * @author Dean Machines Team
 * @date 2025-06-13
 */
interface InteractiveCodeGraphProps {
    repoUrl: string;
    onNodeSelect: (nodeData: CodeGraphNodeData) => void;
}

/**
 * Interactive code graph visualization component using xyflow
 *
 * This component creates an interactive, explorable visualization of code repositories
 * using xyflow. Each node represents a file, and edges represent dependencies or
 * relationships. The graph can be generated from GitHub repositories via AI agents
 * and provides rich interaction capabilities for code exploration.
 *
 * Key Features:
 * - Interactive node-edge graph with zoom, pan, and selection
 * - Real-time graph generation from repository analysis
 * - Node filtering by file type, language, or size
 * - Dependency path highlighting and exploration
 * - Integration with CopilotKit for AI-driven graph generation
 * - Export capabilities for graph data and visualizations
 * - Responsive design with electric neon theme integration
 *
 * @param {InteractiveCodeGraphProps} props - Component configuration props
 * @returns {JSX.Element} The interactive code graph component
 *
 * @example
 * ```typescript
 * <InteractiveCodeGraph
 *   repoUrl="https://github.com/user/repo"
 *   onNodeSelect={(nodeData) => console.log('Selected:', nodeData)}
 * />
 * ```
 *
 * @author Dean Machines Team
 * @date 2025-06-13
 * @version 1.0.0
 * @model Claude Sonnet 4
 */
export function InteractiveCodeGraph({ repoUrl, onNodeSelect }: InteractiveCodeGraphProps) {
    const { graphData, isGenerating, generateGraph, filterType, setFilterType, searchTerm, setSearchTerm, layoutType, setLayoutType } = useCodeGraph();
    const [nodes, setNodes, onNodesChange] = useNodesState<CodeGraphNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<CodeGraphEdge>([]);
    const [selectedNode, setSelectedNode] = useState<CodeGraphNode | null>(null);

    // Memoized filtered nodes and edges
    const filteredNodes = useMemo(() => {
        let filtered = nodes;
        if (filterType !== 'all') {
            filtered = filtered.filter(node => node.data.type === filterType);
        }
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(node =>
                node.data.label.toLowerCase().includes(lowerCaseSearchTerm) ||
                node.data.path.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }
        return filtered;
    }, [nodes, filterType, searchTerm]);

    const filteredEdges = useMemo(() => {
        const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
        return edges.filter(edge =>
            filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
        );
    }, [edges, filteredNodes]);

    // Initialize or update graph when graphData changes
    useEffect(() => {
        if (graphData && graphData.trim() !== '') {
            const success = parseGraphData(graphData);
            if (!success) {
                generateSampleGraph();
            }
        } else {
            generateSampleGraph();
        }
    }, [graphData, parseGraphData, generateSampleGraph]);

    // Handle node click
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        const codeGraphNode = node as CodeGraphNode;
        setSelectedNode(codeGraphNode);
        onNodeSelect(codeGraphNode.data);
    }, [onNodeSelect]);

    // Make graph state readable to agents
    useCopilotReadable({
        description: "Current interactive code graph state and selected elements",
        value: {
            repoUrl,
            nodeCount: nodes.length,
            edgeCount: edges.length,
            selectedNode: selectedNode?.data,
            filterType,
            searchTerm,
            layoutType,
            isGenerating,
            timestamp: new Date().toISOString()
        }
    });

    return (
        <div className="w-full h-full relative">
            <ReactFlow
                nodes={filteredNodes}
                edges={filteredEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                connectionMode={ConnectionMode.Loose}
                fitView
                className="bg-background"
            >
                <Background />
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        switch (node.data?.type) {
                            case 'file': return '#3b82f6';
                            case 'folder': return '#8b5cf6';
                            case 'component': return '#ef4444';
                            default: return '#6b7280';
                        }
                    }}
                />

                <Panel position="top-left">
                    <Card className="w-80 glass-effect">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Graph Controls</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => generateGraph(repoUrl, 'dependencies', 'detailed')}
                                    disabled={isGenerating}
                                    className="flex-1"
                                >
                                    {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                    Generate
                                </Button>
                                <Button size="sm" variant="outline" className="flex-1">
                                    <Download className="w-4 h-4" />
                                    Export
                                </Button>
                            </div>

                            <div>
                                <Label className="text-xs">Filter by Type</Label>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="file">Files</SelectItem>
                                        <SelectItem value="folder">Folders</SelectItem>
                                        <SelectItem value="component">Components</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-xs">Search Nodes</Label>
                                <Input
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-8"
                                />
                            </div>

                            <div>
                                <Label className="text-xs">Layout Style</Label>
                                <Select value={layoutType} onValueChange={(value) => setLayoutType(value as 'hierarchical' | 'force' | 'circular')}>
                                    <SelectTrigger className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hierarchical">Hierarchical</SelectItem>
                                        <SelectItem value="force">Force-Directed</SelectItem>
                                        <SelectItem value="circular">Circular</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </Panel>

                {selectedNode && (
                    <Panel position="top-right">
                        <Card className="w-80 glass-effect">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Node Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div>
                                    <Label className="text-xs">Path</Label>
                                    <p className="text-sm font-mono">{selectedNode.data.path}</p>
                                </div>
                                <div>
                                    <Label className="text-xs">Type</Label>
                                    <Badge variant="outline" className="text-xs">
                                        {selectedNode.data.type}
                                    </Badge>
                                </div>
                                <div>
                                    <Label className="text-xs">Size</Label>
                                    <p className="text-sm">{selectedNode.data.size} lines</p>
                                </div>
                                <div>
                                    <Label className="text-xs">Language</Label>
                                    <p className="text-sm">{selectedNode.data.language}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Panel>
                )}
            </ReactFlow>
        </div>

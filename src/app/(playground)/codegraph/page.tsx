'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgent } from '../layout';
import { GitBranch, FileText, Code, Network, MessageSquare, Zap } from 'lucide-react';
import { InteractiveCodeGraph } from '@/components/copilotkit/InteractiveCodeGraph';
import { CodeGraphChatModal } from '@/components/copilotkit/CodeGraphChatModal';
import { Actions } from '@/components/copilotkit/Actions';

interface CodeGraphNodeData {
    label: string;
    type: 'file' | 'folder' | 'function' | 'class' | 'module' | 'component';
    path: string;
    size: number;
    dependencies: string[];
    language: string;
    metadata: Record<string, string | number | boolean>;
}

// Example user and preferences (replace with real context/hooks as needed)
const currentUser = {
  id: 'playground-user',
  name: 'Playground User',
  email: 'user@example.com',
};
const userPreferences = {
  theme: 'electric-neon',
  notifications: true,
};

/**
 * CodeGraphPage - Playground for agent-driven code graph analysis, visualization, and chat workflows.
 *
 * Integrates CopilotKit custom components (InteractiveCodeGraph, CodeGraphChatModal, Actions) for a seamless
 * multi-agent experience. State and actions are synchronized between the main page and modals/components.
 *
 * @returns {JSX.Element} The code graph playground page
 * @author Dean Machines Team
 * @date 2025-01-13
 */
export default function CodeGraphPage() {
    const [repoUrl, setRepoUrl] = useState('');
    const [graphData, setGraphData] = useState<string>('');
    const [analysisResults, setAnalysisResults] = useState<string>('');
    const [workflowStatus, setWorkflowStatus] = useState<string>('');
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const { setCurrentEndpoint } = useAgent();

    useCopilotReadable({
        description: "Current code graph analysis session",
        value: {
            repoUrl,
            graphData,
            analysisResults,
            workflowStatus,
            user: currentUser,
            preferences: userPreferences,
            timestamp: new Date().toISOString(),
        }
    });

    useCopilotAction({
        name: "switchToGitAgent",
        description: "Switch to the git agent for repository operations",
        parameters: [],
        handler: async () => {
            setCurrentEndpoint('http://localhost:4111/copilotkit/git');
            return "Switched to Git Agent - specialized for repository analysis and version control";
        },
    });

    useCopilotAction({
        name: "switchToGraphAgent",
        description: "Switch to the graph agent for graph analysis and visualization",
        parameters: [],
        handler: async () => {
            setCurrentEndpoint('http://localhost:4111/copilotkit/graph');
            return "Switched to Graph Agent - specialized for graph analysis and visualization";
        },
    });

    useCopilotAction({
        name: "switchToCodeAgent",
        description: "Switch to the code agent for code analysis",
        parameters: [],
        handler: async () => {
            setCurrentEndpoint('http://localhost:4111/copilotkit/code');
            return "Switched to Code Agent - specialized for code analysis and generation";
        },
    });

    useCopilotAction({
        name: "setRepositoryUrl",
        description: "Set the repository URL for analysis",
        parameters: [
            {
                name: "url",
                type: "string",
                description: "GitHub repository URL to analyze",
            }
        ],
        handler: async ({ url }) => {
            setRepoUrl(url);
            setWorkflowStatus(`Repository URL set: ${url}`);
            return `Repository URL set to: ${url}`;
        },
    });

    useCopilotAction({
        name: "recordAnalysisResults",
        description: "Record code analysis results",
        parameters: [
            {
                name: "results",
                type: "string",
                description: "Analysis results to record",
            },
            {
                name: "analysisType",
                type: "string",
                description: "Type of analysis performed",
                enum: ["structure", "dependencies", "complexity", "patterns"],
            }
        ],
        handler: async ({ results, analysisType }) => {
            const timestamp = new Date().toISOString();
            const entry = `[${timestamp}] ${analysisType.toUpperCase()} ANALYSIS:\n${results}`;
            setAnalysisResults(prev => prev ? `${prev}\n\n${entry}` : entry);
            return `Recorded ${analysisType} analysis results`;
        },
    });

    useCopilotAction({
        name: "recordGraphData",
        description: "Record graph visualization data",
        parameters: [
            {
                name: "data",
                type: "string",
                description: "Graph data or visualization information",
            },
            {
                name: "graphType",
                type: "string",
                description: "Type of graph generated",
                enum: ["dependency", "call", "module", "class"],
            }
        ],
        handler: async ({ data, graphType }) => {
            const timestamp = new Date().toISOString();
            const entry = `[${timestamp}] ${graphType.toUpperCase()} GRAPH:\n${data}`;
            setGraphData(prev => prev ? `${prev}\n\n${entry}` : entry);
            return `Recorded ${graphType} graph data`;
        },
    });

    useCopilotAction({
        name: "updateWorkflowStatus",
        description: "Update the current workflow status",
        parameters: [
            {
                name: "status",
                type: "string",
                description: "Current workflow status",
            }
        ],
        handler: async ({ status }) => {
            const timestamp = new Date().toISOString();
            const entry = `[${timestamp}] ${status}`;
            setWorkflowStatus(prev => prev ? `${prev}\n${entry}` : entry);
            return `Workflow status updated: ${status}`;
        },
    });

    useCopilotAction({
        name: "generateInteractiveGraph",
        description: "Generate an interactive code graph from the current repository using advanced workflows",
        parameters: [
            {
                name: "graphType",
                type: "string",
                description: "Type of graph to generate",
                enum: ["dependency", "call-graph", "module-hierarchy", "all"],
            },
            {
                name: "analysisDepth",
                type: "string",
                description: "Depth of analysis to perform",
                enum: ["basic", "detailed", "comprehensive"],
            }
        ],
        handler: async ({ graphType, analysisDepth }) => {
            if (!repoUrl) {
                return "Please set a repository URL first using the setRepositoryUrl action";
            }

            setWorkflowStatus(prev => prev ? `${prev}\n[${new Date().toISOString()}] Starting ${graphType} graph generation with ${analysisDepth} analysis...` : `[${new Date().toISOString()}] Starting ${graphType} graph generation with ${analysisDepth} analysis...`);

            try {
                // Use real Mastra workflow API - Advanced Code Graph Maker
                const response = await fetch('http://localhost:4111/api/workflows/advancedCodeGraphMaker/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': 'playground-user',
                        'X-Session-ID': `session-${Date.now()}`
                    },
                    body: JSON.stringify({
                        inputData: {
                            githubRepoUrl: repoUrl,
                            options: {
                                analysisDepth,
                                graphType,
                                visualStyle: 'hierarchical',
                                includeTests: false
                            }
                        },
                        runtimeContext: {
                            'user-id': 'playground-user',
                            'session-id': `session-${Date.now()}`
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`Workflow failed: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();

                // Extract graph data from workflow result
                const graphData = result.result?.graphResults?.graphJson || result.result?.graphData;

                if (graphData) {
                    setGraphData(JSON.stringify(graphData, null, 2));
                    setWorkflowStatus(prev => prev ? `${prev}\n[${new Date().toISOString()}] Interactive ${graphType} graph generated successfully!` : `[${new Date().toISOString()}] Interactive ${graphType} graph generated successfully!`);
                    return `Generated interactive ${graphType} graph with ${analysisDepth} analysis for ${repoUrl}. Workflow ID: ${result.workflowId}`;
                } else {
                    setWorkflowStatus(prev => prev ? `${prev}\n[${new Date().toISOString()}] Workflow completed but no graph data returned` : `[${new Date().toISOString()}] Workflow completed but no graph data returned`);
                    return `Workflow completed but no graph data was generated. Status: ${result.result?.status}`;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                setWorkflowStatus(prev => prev ? `${prev}\n[${new Date().toISOString()}] ERROR: ${errorMessage}` : `[${new Date().toISOString()}] ERROR: ${errorMessage}`);
                return `Failed to generate graph: ${errorMessage}`;
            }
        },
    });

    // Handler for Actions component to execute agent/graph/code actions
    const handleActionExecute = (actionName: string) => {
        setWorkflowStatus(prev => prev ? `${prev}\n[${new Date().toISOString()}] Action executed: ${actionName}` : `[${new Date().toISOString()}] Action executed: ${actionName}`);
    };
    const handleActionComplete = (actionName: string, result: unknown) => {
        setWorkflowStatus(prev => prev ? `${prev}\n[${new Date().toISOString()}] Action completed: ${actionName}` : `[${new Date().toISOString()}] Action completed: ${actionName}`);
        if (actionName === 'analyzeRepository' && typeof result === 'string') {
            setAnalysisResults(result);
        }
        if (actionName === 'generateCodeGraph' && typeof result === 'string') {
            setGraphData(result);
        }
    };
    const handleActionError = (actionName: string, error: string) => {
        setWorkflowStatus(prev => prev ? `${prev}\n[${new Date().toISOString()}] Action error: ${actionName} - ${error}` : `[${new Date().toISOString()}] Action error: ${actionName} - ${error}`);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    {/* Agent status indicator */}
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse" title="Agent online" />
                      <span className="text-sm text-foreground font-medium">Agent: <span className="font-bold">{currentUser.name}</span></span>
                    </div>
                    {/* Workflow progress bar (simple, based on workflowStatus) */}
                    <div className="flex-1 mx-6">
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        {/* Calculate progress as a number of steps (max 100%) */}
                        {(() => {
                          const progress = workflowStatus ? Math.min(100, workflowStatus.split('\n').length * 10) : 0;
                          let widthClass = 'w-0';
                          if (progress >= 100) widthClass = 'w-full';
                          else if (progress >= 80) widthClass = 'w-5/6';
                          else if (progress >= 60) widthClass = 'w-3/4';
                          else if (progress >= 40) widthClass = 'w-2/4';
                          else if (progress >= 20) widthClass = 'w-1/4';
                          else if (progress > 0) widthClass = 'w-1/6';
                          return (
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${widthClass} ${workflowStatus.includes('ERROR') ? 'bg-red-500' : workflowStatus.includes('completed') || workflowStatus.includes('success') ? 'bg-green-500' : 'bg-primary'}`}
                            />
                          );
                        })()}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{workflowStatus.split('\n').slice(-1)[0]}</span>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div className="mb-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Repository Configuration</CardTitle>
                                    <CardDescription>
                                        Set the repository URL for analysis
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Label htmlFor="repo-url">Repository URL</Label>
                                            <Input
                                                id="repo-url"
                                                value={repoUrl}
                                                onChange={(e) => setRepoUrl(e.target.value)}
                                                placeholder="https://github.com/user/repo"
                                                className="mt-1"
                                            />
                                        </div>
                                        <Button
                                            onClick={() => setWorkflowStatus(`Repository URL set: ${repoUrl}`)}
                                            className="mt-6"
                                        >
                                            Set URL
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Tabs defaultValue="analysis" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                                <TabsTrigger value="graph">Graph Data</TabsTrigger>
                                <TabsTrigger value="workflow">Workflow</TabsTrigger>
                            </TabsList>

                            <TabsContent value="analysis" className="mt-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Code className="h-5 w-5" />
                                            Code Analysis Results
                                        </CardTitle>
                                        <CardDescription>
                                            Recorded analysis results from code agent
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {analysisResults ? (
                                            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-96 whitespace-pre-wrap">
                                                {analysisResults}
                                            </pre>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                <p>No analysis results yet. Ask the AI to analyze code structure.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="graph" className="mt-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Network className="h-5 w-5" />
                                            Interactive Code Graph
                                        </CardTitle>
                                        <CardDescription>
                                            Interactive visualization of repository structure and dependencies
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-[600px] border rounded-lg bg-muted/20">
                                            <InteractiveCodeGraph
                                                graphData={graphData}
                                                repoUrl={repoUrl}
                                                onNodeSelect={(nodeData: CodeGraphNodeData) => {
                                                    setAnalysisResults(prev =>
                                                        prev ? `${prev}\n\n[${new Date().toISOString()}] NODE SELECTED:\n${JSON.stringify(nodeData, null, 2)}`
                                                            : `[${new Date().toISOString()}] NODE SELECTED:\n${JSON.stringify(nodeData, null, 2)}`
                                                    );
                                                }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="workflow" className="mt-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <GitBranch className="h-5 w-5" />
                                            Workflow Status
                                        </CardTitle>
                                        <CardDescription>
                                            Current workflow progress and status updates
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {workflowStatus ? (
                                            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-96 whitespace-pre-wrap">
                                                {workflowStatus}
                                            </pre>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                <p>No workflow status yet. Start by setting a repository URL.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <Card className="h-[800px]">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Code Graph Assistant
                                </CardTitle>
                                <CardDescription>
                                    Multi-agent code analysis and visualization
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[calc(100%-120px)]">
                                <CopilotChat
                                    labels={{
                                        title: "Code Graph Assistant",
                                        initial: "I can help you analyze code repositories and create visualizations:\n\n• Switch between git, code, and graph agents\n• Set repository URLs for analysis\n• Record analysis results and findings\n• Generate graph visualization data\n• Track workflow progress\n\nStart by setting a repository URL or switching to a specialized agent!",
                                    }}
                                    className="h-full"
                                />
                            </CardContent>
                        </Card>
                        {/* Actions component for agent and workflow actions */}
                        <Card className="h-[600px]">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5" />
                                    Actions
                                </CardTitle>
                                <CardDescription>
                                    Run agent, code, and graph actions
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[calc(100%-80px)] overflow-auto">
                                <Actions
                                    onActionExecute={handleActionExecute}
                                    onActionComplete={handleActionComplete}
                                    onActionError={handleActionError}
                                    showExecutionHistory={true}
                                    allowCustomActions={false}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Floating Chat Button */}
            <motion.div
                className="fixed bottom-6 right-6 z-40"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
            >
                <Button
                    onClick={() => setIsChatModalOpen(true)}
                    size="lg"
                    className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 neon-glow pulse-glow shadow-lg"
                >
                    <MessageSquare className="w-6 h-6" />
                </Button>
            </motion.div>

            {/* Code Graph Chat Modal */}
            <CodeGraphChatModal
                isOpen={isChatModalOpen}
                onOpenChange={setIsChatModalOpen}
                currentRepo={repoUrl}
                onGraphGenerate={async (repoUrl, options) => {
                    setWorkflowStatus(prev => prev ? `${prev}\n[${new Date().toISOString()}] Generating ${options.graphType} graph with ${options.analysisDepth} analysis...` : `[${new Date().toISOString()}] Generating ${options.graphType} graph with ${options.analysisDepth} analysis...`);

                    try {
                        // Use real Mastra workflow API - Advanced Code Graph Maker
                        const response = await fetch('http://localhost:4111/api/workflows/advancedCodeGraphMaker/start', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-User-ID': 'playground-user',
                                'X-Session-ID': `session-${Date.now()}`
                            },
                            body: JSON.stringify({
                                inputData: {
                                    githubRepoUrl: repoUrl,
                                    options: {
                                        analysisDepth: options.analysisDepth,
                                        graphType: options.graphType,
                                        visualStyle: options.visualStyle,
                                        includeTests: options.includeTests
                                    }
                                },
                                runtimeContext: {
                                    'user-id': 'playground-user',
                                    'session-id': `session-${Date.now()}`
                                }
                            })
                        });

                        if (!response.ok) {
                            throw new Error(`Workflow failed: ${response.status} ${response.statusText}`);
                        }

                        const result = await response.json();

                        // Extract graph data from workflow result
                        const graphData = result.result?.graphResults?.graphJson || result.result?.graphData;

                        if (graphData) {
                            setGraphData(JSON.stringify(graphData, null, 2));
                            setWorkflowStatus(prev => prev ? `${prev}\n[${new Date().toISOString()}] Graph generated successfully! Workflow ID: ${result.workflowId}` : `[${new Date().toISOString()}] Graph generated successfully! Workflow ID: ${result.workflowId}`);
                        } else {
                            setWorkflowStatus(prev => prev ? `${prev}\n[${new Date().toISOString()}] Workflow completed but no graph data returned` : `[${new Date().toISOString()}] Workflow completed but no graph data returned`);
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        setWorkflowStatus(prev => prev ? `${prev}\n[${new Date().toISOString()}] ERROR: ${errorMessage}` : `[${new Date().toISOString()}] ERROR: ${errorMessage}`);
                    }
                }}
                onAgentSwitch={(agentType) => {
                    setCurrentEndpoint(`http://localhost:4111/copilotkit/${agentType}`);
                    setWorkflowStatus(prev => prev ? `${prev}\n[${new Date().toISOString()}] Switched to ${agentType} agent` : `[${new Date().toISOString()}] Switched to ${agentType} agent`);
                }}
            />
        </div>
    );
}

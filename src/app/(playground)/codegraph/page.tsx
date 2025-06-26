import { useCodeGraph } from '@/components/copilotkit/CodeGraphContext';

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
    const { repoUrl, setRepoUrl, graphData, analysisResults, workflowStatus } = useCodeGraph();

    // Handler for Actions component to execute agent/graph/code actions
    const handleActionExecute = (actionName: string) => {
        // You can use the updateWorkflowStatus action from the context here if needed
    };
    const handleActionComplete = (actionName: string, result: unknown) => {
        // You can use the recordAnalysisResults action from the context here if needed
    };
    const handleActionError = (actionName: string, error: string) => {
        // You can use the updateWorkflowStatus action from the context here if needed
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    {/* Agent status indicator */}
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse" title="Agent online" />
                      <span className="text-sm text-foreground font-medium">Agent: <span className="font-bold">Code Graph Assistant</span></span>
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
                                            onClick={() => {}}
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
                                                repoUrl={repoUrl}
                                                onNodeSelect={(nodeData: any) => {
                                                    // You can use the recordAnalysisResults action from the context here if needed
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
                    onClick={() => {}}
                    size="lg"
                    className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 neon-glow pulse-glow shadow-lg"
                >
                    <MessageSquare className="w-6 h-6" />
                </Button>
            </motion.div>

            {/* Code Graph Chat Modal */}
            <CodeGraphChatModal
                isOpen={false}
                onOpenChange={() => {}}
                currentRepo={repoUrl}
                onGraphGenerate={async (repoUrl, options) => {
                    // You can use the generateGraph action from the context here
                }}
                onAgentSwitch={(agentType) => {
                    // You can use the setCurrentEndpoint action from the context here
                }}
            />
        </div>
    );
}

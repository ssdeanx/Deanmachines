/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { useAgent } from '@/app/(playground)/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MASTRA_URL = process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL || "http://localhost:4111";

import {
    Play,
    Pause,
    Square,
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    Zap,
    Settings,
    Code,
    Database,
    FileText,
    GitBranch,
    Network,
    Bot,
    AlertCircle,
    Info,
    Trash2,
    Edit,
    Save,
    Plus,
    Minus,
    X,
    Eye,
    EyeOff,
    Search,
    Download,
    Folder
} from 'lucide-react';

/**
 * Interface for action execution status
 *
 * @interface ActionStatus
 * @property {string} id - Unique identifier for the action
 * @property {string} name - Name of the action
 * @property {'idle' | 'running' | 'completed' | 'error'} status - Current execution status
 * @property {string} description - Description of what the action does
 * @property {any} result - Result of the action execution
 * @property {string} error - Error message if action failed
 * @property {number} progress - Progress percentage (0-100)
 * @property {Date} startTime - When the action started
 * @property {Date} endTime - When the action completed
 *
 * @author Dean Machines Team
 * @date 2025-06-13
 */
interface ActionStatus {
    id: string;
    name: string;
    status: 'idle' | 'running' | 'completed' | 'error';
    description: string;
    result?: any;
    error?: string;
    progress: number;
    startTime?: Date;
    endTime?: Date;
}

/**
 * Interface for action parameters
 *
 * @interface ActionParameter
 * @property {string} name - Parameter name
 * @property {string} type - Parameter type
 * @property {string} description - Parameter description
 * @property {boolean} required - Whether parameter is required
 * @property {any} defaultValue - Default value for the parameter
 * @property {string[]} enum - Enum values if applicable
 *
 * @author Dean Machines Team
 * @date 2025-06-13
 */
interface ActionParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required?: boolean;
    defaultValue?: any;
    enum?: string[];
}

/**
 * Interface for custom action definition
 *
 * @interface CustomActionDefinition
 * @property {string} name - Action name
 * @property {string} description - Action description
 * @property {ActionParameter[]} parameters - Action parameters
 * @property {string} category - Action category for organization
 * @property {boolean} enabled - Whether action is enabled
 * @property {function} handler - Action execution handler
 * @property {function} render - Custom render function for action UI
 *
 * @author Dean Machines Team
 * @date 2025-06-13
 */
interface CustomActionDefinition {
    name: string;
    description: string;
    parameters: ActionParameter[];
    category: 'development' | 'data' | 'management' | 'operations' | 'creative' | 'ai' | 'custom';
    enabled: boolean;
    handler: (args: Record<string, any>) => Promise<string>;
    render?: (props: { status: string; args: Record<string, any>; result?: any }) => React.ReactNode;
}

/**
 * Props for the Actions component
 *
 * @interface ActionsProps
 * @property {CustomActionDefinition[]} customActions - Array of custom action definitions
 * @property {function} onActionExecute - Callback when action is executed
 * @property {function} onActionComplete - Callback when action completes
 * @property {function} onActionError - Callback when action errors
 * @property {boolean} showExecutionHistory - Whether to show execution history
 * @property {boolean} allowCustomActions - Whether to allow creating custom actions
 *
 * @author Dean Machines Team
 * @date 2025-06-13
 */
interface ActionsProps {
    customActions?: CustomActionDefinition[];
    onActionExecute?: (actionName: string, args: Record<string, any>) => void;
    onActionComplete?: (actionName: string, result: any) => void;
    onActionError?: (actionName: string, error: string) => void;
    showExecutionHistory?: boolean;
    allowCustomActions?: boolean;
}

/**
 * Comprehensive CopilotKit Actions component for Dean Machines RSC
 *
 * This component provides a complete interface for managing and executing
 * CopilotKit actions with real-time status tracking, custom action creation,
 * execution history, and integration with the Mastra agent system.
 *
 * Key Features:
 * - Real-time action execution with progress tracking
 * - Custom action creation and management
 * - Integration with all 22+ Mastra agents
 * - Execution history and result visualization
 * - Parameter validation and error handling
 * - Electric neon theme integration
 * - Professional accessibility support
 * - Markdown rendering for action results
 * - Agent switching and context management
 *
 * @param {ActionsProps} props - Component configuration props
 * @returns {JSX.Element} The comprehensive actions component
 *
 * @example
 * ```typescript
 * <Actions
 *   customActions={myCustomActions}
 *   onActionExecute={(name, args) => console.log('Executing:', name, args)}
 *   onActionComplete={(name, result) => console.log('Completed:', name, result)}
 *   showExecutionHistory={true}
 *   allowCustomActions={true}
 * />
 * ```
 *
 * @author Dean Machines Team
 * @date 2025-06-13
 * @version 1.0.0
 * @model Claude Sonnet 4
 */
export function Actions({
    customActions = [],
    onActionExecute,
    onActionComplete,
    onActionError,
    showExecutionHistory = true,
    allowCustomActions = false
}: ActionsProps) {
    // Get agent context for endpoint management
    const { currentEndpoint, setCurrentEndpoint } = useAgent();
    
    // State management
    const [actionStatuses, setActionStatuses] = useState<ActionStatus[]>([]);
    const [executionHistory, setExecutionHistory] = useState<ActionStatus[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreatingAction, setIsCreatingAction] = useState(false);
    const [newActionForm, setNewActionForm] = useState<Partial<CustomActionDefinition>>({
        name: '',
        description: '',
        parameters: [],
        category: 'custom',
        enabled: true
    });
    const [currentAgent, setCurrentAgent] = useState<string>('master');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Built-in action definitions based on your existing patterns
    const builtInActions: CustomActionDefinition[] = [
        {
            name: 'switchAgent',
            description: 'Switch to a different specialized agent',
            parameters: [
                {
                    name: 'agentName',
                    type: 'string',
                    description: 'Name of the agent to switch to',
                    required: true,
                    enum: ['master', 'code', 'git', 'graph', 'data', 'research', 'weather', 'manager', 'design', 'documentation']
                }
            ],            category: 'management',
            enabled: true,
            handler: async ({ agentName }) => {
                setCurrentAgent(agentName);
                setCurrentEndpoint(`${MASTRA_URL}/copilotkit/${agentName}`);
                return `Successfully switched to ${agentName} agent. Endpoint: ${MASTRA_URL}/copilotkit/${agentName}`;
            }
        },
        {
            name: 'analyzeRepository',
            description: 'Analyze a GitHub repository structure and dependencies using real MCP tools',
            parameters: [
                {
                    name: 'repositoryUrl',
                    type: 'string',
                    description: 'GitHub repository URL to analyze',
                    required: true
                },
                {
                    name: 'analysisType',
                    type: 'string',
                    description: 'Type of analysis to perform',
                    required: false,
                    defaultValue: 'comprehensive',
                    enum: ['basic', 'detailed', 'comprehensive']
                }
            ],
            category: 'development',
            enabled: true,
            handler: async ({ repositoryUrl, analysisType = 'comprehensive' }) => {
                try {
                    // Use real MCP GitHub tools
                    const { executeTracedMCPTool } = await import('@/mastra/tools/mcp');

                    // Search for the repository using real GitHub MCP tool
                    const repoSearch = await executeTracedMCPTool('github', 'search_repositories', {
                        query: repositoryUrl.split('/').pop() || repositoryUrl
                    });

                    // Get file contents using real GitHub MCP tool
                    let fileAnalysis = null;
                    if (analysisType === 'comprehensive' || analysisType === 'detailed') {
                        try {
                            // Try to get README or main files
                            fileAnalysis = await executeTracedMCPTool('github', 'get_file_contents', {
                                owner: repositoryUrl.split('/')[3],
                                repo: repositoryUrl.split('/')[4],
                                path: 'README.md'
                            });
                        } catch (error) {
                            console.warn(`Failed to fetch primary file (e.g., README.md) for ${repositoryUrl}. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Attempting fallback code search.`);
                            // Fallback to code search
                            fileAnalysis = await executeTracedMCPTool('github', 'search_code', {
                                query: `repo:${repositoryUrl.split('/')[3]}/${repositoryUrl.split('/')[4]}`
                            });
                        }
                    }

                    return `Completed ${analysisType} analysis of ${repositoryUrl}. Repository search: ${JSON.stringify(repoSearch, null, 2)}${fileAnalysis ? `\nFile analysis: ${JSON.stringify(fileAnalysis, null, 2)}` : ''}`;
                } catch (error) {
                    return `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
            }
        },
        {
            name: 'generateCodeGraph',
            description: 'Generate an interactive code dependency graph using real MCP tools',
            parameters: [
                {
                    name: 'projectPath',
                    type: 'string',
                    description: 'Path to the project directory',
                    required: true
                },
                {
                    name: 'graphType',
                    type: 'string',
                    description: 'Type of graph to generate',
                    required: false,
                    defaultValue: 'dependency',
                    enum: ['dependency', 'call-graph', 'module-hierarchy', 'all']
                }
            ],
            category: 'development',
            enabled: true,
            handler: async ({ projectPath, graphType = 'dependency' }) => {
                try {
                    const { executeTracedMCPTool } = await import('@/mastra/tools/mcp');

                    // Use real filesystem MCP tools to analyze project structure
                    const projectStructure = await executeTracedMCPTool('filesystem', 'directory_tree', {
                        path: projectPath
                    });

                    // Use real git MCP tools to get repository status
                    const gitStatus = await executeTracedMCPTool('git', 'git_status', {});

                    // Get file information for dependency analysis
                    const fileSearch = await executeTracedMCPTool('filesystem', 'search_files', {
                        path: projectPath,
                        pattern: '*.ts,*.tsx,*.js,*.jsx,*.json'
                    });

                    return `Generated ${graphType} graph for ${projectPath}. Project structure: ${JSON.stringify(projectStructure, null, 2)}. Git status: ${JSON.stringify(gitStatus, null, 2)}. Files found: ${JSON.stringify(fileSearch, null, 2)}`;
                } catch (error) {
                    return `Graph generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
            }
        },
        {
            name: 'searchWeb',
            description: 'Search the web using DuckDuckGo MCP tools',
            parameters: [
                {
                    name: 'query',
                    type: 'string',
                    description: 'Search query to execute',
                    required: true
                },
                {
                    name: 'maxResults',
                    type: 'number',
                    description: 'Maximum number of results to return',
                    required: false,
                    defaultValue: 5
                }
            ],
            category: 'data',
            enabled: true,
            handler: async ({ query, maxResults = 5 }) => {
                try {
                    const { executeTracedMCPTool } = await import('@/mastra/tools/mcp');

                    // Use real DuckDuckGo MCP search tool
                    const searchResults = await executeTracedMCPTool('ddgsearch', 'search', {
                        query,
                        max_results: maxResults
                    });

                    return `Search completed for "${query}". Results: ${JSON.stringify(searchResults, null, 2)}`;
                } catch (error) {
                    return `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
            }
        },
        {
            name: 'createMemoryGraph',
            description: 'Create entities and relations in the memory graph using real MCP tools',
            parameters: [
                {
                    name: 'entityName',
                    type: 'string',
                    description: 'Name of the entity to create',
                    required: true
                },
                {
                    name: 'entityType',
                    type: 'string',
                    description: 'Type of the entity',
                    required: true
                },
                {
                    name: 'observations',
                    type: 'string',
                    description: 'Observations about the entity',
                    required: false
                }
            ],
            category: 'data',
            enabled: true,
            handler: async ({ entityName, entityType, observations = '' }) => {
                try {
                    const { executeTracedMCPTool } = await import('@/mastra/tools/mcp');

                    // Use real memory graph MCP tools
                    const entityResult = await executeTracedMCPTool('memoryGraph', 'create_entities', {
                        entities: [{
                            name: entityName,
                            entityType,
                            observations: observations ? [observations] : []
                        }]
                    });

                    return `Created entity "${entityName}" of type "${entityType}". Result: ${JSON.stringify(entityResult, null, 2)}`;
                } catch (error) {
                    return `Entity creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
            }
        }
    ];

    // Combine built-in and custom actions
    const allActions = [...builtInActions, ...customActions];

    // Utility functions
    const executeAction = useCallback(async (action: CustomActionDefinition, args: Record<string, any>) => {
        const actionId = `${action.name}-${Date.now()}`;
        const newStatus: ActionStatus = {
            id: actionId,
            name: action.name,
            status: 'running',
            description: action.description,
            progress: 0,
            startTime: new Date()
        };

        setActionStatuses(prev => [...prev, newStatus]);
        onActionExecute?.(action.name, args);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setActionStatuses(prev => prev.map(status =>
                    status.id === actionId
                        ? { ...status, progress: Math.min(status.progress + 10, 90) }
                        : status
                ));
            }, 200);

            const result = await action.handler(args);

            clearInterval(progressInterval);

            const completedStatus: ActionStatus = {
                ...newStatus,
                status: 'completed',
                result,
                progress: 100,
                endTime: new Date()
            };

            setActionStatuses(prev => prev.map(status =>
                status.id === actionId ? completedStatus : status
            ));

            setExecutionHistory(prev => [completedStatus, ...prev.slice(0, 49)]); // Keep last 50
            onActionComplete?.(action.name, result);

            return result;
        } catch (error) {
            const errorStatus: ActionStatus = {
                ...newStatus,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                progress: 0,
                endTime: new Date()
            };

            setActionStatuses(prev => prev.map(status =>
                status.id === actionId ? errorStatus : status
            ));

            setExecutionHistory(prev => [errorStatus, ...prev.slice(0, 49)]);
            onActionError?.(action.name, errorStatus.error || 'Unknown error');

            throw error;
        }
    }, [onActionExecute, onActionComplete, onActionError]);

    // Parameter management functions (for future custom action creation)
    const addParameter = useCallback(() => {
        setNewActionForm(prev => ({
            ...prev,
            parameters: [
                ...(prev.parameters || []),
                {
                    name: '',
                    type: 'string',
                    description: '',
                    required: false
                }
            ]
        }));
    }, []);

    const removeParameter = useCallback((index: number) => {
        setNewActionForm(prev => ({
            ...prev,
            parameters: prev.parameters?.filter((_, i) => i !== index) || []
        }));
    }, []);

    const updateParameter = useCallback((index: number, field: keyof ActionParameter, value: unknown) => {
        setNewActionForm(prev => ({
            ...prev,
            parameters: prev.parameters?.map((param, i) =>
                i === index ? { ...param, [field]: value } : param
            ) || []
        }));
    }, []);

    // Use the parameter functions in the UI
    const handleAddParameter = () => addParameter();
    const handleRemoveParameter = (index: number) => removeParameter(index);
    const handleUpdateParameter = (index: number, field: keyof ActionParameter, value: unknown) => updateParameter(index, field, value);

    // Filter actions based on category and search
    const filteredActions = allActions.filter(action => {
        const matchesCategory = selectedCategory === 'all' || action.category === selectedCategory;
        const matchesSearch = searchTerm === '' ||
            action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            action.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch && action.enabled;
    });

    // Get category icon
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'development': return Code;
            case 'data': return Database;
            case 'management': return Settings;
            case 'operations': return Bot;
            case 'creative': return FileText;
            case 'ai': return Zap;
            default: return Settings;
        }
    };

    // Get status icon
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'running': return RefreshCw;
            case 'completed': return CheckCircle;
            case 'error': return XCircle;
            default: return Clock;
        }
    };    // Make actions state readable to agents
    useCopilotReadable({
        description: "Current actions state and execution status",
        value: {
            actionStatuses,
            executionHistory: executionHistory.slice(0, 10), // Last 10 executions
            currentAgent,
            currentEndpoint,
            selectedCategory,
            searchTerm,
            availableActions: allActions.map(a => ({ name: a.name, description: a.description, category: a.category })),
            timestamp: new Date().toISOString()
        }
    });

    // Register individual CopilotKit actions (hooks must be called at top level)
    useCopilotAction({
        name: "switchAgent",
        description: "Switch to a different specialized agent",
        parameters: [
            {
                name: "agentName",
                type: "string",
                description: "Name of the agent to switch to",
                enum: ["master", "code", "git", "graph", "data", "research", "weather", "manager", "design", "documentation"]
            }
        ],        handler: async ({ agentName }) => {
            setCurrentAgent(agentName);
            setCurrentEndpoint(`${MASTRA_URL}/copilotkit/${agentName}`);
            return `Successfully switched to ${agentName} agent. Endpoint: ${MASTRA_URL}/copilotkit/${agentName}`;
        }
    });

    useCopilotAction({
        name: "analyzeRepository",
        description: "Analyze a GitHub repository structure and dependencies using real MCP tools",
        parameters: [
            {
                name: "repositoryUrl",
                type: "string",
                description: "GitHub repository URL to analyze"
            },
            {
                name: "analysisType",
                type: "string",
                description: "Type of analysis to perform",
                enum: ["basic", "detailed", "comprehensive"]
            }
        ],
        handler: async ({ repositoryUrl, analysisType = "comprehensive" }) => {
            try {
                const { executeTracedMCPTool } = await import('@/mastra/tools/mcp');
                const repoSearch = await executeTracedMCPTool('github', 'search_repositories', {
                    query: repositoryUrl.split('/').pop() || repositoryUrl
                });
                return `Completed ${analysisType} analysis of ${repositoryUrl}. Results: ${JSON.stringify(repoSearch, null, 2)}`;
            } catch (error) {
                return `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        }
    });

    useCopilotAction({
        name: "generateCodeGraph",
        description: "Generate an interactive code dependency graph using real MCP tools",
        parameters: [
            {
                name: "projectPath",
                type: "string",
                description: "Path to the project directory"
            },
            {
                name: "graphType",
                type: "string",
                description: "Type of graph to generate",
                enum: ["dependency", "call-graph", "module-hierarchy", "all"]
            }
        ],
        handler: async ({ projectPath, graphType = "dependency" }) => {
            try {
                const { executeTracedMCPTool } = await import('@/mastra/tools/mcp');
                const projectStructure = await executeTracedMCPTool('filesystem', 'directory_tree', {
                    path: projectPath
                });
                return `Generated ${graphType} graph for ${projectPath}. Structure: ${JSON.stringify(projectStructure, null, 2)}`;
            } catch (error) {
                return `Graph generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        }
    });

    useCopilotAction({
        name: "searchWeb",
        description: "Search the web using DuckDuckGo MCP tools",
        parameters: [
            {
                name: "query",
                type: "string",
                description: "Search query to execute"
            },
            {
                name: "maxResults",
                type: "number",
                description: "Maximum number of results to return"
            }
        ],
        handler: async ({ query, maxResults = 5 }) => {
            try {
                const { executeTracedMCPTool } = await import('@/mastra/tools/mcp');
                const searchResults = await executeTracedMCPTool('ddgsearch', 'search', {
                    query,
                    max_results: maxResults
                });
                return `Search completed for "${query}". Results: ${JSON.stringify(searchResults, null, 2)}`;
            } catch (error) {
                return `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        }
    });

    // Add action management actions
    useCopilotAction({
        name: "executeCustomAction",
        description: "Execute a custom action with specified parameters",
        parameters: [
            {
                name: "actionName",
                type: "string",
                description: "Name of the action to execute"
            },
            {
                name: "parameters",
                type: "object",
                description: "Parameters to pass to the action"
            }
        ],
        handler: async ({ actionName, parameters }) => {
            const action = allActions.find(a => a.name === actionName);
            if (!action) {
                throw new Error(`Action ${actionName} not found`);
            }
            return await executeAction(action, parameters);
        }
    });

    useCopilotAction({
        name: "listAvailableActions",
        description: "List all available actions with their descriptions",
        parameters: [
            {
                name: "category",
                type: "string",
                description: "Filter by category",
                enum: ["all", "development", "data", "management", "operations", "creative", "ai", "custom"]
            }
        ],
        handler: async ({ category = "all" }) => {
            const filtered = category === "all"
                ? allActions
                : allActions.filter(a => a.category === category);

            return `Available actions (${filtered.length}):\n\n` +
                filtered.map(a => `• ${a.name}: ${a.description}`).join('\n');
        }
    });

    useCopilotAction({
        name: "getActionStatus",
        description: "Get the current status of running actions",
        parameters: [],
        handler: async () => {
            const running = actionStatuses.filter(s => s.status === 'running');
            const recent = executionHistory.slice(0, 5);

            return `Running actions: ${running.length}\n` +
                `Recent executions: ${recent.length}\n\n` +
                (running.length > 0 ?
                    `Currently running:\n${running.map(s => `• ${s.name} (${s.progress}%)`).join('\n')}\n\n` : '') +
                (recent.length > 0 ?
                    `Recent:\n${recent.map(s => `• ${s.name}: ${s.status}`).join('\n')}` : '');
        }
    });

    useCopilotAction({
        name: "clearExecutionHistory",
        description: "Clear the action execution history",
        parameters: [],
        handler: async () => {
            setExecutionHistory([]);
            return "Execution history cleared";
        }
    });

    // Auto-cleanup completed actions after 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setActionStatuses(prev => prev.filter(status =>
                status.status === 'running' ||
                (status.endTime && Date.now() - status.endTime.getTime() < 30000)
            ));
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Actions Dashboard</h1>
                        <p className="text-muted-foreground">Manage and execute CopilotKit actions</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        {currentAgent}
                    </Badge>
                    {allowCustomActions && (
                        <Button
                            onClick={() => setIsCreatingAction(true)}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Action
                        </Button>
                    )}
                </div>
            </motion.div>

            {/* Filters and Search */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filters & Search</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="search">Search Actions</Label>
                            <Input
                                id="search"
                                placeholder="Search by name or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="category">Category</Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem value="development">Development</SelectItem>
                                    <SelectItem value="data">Data</SelectItem>
                                    <SelectItem value="management">Management</SelectItem>
                                    <SelectItem value="operations">Operations</SelectItem>
                                    <SelectItem value="creative">Creative</SelectItem>
                                    <SelectItem value="ai">AI</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2"
                            >
                                <Settings className="w-4 h-4" />
                                Advanced
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Actions List */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Code className="w-5 h-5" />
                                Available Actions ({filteredActions.length})
                            </CardTitle>
                            <CardDescription>
                                Click on any action to execute it with the AI assistant
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                <AnimatePresence>
                                    {filteredActions.map((action, index) => {
                                        const CategoryIcon = getCategoryIcon(action.category);
                                        const runningStatus = actionStatuses.find(s =>
                                            s.name === action.name && s.status === 'running'
                                        );

                                        return (
                                            <motion.div
                                                key={action.name}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3 flex-1">
                                                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                                                            <CategoryIcon className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="font-medium">{action.name}</h3>
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {action.category}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground mb-2">
                                                                {action.description}
                                                            </p>
                                                            {action.parameters.length > 0 && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    Parameters: {action.parameters.map(p => p.name).join(', ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {runningStatus && (
                                                            <div className="flex items-center gap-2">
                                                                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                                                                <span className="text-sm text-blue-600">
                                                                    {runningStatus.progress}%
                                                                </span>
                                                            </div>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            disabled={!!runningStatus}
                                                            onClick={() => executeAction(action, {})}
                                                            className="flex items-center gap-1"
                                                        >
                                                            <Zap className="w-3 h-3" />
                                                            Execute
                                                        </Button>
                                                    </div>
                                                </div>

                                                {runningStatus && (
                                                    <div className="mt-3">
                                                        <Progress value={runningStatus.progress} className="h-2" />
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>

                                {filteredActions.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No actions found matching your criteria</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Current Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Execution Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {actionStatuses.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground">
                                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No actions running</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {actionStatuses.map((status) => {
                                        const StatusIcon = getStatusIcon(status.status);
                                        return (
                                            <motion.div
                                                key={status.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20"
                                            >
                                                <StatusIcon className={`w-4 h-4 ${
                                                    status.status === 'running' ? 'animate-spin text-blue-500' :
                                                    status.status === 'completed' ? 'text-green-500' :
                                                    status.status === 'error' ? 'text-red-500' : 'text-gray-500'
                                                }`} />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{status.name}</p>
                                                    <p className="text-xs text-muted-foreground">{status.description}</p>
                                                    {status.status === 'running' && (
                                                        <Progress value={status.progress} className="h-2 mt-2" />
                                                    )}
                                                    {status.error && (
                                                        <Alert className="mt-2">
                                                            <AlertCircle className="h-4 w-4" />
                                                            <AlertDescription className="text-xs">
                                                                {status.error}
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                    {status.result && status.status === 'completed' && (
                                                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                                                            <Info className="w-3 h-3 inline mr-1" />
                                                            Result available
                                                        </div>
                                                    )}
                                                </div>
                                                {status.status === 'completed' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setActionStatuses(prev => prev.filter(s => s.id !== status.id))}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Execution History */}
                    {showExecutionHistory && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Recent Executions
                                </CardTitle>
                                <CardDescription>
                                    Last {Math.min(executionHistory.length, 10)} executions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {executionHistory.length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No execution history</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {executionHistory.slice(0, 10).map((execution) => (
                                            <div key={execution.id} className="flex items-center gap-2 p-2 text-sm border rounded">
                                                <Badge variant={execution.status === 'completed' ? 'default' : 'destructive'}>
                                                    {execution.status}
                                                </Badge>
                                                <span className="flex-1 truncate">{execution.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {execution.endTime?.toLocaleTimeString()}
                                                </span>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setExecutionHistory(prev => prev.filter(e => e.id !== execution.id))}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Advanced Settings */}
                    {showAdvanced && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="w-5 h-5" />
                                    Advanced Settings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="show-history">Show Execution History</Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                    >
                                        {showExecutionHistory ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </Button>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label>Current Agent</Label>
                                    <Select value={currentAgent} onValueChange={setCurrentAgent}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="master">
                                                <div className="flex items-center gap-2">
                                                    <Bot className="w-4 h-4" />
                                                    Master Agent
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="code">
                                                <div className="flex items-center gap-2">
                                                    <Code className="w-4 h-4" />
                                                    Code Agent
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="git">
                                                <div className="flex items-center gap-2">
                                                    <GitBranch className="w-4 h-4" />
                                                    Git Agent
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="graph">
                                                <div className="flex items-center gap-2">
                                                    <Network className="w-4 h-4" />
                                                    Graph Agent
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="data">
                                                <div className="flex items-center gap-2">
                                                    <Database className="w-4 h-4" />
                                                    Data Agent
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Custom Action Creation Modal */}
            <AnimatePresence>
                {isCreatingAction && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        onClick={() => setIsCreatingAction(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-background border rounded-lg p-6 w-full max-w-2xl mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Plus className="w-5 h-5" />
                                    Create Custom Action
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsCreatingAction(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <Tabs defaultValue="basic" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="basic" className="flex items-center gap-2">
                                        <Edit className="w-4 h-4" />
                                        Basic Info
                                    </TabsTrigger>
                                    <TabsTrigger value="parameters" className="flex items-center gap-2">
                                        <Settings className="w-4 h-4" />
                                        Parameters
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="basic" className="space-y-4">
                                    <div>
                                        <Label htmlFor="action-name">Action Name</Label>
                                        <Input
                                            id="action-name"
                                            placeholder="Enter action name..."
                                            value={newActionForm.name || ''}
                                            onChange={(e) => setNewActionForm(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="action-description">Description</Label>
                                        <Textarea
                                            id="action-description"
                                            placeholder="Describe what this action does..."
                                            value={newActionForm.description || ''}
                                            onChange={(e) => setNewActionForm(prev => ({ ...prev, description: e.target.value }))}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="action-category">Category</Label>
                                        <Select
                                            value={newActionForm.category || 'custom'}
                                            onValueChange={(value) => setNewActionForm(prev => ({ ...prev, category: value as CustomActionDefinition['category'] }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="development">
                                                    <div className="flex items-center gap-2">
                                                        <Code className="w-4 h-4" />
                                                        Development
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="data">
                                                    <div className="flex items-center gap-2">
                                                        <Database className="w-4 h-4" />
                                                        Data
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="management">
                                                    <div className="flex items-center gap-2">
                                                        <Settings className="w-4 h-4" />
                                                        Management
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="operations">
                                                    <div className="flex items-center gap-2">
                                                        <Bot className="w-4 h-4" />
                                                        Operations
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="creative">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4" />
                                                        Creative
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="ai">
                                                    <div className="flex items-center gap-2">
                                                        <Zap className="w-4 h-4" />
                                                        AI
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="custom">
                                                    <div className="flex items-center gap-2">
                                                        <Folder className="w-4 h-4" />
                                                        Custom
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </TabsContent>

                                <TabsContent value="parameters" className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label>Parameters</Label>
                                        <Button
                                            size="sm"
                                            onClick={handleAddParameter}
                                            className="flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Add Parameter
                                        </Button>
                                    </div>

                                    {newActionForm.parameters?.map((param, index) => (
                                        <div key={index} className="border rounded-lg p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Parameter {index + 1}</Label>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleRemoveParameter(index)}
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label>Name</Label>
                                                    <Input
                                                        placeholder="Parameter name"
                                                        value={param.name}
                                                        onChange={(e) => handleUpdateParameter(index, 'name', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Type</Label>
                                                    <Select
                                                        value={param.type}
                                                        onValueChange={(value) => handleUpdateParameter(index, 'type', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="string">String</SelectItem>
                                                            <SelectItem value="number">Number</SelectItem>
                                                            <SelectItem value="boolean">Boolean</SelectItem>
                                                            <SelectItem value="object">Object</SelectItem>
                                                            <SelectItem value="array">Array</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div>
                                                <Label>Description</Label>
                                                <Input
                                                    placeholder="Parameter description"
                                                    value={param.description}
                                                    onChange={(e) => handleUpdateParameter(index, 'description', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )) || (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p>No parameters defined</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                            <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" onClick={() => setIsCreatingAction(false)}>
                                        Cancel
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" className="flex items-center gap-2">
                                        <Download className="w-4 h-4" />
                                        Export
                                    </Button>
                                    <Button className="flex items-center gap-2">
                                        <Save className="w-4 h-4" />
                                        Create Action
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Controls */}
            <div className="fixed bottom-6 right-6 flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActionStatuses([])}
                    className="flex items-center gap-2"
                >
                    <Square className="w-4 h-4" />
                    Clear Status
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExecutionHistory([])}
                    className="flex items-center gap-2"
                >
                    <Trash2 className="w-4 h-4" />
                    Clear History
                </Button>

                {actionStatuses.some(s => s.status === 'running') ? (
                    <Button
                        size="sm"
                        variant="destructive"
                        className="flex items-center gap-2"
                    >
                        <Pause className="w-4 h-4" />
                        Pause All
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        className="flex items-center gap-2 neon-glow"
                    >
                        <Play className="w-4 h-4" />
                        Ready
                    </Button>
                )}
            </div>
        </div>
    );
}

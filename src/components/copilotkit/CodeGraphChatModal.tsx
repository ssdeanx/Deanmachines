'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    X,
    Minimize2,
    Maximize2,
    Bot,
    GitBranch,
    Network,
    Code
} from 'lucide-react';

/**
 * Props for the CodeGraphChatModal component
 *
 * @interface CodeGraphChatModalProps
 * @property {boolean} isOpen - Whether the modal is open
 * @property {function} onOpenChange - Callback when modal open state changes
 * @property {string} currentRepo - Currently selected repository URL
 * @property {function} onGraphGenerate - Callback when graph generation is requested
 * @property {function} onAgentSwitch - Callback when agent switching is requested
 *
 * @author Dean Machines Team
 * @date 2025-01-13
 */
interface CodeGraphChatModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    currentRepo: string;
    onGraphGenerate: (repoUrl: string, options: GraphGenerationOptions) => void;
    onAgentSwitch: (agentType: string) => void;
}

/**
 * Options for graph generation
 *
 * @interface GraphGenerationOptions
 * @property {string} graphType - Type of graph to generate
 * @property {string} analysisDepth - Depth of analysis
 * @property {string} visualStyle - Visual style for the graph
 * @property {boolean} includeTests - Whether to include test files
 *
 * @author Dean Machines Team
 * @date 2025-01-13
 */
interface GraphGenerationOptions {
    graphType: 'dependency' | 'call-graph' | 'module-hierarchy' | 'all';
    analysisDepth: 'basic' | 'detailed' | 'comprehensive';
    visualStyle: 'hierarchical' | 'circular' | 'force-directed' | 'tree';
    includeTests: boolean;
}

/**
 * Modal chat interface for code graph generation and interaction
 *
 * This component provides a floating chat modal that integrates with CopilotKit
 * to enable AI-driven code graph generation and manipulation. It can analyze
 * GitHub repositories, switch between specialized agents, and generate interactive
 * visualizations using the existing Mastra workflow system.
 *
 * Key Features:
 * - Floating modal chat interface with electric neon theme
 * - Integration with git, code, and graph agents
 * - Real-time graph generation from repository analysis
 * - Advanced configuration options for graph generation
 * - Minimizable and resizable interface
 * - Context-aware suggestions and actions
 * - Professional accessibility support
 *
 * @param {CodeGraphChatModalProps} props - Component configuration props
 * @returns {JSX.Element} The code graph chat modal component
 *
 * @example
 * ```typescript
 * <CodeGraphChatModal
 *   isOpen={isModalOpen}
 *   onOpenChange={setIsModalOpen}
 *   currentRepo="https://github.com/user/repo"
 *   onGraphGenerate={handleGraphGenerate}
 *   onAgentSwitch={handleAgentSwitch}
 * />
 * ```
 *
 * @author Dean Machines Team
 * @date 2025-01-13
 * @version 1.0.0
 * @model Claude Sonnet 4
 */
export function CodeGraphChatModal({
    isOpen,
    onOpenChange,
    currentRepo,
    onGraphGenerate,
    onAgentSwitch
}: CodeGraphChatModalProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [currentAgent, setCurrentAgent] = useState<'git' | 'code' | 'graph' | 'master'>('master');
    const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'complete' | 'error'>('idle');

    // Make modal state readable to agents
    useCopilotReadable({
        description: "Code graph chat modal state and current context",
        value: {
            isOpen,
            isMinimized,
            currentAgent,
            currentRepo,
            generationStatus,
            timestamp: new Date().toISOString()
        }
    });

    // Add action to switch agents
    useCopilotAction({
        name: "switchToSpecializedAgent",
        description: "Switch to a specialized agent for code graph operations",
        parameters: [
            {
                name: "agentType",
                type: "string",
                description: "Type of agent to switch to",
                enum: ["git", "code", "graph", "master"]
            }
        ],
        handler: async ({ agentType }) => {
            setCurrentAgent(agentType as 'git' | 'code' | 'graph' | 'master');
            onAgentSwitch(agentType);
            return `Switched to ${agentType} agent for specialized operations`;
        }
    });

    // Add action to generate code graph
    useCopilotAction({
        name: "generateAdvancedCodeGraph",
        description: "Generate an advanced interactive code graph from a repository",
        parameters: [
            {
                name: "repositoryUrl",
                type: "string",
                description: "GitHub repository URL to analyze"
            },
            {
                name: "graphType",
                type: "string",
                description: "Type of graph to generate",
                enum: ["dependency", "call-graph", "module-hierarchy", "all"]
            },
            {
                name: "analysisDepth",
                type: "string",
                description: "Depth of analysis to perform",
                enum: ["basic", "detailed", "comprehensive"]
            },
            {
                name: "visualStyle",
                type: "string",
                description: "Visual style for the graph",
                enum: ["hierarchical", "circular", "force-directed", "tree"]
            }
        ],
        handler: async ({ repositoryUrl, graphType, analysisDepth, visualStyle }) => {
            setGenerationStatus('generating');

            const options: GraphGenerationOptions = {
                graphType: graphType as GraphGenerationOptions['graphType'],
                analysisDepth: analysisDepth as GraphGenerationOptions['analysisDepth'],
                visualStyle: visualStyle as GraphGenerationOptions['visualStyle'],
                includeTests: false
            };

            try {
                onGraphGenerate(repositoryUrl, options);
                setGenerationStatus('complete');
                return `Successfully generated ${graphType} graph with ${analysisDepth} analysis for ${repositoryUrl}`;
            } catch (error) {
                setGenerationStatus('error');
                return `Failed to generate graph: ${error}`;
            }
        }
    });

    // Add action to analyze current repository
    useCopilotAction({
        name: "analyzeCurrentRepository",
        description: "Analyze the currently selected repository",
        parameters: [],
        handler: async () => {
            if (!currentRepo) {
                return "No repository selected. Please set a repository URL first.";
            }

            setGenerationStatus('generating');

            // Trigger analysis of current repo
            const options: GraphGenerationOptions = {
                graphType: 'all',
                analysisDepth: 'detailed',
                visualStyle: 'hierarchical',
                includeTests: true
            };

            onGraphGenerate(currentRepo, options);
            setGenerationStatus('complete');

            return `Analyzing repository: ${currentRepo} with comprehensive analysis`;
        }
    });

    // Agent configuration
    const agentConfig = {
        git: { name: 'Git Agent', color: 'bg-orange-500', icon: GitBranch },
        code: { name: 'Code Agent', color: 'bg-blue-500', icon: Code },
        graph: { name: 'Graph Agent', color: 'bg-purple-500', icon: Network },
        master: { name: 'Master Agent', color: 'bg-green-500', icon: Bot }
    };

    const currentAgentConfig = agentConfig[currentAgent];
    const IconComponent = currentAgentConfig.icon;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed bottom-4 right-4 z-50"
            >
                <Card className={`glass-effect border-primary/20 ${isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'} transition-all duration-300`}>
                    {/* Header */}
                    <CardHeader className="pb-2 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full ${currentAgentConfig.color} flex items-center justify-center`}>
                                    <IconComponent className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm">Code Graph Assistant</CardTitle>
                                    <Badge variant="outline" className="text-xs">
                                        {currentAgentConfig.name}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {generationStatus === 'generating' && (
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                                )}
                                {generationStatus === 'complete' && (
                                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                                )}
                                {generationStatus === 'error' && (
                                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                                )}

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="h-6 w-6 p-0"
                                >
                                    {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onOpenChange(false)}
                                    className="h-6 w-6 p-0"
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    {/* Chat Content */}
                    {!isMinimized && (
                        <CardContent className="p-0 h-[calc(100%-80px)]">
                            <CopilotChat
                                labels={{
                                    title: "Code Graph Assistant",
                                    initial: `⚡ Hi! I'm your Code Graph Assistant powered by the ${currentAgentConfig.name}.

I can help you:
• Generate interactive code graphs from GitHub repositories
• Switch between specialized agents (git, code, graph)
• Analyze repository structure and dependencies
• Create visualizations with different styles and depths

Current repository: ${currentRepo || 'None selected'}

Try saying: "Generate a dependency graph for this repository" or "Switch to the git agent"`,
                                }}
                                className="h-full border-0"
                            />
                        </CardContent>
                    )}
                </Card>
            </motion.div>
        </AnimatePresence>
    );
}

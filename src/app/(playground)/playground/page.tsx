'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CopilotChat, CopilotPopup, CopilotSidebar } from "@copilotkit/react-ui";
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAgent } from '../layout';

export default function PlaygroundPage() {
    const [selectedAgent, setSelectedAgent] = useState('master');
    const [chatMode, setChatMode] = useState<'popup' | 'sidebar' | 'chat'>('chat');
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const { currentEndpoint, setCurrentEndpoint } = useAgent();

    // Available agents with their endpoints and descriptions
    const agents = {
        // Core Agents
        master: { name: 'Master Agent', endpoint: '/copilotkit/master', description: 'Flexible problem-solver for any task', category: 'Core', color: 'bg-purple-500' },
        strategizer: { name: 'Strategizer', endpoint: '/copilotkit/strategizer', description: 'Strategic planning expert', category: 'Core', color: 'bg-blue-500' },
        analyzer: { name: 'Analyzer', endpoint: '/copilotkit/analyzer', description: 'Data analysis specialist', category: 'Core', color: 'bg-green-500' },
        evolve: { name: 'Evolve', endpoint: '/copilotkit/evolve', description: 'Agent improvement specialist', category: 'Core', color: 'bg-orange-500' },
        supervisor: { name: 'Supervisor', endpoint: '/copilotkit/supervisor', description: 'Agent coordination expert', category: 'Core', color: 'bg-red-500' },

        // Development Agents
        code: { name: 'Code Agent', endpoint: '/copilotkit/code', description: 'Code analysis and generation', category: 'Development', color: 'bg-indigo-500' },
        git: { name: 'Git Agent', endpoint: '/copilotkit/git', description: 'Version control expert', category: 'Development', color: 'bg-gray-500' },
        docker: { name: 'Docker Agent', endpoint: '/copilotkit/docker', description: 'Containerization specialist', category: 'Development', color: 'bg-cyan-500' },
        debug: { name: 'Debug Agent', endpoint: '/copilotkit/debug', description: 'Debugging expert', category: 'Development', color: 'bg-yellow-500' },

        // Data Agents
        data: { name: 'Data Agent', endpoint: '/copilotkit/data', description: 'Data analysis specialist', category: 'Data', color: 'bg-emerald-500' },
        graph: { name: 'Graph Agent', endpoint: '/copilotkit/graph', description: 'Knowledge graph analysis', category: 'Data', color: 'bg-teal-500' },
        processing: { name: 'Processing Agent', endpoint: '/copilotkit/processing', description: 'Data processing automation', category: 'Data', color: 'bg-lime-500' },
        research: { name: 'Research Agent', endpoint: '/copilotkit/research', description: 'Research and analysis', category: 'Data', color: 'bg-amber-500' },
        weather: { name: 'Weather Agent', endpoint: '/copilotkit/weather', description: 'Weather information', category: 'Data', color: 'bg-sky-500' },

        // Management Agents
        manager: { name: 'Manager Agent', endpoint: '/copilotkit/manager', description: 'Project management', category: 'Management', color: 'bg-violet-500' },
        marketing: { name: 'Marketing Agent', endpoint: '/copilotkit/marketing', description: 'Marketing and content', category: 'Management', color: 'bg-pink-500' },

        // Operations Agents
        sysadmin: { name: 'Sysadmin Agent', endpoint: '/copilotkit/sysadmin', description: 'System administration', category: 'Operations', color: 'bg-slate-500' },
        browser: { name: 'Browser Agent', endpoint: '/copilotkit/browser', description: 'Web automation', category: 'Operations', color: 'bg-orange-600' },
        utility: { name: 'Utility Agent', endpoint: '/copilotkit/utility', description: 'General utilities', category: 'Operations', color: 'bg-neutral-500' },

        // Creative Agents
        design: { name: 'Design Agent', endpoint: '/copilotkit/design', description: 'UI/UX design specialist', category: 'Creative', color: 'bg-rose-500' },
        documentation: { name: 'Documentation Agent', endpoint: '/copilotkit/documentation', description: 'Technical writing', category: 'Creative', color: 'bg-blue-600' },

        // Specialized Agents
        special: { name: 'Special Agent', endpoint: '/copilotkit/special', description: 'Multi-domain expert', category: 'Specialized', color: 'bg-fuchsia-500' },
    };

    // Debug info for current endpoint
    const isEndpointActive = currentEndpoint.includes(agents[selectedAgent as keyof typeof agents]?.endpoint || '');

    // Group agents by category
    const agentsByCategory = Object.entries(agents).reduce((acc, [key, agent]) => {
        if (!acc[agent.category]) acc[agent.category] = [];
        acc[agent.category].push({ key, ...agent });
        return acc;
    }, {} as Record<string, Array<{ key: string } & typeof agents[keyof typeof agents]>>);

    // Make current context readable to agents
    useCopilotReadable({
        description: "Current playground state and selected agent",
        value: {
            selectedAgent,
            chatMode,
            availableAgents: Object.keys(agents),
            currentTime: new Date().toISOString(),
        }
    });

    // Add action for agent switching
    useCopilotAction({
        name: "switchAgent",
        description: "Switch to a different AI agent",
        parameters: [
            {
                name: "agentKey",
                type: "string",
                description: "The key of the agent to switch to",
                enum: Object.keys(agents),
            }
        ],
        handler: async ({ agentKey }) => {
            const agent = agents[agentKey as keyof typeof agents];
            setSelectedAgent(agentKey);
            setCurrentEndpoint(`http://localhost:4111${agent.endpoint}`);
            return `Switched to ${agent.name}`;
        },
    });

    const currentAgent = agents[selectedAgent as keyof typeof agents];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-6">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between"
                    >
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">AI Playground</h1>
                            <p className="text-muted-foreground mt-1">
                                Interact with {Object.keys(agents).length} specialized AI agents
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className={`${currentAgent.color} text-white border-0`}>
                                {currentAgent.name}
                            </Badge>

                            <Dialog open={isAgentModalOpen} onOpenChange={setIsAgentModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        Switch Agent
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Choose an AI Agent</DialogTitle>
                                        <DialogDescription>
                                            Select from {Object.keys(agents).length} specialized agents organized by category
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-6">
                                        {Object.entries(agentsByCategory).map(([category, categoryAgents]) => (
                                            <div key={category}>
                                                <h3 className="text-lg font-semibold mb-3">{category} Agents</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {categoryAgents.map((agent) => (
                                                        <Card
                                                            key={agent.key}
                                                            className={`cursor-pointer transition-all hover:shadow-md ${
                                                                selectedAgent === agent.key ? 'ring-2 ring-primary' : ''
                                                            }`}
                                                            onClick={() => {
                                                                setSelectedAgent(agent.key);
                                                                setCurrentEndpoint(`http://localhost:4111${agent.endpoint}`);
                                                                setIsAgentModalOpen(false);
                                                            }}
                                                        >
                                                            <CardHeader className="pb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-3 h-3 rounded-full ${agent.color}`} />
                                                                    <CardTitle className="text-sm">{agent.name}</CardTitle>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <CardDescription className="text-xs">
                                                                    {agent.description}
                                                                </CardDescription>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </motion.div>
                </div>
            </div>            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                {/* Agent Configuration */}
                <div className="mb-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agent Configuration</CardTitle>
                            <CardDescription>Configure your AI agent interaction settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="session-name">Session Name</Label>
                                    <Input id="session-name" placeholder="Enter session name" />
                                </div>
                                <div>
                                    <Label htmlFor="agent-mode">Agent Mode</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="interactive">Interactive</SelectItem>
                                            <SelectItem value="autonomous">Autonomous</SelectItem>
                                            <SelectItem value="collaborative">Collaborative</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="priority">Priority Level</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="instructions">Custom Instructions</Label>
                                <Textarea id="instructions" placeholder="Add custom instructions for the agent" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs value={chatMode} onValueChange={(value) => setChatMode(value as 'popup' | 'sidebar' | 'chat')} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="chat">Chat Interface</TabsTrigger>
                        <TabsTrigger value="sidebar">Sidebar Mode</TabsTrigger>
                        <TabsTrigger value="popup">Popup Mode</TabsTrigger>
                    </TabsList>

                    <TabsContent value="chat" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${currentAgent.color}`} />
                                    Chat with {currentAgent.name}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                    {currentAgent.description} • Endpoint: {currentAgent.endpoint}
                                    <Badge variant={isEndpointActive ? "default" : "secondary"} className="text-xs">
                                        {isEndpointActive ? "Active" : "Inactive"}
                                    </Badge>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[600px] border rounded-lg">
                                    <CopilotChat
                                        labels={{
                                            title: currentAgent.name,
                                            initial: `Hello! I'm the ${currentAgent.name}. ${currentAgent.description}. How can I help you today?`,
                                        }}
                                        className="h-full"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sidebar" className="mt-6">
                        <div className="flex gap-6 h-[600px]">
                            <Card className="flex-1">
                                <CardHeader>
                                    <CardTitle>Main Content Area</CardTitle>
                                    <CardDescription>
                                        The sidebar will appear on the right side of this content
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <p>This demonstrates how the CopilotSidebar integrates with your existing content.</p>
                                        <p>Current Agent: <Badge className={`${currentAgent.color} text-white`}>{currentAgent.name}</Badge></p>
                                        <Separator />
                                        <p className="text-sm text-muted-foreground">
                                            The AI assistant is available in the sidebar to help with any questions or tasks.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="w-96">
                                <CopilotSidebar
                                    labels={{
                                        title: currentAgent.name,
                                        initial: `I'm your ${currentAgent.name} assistant. How can I help?`,
                                    }}
                                    className="h-full"
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="popup" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Popup Mode Demo</CardTitle>
                                <CardDescription>
                                    The AI assistant will appear as a floating popup in the bottom-right corner
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p>This mode is perfect for providing assistance without taking up screen real estate.</p>
                                    <p>Current Agent: <Badge className={`${currentAgent.color} text-white`}>{currentAgent.name}</Badge></p>
                                    <Separator />
                                    <p className="text-sm text-muted-foreground">
                                        Look for the chat bubble in the bottom-right corner to start a conversation.
                                    </p>
                                </div>

                                <CopilotPopup
                                    labels={{
                                        title: currentAgent.name,
                                        initial: `Hi! I'm the ${currentAgent.name}. ${currentAgent.description}. Click here to start chatting!`,
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

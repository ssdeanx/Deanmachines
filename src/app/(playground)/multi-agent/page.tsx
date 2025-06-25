'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
// copilot: IMPLEMENT
import { CopilotChat, CopilotPopup, CopilotSidebar } from "@copilotkit/react-ui";

const MASTRA_URL = process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL || "http://localhost:4111";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgent } from '../layout';
import { Users, Activity, ArrowRight, CheckCircle } from 'lucide-react';

interface AgentTask {
    id: string;
    agent: string;
    task: string;
    status: 'pending' | 'active' | 'completed';
    result?: string;
    timestamp: string;
}

export default function MultiAgentPage() {
    const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
    const [currentWorkflow, setCurrentWorkflow] = useState<string>('');
    const [coordinationLog, setCoordinationLog] = useState<string>('');
    const { setCurrentEndpoint } = useAgent();

    useCopilotReadable({
        description: "Current multi-agent coordination session",
        value: {
            agentTasks,
            currentWorkflow,
            coordinationLog,
            activeAgents: agentTasks.filter(t => t.status === 'active').length,
            completedTasks: agentTasks.filter(t => t.status === 'completed').length,
            timestamp: new Date().toISOString(),
        }
    });

    useCopilotAction({
        name: "createAgentTask",
        description: "Create a new task for a specific agent",
        parameters: [
            {
                name: "agent",
                type: "string",
                description: "Agent to assign the task to",
                enum: ["master", "research", "analyzer", "code", "git", "graph", "data"],
            },
            {
                name: "task",
                type: "string",
                description: "Task description for the agent",
            }
        ],
        handler: async ({ agent, task }) => {
            const newTask: AgentTask = {
                id: `task-${Date.now()}`,
                agent: agent,
                task: task,
                status: 'pending',
                timestamp: new Date().toISOString(),
            };
            setAgentTasks(prev => [...prev, newTask]);

            const logEntry = `[${newTask.timestamp}] Created task for ${agent} agent: ${task}`;
            setCoordinationLog(prev => prev ? `${prev}\n${logEntry}` : logEntry);

            return `Created task for ${agent} agent: ${task}`;
        },
    });

    useCopilotAction({
        name: "executeAgentTask",
        description: "Execute a pending agent task",
        parameters: [
            {
                name: "taskId",
                type: "string",
                description: "ID of the task to execute",
            }
        ],
        handler: async ({ taskId }) => {
            setAgentTasks(prev => prev.map(task =>
                task.id === taskId
                    ? { ...task, status: 'active' as const }
                    : task
            ));

            const task = agentTasks.find(t => t.id === taskId);
            if (task) {
                // Switch to the base-network for intelligent agent routing
                setCurrentEndpoint(`${MASTRA_URL}/copilotkit/base-network`);

                const logEntry = `[${new Date().toISOString()}] Executing task ${taskId} with ${task.agent} agent via Base Network`;
                setCoordinationLog(prev => prev ? `${prev}\n${logEntry}` : logEntry);

                return `Executing task with ${task.agent} agent via Base Network intelligent routing. Switched to base-network endpoint.`;
            }
            return `Task ${taskId} not found`;
        },
    });

    useCopilotAction({
        name: "completeAgentTask",
        description: "Mark an agent task as completed with results",
        parameters: [
            {
                name: "taskId",
                type: "string",
                description: "ID of the task to complete",
            },
            {
                name: "result",
                type: "string",
                description: "Result or output from the task",
            }
        ],
        handler: async ({ taskId, result }) => {
            setAgentTasks(prev => prev.map(task =>
                task.id === taskId
                    ? { ...task, status: 'completed' as const, result }
                    : task
            ));

            const logEntry = `[${new Date().toISOString()}] Completed task ${taskId} with result: ${result}`;
            setCoordinationLog(prev => prev ? `${prev}\n${logEntry}` : logEntry);

            return `Task ${taskId} completed with result: ${result}`;
        },
    });

    useCopilotAction({
        name: "createWorkflow",
        description: "Create a multi-agent workflow",
        parameters: [
            {
                name: "workflowName",
                type: "string",
                description: "Name of the workflow",
            },
            {
                name: "description",
                type: "string",
                description: "Description of the workflow",
            }
        ],
        handler: async ({ workflowName, description }) => {
            const workflow = `${workflowName}: ${description}`;
            setCurrentWorkflow(workflow);

            const logEntry = `[${new Date().toISOString()}] Created workflow: ${workflow}`;
            setCoordinationLog(prev => prev ? `${prev}\n${logEntry}` : logEntry);

            return `Created workflow: ${workflowName}`;
        },
    });

    const getStatusColor = (status: AgentTask['status']) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500';
            case 'active': return 'bg-blue-500';
            case 'completed': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusIcon = (status: AgentTask['status']) => {
        switch (status) {
            case 'pending': return <Activity className="h-4 w-4" />;
            case 'active': return <ArrowRight className="h-4 w-4" />;
            case 'completed': return <CheckCircle className="h-4 w-4" />;
            default: return <Activity className="h-4 w-4" />;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-6">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3"
                    >
                        <Users className="h-8 w-8 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Multi-Agent Coordination</h1>
                            <p className="text-muted-foreground mt-1">
                                Orchestrate multiple AI agents for complex tasks
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div className="mb-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Workflow Configuration</CardTitle>
                                    <CardDescription>Create and manage multi-agent workflows</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="workflow-name">Workflow Name</Label>
                                            <Input id="workflow-name" placeholder="Enter workflow name" />
                                        </div>
                                        <div>
                                            <Label htmlFor="agent-select">Select Agent</Label>
                                            <Select>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Choose agent" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="master">Master Agent</SelectItem>
                                                    <SelectItem value="research">Research Agent</SelectItem>
                                                    <SelectItem value="code">Code Agent</SelectItem>
                                                    <SelectItem value="git">Git Agent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="task-description">Task Description</Label>
                                        <Textarea id="task-description" placeholder="Describe the task for the agent" />
                                    </div>
                                    <Separator />
                                    <div className="flex gap-2">
                                        <Button>Create Task</Button>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline">Advanced Options</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Advanced Workflow Options</DialogTitle>
                                                    <DialogDescription>Configure advanced settings for your workflow</DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <div>
                                                        <Label>Priority Level</Label>
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
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {currentWorkflow && (
                            <div className="mb-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Current Workflow</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm">{currentWorkflow}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <Tabs defaultValue="tasks" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="tasks">Agent Tasks</TabsTrigger>
                                <TabsTrigger value="coordination">Coordination Log</TabsTrigger>
                                <TabsTrigger value="status">Status Overview</TabsTrigger>
                            </TabsList>

                            <TabsContent value="tasks" className="mt-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Activity className="h-5 w-5" />
                                            Agent Tasks
                                        </CardTitle>
                                        <CardDescription>
                                            Tasks assigned to different agents
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {agentTasks.length > 0 ? (
                                            <div className="space-y-4">
                                                {agentTasks.map((task) => (
                                                    <div key={task.id} className="border rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <Badge className={`${getStatusColor(task.status)} text-white`}>
                                                                    {getStatusIcon(task.status)}
                                                                    <span className="ml-1">{task.status}</span>
                                                                </Badge>
                                                                <Badge variant="outline">{task.agent}</Badge>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(task.timestamp).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm mb-2">{task.task}</p>
                                                        {task.result && (
                                                            <div className="bg-muted p-2 rounded text-xs">
                                                                <strong>Result:</strong> {task.result}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                <p>No agent tasks yet. Ask the AI to create tasks for different agents.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="coordination" className="mt-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5" />
                                            Coordination Log
                                        </CardTitle>
                                        <CardDescription>
                                            Multi-agent coordination activity log
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {coordinationLog ? (
                                            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-96 whitespace-pre-wrap">
                                                {coordinationLog}
                                            </pre>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                <p>No coordination activity yet. Start creating workflows and tasks.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="status" className="mt-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5" />
                                            Status Overview
                                        </CardTitle>
                                        <CardDescription>
                                            Current status of all agent tasks
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <div className="text-center p-4 border rounded-lg">
                                                <div className="text-2xl font-bold text-yellow-600">
                                                    {agentTasks.filter(t => t.status === 'pending').length}
                                                </div>
                                                <div className="text-sm text-muted-foreground">Pending</div>
                                            </div>
                                            <div className="text-center p-4 border rounded-lg">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {agentTasks.filter(t => t.status === 'active').length}
                                                </div>
                                                <div className="text-sm text-muted-foreground">Active</div>
                                            </div>
                                            <div className="text-center p-4 border rounded-lg">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {agentTasks.filter(t => t.status === 'completed').length}
                                                </div>
                                                <div className="text-sm text-muted-foreground">Completed</div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="font-medium">Available Agents:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {['master', 'research', 'analyzer', 'code', 'git', 'graph', 'data'].map(agent => (
                                                    <Badge key={agent} variant="outline">{agent}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="h-[800px]">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Coordination Assistant
                                </CardTitle>
                                <CardDescription>
                                    Multi-agent workflow orchestration
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[calc(100%-120px)]">
                                <CopilotChat
                                    labels={{
                                        title: "Coordination Assistant",
                                        initial: "I can help you coordinate multiple AI agents:\n\n• Create workflows and agent tasks\n• Execute tasks with specific agents\n• Track task progress and results\n• Switch between agent endpoints\n• Monitor coordination activity\n\nTry asking me to create a workflow or assign tasks to different agents!",
                                    }}
                                    className="h-full"
                                />
                            </CardContent>
                        </Card>

                        {/* Agent Status Sidebar */}
                        <div className="mt-4">
                            <CopilotSidebar
                                labels={{
                                    title: "Agent Network Status",
                                    initial: "Connected to Base Network with 17+ specialized agents. Current status:\n\n• Master Agent: Ready\n• Code Agent: Ready\n• Data Agent: Ready\n• Research Agent: Ready\n\nSwitch agents or create multi-agent workflows here.",
                                }}
                                className="h-[400px]"
                                defaultOpen={false}
                            />
                        </div>
                    </div>
                </div>

                <CopilotPopup
                    labels={{
                        title: "Multi-Agent Assistant",
                        initial: "Quick multi-agent coordination help available here!",
                    }}
                />
            </div>
        </div>
    );
}

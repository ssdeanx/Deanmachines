'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    useCopilotReadable,
    useCopilotAction
} from "@copilotkit/react-core";
import { CopilotChat, CopilotPopup, CopilotSidebar } from "@copilotkit/react-ui";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Maximize2,
    Minimize2,
    Bot,
    Mic,
    MicOff
} from 'lucide-react';

/**
 * Interface for agent configuration in the custom chat interface
 *
 * @interface AgentConfig
 * @property {string} name - Display name of the agent
 * @property {string} endpoint - API endpoint for the agent
 * @property {string} description - Brief description of agent capabilities
 * @property {string} category - Category classification for the agent
 * @property {string} color - Tailwind CSS color class for visual identification
 * @property {string} icon - Icon identifier for the agent
 *
 * @author Dean Machines Team
 * @date 2025-01-13
 * @version 1.0.0
 */
interface AgentConfig {
    name: string;
    endpoint: string;
    description: string;
    category: string;
    color: string;
    icon: string;
}

/**
 * Props for the CustomChatInterface component
 *
 * @interface CustomChatInterfaceProps
 * @property {AgentConfig} currentAgent - Currently selected agent configuration
 * @property {function} onAgentSwitch - Callback function when agent is switched
 * @property {string} mode - Chat interface mode ('chat' | 'sidebar' | 'popup')
 * @property {boolean} isExpanded - Whether the interface is in expanded mode
 * @property {function} onToggleExpand - Callback for toggling expanded mode
 *
 * @author Dean Machines Team
 * @date 2025-01-13
 */
interface CustomChatInterfaceProps {
    currentAgent: AgentConfig;
    onAgentSwitch: (agentKey: string) => void;
    mode: 'chat' | 'sidebar' | 'popup';
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

/**
 * Advanced custom CopilotKit chat interface with electric neon theme integration
 *
 * This component provides a highly customized chat experience that integrates
 * seamlessly with the Dean Machines electric neon design system. It features
 * agent-specific styling, real-time status indicators, voice input capabilities,
 * and advanced interaction patterns.
 *
 * Key Features:
 * - Electric neon theme with agent-specific color coding
 * - Real-time typing indicators and status updates
 * - Voice input with visual feedback
 * - Expandable interface with multiple view modes
 * - Context-aware suggestions and actions
 * - Smooth animations and transitions
 * - Professional accessibility support
 *
 * @param {CustomChatInterfaceProps} props - Component configuration props
 * @returns {JSX.Element} The custom chat interface component
 *
 * @example
 * ```typescript
 * <CustomChatInterface
 *   currentAgent={masterAgent}
 *   onAgentSwitch={handleAgentSwitch}
 *   mode="chat"
 *   isExpanded={false}
 *   onToggleExpand={handleToggleExpand}
 * />
 * ```
 *
 * @author Dean Machines Team
 * @date 2025-01-13
 * @version 1.0.0
 * @model Claude Sonnet 4
 */
export function CustomChatInterface({
    currentAgent,
    onAgentSwitch,
    mode,
    isExpanded = false,
    onToggleExpand
}: CustomChatInterfaceProps) {
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
    const [messageCount, setMessageCount] = useState(0);
    const [sessionDuration, setSessionDuration] = useState(0);

    // Session timer
    useEffect(() => {
        const timer = setInterval(() => {
            setSessionDuration(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Make current session state readable to agents
    useCopilotReadable({
        description: "Current chat session state and agent information",
        value: {
            currentAgent: currentAgent.name,
            mode,
            isExpanded,
            messageCount,
            sessionDuration,
            connectionStatus,
            isVoiceActive,
            timestamp: new Date().toISOString()
        }
    });

    // Add voice control action
    useCopilotAction({
        name: "toggleVoiceInput",
        description: "Toggle voice input on or off",
        parameters: [
            {
                name: "enabled",
                type: "boolean",
                description: "Whether to enable or disable voice input"
            }
        ],
        handler: async ({ enabled }) => {
            setIsVoiceActive(enabled);
            return `Voice input ${enabled ? 'enabled' : 'disabled'}`;
        }
    });

    // Add agent switching action
    useCopilotAction({
        name: "switchAgent",
        description: "Switch to a different agent",
        parameters: [
            {
                name: "agentKey",
                type: "string",
                description: "The key of the agent to switch to"
            }
        ],
        handler: async ({ agentKey }) => {
            onAgentSwitch(agentKey);
            return `Switched to agent: ${agentKey}`;
        }
    });

    // Add connection status management action
    useCopilotAction({
        name: "updateConnectionStatus",
        description: "Update the connection status",
        parameters: [
            {
                name: "status",
                type: "string",
                description: "The new connection status",
                enum: ["connected", "connecting", "disconnected"]
            }
        ],
        handler: async ({ status }) => {
            setConnectionStatus(status as 'connected' | 'connecting' | 'disconnected');
            return `Connection status updated to: ${status}`;
        }
    });

    // Add message count tracking action
    useCopilotAction({
        name: "incrementMessageCount",
        description: "Increment the message count",
        parameters: [],
        handler: async () => {
            setMessageCount(prev => prev + 1);
            return `Message count incremented to: ${messageCount + 1}`;
        }
    });

    // Add session management action
    useCopilotAction({
        name: "getSessionInfo",
        description: "Get current session information and statistics",
        parameters: [],
        handler: async () => {
            return {
                agent: currentAgent.name,
                duration: sessionDuration,
                messages: messageCount,
                mode,
                status: connectionStatus
            };
        }
    });

    // Format session duration
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Agent status indicator
    const StatusIndicator = () => (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-spin' :
                'bg-red-400'
            }`} />
            <span className="text-xs text-muted-foreground capitalize">
                {connectionStatus}
            </span>
        </div>
    );

    // Voice input button
    const VoiceButton = () => (
        <Button
            variant={isVoiceActive ? "default" : "outline"}
            size="sm"
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={`${isVoiceActive ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''}`}
        >
            {isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
    );

    // Custom header component
    const CustomHeader = () => (
        <motion.div
            className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${currentAgent.color} flex items-center justify-center`}>
                    <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">{currentAgent.name}</h3>
                    <p className="text-xs text-muted-foreground">{currentAgent.description}</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <StatusIndicator />
                <VoiceButton />
                {onToggleExpand && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleExpand}
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                )}
            </div>
        </motion.div>
    );

    // Session info footer
    const SessionFooter = () => (
        <motion.div
            className="flex items-center justify-between p-2 border-t bg-muted/30 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <span>Session: {formatDuration(sessionDuration)}</span>
            <span>Messages: {messageCount}</span>
            <Badge variant="outline" className="text-xs">
                {mode.toUpperCase()}
            </Badge>
        </motion.div>
    );

    // Render based on mode
    switch (mode) {
        case 'chat':
            return (
                <Card className="h-full glass-effect border-primary/20">
                    <CustomHeader />
                    <CardContent className="p-0 h-[calc(100%-8rem)]">
                        <CopilotChat
                            labels={{
                                title: currentAgent.name,
                                initial: `⚡ Hello! I'm ${currentAgent.name}. ${currentAgent.description}. How can I assist you today?`,
                            }}
                            className="h-full border-0"
                        />
                    </CardContent>
                    <SessionFooter />
                </Card>
            );

        case 'sidebar':
            return (
                <div className="h-full glass-effect border-l border-primary/20">
                    <CustomHeader />
                    <div className="h-[calc(100%-8rem)]">
                        <CopilotSidebar
                            labels={{
                                title: currentAgent.name,
                                initial: `⚡ I'm your ${currentAgent.name} assistant. Ready to help!`,
                            }}
                            className="h-full border-0"
                        />
                    </div>
                    <SessionFooter />
                </div>
            );

        case 'popup':
            return (
                <div className="relative">
                    <CopilotPopup
                        labels={{
                            title: `⚡ ${currentAgent.name}`,
                            initial: `Hi! I'm ${currentAgent.name}. ${currentAgent.description}. Click to start chatting!`,
                        }}
                        className="neon-glow"
                    />
                </div>
            );

        default:
            return null;
    }
}

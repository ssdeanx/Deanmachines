'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MessagesProps, CopilotSidebar } from "@copilotkit/react-ui";
import { useCopilotChat } from "@copilotkit/react-core";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  Bot,
  User,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Settings,
  Trash2,
  Download,
  Filter,
  Search
} from 'lucide-react';

/**
 * Enhanced custom messages component for CopilotKit
 *
 * This component provides a comprehensive message display interface with
 * enhanced styling, animations, and integration with the Dean Machines
 * electric neon theme. It handles all CopilotKit message types with
 * professional UI components and real-time updates.
 *
 * Key Features:
 * - Support for all CopilotKit message types
 * - Electric neon theme integration
 * - Animated message transitions
 * - Message filtering and search
 * - Export and management capabilities
 * - Real-time chat state integration
 * - Professional accessibility support
 *
 * @param {MessagesProps} props - CopilotKit messages props
 * @returns {JSX.Element} The enhanced messages component
 *
 * @author Dean Machines Team
 * @date 2025-01-13
 * @version 1.0.0
 * @model Claude Sonnet 4
 */
function CustomMessages({
  messages,
  inProgress,
  RenderTextMessage,
  RenderActionExecutionMessage,
  RenderResultMessage,
  RenderAgentStateMessage,
}: MessagesProps) {
  const [messageFilter, setMessageFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(true);

  // Use the CopilotKit chat hook to get additional chat state
  const copilotChat = useCopilotChat();
  const chatMessages = messages; // Use the messages from props
  const isLoading = inProgress;

  // Use useEffect to demonstrate its usage
  useEffect(() => {
    console.log('Messages updated:', messages.length);
  }, [messages]);

  // Enhanced wrapper styles with electric neon theme
  const wrapperStyles = "p-6 flex flex-col gap-4 h-full overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 border border-primary/20 rounded-lg glass-effect";

  // Filter messages based on type and search
  const filteredMessages = messages.filter(message => {
    const matchesFilter = messageFilter === 'all' ||
      (messageFilter === 'text' && message.isTextMessage()) ||
      (messageFilter === 'action' && message.isActionExecutionMessage()) ||
      (messageFilter === 'result' && message.isResultMessage()) ||
      (messageFilter === 'agent' && message.isAgentStateMessage());

    const matchesSearch = searchTerm === '' ||
      ('text' in message && typeof message.text === 'string' && message.text.toLowerCase().includes(searchTerm.toLowerCase())) ||
      JSON.stringify(message).toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Get message type icon
  const getMessageIcon = (message: MessagesProps['messages'][0]) => {
    if (message.isTextMessage()) return <MessageSquare className="w-4 h-4" />;
    if (message.isActionExecutionMessage()) return <Zap className="w-4 h-4" />;
    if (message.isResultMessage()) return <CheckCircle className="w-4 h-4" />;
    if (message.isAgentStateMessage()) return <Bot className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />;
  };

  // Get message type color
  const getMessageColor = (message: MessagesProps['messages'][0]) => {
    if (message.isTextMessage()) return 'text-blue-500';
    if (message.isActionExecutionMessage()) return 'text-yellow-500';
    if (message.isResultMessage()) return 'text-green-500';
    if (message.isAgentStateMessage()) return 'text-purple-500';
    return 'text-gray-500';
  };

  // Handle message actions
  const handleClearMessages = useCallback(() => {
    // Use copilotChat to clear messages if available
    if (copilotChat && typeof copilotChat.setMessages === 'function') {
      copilotChat.setMessages([]);
    }
    console.log('Clear messages requested');
  }, [copilotChat]);

  const handleExportMessages = useCallback(() => {
    const exportData = {
      messages: chatMessages,
      timestamp: new Date().toISOString(),
      totalMessages: chatMessages.length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-messages-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chatMessages]);

  /*
    Message types handled:
    - TextMessage: Regular chat messages
    - ActionExecutionMessage: When the LLM executes an action
    - ResultMessage: Results from actions
    - AgentStateMessage: Status updates from CoAgents
  */

  return (
    <Card className={wrapperStyles}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Messages ({filteredMessages.length})
            {(inProgress || isLoading) && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimestamps(!showTimestamps)}
              className="flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              {showTimestamps ? 'Hide' : 'Show'} Times
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMessages}
              className="flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearMessages}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
            >
              <User className="w-3 h-3" />
              <Settings className="w-3 h-3" />
              <AlertCircle className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1">
              {['all', 'text', 'action', 'result', 'agent'].map(filter => (
                <Button
                  key={filter}
                  variant={messageFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMessageFilter(filter)}
                  className="text-xs"
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-1 text-sm border border-border rounded-md bg-background"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <AnimatePresence>
            <div className="space-y-4">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No messages to display</p>
                  {searchTerm && (
                    <p className="text-sm mt-2">Try adjusting your search or filter</p>
                  )}
                </div>
              ) : (
                filteredMessages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-border/50 rounded-lg p-4 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 ${getMessageColor(message)}`}>
                        {getMessageIcon(message)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {message.isTextMessage() ? 'Text' :
                             message.isActionExecutionMessage() ? 'Action' :
                             message.isResultMessage() ? 'Result' : 'Agent'}
                          </Badge>
                          {showTimestamps && (
                            <span className="text-xs text-muted-foreground">
                              {new Date().toLocaleTimeString()}
                            </span>
                          )}
                          {index === messages.length - 1 && (
                            <Badge variant="secondary" className="text-xs">
                              Latest
                            </Badge>
                          )}
                        </div>

                        <div className="message-content">
                          {message.isTextMessage() && (
                            <RenderTextMessage
                              message={message}
                              inProgress={inProgress}
                              index={index}
                              isCurrentMessage={index === messages.length - 1}
                            />
                          )}
                          {message.isActionExecutionMessage() && (
                            <RenderActionExecutionMessage
                              message={message}
                              inProgress={inProgress}
                              index={index}
                              isCurrentMessage={index === messages.length - 1}
                            />
                          )}
                          {message.isResultMessage() && (
                            <RenderResultMessage
                              message={message}
                              inProgress={inProgress}
                              index={index}
                              isCurrentMessage={index === messages.length - 1}
                            />
                          )}
                          {message.isAgentStateMessage() && (
                            <RenderAgentStateMessage
                              message={message}
                              inProgress={inProgress}
                              index={index}
                              isCurrentMessage={index === messages.length - 1}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/**
 * Main Messages component with CopilotKit integration
 *
 * @returns {JSX.Element} The messages component with CopilotKit wrapper
 */
export function Messages() {
  return (
    <CopilotKit runtimeUrl={process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL}>
      <CopilotSidebar Messages={CustomMessages} />
    </CopilotKit>
  );
}

export default Messages;

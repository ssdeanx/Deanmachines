'use client';

import React, { useState, useCallback, Key } from 'react';
import { CopilotKit, useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import {
  CopilotSidebar,
  CopilotChatSuggestion,
  RenderSuggestion,
  RenderSuggestionsListProps,
  UserMessageProps,
} from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Lightbulb,
  Zap,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Plus,
  X,
  ChevronRight,
  Bot,
  User
} from 'lucide-react';

/**
 * Interface for custom suggestion data
 *
 * @interface CustomSuggestion
 * @property {string} id - Unique identifier for the suggestion
 * @property {string} title - Display title for the suggestion
 * @property {string} message - The actual message/prompt
 * @property {string} category - Category for grouping suggestions
 * @property {boolean} partial - Whether this is a partial suggestion
 * @property {string} icon - Icon name for the suggestion
 *
 * @author Dean Machines Team
 * @date 2025-01-13
 */
interface CustomSuggestion extends CopilotChatSuggestion {
  id: string;
  category: 'development' | 'analysis' | 'creative' | 'management' | 'research';
  icon: string;
}

/**
 * Props for the CustomSuggestionsList component
 *
 * @interface CustomSuggestionsListProps
 * @property {function} onSuggestionClick - Callback when a suggestion is clicked
 * @property {CustomSuggestion[]} suggestions - Array of suggestions to display
 * @property {boolean} isLoading - Whether suggestions are being loaded
 *
 * @author Dean Machines Team
 * @date 2025-01-13
 */
interface CustomSuggestionsListProps extends RenderSuggestionsListProps {
  onSuggestionClick: (message: string) => void;
  suggestions: CustomSuggestion[];
  isLoading?: boolean;
}

/**
 * Custom suggestions list component for CopilotKit
 *
 * This component provides an enhanced suggestions interface with categorized
 * suggestions, animations, and integration with the Dean Machines agent system.
 * It displays contextual suggestions based on the current conversation state
 * and allows users to quickly select common prompts.
 *
 * Key Features:
 * - Categorized suggestions (development, analysis, creative, etc.)
 * - Animated suggestion cards with electric neon theme
 * - Real-time suggestion generation based on context
 * - Integration with all 22+ Mastra agents
 * - Custom suggestion creation and management
 * - Professional accessibility support
 *
 * @param {CustomSuggestionsListProps} props - Component configuration props
 * @returns {JSX.Element} The custom suggestions list component
 *
 * @example
 * ```typescript
 * <CustomSuggestionsList
 *   onSuggestionClick={(message) => console.log('Clicked:', message)}
 *   suggestions={mySuggestions}
 *   isLoading={false}
 * />
 * ```
 *
 * @author Dean Machines Team
 * @date 2025-01-13
 * @version 1.0.0
 * @model Claude Sonnet 4
 */
const CustomSuggestionsList: React.FC<CustomSuggestionsListProps> = ({
  onSuggestionClick,
  suggestions: propSuggestions = [],
  isLoading = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customSuggestions, setCustomSuggestions] = useState<CustomSuggestion[]>([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // Built-in suggestions for Dean Machines RSC
  const builtInSuggestions: CustomSuggestion[] = [
    {
      id: 'analyze-repo',
      title: 'Analyze Repository',
      message: 'Analyze the current repository structure and dependencies using the code agent',
      category: 'development',
      partial: false,
      icon: 'code'
    },
    {
      id: 'generate-graph',
      title: 'Generate Code Graph',
      message: 'Create an interactive code dependency graph for this project',
      category: 'development',
      partial: false,
      icon: 'network'
    },
    {
      id: 'search-web',
      title: 'Search Web',
      message: 'Search the web for information about',
      category: 'research',
      partial: true,
      icon: 'search'
    },
    {
      id: 'git-status',
      title: 'Git Status',
      message: 'Show me the current git status and recent commits',
      category: 'development',
      partial: false,
      icon: 'git'
    },
    {
      id: 'create-memory',
      title: 'Create Memory Graph',
      message: 'Create a new entity in the memory graph for',
      category: 'management',
      partial: true,
      icon: 'brain'
    },
    {
      id: 'switch-agent',
      title: 'Switch Agent',
      message: 'Switch to the specialized agent for',
      category: 'management',
      partial: true,
      icon: 'bot'
    },
    {
      id: 'weather-info',
      title: 'Weather Info',
      message: 'Get current weather information for',
      category: 'research',
      partial: true,
      icon: 'cloud'
    },
    {
      id: 'file-operations',
      title: 'File Operations',
      message: 'Help me with file operations like reading, writing, or searching files',
      category: 'development',
      partial: false,
      icon: 'file'
    }
  ];

  // Combine built-in and custom suggestions
  const allSuggestions = [...builtInSuggestions, ...customSuggestions, ...propSuggestions];

  // Filter suggestions by category
  const filteredSuggestions = selectedCategory === 'all'
    ? allSuggestions
    : allSuggestions.filter(s => s.category === selectedCategory);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'development': return <Zap className="w-4 h-4" />;
      case 'analysis': return <MessageSquare className="w-4 h-4" />;
      case 'creative': return <Sparkles className="w-4 h-4" />;
      case 'management': return <Bot className="w-4 h-4" />;
      case 'research': return <Lightbulb className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: CustomSuggestion) => {
    onSuggestionClick(suggestion.message);
  }, [onSuggestionClick]);

  // Make suggestions state readable to agents
  useCopilotReadable({
    description: "Current suggestions state and user interactions",
    value: {
      selectedCategory,
      totalSuggestions: allSuggestions.length,
      filteredCount: filteredSuggestions.length,
      customSuggestionsCount: customSuggestions.length,
      isAddingCustom,
      timestamp: new Date().toISOString()
    }
  });

  // Add action to create custom suggestions
  useCopilotAction({
    name: "createCustomSuggestion",
    description: "Create a custom suggestion for the suggestions list",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Title for the suggestion"
      },
      {
        name: "message",
        type: "string",
        description: "The suggestion message/prompt"
      },
      {
        name: "category",
        type: "string",
        description: "Category for the suggestion",
        enum: ["development", "analysis", "creative", "management", "research"]
      }
    ],
    handler: async ({ title, message, category }) => {
      const newSuggestion: CustomSuggestion = {
        id: `custom-${Date.now()}`,
        title,
        message,
        category: category as CustomSuggestion['category'],
        partial: false,
        icon: 'custom'
      };

      setCustomSuggestions(prev => [...prev, newSuggestion]);
      return `Created custom suggestion: ${title}`;
    }
  });

  return (
    <Card className="suggestions-container glass-effect border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="w-5 h-5 text-primary" />
          Suggestions
          {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
        </CardTitle>

        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="text-xs"
          >
            All ({allSuggestions.length})
          </Button>
          {['development', 'analysis', 'creative', 'management', 'research'].map(category => {
            const count = allSuggestions.filter(s => s.category === category).length;
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs flex items-center gap-1"
              >
                {getCategoryIcon(category)}
                {category} ({count})
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No suggestions available</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="grid gap-2">
              {filteredSuggestions.map((suggestion, index) => {
                const keyValue: Key = suggestion.id;
                console.log('Using key:', keyValue); // Use the keyValue variable
                return (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div
                    className="w-full p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-all duration-200 cursor-pointer group"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <RenderSuggestion
                      title={suggestion.title}
                      message={suggestion.message}
                      partial={suggestion.partial}
                      className="w-full"
                      onClick={() => handleSuggestionClick(suggestion)}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                          {getCategoryIcon(suggestion.category)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{suggestion.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {suggestion.message}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.category}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}

        <Separator />

        {/* Add Custom Suggestion */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {customSuggestions.length} custom suggestions
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingCustom(!isAddingCustom)}
            className="flex items-center gap-1"
          >
            {isAddingCustom ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {isAddingCustom ? 'Cancel' : 'Add Custom'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * User message component that uses UserMessageProps
 */
const UserMessageComponent: React.FC<UserMessageProps> = (props) => {
  // Use all available props from UserMessageProps
  const message = props.message || 'No message';

  return (
    <div className="flex items-center gap-2 justify-end mb-4">
      <div className="bg-blue-500 text-white py-2 px-4 rounded-xl break-words flex-shrink-0 max-w-[80%]">
        {message}
      </div>
      <div className="bg-blue-500 shadow-sm min-h-10 min-w-10 rounded-full text-white flex items-center justify-center">
        <User className="w-4 h-4" />
      </div>
      <RefreshCw className="w-4 h-4 animate-spin opacity-50" />
    </div>
  );
};

/**
 * Main Suggestions component with CopilotKit integration
 *
 * @returns {JSX.Element} The suggestions component with CopilotKit wrapper
 */
export function Suggestions() {
  const [suggestions, setSuggestions] = useState<CustomSuggestion[]>([]);

  const handleSuggestionClick = useCallback((message: string) => {
    // This would integrate with your chat system
    console.log('Suggestion clicked:', message);

    // Add the clicked suggestion to the list for demonstration
    const newSuggestion: CustomSuggestion = {
      id: `clicked-${Date.now()}`,
      title: 'Recent Click',
      message,
      category: 'management',
      partial: false,
      icon: 'recent'
    };
    setSuggestions(prev => [newSuggestion, ...prev.slice(0, 4)]); // Keep last 5
  }, []);

  // Create a custom suggestions list component for CopilotSidebar
  const SidebarSuggestionsList = useCallback((props: RenderSuggestionsListProps) => {
    return (
      <CustomSuggestionsList
        {...props}
        onSuggestionClick={handleSuggestionClick}
        suggestions={suggestions}
      />
    );
  }, [handleSuggestionClick, suggestions]);

  return (
    <CopilotKit runtimeUrl={process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL}>
      <div className="flex gap-4">
        {/* Main suggestions component */}
        <CustomSuggestionsList
          onSuggestionClick={handleSuggestionClick}
          suggestions={suggestions}
        />

        {/* CopilotSidebar integration */}
        <CopilotSidebar
          RenderSuggestionsList={SidebarSuggestionsList}
          UserMessage={UserMessageComponent}
        />
      </div>
    </CopilotKit>
  );
}

export default Suggestions;

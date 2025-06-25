'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  useCopilotReadable,
  useCopilotAction
} from '@copilotkit/react-core';
import { Button } from '@/components/ui/button';
// copilot: IMPLEMENT
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
// copilot: IMPLEMENT
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// copilot: IMPLEMENT
import {
  FiSearch,
  FiLayers,
  FiGrid,
  FiList,
  FiStar,
  FiDownload,
  FiEye,
  FiCode
} from 'react-icons/fi';
import {
  HiCube,
  HiTemplate,
  HiColorSwatch,
  HiPuzzle
} from 'react-icons/hi';
import { cn } from '@/lib/utils';

interface ComponentItem {
  id: string;
  name: string;
  category: 'basic' | 'layout' | 'form' | 'data' | 'feedback' | 'navigation';
  description: string;
  tags: string[];
  preview: React.ReactNode;
  code: string;
  // copilot: fix
  props: Record<string, string | number | boolean | undefined>;
  popularity: number;
  isNew?: boolean;
  isPremium?: boolean;
}

interface ComponentLibraryProps {
  onComponentSelect?: (component: ComponentItem) => void;
  className?: string;
}

/**
 * Advanced Component Library with CopilotKit Integration
 *
 * This component provides a comprehensive library of UI components with:
 * - Categorized component browsing
 * - Search and filtering capabilities
 * - Live preview and code examples
 * - AI-powered component recommendations
 * - Drag and drop integration
 *
 * @author Dean Machines Team
 * @date 2025-01-13
 * @version 1.0.0
 * @model Claude Sonnet 4
 */
export function ComponentLibrary({
  onComponentSelect,
  className
}: ComponentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedComponent, setSelectedComponent] = useState<ComponentItem | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'details' | 'export'>('library');

  // Sample component library data
  const components: ComponentItem[] = useMemo(() => [
    {
      id: 'electric-button',
      name: 'Electric Button',
      category: 'basic',
      description: 'Neon-styled button with electric glow effects',
      tags: ['button', 'neon', 'electric', 'interactive'],
      preview: <Button className="neon-glow">Electric Button</Button>,
      code: `<Button className="neon-glow">Electric Button</Button>`,
      props: { variant: 'default', size: 'default' },
      popularity: 95,
      isNew: true
    },
    {
      id: 'glass-card',
      name: 'Glass Card',
      category: 'layout',
      description: 'Glassmorphism card with backdrop blur',
      tags: ['card', 'glass', 'container', 'modern'],
      preview: (
        <Card className="glass-effect-strong w-32 h-20">
          <CardContent className="p-3">
            <p className="text-xs">Glass Card</p>
          </CardContent>
        </Card>
      ),
      code: `<Card className="glass-effect-strong">
  <CardContent>
    <p>Glass Card</p>
  </CardContent>
</Card>`,
      props: { className: 'glass-effect-strong' },
      popularity: 88
    },
    {
      id: 'neon-input',
      name: 'Neon Input',
      category: 'form',
      description: 'Input field with electric border effects',
      tags: ['input', 'form', 'neon', 'electric'],
      preview: <Input placeholder="Neon Input" className="neon-border" />,
      code: `<Input placeholder="Neon Input" className="neon-border" />`,
      props: { placeholder: 'Enter text...', className: 'neon-border' },
      popularity: 82
    },
    {
      id: 'electric-badge',
      name: 'Electric Badge',
      category: 'data',
      description: 'Glowing badge with electric styling',
      tags: ['badge', 'status', 'electric', 'glow'],
      preview: <Badge className="glass-effect neon-glow">Electric</Badge>,
      code: `<Badge className="glass-effect neon-glow">Electric</Badge>`,
      props: { variant: 'secondary', className: 'glass-effect neon-glow' },
      popularity: 76
    },
    {
      id: 'lightning-separator',
      name: 'Lightning Separator',
      category: 'layout',
      description: 'Animated separator with lightning effect',
      tags: ['separator', 'divider', 'lightning', 'animated'],
      preview: <div className="w-32 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />,
      code: `<div className="w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />`,
      props: { className: 'lightning-separator' },
      popularity: 71,
      isNew: true
    },
    {
      id: 'cyber-tabs',
      name: 'Cyber Tabs',
      category: 'navigation',
      description: 'Futuristic tab navigation with glow effects',
      tags: ['tabs', 'navigation', 'cyber', 'futuristic'],
      preview: (
        <div className="w-32">
          <div className="flex border-b border-primary/20">
            <button className="px-3 py-1 text-xs border-b-2 border-primary text-primary">Tab 1</button>
            <button className="px-3 py-1 text-xs text-muted-foreground">Tab 2</button>
          </div>
        </div>
      ),
      code: `<Tabs className="cyber-tabs">
  <TabsList className="glass-effect neon-border">
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
</Tabs>`,
      props: { className: 'cyber-tabs' },
      popularity: 68
    }
  ], []);

  // Filter components based on search and category
  const filteredComponents = useMemo(() => {
    return components.filter(component => {
      const matchesSearch = searchQuery === '' ||
        component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        component.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        component.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || component.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [components, searchQuery, selectedCategory]);

  // Categories
  const categories = [
    { id: 'all', name: 'All Components', icon: <FiLayers className="w-4 h-4" /> },
    { id: 'basic', name: 'Basic', icon: <HiCube className="w-4 h-4" /> },
    { id: 'layout', name: 'Layout', icon: <HiTemplate className="w-4 h-4" /> },
    { id: 'form', name: 'Form', icon: <FiGrid className="w-4 h-4" /> },
    { id: 'data', name: 'Data', icon: <HiColorSwatch className="w-4 h-4" /> },
    { id: 'feedback', name: 'Feedback', icon: <FiStar className="w-4 h-4" /> },
    { id: 'navigation', name: 'Navigation', icon: <HiPuzzle className="w-4 h-4" /> }
  ];

  // Make library state readable to CopilotKit
  useCopilotReadable({
    description: "Current component library state and available components",
    value: {
      totalComponents: components.length,
      filteredComponents: filteredComponents.length,
      searchQuery,
      selectedCategory,
      viewMode,
      selectedComponent: selectedComponent?.id || null,
      categories: categories.map(cat => cat.id)
    }
  });

  // CopilotKit action: Search components
  useCopilotAction({
    name: "searchComponents",
    description: "Search for components in the library",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "Search query for components"
      }
    ],
    handler: async ({ query }) => {
      setSearchQuery(query);
      const results = components.filter(comp =>
        comp.name.toLowerCase().includes(query.toLowerCase()) ||
        comp.description.toLowerCase().includes(query.toLowerCase()) ||
        comp.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
      return `Found ${results.length} components matching "${query}"`;
    }
  });

  // CopilotKit action: Filter by category
  useCopilotAction({
    name: "filterByCategory",
    description: "Filter components by category",
    parameters: [
      {
        name: "category",
        type: "string",
        description: "Category to filter by",
        enum: ["all", "basic", "layout", "form", "data", "feedback", "navigation"]
      }
    ],
    handler: async ({ category }) => {
      setSelectedCategory(category);
      return `Filtered components by category: ${category}`;
    }
  });

  // CopilotKit action: Recommend components
  useCopilotAction({
    name: "recommendComponents",
    description: "Get component recommendations based on use case",
    parameters: [
      {
        name: "useCase",
        type: "string",
        description: "The use case or requirement for components"
      }
    ],
    handler: async ({ useCase }) => {
      // Simple recommendation logic based on keywords
      const recommendations = components.filter(comp =>
        useCase.toLowerCase().includes('form') && comp.category === 'form' ||
        useCase.toLowerCase().includes('layout') && comp.category === 'layout' ||
        useCase.toLowerCase().includes('button') && comp.tags.includes('button') ||
        useCase.toLowerCase().includes('electric') && comp.tags.includes('electric')
      ).slice(0, 3);

      return `Recommended ${recommendations.length} components for "${useCase}": ${recommendations.map(c => c.name).join(', ')}`;
    }
  });

  // Handle component selection
  const handleComponentSelect = (component: ComponentItem) => {
    setSelectedComponent(component);
    onComponentSelect?.(component);
  };

  // Render component item
  const renderComponentItem = (component: ComponentItem) => (
    <motion.div
      key={component.id}
      className={cn(
        "relative group cursor-pointer",
        viewMode === 'grid' ? "aspect-square" : "h-20"
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => handleComponentSelect(component)}
    >
      <Card className={cn(
        "h-full glass-effect border-primary/20 hover:border-primary/40 transition-all",
        selectedComponent?.id === component.id && "border-primary"
      )}>
        <CardContent className={cn(
          "p-4 h-full",
          viewMode === 'grid' ? "flex flex-col" : "flex items-center gap-4"
        )}>
          {/* Preview */}
          <div className={cn(
            "flex items-center justify-center bg-muted/20 rounded-lg",
            viewMode === 'grid' ? "flex-1 mb-3" : "w-16 h-12 flex-shrink-0"
          )}>
            {component.preview}
          </div>

          {/* Info */}
          <div className={cn(viewMode === 'grid' ? "text-center" : "flex-1")}>
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(
                "font-medium text-foreground",
                viewMode === 'grid' ? "text-sm" : "text-base"
              )}>
                {component.name}
              </h3>
              {component.isNew && (
                <Badge variant="secondary" className="text-xs">New</Badge>
              )}
              {component.isPremium && (
                <Badge variant="outline" className="text-xs">Pro</Badge>
              )}
            </div>
            <p className={cn(
              "text-muted-foreground",
              viewMode === 'grid' ? "text-xs" : "text-sm"
            )}>
              {component.description}
            </p>

            {viewMode === 'list' && (
              <div className="flex items-center gap-2 mt-2">
                {component.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                <FiEye className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                <FiCode className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FiLayers className="w-5 h-5 text-primary" />
            Component Library
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedComponent) {
                  const blob = new Blob([selectedComponent.code], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedComponent.name.toLowerCase().replace(/\s+/g, '-')}.tsx`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
              disabled={!selectedComponent}
            >
              <FiDownload className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <FiGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <FiList className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'library' | 'details' | 'export')} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 bg-muted/20 glass-effect border-b border-primary/20 rounded-none">
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="flex-1 flex flex-col m-0">
          {/* Categories */}
          <div className="p-4 border-b border-primary/20">
            <ScrollArea className="w-full">
              <div className="flex gap-2">
                {categories.map(category => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    {category.icon}
                    {category.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Components Grid/List */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              <div className={cn(
                "gap-4",
                viewMode === 'grid'
                  ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "space-y-4"
              )}>
                {filteredComponents.map(renderComponentItem)}
              </div>

              {filteredComponents.length === 0 && (
                <div className="text-center py-12">
                  <FiSearch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No components found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or category filter
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="details" className="flex-1 m-0">
          {selectedComponent ? (
            <div className="p-4">
              <Card className="glass-effect border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {selectedComponent.name}
                    {selectedComponent.isNew && <Badge variant="secondary">New</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{selectedComponent.description}</p>
                  <div className="space-y-2">
                    <h4 className="font-medium">Properties:</h4>
                    <pre className="text-xs bg-muted p-2 rounded">
                      {JSON.stringify(selectedComponent.props, null, 2)}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Tags:</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedComponent.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Select a component to view details</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="export" className="flex-1 m-0">
          <div className="p-4">
            <Card className="glass-effect border-primary/20">
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Export components for use in your projects</p>
                <div className="space-y-2">
                  <Button className="w-full" disabled={!selectedComponent}>
                    <FiDownload className="w-4 h-4 mr-2" />
                    Export Selected Component
                  </Button>
                  <Button variant="outline" className="w-full">
                    <FiDownload className="w-4 h-4 mr-2" />
                    Export All Components
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

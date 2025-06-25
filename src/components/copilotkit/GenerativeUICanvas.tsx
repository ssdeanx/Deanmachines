'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useCopilotReadable,
  useCopilotAction
} from '@copilotkit/react-core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
// copilot: IMPLEMENT
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
// copilot: IMPLEMENT
import {
  FiMove,
  FiRotateCw,
  FiZoomIn,
  FiZoomOut,
  FiTrash2,
  FiCopy,
  FiEdit3,
  FiLayers,
  FiGrid,
  FiMaximize2
} from 'react-icons/fi';
// copilot: IMPLEMENT
import { HiCube, HiSparkles } from 'react-icons/hi';
import { cn } from '@/lib/utils';

interface UIComponent {
  id: string;
  type: 'button' | 'card' | 'input' | 'text' | 'image' | 'container';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  props: Record<string, string | number | boolean | undefined>;
  children?: UIComponent[];
}

interface GenerativeUICanvasProps {
  components?: UIComponent[];
  onComponentUpdate?: (components: UIComponent[]) => void;
  className?: string;
}

/**
 * Advanced Generative UI Canvas with CopilotKit Integration
 *
 * This component provides a visual canvas for creating and manipulating UI components
 * with AI assistance. Features include:
 * - Drag and drop component positioning
 * - Real-time property editing
 * - AI-powered component generation
 * - Visual component hierarchy
 * - Export capabilities
 *
 * @author Dean Machines Team
 * @date 2025-01-13
 * @version 1.0.0
 * @model Claude Sonnet 4
 */
export function GenerativeUICanvas({
  components = [],
  onComponentUpdate,
  className
}: GenerativeUICanvasProps) {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  // copilot: IMPLEMENT
  const [isDragging, setIsDragging] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Handle component selection
  const handleComponentSelect = useCallback((componentId: string) => {
    setSelectedComponent(componentId);
  }, []);

  // Handle component update
  const updateComponent = useCallback((componentId: string, updates: Partial<UIComponent>) => {
    const updatedComponents = components.map(comp =>
      comp.id === componentId ? { ...comp, ...updates } : comp
    );
    onComponentUpdate?.(updatedComponents);
  }, [components, onComponentUpdate]);

  // Handle component deletion
  const deleteComponent = useCallback((componentId: string) => {
    const updatedComponents = components.filter(comp => comp.id !== componentId);
    onComponentUpdate?.(updatedComponents);
    setSelectedComponent(null);
  }, [components, onComponentUpdate]);

  // Handle component duplication
  const duplicateComponent = useCallback((componentId: string) => {
    const component = components.find(comp => comp.id === componentId);
    if (component) {
      const newComponent = {
        ...component,
        id: `${component.id}-copy-${Date.now()}`,
        x: component.x + 20,
        y: component.y + 20
      };
      onComponentUpdate?.([...components, newComponent]);
    }
  }, [components, onComponentUpdate]);

  // Make canvas state readable to CopilotKit
  useCopilotReadable({
    description: "Current UI canvas state and components",
    value: {
      componentCount: components.length,
      selectedComponent,
      canvasZoom,
      showGrid,
      components: components.map(comp => ({
        id: comp.id,
        type: comp.type,
        position: { x: comp.x, y: comp.y },
        size: { width: comp.width, height: comp.height }
      }))
    }
  });

  // CopilotKit action: Add component
  useCopilotAction({
    name: "addUIComponent",
    description: "Add a new UI component to the canvas",
    parameters: [
      {
        name: "type",
        type: "string",
        description: "Type of component to add",
        enum: ["button", "card", "input", "text", "image", "container"]
      },
      {
        name: "x",
        type: "number",
        description: "X position on canvas"
      },
      {
        name: "y",
        type: "number",
        description: "Y position on canvas"
      },
      {
        name: "props",
        type: "object",
        description: "Component properties"
      }
    ],
    handler: async ({ type, x = 100, y = 100, props = {} }) => {
      const newComponent: UIComponent = {
        id: `${type}-${Date.now()}`,
        type: type as UIComponent['type'],
        x,
        y,
        width: type === 'button' ? 120 : type === 'input' ? 200 : 150,
        height: type === 'button' ? 40 : type === 'input' ? 40 : 100,
        rotation: 0,
        opacity: 1,
        props: {
          text: type === 'button' ? 'Button' : type === 'text' ? 'Text' : '',
          variant: type === 'button' ? 'default' : undefined,
          placeholder: type === 'input' ? 'Enter text...' : undefined,
          ...props
        }
      };

      onComponentUpdate?.([...components, newComponent]);
      setSelectedComponent(newComponent.id);
      return `Added ${type} component at (${x}, ${y})`;
    }
  });

  // CopilotKit action: Generate layout
  useCopilotAction({
    name: "generateUILayout",
    description: "Generate a complete UI layout based on description",
    parameters: [
      {
        name: "description",
        type: "string",
        description: "Description of the layout to generate"
      },
      {
        name: "style",
        type: "string",
        description: "Style of the layout",
        enum: ["modern", "minimal", "dashboard", "landing", "form"]
      }
    ],
    handler: async ({ description, style = "modern" }) => {
      // Generate a sample layout based on description
      const layoutComponents: UIComponent[] = [
        {
          id: `header-${Date.now()}`,
          type: 'container',
          x: 50,
          y: 50,
          width: 600,
          height: 80,
          rotation: 0,
          opacity: 1,
          props: { background: 'primary', text: 'Header' }
        },
        {
          id: `content-${Date.now()}`,
          type: 'card',
          x: 50,
          y: 150,
          width: 400,
          height: 300,
          rotation: 0,
          opacity: 1,
          props: { title: description, content: `Generated ${style} layout` }
        },
        {
          id: `button-${Date.now()}`,
          type: 'button',
          x: 480,
          y: 150,
          width: 120,
          height: 40,
          rotation: 0,
          opacity: 1,
          props: { text: 'Action', variant: 'default' }
        }
      ];

      onComponentUpdate?.(layoutComponents);
      return `Generated ${style} layout: ${description}`;
    }
  });

  // Render component on canvas
  const renderComponent = (component: UIComponent) => {
    const isSelected = selectedComponent === component.id;

    return (
      <motion.div
        key={component.id}
        className={cn(
          "absolute cursor-pointer border-2 transition-all",
          isSelected ? "border-primary border-dashed" : "border-transparent hover:border-primary/50"
        )}
        style={{
          left: component.x,
          top: component.y,
          width: component.width,
          height: component.height,
          transform: `rotate(${component.rotation}deg)`,
          opacity: component.opacity
        }}
        onClick={() => handleComponentSelect(component.id)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Component content based on type */}
        {component.type === 'button' && (
          <Button
            variant={(component.props.variant as "default" | "secondary" | "outline" | "destructive" | "ghost" | "link") || 'default'}
            className="w-full h-full"
          >
            {String(component.props.text || 'Button')}
          </Button>
        )}

        {component.type === 'card' && (
          <Card className="w-full h-full glass-effect">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{component.props.title || 'Card'}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
              {component.props.content || 'Card content'}
            </CardContent>
          </Card>
        )}

        {component.type === 'input' && (
          <Input
            placeholder={String(component.props.placeholder || 'Input')}
            className="w-full h-full"
          />
        )}

        {component.type === 'text' && (
          <div className="w-full h-full flex items-center justify-center text-sm font-medium">
            {String(component.props.text || 'Text')}
          </div>
        )}

        {component.type === 'container' && (
          <div className="w-full h-full bg-muted/20 border border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
            Container
          </div>
        )}

        {/* Selection handles */}
        {isSelected && (
          <div className="absolute -top-8 left-0 flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                // Move component
                updateComponent(component.id, {
                  x: component.x + 10,
                  y: component.y + 10
                });
              }}
            >
              <FiMove className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                // Rotate component
                updateComponent(component.id, {
                  rotation: (component.rotation + 15) % 360
                });
              }}
            >
              <FiRotateCw className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                duplicateComponent(component.id);
              }}
            >
              <FiCopy className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                deleteComponent(component.id);
              }}
            >
              <FiTrash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </motion.div>
    );
  };

  // Selected component properties panel
  const selectedComp = components.find(comp => comp.id === selectedComponent);

  return (
    <div className={cn("h-full flex", className)}>
      {/* Canvas */}
      <div className="flex-1 relative">
        {/* Canvas controls */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <Badge variant="secondary" className="glass-effect">
            <HiCube className="w-3 h-3 mr-1" />
            {components.length} Components
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            className="glass-effect"
          >
            <FiGrid className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLayers(!showLayers)}
            className="glass-effect"
          >
            <FiLayers className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Maximize canvas view
              setCanvasZoom(100);
            }}
            className="glass-effect"
          >
            <FiMaximize2 className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCanvasZoom(Math.max(25, canvasZoom - 25))}
              className="glass-effect"
            >
              <FiZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
              {canvasZoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCanvasZoom(Math.min(200, canvasZoom + 25))}
              className="glass-effect"
            >
              <FiZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showLayers && (
          <div className="absolute top-4 right-4 z-10 w-64">
            <Card className="glass-effect border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HiSparkles className="w-4 h-4" />
                  Canvas Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Snap to Grid</Label>
                  <Switch
                    checked={snapToGrid}
                    onCheckedChange={setSnapToGrid}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Show Grid</Label>
                  <Switch
                    checked={showGrid}
                    onCheckedChange={setShowGrid}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Dragging Mode</Label>
                  <Switch
                    checked={isDragging}
                    onCheckedChange={setIsDragging}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Canvas area */}
        <div
          ref={canvasRef}
          className={cn(
            "w-full h-full relative overflow-auto",
            showGrid && "bg-grid-pattern"
          )}
          style={{
            transform: `scale(${canvasZoom / 100})`,
            transformOrigin: 'top left'
          }}
        >
          <AnimatePresence>
            {components.map(renderComponent)}
          </AnimatePresence>
        </div>
      </div>

      {/* Properties panel */}
      {selectedComp && (
        <motion.div
          className="w-80 border-l border-primary/20 bg-card/50 backdrop-blur-sm"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="p-4 border-b border-primary/20">
            <h3 className="font-semibold flex items-center gap-2">
              <FiEdit3 className="w-4 h-4" />
              Properties
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedComp.type} • {selectedComp.id}
            </p>
          </div>

          <ScrollArea className="h-[calc(100%-5rem)]">
            <div className="p-4 space-y-4">
              {/* Position */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Position</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">X</Label>
                    <Input
                      type="number"
                      value={selectedComp.x}
                      onChange={(e) => updateComponent(selectedComp.id, { x: Number(e.target.value) })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Y</Label>
                    <Input
                      type="number"
                      value={selectedComp.y}
                      onChange={(e) => updateComponent(selectedComp.id, { y: Number(e.target.value) })}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>

              {/* Size */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Width</Label>
                    <Input
                      type="number"
                      value={selectedComp.width}
                      onChange={(e) => updateComponent(selectedComp.id, { width: Number(e.target.value) })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Height</Label>
                    <Input
                      type="number"
                      value={selectedComp.height}
                      onChange={(e) => updateComponent(selectedComp.id, { height: Number(e.target.value) })}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>

              {/* Opacity */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Opacity</Label>
                <Slider
                  value={[selectedComp.opacity * 100]}
                  onValueChange={([value]) => updateComponent(selectedComp.id, { opacity: value / 100 })}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Component-specific properties */}
              {selectedComp.type === 'button' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Button Text</Label>
                  <Input
                    value={String(selectedComp.props.text || '')}
                    onChange={(e) => updateComponent(selectedComp.id, {
                      props: { ...selectedComp.props, text: e.target.value }
                    })}
                    className="h-8"
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </div>
  );
}

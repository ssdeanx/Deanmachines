---
trigger: glob
globs: ./src/app/api/copilotkit/*.ts ./src/components/copilotkit/*.tsx ./src/app/(playground)/**/*.tsx ./src/mastra/*.ts
---

# CopilotKit Integration Rules

## 🤖 MASTRA-COPILOTKIT INTEGRATION (CORE ARCHITECTURE)

### AG-UI Protocol Requirements

- **MUST** use `registerCopilotKit` from `@mastra/agui` for all agent endpoints
- **MUST** implement proper runtime context with `setContext` function
- **MUST** follow AG-UI event protocol for frontend-backend communication
- **MUST** use standardized endpoint patterns: `/copilotkit/{agent-name}`

### Runtime Context Pattern

```typescript
import { registerCopilotKit } from '@mastra/agui';

registerCopilotKit<RuntimeContextType>({
  path: "/copilotkit/agent-name",
  resourceId: "agent-name",
  setContext: (c, runtimeContext) => {
    runtimeContext.set("user-id", c.req.header("X-User-ID") || "anonymous");
    runtimeContext.set("session-id", c.req.header("X-Session-ID") || `session-${Date.now()}`);
    runtimeContext.set("workspace-id", c.req.header("X-Workspace-ID") || "default");
  }
});
```

### Agent Registration Requirements

- **ALL** Mastra agents MUST be registered with CopilotKit endpoints
- **MUST** use consistent naming: agent file `master-agent.ts` → endpoint `/copilotkit/master`
- **MUST** implement proper error handling and logging
- **MUST** include runtime context for user/session management

## 🎨 FRONTEND COPILOTKIT COMPONENTS (UI INTEGRATION)

### Required CopilotKit Imports

```typescript
import {
  CopilotKit,
  CopilotChat,
  CopilotSidebar,
  CopilotPopup,
  useCopilotAgent,
  useCopilotAction,
  useCopilotReadable
} from '@copilotkit/react-core';
import { CopilotKitProvider } from '@copilotkit/react-core';
```

### Provider Setup Pattern

```typescript
// In layout.tsx or page.tsx
<CopilotKitProvider
  runtimeUrl={process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL}
  agent="master" // Default agent
>
  <CopilotChat
    labels={{
      title: "Dean Machines AI Assistant",
      initial: "Hello! I'm your AI assistant. How can I help you today?"
    }}
    className="glass-effect-strong neon-border"
  />
  {children}
</CopilotKitProvider>
```

### Agent Switching Implementation

```typescript
const { setAgent } = useCopilotAgent();

// Dynamic agent switching
const handleAgentSwitch = (agentName: string) => {
  setAgent(agentName);
};

// Available agents
const agents = [
  'master', 'strategizer', 'code', 'data', 'research',
  'design', 'marketing', 'content', 'debug', 'quality'
];
```

## 🛠️ CUSTOM COPILOTKIT COMPONENTS (PLAYGROUND FEATURES)

### Required Custom Components

1. **AgentSelector**: Dropdown for switching between agents
2. **ChatInterface**: Enhanced chat with electric theme
3. **SidebarAgent**: Collapsible sidebar with agent controls
4. **PopupAgent**: Modal chat interface
5. **ActionButtons**: Quick action triggers

### Custom Component Template

```typescript
interface CopilotComponentProps {
  agent?: string;
  className?: string;
  onAgentChange?: (agent: string) => void;
}

export function CustomCopilotComponent({
  agent = "master",
  className,
  onAgentChange
}: CopilotComponentProps) {
  const { setAgent } = useCopilotAgent();

  return (
    <div className={cn(
      glassVariants.strong,
      "neon-border electric-pulse",
      className
    )}>
      <CopilotChat
        agent={agent}
        className="bg-transparent border-none"
        labels={{
          title: `${agent.charAt(0).toUpperCase() + agent.slice(1)} Agent`,
          initial: `Hello! I'm the ${agent} agent. How can I assist you?`
        }}
      />
    </div>
  );
}
```

## 🎯 COPILOTKIT ACTIONS (INTERACTIVE FEATURES)

### Action Definition Pattern

```typescript
useCopilotAction({
  name: "actionName",
  description: "Clear description of what this action does",
  parameters: [
    {
      name: "parameter",
      type: "string",
      description: "Parameter description",
      required: true
    }
  ],
  handler: async ({ parameter }) => {
    try {
      // Action implementation
      const result = await performAction(parameter);
      return `Action completed: ${result}`;
    } catch (error) {
      console.error('Action failed:', error);
      return `Action failed: ${error.message}`;
    }
  }
});
```

### Required Actions for Playground

1. **generateCode**: Code generation with syntax highlighting
2. **analyzeRepository**: GitHub repository analysis
3. **createWorkflow**: Multi-agent workflow creation
4. **debugCode**: Code debugging assistance
5. **optimizePerformance**: Performance optimization suggestions

## 📊 COPILOTKIT READABLE STATE (DATA SHARING)

### State Sharing Pattern

```typescript
// Share application state with CopilotKit
useCopilotReadable({
  description: "Current user project information",
  value: {
    projectName: project.name,
    technologies: project.tech,
    currentFile: editor.activeFile,
    gitBranch: git.currentBranch
  }
});

// Share dynamic data
useCopilotReadable({
  description: "Real-time system metrics",
  value: systemMetrics,
  dependencies: [systemMetrics] // Re-share when metrics change
});
```

## 🎨 PLAYGROUND UI INTEGRATION (ELECTRIC THEME)

### CopilotKit Theme Customization

```typescript
// Custom CopilotKit styling with electric theme
const copilotKitTheme = {
  colors: {
    primary: 'oklch(0.7 0.25 105)',
    secondary: 'oklch(0.6 0.2 180)',
    background: 'oklch(0.09 0.005 270)',
    surface: 'color-mix(in oklch, white 8%, transparent)',
    text: 'oklch(0.98 0.005 60)'
  },
  borderRadius: '0.75rem',
  shadows: {
    glow: '0 0 20px var(--color-primary)',
    electric: '0 0 30px var(--color-primary)'
  }
};
```

### Playground Layout Requirements

- **Chat Interface**: Full-screen chat with agent switching
- **Sidebar Mode**: Collapsible sidebar for multi-tasking
- **Popup Mode**: Modal overlay for quick interactions
- **Settings Panel**: Agent configuration and preferences

### Required Playground Pages

1. **Main Chat**: `/playground` - Primary agent interaction
2. **Multi-Agent**: `/playground/multi-agent` - Orchestrated workflows
3. **Code Graph**: `/playground/codegraph` - Repository visualization
4. **Research Canvas**: `/playground/research` - Research workflows
5. **Settings**: `/playground/settings` - Configuration panel

## 🔧 ERROR HANDLING & DEBUGGING (RELIABILITY)

### CopilotKit Error Patterns

```typescript
// Error boundary for CopilotKit components
export function CopilotErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="glass-effect-strong neon-border p-6 text-center">
          <p className="text-destructive">CopilotKit connection failed</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// Connection status monitoring
const { isConnected, error } = useCopilotStatus();

if (!isConnected) {
  return <ConnectionFailure error={error} />;
}
```

### Debugging Requirements

- **Connection Status**: Monitor CopilotKit runtime connectivity
- **Agent Response Times**: Track performance metrics
- **Error Logging**: Comprehensive error capture and reporting
- **Fallback UI**: Graceful degradation when services unavailable

## 🚀 PERFORMANCE OPTIMIZATION (EFFICIENCY)

### CopilotKit Performance Best Practices

- **Lazy Loading**: Load CopilotKit components only when needed
- **Memoization**: Use React.memo for expensive CopilotKit components
- **Debouncing**: Debounce user inputs to reduce API calls
- **Caching**: Cache agent responses for repeated queries

### Memory Management

```typescript
// Cleanup CopilotKit resources
useEffect(() => {
  return () => {
    // Cleanup subscriptions and connections
    copilotKit.disconnect();
  };
}, []);

// Optimize re-renders
const MemoizedCopilotChat = React.memo(CopilotChat);
```

## 🔐 SECURITY CONSIDERATIONS (PROTECTION)

### Authentication Integration

- **User Context**: Pass authenticated user info to runtime context
- **Session Management**: Maintain secure session state
- **API Key Protection**: Never expose API keys in frontend code
- **Rate Limiting**: Implement client-side rate limiting

### Data Privacy

- **Sensitive Data**: Filter sensitive information before sending to agents
- **User Consent**: Obtain consent for data processing
- **Data Retention**: Implement data cleanup policies
- **Audit Logging**: Log all agent interactions for security review

## 📱 MOBILE RESPONSIVENESS (ACCESSIBILITY)

### Mobile CopilotKit Patterns

- **Touch Optimization**: Larger touch targets for mobile
- **Responsive Chat**: Adaptive chat interface for small screens
- **Gesture Support**: Swipe gestures for navigation
- **Offline Handling**: Graceful offline state management

### Accessibility Requirements

- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader**: ARIA labels and descriptions
- **Focus Management**: Proper focus handling in chat interface
- **High Contrast**: Support for high contrast mode

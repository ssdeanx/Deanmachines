---
applyTo: "src/app/components/copilotkit/**/*.tsx"
description: "CopilotKit Guidelines for the Dean Machines RSC Project"
---

# CopilotKit Implementation Guidelines

## Core Concepts

### State Machine Patterns
Based on CopilotKit's state machine documentation:
- Use the `available` prop to control when actions are accessible to the Copilot
- Implement proper stage transitions using state variables
- Leverage generative UI for dynamic interface creation
- Follow advanced patterns for complex multi-step workflows

### Mastra + CopilotKit Integration
From Mastra's CopilotKit documentation:
- Set up proper backend integration through `src/app/api/copilotkit/route.ts`
- Implement runtime context passing from Mastra agents to CopilotKit components
- Ensure type safety between Mastra agent outputs and CopilotKit component inputs
- Use Next.js integration patterns for seamless server/client communication

## Essential Hooks

### useCopilotAction
Primary hook for creating interactive AI actions in your components.

**Key Parameters:**
- `name` (required): Unique identifier for the action
- `description` (required): Clear description for the AI to understand usage
- `parameters`: Array defining input parameters with types and descriptions
- `handler`: Async function that executes the action
- `available`: Control availability ('enabled' | 'disabled' | 'remote')
- `render`: Custom UI rendering function with status-based rendering

**Parameter Types:**
- Primitives: `"string"`, `"number"`, `"boolean"`
- Arrays: `"string[]"`, `"number[]"`, `"boolean[]"`
- Objects: `"object"`, `"object[]"` with nested attributes

**Render Props Pattern:**
```typescript
render: (props: ActionRenderProps<T>) => {
  const { status, args, result } = props;
  // status: 'inProgress' | 'executing' | 'complete'
  // args: Real-time parameters (possibly incomplete during 'inProgress')
  // result: Available only when status is 'complete'
}
```

### useLangGraphInterrupt
**NEW 2024/2025**: Essential hook for implementing Human-in-the-Loop (HITL) with LangGraph agents.

**Purpose:** Renders custom UI when LangGraph agents emit interrupt events, allowing users to review, approve, or modify agent actions before continuation.

**Key Parameters:**
- `enabled`: Function that determines if this interrupt handler should process a specific event
- `render`: Custom React component to display during interrupt
- `onInterrupt`: Action handler for interrupt resolution

**Core Implementation:**
```typescript
import { useLangGraphInterrupt } from '@copilotkit/react-core';

useLangGraphInterrupt({
  enabled: ({ eventValue }) => {
    // Return true if this interrupt should handle this event
    return eventValue.type === 'tool_approval_required';
  },
  render: ({ event, resolve }) => (
    <div className="interrupt-ui">
      <h3>Review Agent Action</h3>
      <pre>{JSON.stringify(event.value, null, 2)}</pre>
      <div className="actions">
        <button onClick={() => resolve({ approved: true })}>
          Approve
        </button>
        <button onClick={() => resolve({ approved: false })}>
          Reject
        </button>
      </div>
    </div>
  ),
  onInterrupt: async ({ event, resolve }) => {
    // Optional programmatic handler
    console.log('Interrupt triggered:', event);
    // Can perform operations before calling render
  }
});
```

**Dean Machines RSC Integration:**
```typescript
// For research workflow interrupts
useLangGraphInterrupt({
  enabled: ({ eventValue }) => eventValue.type === 'research_outline_review',
  render: ({ event, resolve }) => (
    <ResearchOutlineViewer
      proposal={event.value.proposal}
      onApprove={() => resolve({ action: 'approve' })}
      onRevise={(feedback) => resolve({ action: 'revise', feedback })}
      onReject={() => resolve({ action: 'reject' })}
    />
  )
});

// For code generation approvals
useLangGraphInterrupt({
  enabled: ({ eventValue }) => eventValue.type === 'code_review_required',
  render: ({ event, resolve }) => (
    <CodeReviewModal
      generatedCode={event.value.code}
      context={event.value.context}
      onApprove={() => resolve({ approved: true })}
      onRequestChanges={(changes) => resolve({ approved: false, changes })}
    />
  )
});
```

**Advanced Features:**
- `renderAndWaitForResponse`: Interactive components that wait for user input
- `followUp`: Control whether to report results back to the LLM (default: true)
- `dependencies`: React dependency array for re-registration

### useCopilotReadable
Provides application state and context to the Copilot.

**Key Parameters:**
- `description` (required): Clear description of the context
- `value` (required): The actual data to make available to the Copilot
- `parentId`: For hierarchical context structure
- `categories`: Control context visibility in specific scenarios
- `available`: Enable/disable context availability
- `convert`: Custom serialization function for complex objects

**Hierarchical Context:**
```typescript
// Parent context
const employeeId = useCopilotReadable({
  description: "Employee information",
  value: employee
});

// Child context
useCopilotReadable({
  description: "Work profile",
  value: workProfile,
  parentId: employeeId
});
```

### useCopilotAdditionalInstructions
Provides dynamic instructions to guide the Copilot's behavior.

**Key Parameters:**
- `instructions` (required): String containing specific behavior instructions
- `available`: Control when instructions are active ('enabled' | 'disabled')

**Usage Examples:**
```typescript
// Basic usage
useCopilotAdditionalInstructions({
  instructions: "Focus on code quality and best practices when generating code."
});

// Conditional instructions
useCopilotAdditionalInstructions({
  available: isDebugMode ? "enabled" : "disabled",
  instructions: "Provide detailed debugging information and step-by-step analysis."
});
```

### useCoAgent
Enables bidirectional state sharing between your application and AI agents.

**Key Features:**
- Bidirectional state synchronization between UI and agent
- Real-time updates reflected in both directions
- Support for complex state management patterns
- Integration with external state management systems

**Returned Properties:**
- `name`: Current agent name
- `nodeName`: Current LangGraph node name
- `state`: Current agent state
- `setState`: Function to update agent state
- `running`: Boolean indicating if agent is currently running
- `start`: Function to start the agent
- `stop`: Function to stop the agent
- `run`: Function to re-run the agent with optional hint

**Basic Usage:**
```typescript
type AgentState = {
  count: number;
  status: string;
};

const { state, setState, running, start, stop } = useCoAgent<AgentState>({
  name: "counter-agent",
  initialState: { count: 0, status: "idle" }
});

// State updates are bidirectional
const increment = () => setState({ ...state, count: state.count + 1 });
```

**External State Management:**
```typescript
const [externalState, setExternalState] = useState(initialState);

const agent = useCoAgent({
  name: "my-agent",
  state: externalState,
  setState: setExternalState
});
```

### useCopilotChat
Provides direct interaction with the Copilot instance for custom chat implementations.

**Key Features:**
- Programmatic chat control and message management
- Support for fully custom UI implementations (headless)
- Message lifecycle management (append, delete, reload)
- Loading state management and generation control

**Returned Properties:**
- `visibleMessages`: Array of currently visible chat messages
- `appendMessage`: Function to add messages to the chat
- `setMessages`: Function to replace all messages
- `deleteMessage`: Function to remove specific messages
- `reloadMessages`: Function to refresh messages from API
- `stopGeneration`: Function to halt ongoing message generation
- `reset`: Function to clear the entire chat
- `isLoading`: Boolean indicating chat loading state

**Basic Usage:**
```typescript
import { useCopilotChat } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";

const { appendMessage, visibleMessages, isLoading } = useCopilotChat();

// Append user message
appendMessage(new TextMessage({
  content: "Hello World",
  role: Role.User,
}));

// Append without triggering chat completion
appendMessage(message, { followUp: false });
```

**Parameters:**
- `id`: Unique chat identifier for shared state across components
- `headers`: HTTP headers for API requests
- `initialMessages`: Array of initial system messages
- `makeSystemMessage`: Function to generate system messages

### useCopilotChatSuggestions
Generates dynamic AI-powered suggestions in the chat window based on real-time application state.

**Key Features:**
- Real-time suggestion generation based on app state
- Configurable suggestion count (min/max)
- Automatic lifecycle management (mount/unmount)
- Dependency-based suggestion updates

**Key Parameters:**
- `instructions` (required): Prompt or instructions for generating suggestions
- `minSuggestions`: Minimum number of suggestions (default: 1)
- `maxSuggestions`: Maximum number of suggestions (default: 3)
- `available`: Enable/disable suggestions ('enabled' | 'disabled')
- `className`: Optional styling class

**Basic Usage:**
```typescript
import { useCopilotChatSuggestions } from "@copilotkit/react-ui";

// Simple suggestions
useCopilotChatSuggestions({
  instructions: "Suggest the most relevant next actions based on current app state."
});

// Context-aware suggestions with dependencies
const [employees, setEmployees] = useState([]);

useCopilotChatSuggestions(
  {
    instructions: `The following employees are on duty: ${JSON.stringify(employees)}`,
    minSuggestions: 2,
    maxSuggestions: 5
  },
  [employees] // Dependencies - suggestions update when employees change
);
```

### useCoAgentStateRender
Renders UI components or text based on real-time agent state changes in the chat interface.

**Key Features:**
- Real-time agent state visualization
- Support for both React components and text rendering
- Node-specific state monitoring
- Progress tracking during agent operations

**Key Parameters:**
- `name` (required): Name of the CoAgent to monitor
- `nodeName`: Specific node name to track (optional)
- `render`: Function returning React elements or strings based on state
- `handler`: Optional handler function for state changes

**Render Props:**
- `status`: Current agent execution status
- `state`: Current agent state object
- `nodeName`: Active node name

**Basic Usage:**
```typescript
import { useCoAgentStateRender } from "@copilotkit/react-core";

type AgentState = {
  searchProgress: number;
  currentQuery: string;
  results: string[];
};

useCoAgentStateRender<AgentState>({
  name: "research_agent",
  nodeName: "search_node", // Optional: monitor specific node
  render: ({ status, state, nodeName }) => {
    if (status === 'running' && state.searchProgress) {
      return (
        <div className="agent-progress">
          <h3>Searching: {state.currentQuery}</h3>
          <div className="progress-bar">
            Progress: {state.searchProgress}%
          </div>
          <p>Found {state.results.length} results so far...</p>
        </div>
      );
    }
    return null;
  }
});
```

**Dean Machines RSC Applications:**
- Research agent progress visualization
- Code generation status displays
- Multi-agent workflow coordination
- Tool execution progress tracking

## Backend Integration

### CopilotRuntime Class
The backend component that enables LLM interaction and agent orchestration.

**Key Constructor Parameters:**

**Middleware Configuration:**
- `onBeforeRequest`: Preprocessing hook for incoming requests
- `onAfterRequest`: Post-processing hook for completed requests

**Action & Agent Management:**
- `actions`: Server-side actions for local execution
- `remoteEndpoints`: External action endpoints
- `agents`: Map of agent names to AGUI agent instances
- `delegateAgentProcessingToServiceAdapter`: Delegate agent processing to service adapter

**Advanced Features:**
- `observability_c`: LLM request/response logging configuration
- `mcpServers`: Model Context Protocol server connections (experimental)
- `createMCPClient`: Function for MCP client instantiation
- `onTrace`: Comprehensive debugging and observability handler

**Example Configuration:**
```typescript
import { CopilotRuntime } from "@copilotkit/runtime";

const runtime = new CopilotRuntime({
  // Agent configuration
  agents: {
    "master": new MasterAgent(),
    "code": new CodeAgent(),
    "data": new DataAgent()
  },
  
  // Observability setup
  observability_c: {
    logging: {
      enabled: true,
      progressive: true,
      logger: {
        logRequest: (data) => langfuse.trace({ name: "LLM Request", input: data }),
        logResponse: (data) => langfuse.trace({ name: "LLM Response", output: data }),
        logError: (errorData) => langfuse.trace({ name: "LLM Error", metadata: errorData })
      }
    }
  },
  
  // MCP integration (experimental)
  mcpServers: [{ endpoint: "your-mcp-endpoint" }],
  createMCPClient: async (config) => {
    return await experimental_createMCPClient({
      transport: {
        type: "sse",
        url: config.endpoint,
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined
      }  }
});
```

### CopilotTask Class
Used for executing one-off AI tasks, such as on button clicks or specific user interactions.

**Key Features:**
- One-off task execution with custom instructions
- Integration with existing context from `useCopilotReadable`
- Support for both predefined and custom actions
- Context-aware task processing

**Constructor Parameters:**
- `instructions` (required): Clear task instructions for the AI
- `actions`: Array of action definitions that can be called
- `includeCopilotReadable`: Include context from `useCopilotReadable` hooks
- `includeCopilotActions`: Include actions from `useCopilotAction` hooks
- `forwardedParameters`: Additional parameters for task execution

**Basic Usage:**
```typescript
import { CopilotTask, useCopilotContext } from "@copilotkit/react-core";

const context = useCopilotContext();

const task = new CopilotTask({
  instructions: "Set a random message",
  actions: [{
    name: "setMessage",
    description: "Set the message.",
    argumentAnnotations: [{
      name: "message",
      type: "string",
      description: "A message to display.",
      required: true,
    }],  }]
});

const executeTask = async () => {
  await task.run(context);
};
```

## LLM Adapters

### Overview
LLM Adapters are responsible for executing requests with various language models and standardizing the request/response format for the CopilotRuntime. They provide a unified interface for different LLM providers.

**Supported Adapters (2024/2025):**
- **OpenAI Adapter**: Native OpenAI API support (Azure also supported)
- **OpenAI Assistant Adapter**: OpenAI Assistants API integration
- **Anthropic Adapter**: Claude models integration
- **Google Generative AI Adapter**: Gemini model support
- **Groq Adapter**: High-speed inference with Groq
- **LangChain Adapter**: Universal adapter for any LLM provider through LangChain

### OpenAI Adapter
```typescript
import { CopilotRuntime, OpenAIAdapter } from "@copilotkit/runtime";

const runtime = new CopilotRuntime({
  adapter: new OpenAIAdapter({
    model: "gpt-4-turbo-preview",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0.7,
    maxTokens: 4000
  })
});
```

### Anthropic Adapter
```typescript
import { CopilotRuntime, AnthropicAdapter } from "@copilotkit/runtime";

const runtime = new CopilotRuntime({
  adapter: new AnthropicAdapter({
    model: "claude-3-5-sonnet-20241022",
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxTokens: 4000,
    temperature: 0.1
  })
});
```

### Google Generative AI Adapter
**Dean Machines RSC Compatible:**
```typescript
import { CopilotRuntime, GoogleGenerativeAIAdapter } from "@copilotkit/runtime";

const runtime = new CopilotRuntime({
  adapter: new GoogleGenerativeAIAdapter({
    model: "gemini-2.0-flash-exp", // Latest 2.5 Flash model
    apiKey: process.env.GOOGLE_AI_API_KEY,
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192
    }
  })
});
```

### LangChain Adapter (Universal Support)
Use for any LLM provider not natively supported:
```typescript
import { CopilotRuntime, LangChainAdapter } from "@copilotkit/runtime";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

// OpenAI through LangChain
const openaiLangChain = new CopilotRuntime({
  adapter: new LangChainAdapter({
    chainFn: () => new ChatOpenAI({
      modelName: "gpt-4-turbo-preview",
      temperature: 0.7
    })
  })
});

// Anthropic through LangChain
const anthropicLangChain = new CopilotRuntime({
  adapter: new LangChainAdapter({
    chainFn: () => new ChatAnthropic({
      model: "claude-3-5-sonnet-20241022",
      temperature: 0.1
    })
  })
});
```

### Custom LLM Adapter
For unsupported providers, create custom adapters:
```typescript
import { LLMAdapter } from "@copilotkit/runtime";

class CustomLLMAdapter implements LLMAdapter {
  async process(params: LLMAdapterParams): Promise<LLMAdapterResponse> {
    // Custom implementation for your LLM provider
    const response = await yourLLMProvider.chat({
      messages: params.messages,
      functions: params.functions,
      model: params.model
    });
    
    return {
      stream: response.stream,
      chat: response.chat
    };
  }
}

const runtime = new CopilotRuntime({
  adapter: new CustomLLMAdapter()
});
```

### Dean Machines RSC LLM Configuration
Based on the project's Google Gemini 2.5 Flash setup:
```typescript
// src/app/api/copilotkit/route.ts
import { CopilotRuntime, GoogleGenerativeAIAdapter } from "@copilotkit/runtime";
import { NextRequest } from "next/server";

const runtime = new CopilotRuntime({
  adapter: new GoogleGenerativeAIAdapter({
    model: "gemini-2.0-flash-exp",
    apiKey: process.env.GOOGLE_AI_API_KEY!,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 8192
    }
  }),
  // Langfuse observability integration
  observability_c: {
    logging: {
      enabled: true,
      progressive: true,
      logger: {
        logRequest: (data) => langfuse.trace({ 
          name: "CopilotKit LLM Request", 
          input: data,
          metadata: { model: "gemini-2.5-flash" }
        }),
        logResponse: (data) => langfuse.trace({ 
          name: "CopilotKit LLM Response", 
          output: data 
        })
      }
    }
  }
});

export async function POST(req: NextRequest) {
  return runtime.streamHttpServerResponse(req);
}
```

## AG-UI Protocol Integration

### What is AG-UI?
AG-UI (Agent User Interaction Protocol) is an open protocol that standardizes how front-end applications connect to AI agents, serving as a universal translator for AI-driven systems.

**Key Concepts:**
- **Event-Driven Communication**: Uses 16 standardized event types for agent-client interaction
- **Bidirectional Interaction**: Enables collaborative workflows between humans and AI
- **Transport Agnostic**: Supports SSE, WebSockets, webhooks, and other transport mechanisms
- **Framework Integration**: Native support for LangGraph, CrewAI, Mastra, and AG2

**Architecture:**
- **Frontend Applications**: Chat interfaces and AI-enabled apps
- **Direct Agent Connection**: Agents that communicate directly via AG-UI
- **Secure Proxy**: Intermediary for routing to multiple agents
- **Managed Agents**: Agents coordinated through the proxy service

**Protocol Advantages:**
- Lightweight and minimally opinionated design
- Flexible event structure (AG-UI-compatible, not exact format required)
- Middleware layer for maximum framework compatibility
- Complementary to other protocols (A2A for agent-to-agent, MCP for model context)

**Integration with Dean Machines RSC:**
- Use Mastra's TypeScript-first approach with AG-UI protocol
- Leverage the existing agent network architecture
- Implement event streaming for real-time agent interactions
- Maintain compatibility with existing CopilotKit components

## UI Components

### CopilotKit Provider
The root provider component that wraps your application and provides copilot context.

**Essential Properties:**
- `runtimeUrl` (required): Endpoint for your Copilot Runtime instance
- `publicApiKey`: Copilot Cloud API key for hosted features
- `children` (required): Your application components
- `agent`: Name of the specific agent to use
- `headers`: Additional request headers
- `properties`: Custom properties sent with requests

**Advanced Configuration:**
- `guardrails_c`: Topic restrictions for conversations (Cloud only)
- `transcribeAudioUrl`: Audio transcription service endpoint
- `textToSpeechUrl`: TTS service endpoint
- `authConfig_c`: Authentication configuration (Cloud only)
- `threadId`: Specific thread identifier for conversation continuity
- `onTrace`: Debugging and observability handler (Cloud only)
- `showDevConsole`: Error UI visibility toggle
- `forwardedParameters`: Task execution parameters

**Basic Setup:**
```typescript
import { CopilotKit } from "@copilotkit/react-core";

<CopilotKit runtimeUrl="/api/copilotkit">
  {/* Your application components */}
</CopilotKit>
```

**Dean Machines RSC Configuration:**
```typescript
<CopilotKit 
  runtimeUrl="/api/copilotkit"
  agent="master-agent"
  headers={{
    "X-Project": "dean-machines-rsc"
  }}
  properties={{
    user_id: userId,
    session_context: sessionData
  }}
  showDevConsole={process.env.NODE_ENV === 'development'}
>
  {/* Playground components */}
</CopilotKit>
```

### CopilotPopup
A popup chat interface component for interacting with your copilot.

**Key Features:**
- Floating popup chat window
- Customizable keyboard shortcuts (default: '/')
- Click-outside and escape-to-close functionality
- Extensive customization options for all UI elements

**Essential Properties:**
- `instructions`: Custom system instructions for the AI
- `labels`: Custom labels for title and initial message
- `defaultOpen`: Whether popup opens by default (default: false)
- `clickOutsideToClose`: Close on outside click (default: true)
- `hitEscapeToClose`: Close on escape key (default: true)
- `shortcut`: Keyboard shortcut to open (default: '/')

**Callback Properties:**
- `onInProgress`: Triggered when generation state changes
- `onSubmitMessage`: Called when user submits a message
- `onSetOpen`: Called when popup opens/closes
- `onCopy`, `onThumbsUp`, `onThumbsDown`: Message interaction callbacks

**Customization:**
- `icons`: Custom icon set for the interface
- `markdownTagRenderers`: Custom markdown component renderers
- `AssistantMessage`, `UserMessage`: Custom message components
- `Input`, `Header`, `Button`: Custom UI component overrides

**Basic Usage:**
```typescript
import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

<CopilotPopup
  labels={{
    title: "Dean Machines Assistant",
    initial: "Hi! 👋 How can I help you with your AI development today?"
  }}
  instructions="You are an expert AI assistant for the Dean Machines RSC project."
  shortcut="/"
  defaultOpen={false}
/>
```

### CopilotChat
A full-featured chat interface component for building conversational AI applications.

**Key Features:**
- Full chat interface with message history
- Support for all CopilotKit hooks and actions
- Customizable message components and styling
- Image upload support (model-dependent)
- Built-in markdown rendering with custom tag support
- Comprehensive callback system for user interactions

**Essential Properties:**
- `instructions`: Custom system instructions for the AI
- `labels`: Custom labels for title and initial message
- `className`: CSS class for styling the chat container
- `showResponseButton`: Show/hide response generation button

**Message Customization:**
- `AssistantMessage`: Custom assistant message component
- `UserMessage`: Custom user message component
- `Messages`: Custom messages container component
- `markdownTagRenderers`: Custom markdown component renderers

**Interaction Callbacks:**
- `onInProgress`: Triggered during message generation
- `onSubmitMessage`: Called when user submits a message
- `onCopy`, `onThumbsUp`, `onThumbsDown`: Message interaction callbacks
- `onRegenerate`: Message regeneration callback

**Basic Usage:**
```typescript
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

<CopilotChat
  instructions="You are an expert AI assistant for the Dean Machines RSC project."
  labels={{
    title: "Dean Machines Assistant",
    initial: "Hi! 👋 How can I help you with your AI development today?"
  }}
  className="custom-chat-container"
  onSubmitMessage={(message) => console.log("User message:", message)}
  imageUploadsEnabled={true}
/>
```

### CopilotSidebar  
A sidebar chat interface component that provides persistent AI interaction alongside your main application content.

**Key Features:**
- Sidebar layout for persistent AI access
- All CopilotChat functionality in sidebar form
- Collapsible/expandable interface
- Keyboard shortcut support for quick access
- Integrated with main application workflow

**Essential Properties:**
- `instructions`: Custom system instructions for the AI
- `labels`: Custom labels for title and initial message  
- `defaultOpen`: Whether sidebar opens by default (default: false)
- `clickOutsideToClose`: Close on outside click (default: true)
- `hitEscapeToClose`: Close on escape key (default: true)
- `shortcut`: Keyboard shortcut to open (default: '/')

**Customization Properties:**
- `AssistantMessage`, `UserMessage`: Custom message components
- `Messages`, `Input`, `Header`, `Button`: Custom UI components
- `Window`: Custom window container component
- `markdownTagRenderers`: Custom markdown renderers
- `icons`: Custom icon set for the interface

**Callback Properties:**
- `onInProgress`: Generation state change callback
- `onSubmitMessage`: Message submission callback
- `onSetOpen`: Sidebar open/close callback
- `onCopy`, `onThumbsUp`, `onThumbsDown`: Message interaction callbacks

**Basic Usage:**
```typescript
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

<CopilotSidebar
  instructions="You are an expert AI assistant for the Dean Machines RSC project."
  labels={{
    title: "Dean Machines Assistant",
    initial: "Hi! 👋 How can I help you with your AI development today?"
  }}
  defaultOpen={false}
  shortcut="/"
  onSetOpen={(open) => console.log("Sidebar", open ? "opened" : "closed")}
>
  {/* Your main application content */}
  <YourMainApp />
</CopilotSidebar>
```

**Dean Machines RSC Use Cases:**
- Persistent AI assistance during development
- Code review and suggestions sidebar
- Agent interaction while working in playground
- Multi-agent coordination interface

### CopilotTextarea
An AI-powered textarea that serves as a drop-in replacement for standard textareas with intelligent autocomplete.

**Key Features:**
- Context-aware autosuggestions based on `useCopilotReadable`
- Hovering editor window (Cmd/Ctrl + K)
- Real-time AI-powered text completion
- Seamless integration with existing forms

**Essential Properties:**
- `autosuggestionsConfig` (required): Configuration for AI features
- `value`: Controlled value of the textarea
- `onValueChange`: Callback when value changes
- `placeholder`: Placeholder text
- `disabled`: Whether textarea is disabled

**Autosuggestions Configuration:**
- `textareaPurpose` (required): Plain text description of textarea purpose
- `chatApiConfigs`: Configuration for suggestions and insertion APIs
- `suggestionsApiConfig`: Settings for suggestion generation
- `insertionApiConfig`: Settings for text insertion features

**Styling Properties:**
- `className`: CSS class for the textarea
- `placeholderStyle`: Styles for placeholder text
- `suggestionsStyle`: Styles for suggestions list
- `hoverMenuClassname`: Class for editor popover
- `disableBranding`: Hide CopilotKit branding

**Basic Usage:**
```typescript
import { CopilotTextarea } from "@copilotkit/react-textarea";
import "@copilotkit/react-textarea/styles.css";

const [text, setText] = useState("");

<CopilotTextarea
  className="custom-textarea"
  value={text}
  onValueChange={(value) => setText(value)}
  placeholder="Describe your AI agent requirements..."
  autosuggestionsConfig={{
    textareaPurpose: "AI agent requirements and specifications",
    chatApiConfigs: {
      suggestionsApiConfig: {
        maxTokens: 50,
        stop: [".", "?", "!"]
      }
    }
  }}
  shortcut="Cmd-k"
/>
```

**Dean Machines RSC Use Cases:**
- Agent instruction authoring
- Code documentation writing
- Research query composition
- Workflow description creation

## Generative UI Patterns

### Render Method in Actions
Enable dynamic UI generation within chat interfaces using the `render` property in `useCopilotAction`.

**Key Features:**
- Status-based rendering (`inProgress`, `executing`, `complete`)
- Real-time argument streaming during `inProgress` state
- Custom component integration in chat interface
- Loading state management

**Implementation Pattern:**
```typescript
useCopilotAction({
  name: "showCalendarMeeting",
  description: "Displays calendar meeting information",
  parameters: [
    {
      name: "date",
      type: "string",
      description: "Meeting date (YYYY-MM-DD)",
      required: true
    },
    {
      name: "time", 
      type: "string",
      description: "Meeting time (HH:mm)",
      required: true
    }
  ],
  render: ({ status, args }) => {
    const { date, time, meetingName } = args;
    
    if (status === 'inProgress') {
      return <LoadingView />; // Show loading during argument collection
    }
    
    return (
      <CalendarMeetingCard 
        date={date}
        time={time}
        meetingName={meetingName}
      />
    );
  }
});
```

**Status States:**
- `inProgress`: Arguments are being dynamically streamed (potentially incomplete)
- `executing`: Action handler is running (complete arguments available)
- `complete`: Action execution finished (result available)

**Dean Machines RSC Applications:**
- Agent status dashboards with real-time updates
- Code visualization components for the code graph maker
- Interactive tool execution results
- Multi-agent workflow progress indicators
- Research canvas components with dynamic content

## Advanced Integration Patterns

### Model Context Protocol (MCP) Integration
Connect to external MCP servers to extend your AI agents' capabilities.

**Key Concepts:**
- Open standard for secure, two-way connections between data sources and AI tools
- Server-Sent Events (SSE) endpoint support
- Tool call visualization and management
- Secure proxy routing for multiple agents

**Basic MCP Setup:**
```typescript
import { useCopilotChat } from "@copilotkit/react-core";

function McpServerManager() {
  const { setMcpServers } = useCopilotChat();
  
  useEffect(() => {
    setMcpServers([
      {
        endpoint: "your_mcp_sse_url"
      }
    ]);
  }, [setMcpServers]);
  
  return null;
}
```

**Tool Call Visualization:**
```typescript
import { useCopilotAction, CatchAllActionRenderProps } from "@copilotkit/react-core";

export function ToolRenderer() {
  useCopilotAction({
    name: "*", // Asterisk matches all tool calls
    render: ({ name, status, args, result }: CatchAllActionRenderProps<[]>) => (
      <McpToolCall 
        status={status} 
        name={name} 
        args={args} 
        result={result} 
      />
    )
  });
  
  return null;
}
```

### AG-UI Protocol Integration
The AG-UI (Agent-User Interface) protocol provides structured communication between AI agents and user interfaces.

**Core Components:**
- **Event Streaming**: Real-time bidirectional communication between agents and UI
- **Agent Orchestration**: Coordinate multiple agents through a unified interface
- **Protocol Flexibility**: Lightweight, minimally opinionated design for maximum compatibility

**Implementation Patterns:**
- **Direct Agent Connection**: Agents that communicate directly via AG-UI
- **Secure Proxy**: Intermediary for routing to multiple agents
- **Managed Agents**: Agents coordinated through the proxy service

**Protocol Advantages:**
- Lightweight and minimally opinionated design
- Flexible event structure (AG-UI-compatible, not exact format required)
- Middleware layer for maximum framework compatibility
- Complementary to other protocols (A2A for agent-to-agent, MCP for model context)

**Integration with Dean Machines RSC:**
- Use Mastra's TypeScript-first approach with AG-UI protocol
- Leverage the existing agent network architecture
- Implement event streaming for real-time agent interactions
- Maintain compatibility with existing CopilotKit components

### Frontend Actions Pattern
Implement client-side actions that execute within the browser context with full access to application state.

**Key Benefits:**
- Direct access to React state and browser APIs
- Real-time UI updates during action execution
- Seamless integration with existing component logic
- No server round-trips for UI operations

**Implementation Example:**
```typescript
import { useCopilotAction } from "@copilotkit/react-core";

function AgentStatusDashboard() {
  const [agents, setAgents] = useState([]);
  const [activeAgent, setActiveAgent] = useState(null);

  useCopilotAction({
    name: "updateAgentStatus",
    description: "Update the status of a specific agent in the dashboard",
    parameters: [
      {
        name: "agentId",
        type: "string",
        description: "The ID of the agent to update",
        required: true
      },
      {
        name: "status",
        type: "string",
        description: "New status for the agent",
        required: true
      }
    ],
    handler: async ({ agentId, status }) => {
      // Direct state manipulation in frontend
      setAgents(prev => prev.map(agent => 
        agent.id === agentId ? { ...agent, status } : agent
      ));
      
      // Update active agent if it matches
      if (activeAgent?.id === agentId) {
        setActiveAgent(prev => ({ ...prev, status }));
      }
      
      return `Agent ${agentId} status updated to ${status}`;
    },
    render: ({ status, args }) => {
      if (status === 'executing') {
        return (
          <div className="agent-update-progress">
            <AgentIcon agentId={args.agentId} />
            <span>Updating {args.agentId} to {args.status}...</span>
          </div>
        );
      }
      return null;
    }
  });

  return <AgentGrid agents={agents} activeAgent={activeAgent} />;
}
```

### TypeScript Backend Actions
Implement native backend actions directly in your CopilotRuntime configuration.

**Key Features:**
- Dynamic action exposure based on URL and properties
- Context-aware action availability
- Direct integration with backend systems
- Type-safe parameter handling

**Implementation Pattern:**
```typescript
const runtime = new CopilotRuntime({
  actions: ({ properties, url }) => {
    // Dynamic action generation based on context
    return [
      {
        name: "fetchUserData",
        description: "Fetches user data from the database for a given ID.",
        parameters: [
          {
            name: "userId",
            type: "string",
            description: "The ID of the user to fetch data for.",
            required: true
          }
        ],
        handler: async ({ userId }: { userId: string }) => {
          // Backend logic implementation
          const userData = await database.findUser(userId);
          return {
            name: userData.name,
            email: userData.email,
            status: userData.status
          };
        }
      }
    ];
  }
});
```

**Dean Machines RSC Backend Actions:**
- Agent state management and coordination
- Tool execution with Mastra integration
- Vector database queries through LibSQL/Turso
- Workflow orchestration and monitoring
- Memory system operations
- Graph RAG document processing

## Best Practices for Dean Machines RSC

### 1. Agent Integration
- Export runtime context types from `src/mastra/agents/index.ts`
- Use consistent naming patterns between agent definitions and network references
- Implement proper error handling and logging with Langfuse integration
- Leverage the existing 22+ agent architecture for specialized tasks

### 2. Component Architecture
- Place CopilotKit components in `src/app/(playground)` for consistency
- Use the established electric neon theme and glassmorphism styling
- Implement proper client/server boundaries with `"use client"` directives
- Follow the existing component patterns in `src/components/copilotkit/`

### 3. Type Safety
- Use Zod schemas for action parameter validation
- Export and utilize agent runtime context types
- Implement proper TypeScript strict mode compliance
- Ensure type safety between Mastra agents and CopilotKit components

### 4. Observability
- Integrate with existing Langfuse observability setup
- Use structured logging with Pino throughout components
- Implement proper error tracking and debugging
- Leverage the existing observability configuration in `src/mastra/config/`

**Langfuse Integration:**
```typescript
// Environment variables for Langfuse tracing
LANGFUSE_SECRET_KEY="<your-secret-key>"
LANGFUSE_PUBLIC_KEY="<your-public-key>"
LANGFUSE_BASE_URL="https://cloud.langfuse.com" // or your self-hosted URL

// Use Langfuse with CopilotRuntime for comprehensive tracing
const runtime = new CopilotRuntime({
  // Enable observability with Langfuse integration
  observability_c: {
    langfuse: {
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
    }
  },
  
  // Add trace metadata for better observability
  onTrace: (trace) => {
    // Custom trace handling with Langfuse
    trace.update({
      sessionId: trace.sessionId,
      userId: trace.userId,
      metadata: {
        project: "dean-machines-rsc",
        environment: process.env.NODE_ENV,
        component: "copilotkit",
        timestamp: new Date().toISOString()
      },
      tags: ["copilotkit", "mastra", "dean-machines"]
    });
  }
});

// For Mastra agents with Langfuse tracing
import { Langfuse } from "langfuse";

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

// Agent with Langfuse observability
export const myAgent = new Agent({
  memory: agentMemory,
  observability: {
    langfuse: langfuse,
    sessionId: "dean-machines-session",
    tags: ["agent", "mastra", "copilotkit"]
  }
});
```

### 5. Performance Optimization
- Use proper React hook dependencies for re-registration
- Implement loading states and error boundaries
- Optimize render methods for real-time updates
- Cache expensive operations where appropriate

### 6. Component Usage Requirements
**Always import ALL CopilotKit UI components and ensure every imported component is used:**
```typescript
// CopilotKit - ALL components must be used in JSX
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat, CopilotPopup, CopilotSidebar } from "@copilotkit/react-ui";

// shadcn/ui - Complete component set, all must be used
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
```

### 7. Real Functionality Requirements
- **Never create fake API endpoints** - Use real agent integration only
- **No mock data allowed** - Implement real functionality or nothing
- **Use existing Mastra agent endpoints** - Don't create non-existent APIs
- **Implement proper error handling** for all agent communications
- **Provide real-time updates** through actual state changes

### 8. TSDoc Documentation Standards
**Use comprehensive TSDoc comments for all public functions:**
```typescript
/**
 * Handles agent switching with real-time state updates and error handling.
 * 
 * @param agentName - The name of the target agent to switch to
 * @param context - Optional context data to pass to the new agent
 * @returns Promise resolving to the agent switch confirmation
 * 
 * @example
 * ```typescript
 * const result = await switchToAgent("research", { query: "AI trends" });
 * console.log(result.message); // "Successfully switched to research agent"
 * ```
 * 
 * @throws {AgentNotFoundError} When the specified agent doesn't exist
 * @throws {NetworkError} When unable to connect to the agent endpoint
 * 
 * @see {@link useCopilotAction} for implementing this in components
 * @since v1.0.0
 * @author Dean Machines RSC Team
 * @remarks Integrates with existing Mastra agent network architecture
 */
async function switchToAgent(agentName: string, context?: AgentContext): Promise<AgentSwitchResult> {
  // Implementation
}
```

### 9. Anti-Patterns to Avoid
**❌ Never Do These:**
- Import unused components (breaks builds)
- Create fake API calls (causes runtime errors)
- Remove existing working code
- Use mock implementations
- Create non-existent endpoints

**✅ Always Do These:**
- Use every imported component in JSX
- Implement real agent integration
- Follow existing project patterns
- Add comprehensive error handling
- Maintain type safety throughout

## Project-Specific Implementation

### Dean Machines RSC Integration
- Use `src/mastra/index.ts` for agent registration and configuration
- Implement runtime context types for all agents (exported from `src/mastra/agents/index.ts`)
- Follow the established pattern in `src/app/(playground)` for CopilotKit component implementation
- Ensure proper error handling and logging integration with the project's observability setup

### Real Agent Integration Example
```typescript
useCopilotAction({
  name: "switchToAgent",
  description: "Switch to a specific agent endpoint in the Dean Machines network",
  parameters: [
    {
      name: "agentName",
      type: "string",
      description: "Name of the agent to switch to",
      enum: ["master", "research", "code", "git", "graph", "strategizer", "supervisor"],
    }
  ],
  handler: async ({ agentName }) => {
    // Real implementation using existing Mastra endpoints
    setCurrentEndpoint(`/api/copilotkit?agent=${agentName}`);
    
    // Update context for Langfuse observability
    updateAgentContext({
      activeAgent: agentName,
      timestamp: new Date().toISOString(),
      sessionId: getCurrentSessionId()
    });
    
    // Log to Langfuse for tracing
    langfuse.trace({
      name: "agent-switch",
      input: { agentName },
      metadata: {
        component: "copilotkit-action",
        action: "switchToAgent",
        project: "dean-machines-rsc"
      },
      tags: ["agent-switching", "copilotkit"]
    });
    
    return `Successfully switched to ${agentName} agent`;
  },
  render: ({ status, args }) => {
    if (status === 'executing') {
      return (
        <div className="agent-switch-progress">
          <Badge variant="outline">
            Switching to {args.agentName}...
          </Badge>
        </div>
      );
    }
    return null;
  }
});
```

### Langfuse Observability Patterns for CopilotKit

**Action-Level Tracing:**
```typescript
useCopilotAction({
  name: "processData",
  description: "Process user data with comprehensive tracing",
  handler: async ({ data }) => {
    const trace = langfuse.trace({
      name: "copilotkit-action-processData",
      input: { data },
      metadata: {
        component: "copilotkit",
        action: "processData",
        sessionId: getCurrentSessionId()
      }
    });

    try {
      const result = await processUserData(data);
      
      trace.update({
        output: result,
        status: "success"
      });
      
      return result;
    } catch (error) {
      trace.update({
        status: "error",
        error: error.message      });
      throw error;
    } finally {
      trace.end();
    }
  }
});
```

**Agent State Monitoring with Langfuse:**
```typescript
useCoAgentStateRender({
  name: "research-agent",
  render: ({ status, state }) => {
    // Log agent state changes to Langfuse
    useEffect(() => {
      if (status === 'running') {
        langfuse.event({
          name: "agent-state-change",
          input: { agentName: "research-agent", status, state },
          metadata: {
            component: "useCoAgentStateRender",
            timestamp: new Date().toISOString()
          }
        });
      }
    }, [status, state]);

    return status === 'running' ? (
      <div className="agent-progress">
        Research agent is processing: {state.currentTask}
      </div>
    ) : null;
  }
});
```

## Advanced Features (2024/2025)

### Image Input Support
**NEW**: Multi-model image input with paste functionality.

**Capabilities:**
- Direct image pasting into chat interfaces
- Multi-model compatibility (OpenAI GPT-4V, Claude 3.5 Sonnet, Gemini Pro Vision)
- Automatic image preprocessing and optimization
- Base64 and URL-based image handling

**Implementation:**
```typescript
useCopilotAction({
  name: "analyzeImage",
  description: "Analyze uploaded or pasted images",
  parameters: [
    {
      name: "image",
      type: "string", // Base64 encoded image
      description: "The image to analyze"
    },
    {
      name: "analysisType",
      type: "string",
      description: "Type of analysis: 'code', 'design', 'content', 'data'"
    }
  ],
  handler: async ({ image, analysisType }) => {
    // Process image with vision models
    const analysis = await visionModel.analyze({
      image: image,
      prompt: `Perform ${analysisType} analysis on this image`
    });
    
    return analysis;
  }
});

// Enable image input in CopilotChat
<CopilotChat
  instructions="You can analyze images I upload or paste"
  enableImageInput={true}
  imageProcessingConfig={{
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    autoResize: true
  }}
/>
```

### Enhanced MCP Server Integration
**Updated 2024/2025**: Improved Model Context Protocol support with better tooling.

**New Features:**
- Renamed `mcpEndpoints` to `mcpServers` for consistency
- Enhanced deduplication logic for server configurations
- Priority ordering where request-specific endpoints override base endpoints
- Improved tool parameter extraction and schema handling

**Updated Configuration:**
```typescript
// New mcpServers interface (v1.8.8+)
const runtime = new CopilotRuntime({
  mcpServers: [
    {
      endpoint: "http://localhost:3001/mcp",
      apiKey: process.env.MCP_API_KEY, // Optional
      name: "dean-machines-tools"
    },
    {
      endpoint: "http://localhost:3002/mcp",
      name: "vector-search-tools"
    }
  ],
  createMCPClient: async (config) => {
    return await experimental_createMCPClient({
      transport: {
        type: "sse",
        url: config.endpoint,
        headers: config.apiKey ? 
          { Authorization: `Bearer ${config.apiKey}` } : 
          undefined
      }
    });
  }
});

// Access MCP servers in hooks
const { mcpServers, setMcpServers } = useCopilotChat();

// Dynamic MCP server management
const addMCPServer = (serverConfig: MCPServerConfig) => {
  setMcpServers(prev => [...prev, serverConfig]);
};
```

### LangGraph Configuration from UI
**NEW 2024/2025**: Configure LangGraph parameters directly from the user interface.

**Features:**
- Dynamic checkpoint configuration
- Real-time graph parameter updates
- UI-driven interrupt handling
- Visual workflow state management

**Implementation:**
```typescript
import { useLangGraphConfig } from '@copilotkit/react-core';

function LangGraphControlPanel() {
  const { config, updateConfig, isConnected } = useLangGraphConfig();
  
  return (
    <div className="langgraph-controls">
      <h3>LangGraph Configuration</h3>
      
      <div className="config-section">
        <label>Checkpoint Frequency</label>
        <input 
          type="number"
          value={config.checkpointFrequency}
          onChange={(e) => updateConfig({
            checkpointFrequency: parseInt(e.target.value)
          })}
        />
      </div>
      
      <div className="config-section">
        <label>Enable Interrupts</label>
        <input 
          type="checkbox"
          checked={config.enableInterrupts}
          onChange={(e) => updateConfig({
            enableInterrupts: e.target.checked
          })}
        />
      </div>
      
      <div className="status">
        Status: {isConnected ? "Connected" : "Disconnected"}
      </div>
    </div>
  );
}
```

### Enhanced Chat UI Features
**Updated 2024/2025**: Improved chat interface with new capabilities.

**New Features:**
- Multi-line input expansion
- Dark mode color fixes
- Improved message threading
- Better error handling and recovery

**Configuration:**
```typescript
<CopilotChat
  instructions="Enhanced chat interface with latest features"
  enableMultilineInput={true}
  darkModeOptimized={true}
  messageThreading={{
    enabled: true,
    maxThreadDepth: 5,
    showThreadIndicators: true
  }}
  errorRecovery={{
    retryAttempts: 3,
    backoffStrategy: 'exponential',
    showRetryButton: true
  }}
  labels={{
    title: "Dean Machines Assistant",
    initial: "Hi! I'm your AI assistant with enhanced capabilities.",
    placeholder: "Message (Shift+Enter for new line)..."
  }}
/>
```

### Public Key Authentication
**NEW v1.9.1**: Enhanced security with public key authentication for CopilotKit Cloud.

**Setup:**
```typescript
<CopilotKit 
  runtimeUrl="/api/copilotkit"
  publicApiKey={process.env.NEXT_PUBLIC_COPILOTKIT_KEY}
  authConfig={{
    publicKeyAuth: {
      keyId: process.env.COPILOTKIT_KEY_ID,
      algorithm: 'RS256'
    }
  }}
>
  {/* Your application */}
</CopilotKit>
```

### Environment Variables for Latest Features
```env
# Core CopilotKit
COPILOTKIT_API_KEY=your_copilot_cloud_api_key
NEXT_PUBLIC_COPILOTKIT_KEY=your_public_key

# Public Key Authentication (v1.9.1+)
COPILOTKIT_KEY_ID=your_key_id
COPILOTKIT_PRIVATE_KEY=your_private_key

# Enhanced MCP Support
MCP_PRIMARY_ENDPOINT=http://localhost:3001/mcp
MCP_SECONDARY_ENDPOINT=http://localhost:3002/mcp
MCP_API_KEY=your_mcp_api_key

# Vision/Image Support
VISION_MODEL_PROVIDER=openai # or anthropic, google
VISION_MODEL_NAME=gpt-4-vision-preview
MAX_IMAGE_SIZE=10485760 # 10MB

# LangGraph Integration
LANGGRAPH_CONFIG_ENDPOINT=http://localhost:8080/config
LANGGRAPH_CHECKPOINT_FREQUENCY=5
LANGGRAPH_ENABLE_INTERRUPTS=true

# Observability (Langfuse)
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_HOST=https://cloud.langfuse.com
```

### Dean Machines RSC Integration Checklist

**✅ Latest CopilotKit Features (2024/2025):**
- [ ] Image input support for code analysis and design review
- [ ] Enhanced MCP server integration with tool registry
- [ ] LangGraph interrupt handling for human-in-the-loop workflows
- [ ] Public key authentication for secure cloud deployment
- [ ] Multi-line chat input for complex queries
- [ ] Dark mode optimization for better UX
- [ ] Comprehensive Langfuse observability integration
- [ ] Advanced LLM adapter configuration (Google Gemini 2.5 Flash)
- [ ] AG-UI protocol implementation for agent coordination
- [ ] Enhanced error recovery and retry mechanisms
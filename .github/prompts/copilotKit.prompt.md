---
mode: 'agent'
description: 'CopilotKit guidelines for the Dean Machines RSC project'
---
# CopilotKit Guidelines for the Dean Machines RSC Project
## 1. Overview
This document provides guidelines for using CopilotKit in the Dean Machines RSC project, including setup, usage, and best practices.
- This is links to my current CopilotKit implementation:
`C:\\Users\\dm\\Documents\\deanmachines-rsc\\src\\app\\api\\copilotkit\\route.ts`
`C:\\Users\\dm\\Documents\\deanmachines-rsc\\src\\mastra\\index.ts`
- This is where we will build this in so we stay consistent.
`C:\\Users\\dm\\Documents\\deanmachines-rsc\\src\\app\\(playground)`

## 2. URLs

https://docs.copilotkit.ai/cookbook/state-machine
https://mastra.ai/en/docs/frameworks/agentic-uis/copilotkit
https://docs.copilotkit.ai/mastra/concepts/mastra
- UI Components
https://docs.copilotkit.ai/reference/components/chat/CopilotChat
https://docs.copilotkit.ai/reference/components/chat/CopilotPopup
https://docs.copilotkit.ai/reference/components/chat/CopilotSidebar
https://docs.copilotkit.ai/reference/components/CopilotTextarea
https://docs.copilotkit.ai/reference/components/CopilotKit
- Hooks
https://docs.copilotkit.ai/reference/hooks/useCopilotReadable
https://docs.copilotkit.ai/reference/hooks/useCopilotAction
https://docs.copilotkit.ai/reference/hooks/useCopilotAdditionalInstructions
https://docs.copilotkit.ai/reference/hooks/useCopilotChat
https://docs.copilotkit.ai/reference/hooks/useCopilotChatSuggestions
https://docs.copilotkit.ai/reference/hooks/useCoAgent
https://docs.copilotkit.ai/reference/hooks/useCoAgentStateRender
- Class
https://docs.copilotkit.ai/reference/classes/CopilotRuntime
https://docs.copilotkit.ai/reference/classes/CopilotTask
- Customize UI
https://docs.copilotkit.ai/guides/custom-look-and-feel/built-in-ui-components
https://docs.copilotkit.ai/guides/custom-look-and-feel/customize-built-in-ui-components
https://docs.copilotkit.ai/guides/custom-look-and-feel/bring-your-own-components
https://docs.copilotkit.ai/guides/custom-look-and-feel/markdown-rendering
https://docs.copilotkit.ai/guides/custom-look-and-feel/headless-ui
- Connecting to your Data
https://docs.copilotkit.ai/guides/connect-your-data/frontend
https://docs.copilotkit.ai/guides/connect-your-data/backend
- Generative-ui
https://docs.copilotkit.ai/guides/generative-ui
- Frontend Actions
https://docs.copilotkit.ai/guides/frontend-actions
- Backend Actions
https://docs.copilotkit.ai/guides/backend-actions
- Actions
https://docs.copilotkit.ai/guides/backend-actions/typescript-backend-actions
- MCP
http://docs.copilotkit.ai/guides/model-context-protocol?cli=do-it-manually
- Custom AI Assistant Behavior
http://docs.copilotkit.ai/guides/custom-ai-assistant-behavior
- Copilot Suggestions
https://docs.copilotkit.ai/guides/copilot-suggestions
- Bring Your Own LLM
https://docs.copilotkit.ai/guides/bring-your-own-llm?hosting=self-hosted
- Copilot Textarea
https://docs.copilotkit.ai/guides/copilot-textarea
- self-hosting
https://docs.copilotkit.ai/guides/self-hosting
- Messages and LocalStorage
https://docs.copilotkit.ai/guides/messages-localstorage

https://docs.copilotkit.ai/mastra
https://docs.copilotkit.ai/mastra/agentic-chat-ui
https://docs.copilotkit.ai/mastra/generative-ui/tool-based
https://docs.copilotkit.ai/mastra/generative-ui
https://docs.copilotkit.ai/mastra/human-in-the-loop
https://docs.copilotkit.ai/mastra/frontend-actions
https://docs.copilotkit.ai/mastra/multi-agent-flows
https://docs.copilotkit.ai/mastra/concepts/agentic-copilots?experience=intermediate
https://docs.copilotkit.ai/mastra/concepts/mastra
https://docs.copilotkit.ai/guides/custom-look-and-feel/customize-built-in-ui-components

https://docs.copilotkit.ai/guides/custom-look-and-feel/bring-your-own-components
https://docs.copilotkit.ai/guides/custom-look-and-feel/markdown-rendering
https://docs.copilotkit.ai/guides/custom-look-and-feel/headless-ui
https://docs.copilotkit.ai/guides/connect-your-data/frontend
https://docs.copilotkit.ai/guides/connect-your-data/backend

https://docs.copilotkit.ai/guides/generative-ui
https://docs.copilotkit.ai/guides/generative-ui?gen-ui-type=Fetch+data+%26+render
https://docs.copilotkit.ai/guides/generative-ui?gen-ui-type=renderAndWaitForResponse+%28HITL%29
https://docs.copilotkit.ai/guides/generative-ui?gen-ui-type=Render+strings
https://docs.copilotkit.ai/guides/generative-ui?gen-ui-type=Catch+all+renders

https://docs.copilotkit.ai/guides/frontend-actions
https://docs.copilotkit.ai/guides/backend-actions/typescript-backend-actions

https://docs.copilotkit.ai/guides/custom-ai-assistant-behavior
https://docs.copilotkit.ai/guides/copilot-suggestions
https://docs.copilotkit.ai/guides/copilot-textarea
https://docs.copilotkit.ai/guides/messages-localstorage
https://docs.copilotkit.ai/observability/langsmith

## 3. Example

- Tutorial: AI Todo App
https://docs.copilotkit.ai/tutorials/ai-todo-app/overview
https://docs.copilotkit.ai/tutorials/ai-todo-app/step-1-checkout-repo
https://docs.copilotkit.ai/tutorials/ai-todo-app/step-2-setup-copilotkit?hosting=self-hosted
https://docs.copilotkit.ai/tutorials/ai-todo-app/step-3-copilot-readable-state
https://docs.copilotkit.ai/tutorials/ai-todo-app/step-4-copilot-actions

- Tutorial: AI Powered Textarea
https://docs.copilotkit.ai/tutorials/ai-powered-textarea/overview
https://docs.copilotkit.ai/tutorials/ai-powered-textarea/step-1-checkout-repo
https://docs.copilotkit.ai/tutorials/ai-powered-textarea/step-2-setup-copilotkit?hosting=self-hosted
https://docs.copilotkit.ai/tutorials/ai-powered-textarea/step-3-copilot-textarea
https://docs.copilotkit.ai/tutorials/ai-powered-textarea/step-4-copilot-readable-state
https://docs.copilotkit.ai/tutorials/ai-powered-textarea/next-steps

## 4. Best Practices

### Component Usage
- **Always import ALL CopilotKit UI components**: `CopilotChat`, `CopilotPopup`, `CopilotSidebar`
- **Use components, don't just import them**: Every imported component must be used in the JSX
- **Import complete shadcn/ui component sets**: Include Button, Card, Badge, Input, Label, Textarea, Select, Separator, Dialog, Tabs
- **Real functionality over mock data**: Never create fake APIs or mock implementations

### CopilotKit Integration
- **Use useCopilotReadable** to make application state available to agents
- **Implement useCopilotAction** for real agent interactions, not fake API calls
- **Provide meaningful descriptions** in actions and readable state
- **Use proper parameter validation** with enum types where applicable

### Agent Integration
- **Switch between real agent endpoints** using setCurrentEndpoint
- **Provide context through headers** (X-User-ID, X-Session-ID, X-Project-Context)
- **Use existing Mastra agent system** - don't create fake agent endpoints
- **Implement proper error handling** for agent communication

### State Management
- **Use React hooks properly** for state management
- **Provide real-time updates** through state changes
- **Maintain consistency** between UI state and agent context
- **Track user interactions** and agent responses

### TSDoc Comments
- **Use TSDoc comments** for all public functions, classes, interfaces, and types
- **Use Professional grade level of quality, clarity, and completeness**
- **Document all parameters and return types** clearly
- **Include examples** where applicable
- **Include error handling** where applicable
- **Include performance considerations** where applicable
- **Include security implications** where applicable
- **Include TODOs** where applicable
- **Include deprecation warnings** where applicable
- **Include internal notes** where applicable
- **Include author information** where applicable
- **Include date information** where applicable
- **Include model information** where applicable
- **Include version information** where applicable
- **Include related functions and classes** where applicable
- **Include best practices** where applicable
- **Include testing information** where applicable
- **Include observability information** where applicable
- **Include monitoring information** where applicable
- **Include alerting information** where applicable
- **Include logging information** where applicable
- **Include security information** where applicable
- **Include data protection information** where applicable
- **Include compliance information** where applicable
- **Include accessibility information** where applicable
- **Include internationalization information** where applicable
- **Include localization information** where applicable
- **Include performance optimization information** where applicable
- **Include cost optimization information** where applicable
- **Include scalability information** where applicable
- **Include maintainability information** where applicable
- **Include extensibility information** where applicable
- **Include documentation generation information** where applicable
- **Include deployment information** where applicable
- **Include infrastructure information** where applicable
- **Include links to external documentation or resources** where applicable
- **Include detailed descriptions** for complex functions
- **Use `@param` for parameters and `@returns` for return values**
- **Use `@example` for examples of usage where applicable**
- **Use `@throws` for exceptions that can be thrown**
- **Use `@see` to reference related functions or classes**
- **Use `@link` to link to external documentation or resources**
- **Use `@since` to indicate when the function was added**
- **Use `@remarks` for important implementation notes**
- **Use `@deprecated` to mark deprecated functions**
- **Use `@author` to indicate the author of the function**
- **Use `@date` to indicate when the function was last updated**
- **Use `@model` to indicate the model that generated the code**
- **Use `@version` to indicate the version of the function**
- **Use `@todo` to indicate TODOs**
- **Use `@internal` to indicate internal functions**
- **Use `@default` to indicate default values**
- **Use `@category` to indicate the category of the function**
- **Use `@event` to indicate events**
- **Use `@listens` to indicate event listeners**
- **Use `@fires` to indicate events fired**
- **Use `@borrows` to indicate borrowed functions**
- **Use `@callback` to indicate callback functions**


## 5. Anti-Patterns

### ❌ Never Do These
- **Don't create fake API endpoints** - Use real agent integration only
- **Don't import unused components** - This breaks builds and causes errors
- **Don't use mock data** - Implement real functionality or nothing
- **Don't remove existing components** - Only add what's missing
- **Don't create non-existent APIs** - Use existing Mastra agent endpoints

### ❌ Common Mistakes
- **Importing components without using them** - Causes build failures
- **Creating fetch() calls to non-existent endpoints** - Use CopilotKit actions instead
- **Removing working code** - Only add functionality, never remove
- **Using emojis or unnecessary UI bloat** - Keep interfaces clean and functional
- **Mock implementations** - Always implement real functionality

### ❌ Build Breaking Patterns
- **Unused imports** - TypeScript will fail compilation
- **Missing component usage** - Imported components must be used in JSX
- **Fake API calls** - Will cause runtime errors
- **Incomplete implementations** - Finish what you start

## 6. Implementation Guidelines

### Required Imports Pattern
```typescript
// CopilotKit - ALL components must be used
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat, CopilotPopup, CopilotSidebar } from "@copilotkit/react-ui";

// shadcn/ui - Complete component set
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

### Real Action Implementation
```typescript
useCopilotAction({
    name: "switchToAgent",
    description: "Switch to a specific agent endpoint",
    parameters: [
        {
            name: "agentName",
            type: "string",
            description: "Name of the agent to switch to",
            enum: ["master", "research", "code", "git", "graph"],
        }
    ],
    handler: async ({ agentName }) => {
        setCurrentEndpoint(`http://localhost:4111/copilotkit/${agentName}`);
        return `Switched to ${agentName} agent`;
    },
});
```

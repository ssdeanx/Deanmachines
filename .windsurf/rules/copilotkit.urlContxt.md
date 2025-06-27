---
trigger: glob
globs: ./src/mastra/index.ts ./src/app/api/copilotkit/route.ts ./src/components/**/*.tsx ./src/app/**/*tsx
---

# CopilotKit & Mastra UI Canonical Reference (Dean Machines RSC)

## 1. UI Component Architecture

### 1.1 Prebuilt Components

- **CopilotPopup, CopilotSidebar, CopilotChat, CopilotKit**: Core chat UIs. Import from `@copilotkit/react-ui`.
- **Usage Example:**
  ```tsx
  import { CopilotSidebar, CopilotPopup, CopilotChat } from "@copilotkit/react-ui";
  <CopilotSidebar instructions="You are a helpful assistant." />
  <CopilotPopup labels={{ title: "Popup Assistant" }} />
  <CopilotChat icons={{ openIcon: <MyIcon /> }} />
  ```
- **Integration with Next.js**: Always import `@copilotkit/react-ui/styles.css` in `src/app/layout.tsx`.

### 1.2 Component Props and Patterns
- **instructions**: System prompt for the agent.
- **labels**: Object for customizing all user-facing text (title, placeholder, stopGenerating, etc.).
- **icons**: Object for overriding all icons (openIcon, closeIcon, sendIcon, etc.).
- **agent**: (Advanced) Specify a particular agent instance or endpoint.
- **Example:**
  ```tsx
  <CopilotSidebar
    instructions="You are a project management assistant."
    labels={{ title: "Project Copilot", placeholder: "Ask about your project..." }}
    icons={{ openIcon: <OpenIcon />, closeIcon: <CloseIcon /> }}
  />
  ```
- **Headless/Custom UI**: Use the headless UI pattern for full control. See section 3 for bring-your-own components.

### 1.3 shadcn/ui Integration

- **Required Imports:**

  ```tsx
  import { Button, Card, Badge, Input, Label, Textarea, Select, Separator, Dialog, Tabs } from '@/components/ui';
  ```

- **Usage:** Use shadcn/ui for all form controls, dialogs, and layout. Ensures consistent look and feel with CopilotKit.

---

## 2. Styling & Theming

### 2.1 CSS Variables

- **Supported Variables:**

  | Variable                        | Purpose                                 |
  |----------------------------------|-----------------------------------------|
  | --copilot-kit-primary-color      | Main brand/action color                 |
  | --copilot-kit-contrast-color     | Text on primary elements                |
  | --copilot-kit-background-color   | Main background                         |
  | --copilot-kit-secondary-color    | Card/panel backgrounds                  |
  | --copilot-kit-secondary-contrast-color | Main content text color           |
  | --copilot-kit-separator-color    | Borders/dividers                        |
  | --copilot-kit-muted-color        | Disabled/inactive states                |

- **Override Example:**

  ```tsx
  <div style={{ "--copilot-kit-primary-color": "#00ff99" }}>
    <CopilotSidebar ... />
  </div>
  ```

- **Global Override:**

  ```css
  :root {
    --copilot-kit-primary-color: #00ff99;
    --copilot-kit-background-color: #18181b;
  }
  ```

### 2.2 CSS Classes

- **Key Classes:** `.copilotKitMessages`, `.copilotKitInput`, `.copilotKitUserMessage`, `.copilotKitAssistantMessage`, `.copilotKitHeader`, `.copilotKitButton`, `.copilotKitWindow`, `.copilotKitSidebar`, `.copilotKitPopup`, `.copilotKitMarkdown`, `.copilotKitCodeBlock`, etc.
- **Override Example:**

  ```css
  .copilotKitUserMessage { background: #007AFF; }
  .copilotKitMessages { padding: 2rem; }
  ```

- **Font Customization:**

  ```css
  .copilotKitMessages, .copilotKitInput { font-family: 'Inter', Arial, sans-serif; }
  ```

### 2.3 Tailwind v4 & shadcn/ui

- **Full Compatibility:** You can use all CopilotKit CSS with Tailwind v4.
- **Utility-First Pattern:** Use Tailwind utility classes directly in your custom components
Example:
  ```tsx
  <div className="bg-gradient-to-br from-black to-gray-900 p-4 rounded-xl">
    <CopilotSidebar ... />
  </div>
  ```
- **Global Class Overrides:** For CopilotKit classes, add overrides in `globals.css` loaded after Tailwind’s base styles. Use Tailwind’s `@layer base` for specificity:
  ```css
  @layer base {
    .copilotKitUserMessage { @apply bg-blue-500 text-white rounded-lg; }
    .copilotKitMessages { @apply p-8; }
  }
  ```
- **Combining CSS Variables & Tailwind:**
  - Use CSS variables for theme colors, then reference them in Tailwind config if needed (see Tailwind docs for custom properties).
- **shadcn/ui Integration:**
  - All shadcn/ui components are Tailwind-native & work seamlessly with CopilotKit.
- **Troubleshooting:**
  - If a CopilotKit class is not being overridden, check CSS load order & use `@layer base` for higher specificity.
  - For dynamic theming, use Tailwind’s `theme()` function or custom properties in your config.
- **Performance:**
  - Prefer utility classes & CSS variables for best build size & runtime performance in Tailwind v4.

### 2.4 Accessibility & A11y

- All CopilotKit UI components are ARIA-compliant. When customizing, ensure custom components maintain ARIA roles & keyboard navigation.
- Use `aria-label`, `aria-live`, & semantic HTML for all custom UI.

## 3. Custom Sub-Components (Bring-Your-Own)

### 3.1 Replaceable Sub-Components

- **List:** `UserMessage`, `AssistantMessage`, `Window`, `Button`, `Header`, `Messages`, `Suggestions`, `Input`, `Actions`, `Agent State`.
- **Purpose:** Swap out any sub-component to fully control look, feel, & behavior.

### 3.2 Usage Pattern

  ```tsx
  <CopilotSidebar
    UserMessage={MyUserMessage}
    AssistantMessage={MyAssistantMessage}
    Window={MyWindow}
    Button={MyButton}
    Header={MyHeader}
    Messages={MyMessages}
    Suggestions={MySuggestions}
    Input={MyInput}
    Actions={MyActions}
    AgentState={MyAgentState}
  />
  ```

- **TypeScript:** All sub-components are strongly typed. Use the provided prop types for DX & safety.

### 3.3 Advanced Patterns

- **Multi-Agent/CoAgent:** Customize `AgentState` & `Actions` to visualize agent progress, tool execution, & streaming state.
- **Accessibility:** Ensure all custom components support keyboard navigation & screen readers.
- **Observability:** Add logging or analytics hooks to custom components.

## 4. Markdown & Content Rendering

### 4.1 Default Behavior

- CopilotKit uses `react-markdown` for rendering assistant messages, supporting links, code, lists, and more.

### 4.2 Custom Tag Renderers

- **Pattern:**

  ```tsx
  <CopilotSidebar
    markdownTagRenderers={{
      "reference-chip": ({ children, href }) => (
        <a href={href} className="reference-chip">{children}</a>
      ),
    }}
  />
  ```

- **Use Cases:** Add custom chips for citations, source links, or inline actions.

### 4.3 Full Markdown Replacement

- Replace the `AssistantMessage` component to control all markdown rendering.

  ```tsx
  <CopilotSidebar AssistantMessage={MyCustomAssistantMessage} />
  ```

### 4.4 Styling Markdown

- Style `.copilotKitMarkdown`, `.copilotKitCodeBlock`, & custom tags in your CSS.
- **Example:**

  ```css
  .reference-chip { background: #f0f1f2; border-radius: 12px; padding: 2px 8px; }
  ```

### 4.5 Troubleshooting

- If markdown is not rendering as expected, check for missing or misconfigured tag renderers.

## 5. Hooks & State Management

### 5.1 Hooks

- `useCopilotReadable`: Expose app state to agents. Accepts a state object & optional description.
- `useCopilotAction`: Register agent actions. Accepts name, description, parameters (with type/enum), & async handler.
- `useCopilotAdditionalInstructions`: Add dynamic, context-aware instructions for the agent.
- `useCopilotChat`: Manage chat state, messages, & UI events.
- `useCopilotChatSuggestions`: Provide & manage chat suggestions.
- `useCoAgent`: Orchestrate multi-agent flows, manage agent state & transitions.
- `useCoAgentStateRender`: Render & visualize agent state in the UI.
- `useLangGraphInterrupt`: Integrate with LangGraph for advanced agent workflows & interruption handling.

### 5.2 Usage Patterns

- Use hooks for real-time updates, validation, & orchestration.
- Integrate with React state & shadcn/ui for seamless UX.
- **Example:**

  ```tsx
  const [project, setProject] = useState<Project>(...);
  useCopilotReadable({ project, description: "Current project state" });
  useCopilotAction({ name: "updateProject", handler: async ({ id, data }) => ... });
  ```

### 5.3 Advanced Patterns

- Use `useCoAgent` & `useCoAgentStateRender` for multi-agent, streaming, and HITL scenarios.
- Use `useLangGraphInterrupt` for advanced agent workflows & interruption handling.

### 5.4 Troubleshooting

- If state is not syncing, check hook dependencies & ensure correct state shape.
- For action errors, ensure parameter types & handler signatures match.

### 5.5 Accessibility

- Ensure all state-driven UI updates are announced to screen readers (e.g., via `aria-live`).

---

## 6. Action & Agent Integration

### 6.1 Real Actions

- Always use `useCopilotAction` for real agent actions. Validate parameters, use enums, & implement async handlers.
- **Example:**

  ```typescript
  useCopilotAction({
    name: "switchToAgent",
    description: "Switch to a specific agent endpoint",
    parameters: [
      {
        name: "agentName",
        type: "string",
        enum: ["master", "research", "code", "git", "graph"],
      }
    ],
    handler: async ({ agentName }) => {
      setCurrentEndpoint(`/copilotkit/${agentName}`);
      return `Switched to ${agentName} agent`;
    },
  });
  ```

### 6.2 Agent Endpoints & Context

- Switch between real agent endpoints using `setCurrentEndpoint`.
- Provide context via headers (X-User-ID, X-Session-ID, X-Project-Context).
- Use the Mastra agent system for all agent communication.

### 6.3 Never use fake APIs or mock data

- Never use fake APIs or mock data.

### 6.4 Security

- Validate all action parameters and sanitize user input.
- Never expose sensitive data in agent responses.

### 6.5 Observability

- Log all agent actions, errors, and state changes for debugging and monitoring.

### 6.6 Performance

- Debounce or throttle high-frequency actions to avoid agent overload.

### 6.7 Troubleshooting

- If agent actions are not working, check endpoint URLs, headers, and handler signatures.

---

## 7. AGUI Protocol & Multi-Agent Flows (Advanced)

### 7.1 Multi-Agent Orchestration

- **Pattern:**

  ```tsx
  import { useCoAgent, useCoAgentStateRender } from "@copilotkit/react-core";
  const { agents, activeAgent, sendToAgent } = useCoAgent({
    agents: ["master", "research", "code"],
    onStateChange: (state) => log.info("Agent state", state),
  });
  <CopilotSidebar AgentState={MyAgentStateRenderer} />
  ```

- **Streaming State:** Use AGUI events to stream agent progress, intermediate results, & tool execution to the UI in real time.
- **HITL:** Insert human-in-the-loop steps by pausing agent execution & surfacing UI controls for user input.
- **Edge Cases:** Handle agent timeouts, retries, & fallback strategies for failed tool calls.

### 7.2 Real-World Example

- **Scenario:** Multi-agent code review with streaming feedback & user approval step.
- **Pattern:**
  1. User submits code.
  2. "Code Agent" streams review comments.
  3. "Supervisor Agent" requests user approval (HITL event).
  4. On approval, "Git Agent" merges code.
- **Code:**

  ```tsx
  // Pseudocode for multi-agent workflow
  useCoAgent({
    agents: ["code", "supervisor", "git"],
    onStateChange: handleState,
    onUserInput: handleUserApproval,
  });
  ```
---

## 8. Best Practices & Anti-Patterns

- **Required Imports:** Always import & use all CopilotKit & shadcn/ui components as specified. Never import unused components.
- **Component Usage:** Every imported component must be used in JSX. Never create fake APIs or mock data.
- **State Management:** Use React hooks for state, provide real-time updates, & maintain consistency between UI & agent context.
- **TSDoc Documentation:** Document all public functions, classes, & types with TSDoc. Include parameters, return types, examples, error handling, performance, security, & observability notes.
- **Anti-Patterns:**
  - Never create fake API endpoints or mock implementations.
  - Never remove existing components—only add what's missing.
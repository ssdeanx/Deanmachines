---
trigger: glob
globs: src/mastra/tools/**/*.ts
---

# Mastra Tools Development Guidelines

## Core Tool Architecture

### Tool Creation Pattern

All Mastra tools follow a consistent pattern using `createTool` from `@mastra/core/tools`:

```typescript
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { RuntimeContext } from '@mastra/core/di';
import { z } from "zod";
import { generateId } from 'ai';
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'toolName', level: 'info' });

export const myTool = createTool({
  id: 'tool-identifier',
  description: 'Clear description of tool functionality',
  inputSchema: inputSchema,
  outputSchema: outputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof inputSchema> & {
    input: z.infer<typeof inputSchema>;
    runtimeContext?: RuntimeContext<MyRuntimeContext>;
  }) => {
    // Implementation
  }
});
```

### Required Imports

- `createTool, ToolExecutionContext` from `@mastra/core/tools`
- `RuntimeContext` from `@mastra/core/di`
- `z` from `zod` for schema validation
- `generateId` from `ai` for unique request IDs
- `PinoLogger` from `@mastra/loggers` for structured logging

### Schema Validation

All tools must define strict Zod schemas with comprehensive validation:

```typescript
const inputSchema = z.object({
  requiredField: z.string()
    .min(1, 'Field cannot be empty')
    .max(1000, 'Field too long')
    .describe('Description of the field'),
  optionalField: z.boolean()
    .optional()
    .default(false)
    .describe('Optional field description'),
}).strict();

const outputSchema = z.object({
  success: z.boolean(),
  result: z.string(),
  requestId: z.string(),
  executionTime: z.number(),
}).strict();
```

## Runtime Context Pattern

### Context Type Definition

Define runtime context types for configuration:

```typescript
export type MyRuntimeContext = {
  'user-id'?: string;
  'session-id'?: string;
  'debug'?: boolean;
  'timeout'?: number;
  'custom-setting'?: string;
};
```

### Context Instance Creation

Create and configure runtime context instances:

```typescript
export const myRuntimeContext = new RuntimeContext<MyRuntimeContext>();
myRuntimeContext.set('debug', false);
myRuntimeContext.set('timeout', 5000);
myRuntimeContext.set('custom-setting', 'default-value');
```

### Context Usage in Tools

Access runtime context within tool execution:

```typescript
execute: async ({ input, runtimeContext }) => {
  const userId = (runtimeContext?.get('user-id') as string) || 'anonymous';
  const sessionId = (runtimeContext?.get('session-id') as string) || 'default';
  const debug = Boolean(runtimeContext?.get('debug'));
  const timeout = (runtimeContext?.get('timeout') as number) || 5000;

  // Use context values in implementation
}
```

## TSDoc Documentation Standards

### Tool Documentation

Use comprehensive TSDoc comments with @mastra tags:

```typescript
/**
 * @mastra Tool for [specific functionality]
 *
 * Detailed description of what the tool does, its capabilities,
 * and integration patterns with other tools or systems.
 *
 * @param input - Validated input matching inputSchema
 * @param runtimeContext - Runtime configuration context
 * @returns Promise resolving to tool execution results
 *
 * @example
 * ```typescript
 * const result = await myTool.execute({
 *   input: {
 *     requiredField: 'value',
 *     optionalField: true
 *   },
 *   runtimeContext
 * });
 * ```
 *
 * @see {@link RelatedTool} for related functionality
 * @link https://docs.mastra.ai/tools
 * @mastra Custom tool implementation
 */
```

### Function Documentation

Document helper functions with proper TSDoc:

```typescript
/**
 * Helper function description
 *
 * @param param1 - Description of parameter
 * @param param2 - Description of parameter
 * @returns Description of return value
 * @throws {ErrorType} When specific error conditions occur
 */
async function helperFunction(param1: string, param2: number): Promise<string> {
  // Implementation
}
```

## Error Handling Patterns

### Structured Error Handling

Use try-catch blocks with structured logging:

```typescript
execute: async ({ input, runtimeContext }) => {
  const requestId = generateId();
  const startTime = Date.now();

  try {
    // Tool implementation

    logger.info('Tool execution successful', {
      requestId,
      executionTime: Date.now() - startTime,
      userId: runtimeContext?.get('user-id')
    });

    return {
      success: true,
      result: 'Tool result',
      requestId,
      executionTime: Date.now() - startTime
    };
  } catch (error) {
    logger.error('Tool execution failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      input: JSON.stringify(input)
    });

    return {
      success: false,
      result: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      requestId,
      executionTime: Date.now() - startTime
    };
  }
}
```

### Error Response Format

Maintain consistent error response structure:

```typescript
// Success response
{
  success: true,
  result: 'Actual result data',
  requestId: 'unique-id',
  executionTime: 1234
}

// Error response
{
  success: false,
  result: 'Error description',
  requestId: 'unique-id',
  executionTime: 1234
}
```

## Advanced Patterns

### Shared Isolate Integration

For tools requiring isolated execution environments:

```typescript
import { SharedIsolateManager } from './shared-isolate-manager';

// In tool execution
const useSharedIsolate = Boolean(input.useSharedIsolate);
const sessionId = (runtimeContext?.get('session-id') as string) || 'default';

if (useSharedIsolate) {
  const manager = SharedIsolateManager.getInstance();
  const result = await manager.executeInSharedIsolate(sessionId, code, {
    timeout: timeout + 5000,
    type: 'code'
  });
}
```

### MCP Tool Integration

For tools that integrate with Model Context Protocol:

```typescript
import { executeTracedMCPTool } from './mcp';

// Use MCP tools within Mastra tools
const mcpResult = await executeTracedMCPTool('filesystem', 'read_file', {
  path: filePath
});
```

### Multi-Tool Suites

Organize related tools in single files:

```typescript
// Export multiple related tools from one file
export const primaryTool = createTool({ /* ... */ });
export const secondaryTool = createTool({ /* ... */ });
export const helperTool = createTool({ /* ... */ });

// Export runtime contexts
export const toolSuiteRuntimeContext = new RuntimeContext<SuiteRuntimeContext>();
```

### Abort Signal Support

Implement cancellation support for long-running operations:

```typescript
export const longRunningTool = createTool({
  id: 'long-computation',
  description: 'Performs a potentially long computation with abort support',
  inputSchema: z.object({
    iterations: z.number().default(1000000)
  }),
  execute: async ({ input }, { abortSignal }) => {
    // Forward signal to fetch requests
    const response = await fetch('https://api.example.com/data', {
      signal: abortSignal
    });

    // Check abort signal during loops
    for (let i = 0; i < input.iterations; i++) {
      if (abortSignal?.aborted) {
        logger.info('Tool execution aborted during loop');
        throw new Error('Operation aborted');
      }
      // Perform computation step
    }

    return { result: 'Computation completed' };
  }
});
```

### AI SDK Tool Compatibility

Mastra supports Vercel AI SDK tool format for compatibility:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

// AI SDK format tool
export const vercelWeatherTool = tool({
  description: 'Fetches current weather using Vercel AI SDK format',
  parameters: z.object({
    city: z.string().describe('The city to get weather for')
  }),
  execute: async ({ city }) => {
    const data = await fetch(`https://api.example.com/weather?city=${city}`);
    return data.json();
  }
});

// Use alongside Mastra tools in agents
export const mixedToolsAgent = new Agent({
  name: 'Mixed Tools Agent',
  tools: {
    weatherVercel: vercelWeatherTool,  // AI SDK tool
    mastraWeather: mastraWeatherTool   // Mastra tool
  }
});
```

## File Organization

### Tool File Structure

```txt
src/mastra/tools/
├── index.ts                    # Export all tools and types
├── chunker-tool.ts            # Document processing tools
├── code-execution-tool.ts     # Code execution suite (4 tools)
├── file-manager-tools.ts      # File operations suite (3 tools)
├── git-tool.ts               # Git operations tool
├── web-browser-tools.ts      # Web scraping suite (6 tools)
├── mcp.ts                    # MCP integration utilities
└── [domain]-tool.ts          # Domain-specific tools
```

### Index File Pattern

Export all tools and types from index.ts:

```typescript
// Export all tools
export * from './chunker-tool';
export * from './code-execution-tool';
export * from './file-manager-tools';

// Export all runtime context types
export type { ChunkerToolRuntimeContext } from './chunker-tool';
export type { CodeExecutionRuntimeContext } from './code-execution-tool';
export type { FileManagerRuntimeContext } from './file-manager-tools';
```

## Integration Patterns

### Agent Integration

Tools are integrated into agents via the master agent:

```typescript
// In master-agent.ts
import {
  codeExecutionTool,
  fileOperationTool,
  gitTool
} from '@/mastra/tools';

export const masterAgent = new Agent({
  tools: {
    codeExecutionTool,
    fileOperationTool,
    gitTool,
    // MCP tools by server
    ...await getMCPToolsByServer('filesystem'),
    ...await getMCPToolsByServer('git'),
  }
});
```

### CopilotKit Integration

Tools can be exposed through CopilotKit actions:

```typescript
// In Actions.tsx
useCopilotAction({
  name: 'executeCode',
  description: 'Execute code using Mastra code execution tool',
  parameters: {
    code: { type: 'string', description: 'Code to execute' },
    language: { type: 'string', description: 'Programming language' }
  },
  handler: async ({ code, language }) => {
    const { codeExecutionTool } = await import('@/mastra/tools');
    return await codeExecutionTool.execute({
      input: { code, language }
    });
  }
});
```

## Quality Standards

### Type Safety

- Never use `any` type - use proper TypeScript interfaces
- Use strict Zod schemas with comprehensive validation
- Implement proper type guards for runtime validation

### Performance

- Use request IDs for tracing and debugging
- Implement proper timeout handling
- Log execution times for performance monitoring

### Security

- Validate all inputs with Zod schemas
- Sanitize file paths and user inputs
- Use isolated execution environments when needed
- Implement proper error boundaries

### Testing

- Write unit tests for all tools
- Test error conditions and edge cases
- Validate schema compliance
- Test runtime context behavior

This comprehensive guide ensures consistent, high-quality tool development within the Mastra framework while maintaining security, performance, and maintainability standards.

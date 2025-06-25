---
applyTo: "src/mastra/workflows/*.ts"
description: "Mastra AI Framework Guidelines for the Dean Machines RSC Project"
---
# Mastra Workflows Complete Guide

*Based on official Mastra documentation (v1.0+)*

## 🎯 **Overview**

Mastra workflows enable you to create state machines for complex sequences of operations with conditional branching, loops, parallel execution, and data validation. This guide provides comprehensive instructions for building production-ready workflows in the Dean Machines RSC project.

## 📋 **Quick Reference**

### Core Workflow Methods
- `createWorkflow()` - Initialize a workflow with schemas and steps
- `createStep()` - Define individual workflow steps
- `.then()` - Sequential step execution
- `.parallel()` - Concurrent step execution
- `.branch()` - Conditional branching
- `.map()` - Data transformation between steps
- `.commit()` - Finalize workflow configuration
- `.createRun()` - Create workflow execution instance
- `.start()` - Execute workflow with input data

### Control Flow Methods
- `.dowhile()` - Execute while condition is true
- `.dountil()` - Execute until condition becomes true
- `.foreach()` - Iterate over arrays with optional concurrency
- `.execute()` - Direct step execution
- `.resume()` - Resume suspended workflows

## 🏗️ **Basic Workflow Structure**

### 1. Import Required Dependencies

```typescript
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { RuntimeContext } from '@mastra/core/di';
```

### 2. Define Steps

```typescript
const step1 = createStep({
  id: 'step-1',
  description: 'Process input data',
  inputSchema: z.object({
    value: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ inputData, mastra, runtimeContext }) => {
    // Step logic here
    return {
      result: `Processed: ${inputData.value}`,
    };
  },
});
```

### 3. Create and Configure Workflow

```typescript
export const myWorkflow = createWorkflow({
  id: 'my-workflow',
  description: 'Example workflow demonstrating core patterns',
  inputSchema: z.object({
    initialValue: z.string(),
  }),
  outputSchema: z.object({
    finalResult: z.string(),
  }),
  steps: [step1], // Declare all steps used
})
  .then(step1)
  .commit();
```

### 4. Register with Mastra

```typescript
// In src/mastra/index.ts
export const mastra = new Mastra({
  workflows: {
    myWorkflow,
  },
});
```

## 🔧 **Advanced Step Configuration**

### Complete Step Definition

```typescript
const advancedStep = createStep({
  id: 'advanced-step',
  description: 'Advanced step with all options',
  inputSchema: z.object({
    data: z.string(),
    options: z.object({
      flag: z.boolean(),
    }),
  }),
  outputSchema: z.object({
    processed: z.string(),
    metadata: z.object({
      timestamp: z.string(),
    }),
  }),
  resumeSchema: z.object({
    resumePoint: z.string(),
  }),
  suspendSchema: z.object({
    suspendReason: z.string(),
  }),
  execute: async ({
    inputData,
    resumeData,
    mastra,
    getStepResult,
    getInitData,
    suspend,
    runtimeContext,
    runId,
  }) => {
    // Access previous step results
    const previousResult = getStepResult(step1);
    
    // Access initial workflow input
    const initData = getInitData();
    
    // Access runtime context
    const contextValue = runtimeContext?.get('contextKey');
    
    // Conditional suspension
    if (inputData.options.flag) {
      await suspend();
      return; // Will resume with resumeData later
    }
    
    return {
      processed: `Advanced processing of ${inputData.data}`,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  },
});
```

## 🔀 **Control Flow Patterns**

### Sequential Execution

```typescript
export const sequentialWorkflow = createWorkflow({
  id: 'sequential-workflow',
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ output: z.string() }),
  steps: [step1, step2, step3],
})
  .then(step1)
  .then(step2)
  .then(step3)
  .commit();
```

### Parallel Execution

```typescript
export const parallelWorkflow = createWorkflow({
  id: 'parallel-workflow',
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ results: z.array(z.string()) }),
  steps: [step1, step2, step3],
})
  .parallel([step1, step2, step3])
  .commit();
```

### Conditional Branching

```typescript
export const branchingWorkflow = createWorkflow({
  id: 'branching-workflow',
  inputSchema: z.object({ condition: z.boolean() }),
  outputSchema: z.object({ result: z.string() }),
  steps: [step1, step2],
})
  .branch([
    [async ({ inputData }) => inputData.condition === true, step1],
    [async ({ inputData }) => inputData.condition === false, step2],
  ])
  .commit();
```

### Loop Patterns

#### Do-While Loop
```typescript
export const doWhileWorkflow = createWorkflow({
  id: 'do-while-workflow',
  inputSchema: z.object({ counter: z.number() }),
  outputSchema: z.object({ finalCount: z.number() }),
  steps: [incrementStep],
})
  .dowhile(incrementStep, async ({ inputData }) => inputData.counter < 10)
  .commit();
```

#### Do-Until Loop
```typescript
export const doUntilWorkflow = createWorkflow({
  id: 'do-until-workflow',
  inputSchema: z.object({ counter: z.number() }),
  outputSchema: z.object({ finalCount: z.number() }),
  steps: [incrementStep],
})
  .dountil(incrementStep, async ({ inputData }) => inputData.counter >= 10)
  .commit();
```

#### For-Each Loop
```typescript
export const forEachWorkflow = createWorkflow({
  id: 'for-each-workflow',
  inputSchema: z.object({ items: z.array(z.string()) }),
  outputSchema: z.object({ results: z.array(z.string()) }),
  steps: [processItemStep],
})
  .foreach(processItemStep, { concurrency: 3 }) // Process 3 items in parallel
  .commit();
```

## 🗺️ **Data Mapping Between Steps**

### Basic Data Transformation

```typescript
export const mappingWorkflow = createWorkflow({
  id: 'mapping-workflow',
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ output: z.string() }),
  steps: [step1, step2],
})
  .then(step1)
  .map(({ inputData }) => {
    // Transform data between steps
    return {
      transformedValue: inputData.result.toUpperCase(),
    };
  })
  .then(step2)
  .commit();
```

### Advanced Data Access

```typescript
export const advancedMappingWorkflow = createWorkflow({
  id: 'advanced-mapping-workflow',
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ output: z.string() }),
  steps: [step1, step2, step3],
})
  .then(step1)
  .then(step2)
  .map(({ inputData, getStepResult, getInitData }) => {
    // Access specific step results
    const step1Result = getStepResult(step1);
    
    // Access initial workflow input
    const initData = getInitData();
    
    // Combine data from multiple sources
    return {
      combinedData: `${initData.input} + ${step1Result.value} + ${inputData.current}`,
    };
  })
  .then(step3)
  .commit();
```

### Output Renaming

```typescript
export const renamingWorkflow = createWorkflow({
  id: 'renaming-workflow',
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ renamedOutput: z.string() }),
  steps: [step1],
})
  .then(step1)
  .map({
    renamedOutput: {
      step: step1,
      path: 'originalOutput',
    },
  })
  .commit();
```

## 🤖 **Using Agents and Tools in Workflows**

### Agents as Steps

```typescript
import { testAgent } from '../agents/test-agent';

// Direct agent as step
const agentStep = createStep(testAgent);

// Agent with custom execution
const customAgentStep = createStep({
  id: 'custom-agent-step',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: z.object({ response: z.string() }),
  execute: async ({ inputData }) => {
    const { text } = await testAgent.generate([
      { role: 'user', content: inputData.prompt },
    ]);
    
    return { response: text };
  },
});

export const agentWorkflow = createWorkflow({
  id: 'agent-workflow',
  inputSchema: z.object({ userInput: z.string() }),
  outputSchema: z.object({ agentResponse: z.string() }),
  steps: [agentStep],
})
  .map(({ inputData }) => ({
    prompt: `Process this: ${inputData.userInput}`,
  }))
  .then(agentStep)
  .commit();
```

### Tools as Steps

```typescript
import { testTool } from '../tools/test-tool';

// Direct tool as step
const toolStep = createStep(testTool);

// Tool with custom execution
const customToolStep = createStep({
  id: 'custom-tool-step',
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ output: z.string() }),
  execute: async ({ inputData, runtimeContext }) => {
    const result = await testTool.execute({
      context: { input: inputData.input },
      runtimeContext,
    });
    
    return { output: result.country_name };
  },
});

export const toolWorkflow = createWorkflow({
  id: 'tool-workflow',
  inputSchema: z.object({ city: z.string() }),
  outputSchema: z.object({ country: z.string() }),
  steps: [toolStep],
})
  .then(toolStep)
  .commit();
```

### Workflows as Tools

```typescript
// Use workflow within another workflow
const workflowAsTool = createStep({
  id: 'workflow-as-tool',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData, mastra }) => {
    const workflow = mastra?.getWorkflow('target-workflow');
    const run = workflow?.createRun();
    
    const { result } = await run?.start({
      inputData: { value: inputData.data },
    });
    
    return { result: result.output };
  },
});
```

## 🔄 **Workflow Execution and Management**

### Running Workflows

```typescript
// Create and execute workflow run
const run = myWorkflow.createRun();

const result = await run.start({
  inputData: {
    initialValue: 'test data',
  },
  runtimeContext: new RuntimeContext(), // Optional
});

console.log(result.result); // Final workflow output
console.log(result.status); // 'success', 'failed', or 'suspended'
```

### Workflow Suspension and Resumption

```typescript
// Workflow that can be suspended
const suspendableStep = createStep({
  id: 'suspendable-step',
  inputSchema: z.object({ shouldSuspend: z.boolean() }),
  outputSchema: z.object({ result: z.string() }),
  suspendSchema: z.object({ reason: z.string() }),
  resumeSchema: z.object({ resumeData: z.string() }),
  execute: async ({ inputData, resumeData, suspend }) => {
    if (resumeData) {
      // Resuming from suspension
      return { result: `Resumed with: ${resumeData.resumeData}` };
    }
    
    if (inputData.shouldSuspend) {
      // Suspend workflow execution
      await suspend();
      return;
    }
    
    return { result: 'Completed without suspension' };
  },
});

// Resume suspended workflow
const suspendedRun = myWorkflow.createRun('existing-run-id');
const result = await suspendedRun.resume({
  resumeData: { resumeData: 'continuation data' },
});
```

### Error Handling

```typescript
const errorHandlingStep = createStep({
  id: 'error-handling-step',
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    try {
      // Potentially failing operation
      const result = await riskyOperation(inputData.input);
      return { result };
    } catch (error) {
      // Handle errors gracefully
      return { result: `Error handled: ${error.message}` };
    }
  },
});
```

## 🌐 **Inngest Integration (Experimental)**

### Setting Up Inngest Workflows

```typescript
// src/mastra/inngest/index.ts
import { Inngest } from 'inngest';
import { realtimeMiddleware } from '@inngest/realtime';

export const inngest = new Inngest({
  id: 'mastra',
  baseUrl: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8288' 
    : undefined,
  isDev: process.env.NODE_ENV === 'development',
  middleware: [realtimeMiddleware()],
});
```

### Creating Inngest-Compatible Workflows

```typescript
import { init } from '@mastra/inngest';
import { inngest } from '../inngest';

const { createWorkflow, createStep } = init(inngest);

const inngestStep = createStep({
  id: 'inngest-step',
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.object({ value: z.number() }),
  execute: async ({ inputData }) => {
    return { value: inputData.value + 1 };
  },
});

export const inngestWorkflow = createWorkflow({
  id: 'inngest-workflow',
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.object({ value: z.number() }),
})
  .dountil(inngestStep, async ({ inputData }) => inputData.value >= 10)
  .commit();
```

### Mastra Instance Configuration for Inngest

```typescript
// src/mastra/index.ts
import { Mastra } from '@mastra/core/mastra';
import { serve as inngestServe } from '@mastra/inngest';
import { inngestWorkflow } from './workflows';
import { inngest } from './inngest';

export const mastra = new Mastra({
  workflows: {
    inngestWorkflow,
  },
  server: {
    host: '0.0.0.0',
    apiRoutes: [
      {
        path: '/api/inngest',
        method: 'ALL',
        createHandler: async ({ mastra }) => inngestServe({ mastra, inngest }),
      },
    ],
  },
});
```

## 🧪 **MCP Server Integration**

### Exposing Workflows as MCP Tools

```typescript
import { MCPServer } from '@mastra/mcp';
import { myWorkflow } from './workflows';

const server = new MCPServer({
  name: 'workflow-mcp-server',
  version: '1.0.0',
  workflows: {
    myWorkflow, // Automatically exposed as 'run_myWorkflow' tool
  },
});

await server.startStdio();
```

### Using MCP Client to Test Workflows

```typescript
import { MCPClient } from '@mastra/mcp';

const mcp = new MCPClient({
  servers: {
    local: {
      command: 'npx',
      args: ['tsx', 'src/workflow-mcp-server.ts'],
    },
  },
});

// List available workflow tools
const tools = await mcp.getTools();
console.log(tools); // Will show 'run_myWorkflow'

// Execute workflow via MCP
const result = await mcp.callTool('run_myWorkflow', {
  inputData: { initialValue: 'test' },
});
```

## ✅ **Best Practices**

### 1. Schema Design
```typescript
// ✅ Good: Comprehensive schemas
const step = createStep({
  id: 'well-defined-step',
  inputSchema: z.object({
    required: z.string(),
    optional: z.string().optional(),
    validated: z.string().email(),
  }),
  outputSchema: z.object({
    result: z.string(),
    metadata: z.object({
      timestamp: z.string(),
      processingTime: z.number(),
    }),
  }),
  // ...
});

// ❌ Avoid: Loose schemas
const badStep = createStep({
  inputSchema: z.any(),
  outputSchema: z.any(),
  // ...
});
```

### 2. Error Handling
```typescript
// ✅ Good: Explicit error handling
const robustStep = createStep({
  id: 'robust-step',
  execute: async ({ inputData }) => {
    try {
      const result = await externalService.call(inputData);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
```

### 3. Resource Management
```typescript
// ✅ Good: Proper resource cleanup
const resourceStep = createStep({
  id: 'resource-step',
  execute: async ({ inputData }) => {
    const connection = await createConnection();
    try {
      const result = await connection.process(inputData);
      return result;
    } finally {
      await connection.close();
    }
  },
});
```

### 4. Runtime Context Usage
```typescript
// ✅ Good: Leveraging runtime context
const contextAwareStep = createStep({
  id: 'context-aware-step',
  execute: async ({ inputData, runtimeContext }) => {
    const userId = runtimeContext?.get('userId');
    const permissions = runtimeContext?.get('permissions');
    
    if (!userId || !permissions.includes('read')) {
      throw new Error('Unauthorized');
    }
    
    return await processForUser(inputData, userId);
  },
});
```

## 🔍 **Debugging and Monitoring**

### Workflow Status Monitoring

```typescript
// Monitor workflow execution
const run = myWorkflow.createRun();

// Subscribe to workflow events (if using streaming)
run.stream().subscribe({
  next: (event) => {
    console.log('Workflow event:', event);
  },
  error: (error) => {
    console.error('Workflow error:', error);
  },
  complete: () => {
    console.log('Workflow completed');
  },
});

const result = await run.start({ inputData: { value: 'test' } });

// Check final status
switch (result.status) {
  case 'success':
    console.log('Workflow completed successfully:', result.result);
    break;
  case 'failed':
    console.error('Workflow failed:', result.error);
    break;
  case 'suspended':
    console.log('Workflow suspended, can be resumed later');
    break;
}
```

### Step-level Debugging

```typescript
const debugStep = createStep({
  id: 'debug-step',
  execute: async ({ inputData, runId, mastra }) => {
    console.log(`[${runId}] Processing step with input:`, inputData);
    
    const startTime = Date.now();
    const result = await processData(inputData);
    const endTime = Date.now();
    
    console.log(`[${runId}] Step completed in ${endTime - startTime}ms`);
    
    return result;
  },
});
```

## 📚 **Project Integration Examples**

### Dean Machines RSC Integration

```typescript
// Example workflow using project's agents and tools
import { masterAgent } from '../agents/master-agent';
import { graphRAGTool } from '../tools/graphRAG';
import { vectorQueryTool } from '../tools/vectorQueryTool';

const researchStep = createStep(masterAgent);
const graphStep = createStep(graphRAGTool);
const queryStep = createStep(vectorQueryTool);

export const researchWorkflow = createWorkflow({
  id: 'research-workflow',
  description: 'Multi-agent research with graph and vector analysis',
  inputSchema: z.object({
    query: z.string(),
    options: z.object({
      includeVector: z.boolean().default(true),
      includeGraph: z.boolean().default(true),
    }),
  }),
  outputSchema: z.object({
    summary: z.string(),
    vectorResults: z.array(z.any()).optional(),
    graphResults: z.any().optional(),
  }),
  steps: [researchStep, graphStep, queryStep],
})
  .then(researchStep)
  .parallel([
    // Conditional parallel execution
    ...(options => options.includeVector ? [queryStep] : []),
    ...(options => options.includeGraph ? [graphStep] : []),
  ])
  .map(({ inputData, getStepResult }) => {
    const research = getStepResult(researchStep);
    const vectorResults = inputData.options.includeVector 
      ? getStepResult(queryStep) 
      : undefined;
    const graphResults = inputData.options.includeGraph 
      ? getStepResult(graphStep) 
      : undefined;
    
    return {
      summary: `Research: ${research.output}`,
      vectorResults,
      graphResults,
    };
  })
  .commit();
```

### CopilotKit Integration

```typescript
// Export workflow for CopilotKit API route
export { researchWorkflow } from './workflows/research-workflow';

// In API route (app/api/copilotkit/route.ts)
import { researchWorkflow } from '@/mastra/workflows';

// Workflow accessible via CopilotKit actions
```

## 🚀 **Advanced Patterns**

### Dynamic Workflow Construction

```typescript
export function createDynamicWorkflow(steps: string[]) {
  const stepMap = {
    'process': processStep,
    'analyze': analyzeStep,
    'transform': transformStep,
  };
  
  let workflow = createWorkflow({
    id: 'dynamic-workflow',
    inputSchema: z.object({ data: z.any() }),
    outputSchema: z.object({ result: z.any() }),
    steps: steps.map(name => stepMap[name]).filter(Boolean),
  });
  
  // Chain steps dynamically
  for (const stepName of steps) {
    const step = stepMap[stepName];
    if (step) {
      workflow = workflow.then(step);
    }
  }
  
  return workflow.commit();
}
```

### Workflow Composition

```typescript
// Compose larger workflows from smaller ones
export const compositeWorkflow = createWorkflow({
  id: 'composite-workflow',
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  steps: [subWorkflowStep],
})
  .then(subWorkflowStep)
  .commit();

const subWorkflowStep = createStep({
  id: 'sub-workflow-step',
  execute: async ({ inputData, mastra }) => {
    // Execute sub-workflow
    const subWorkflow = mastra?.getWorkflow('sub-workflow');
    const run = subWorkflow?.createRun();
    const result = await run?.start({ inputData });
    
    return { processed: result.result };
  },
});
```

### Logger for Optimizing

```ts
// Performance monitoring example
const performanceStep = createStep({
  execute: async ({ inputData }) => {
    const startTime = performance.now();
    const result = await processData(inputData);
    const endTime = performance.now();
    
    logger.info('Step performance', {
      stepId: 'performance-step',
      duration: endTime - startTime,
      inputSize: JSON.stringify(inputData).length
    });
    
    return result;
  }
});

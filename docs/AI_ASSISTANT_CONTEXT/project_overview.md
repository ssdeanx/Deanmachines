# Project Overview - DeanMachines-RSC

## Project Identity
- **Name**: DeanMachines-RSC
- **Type**: Advanced AI-powered multi-agent platform
- **Version**: 0.2.0
- **Architecture**: Next.js 15 + React 19 frontend with Mastra AI backend
- **Primary Purpose**: Intelligent code analysis, automation, and workflow orchestration

## Technical Stack

### Frontend (`/src/app`)
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **AI Integration**: CopilotKit for real-time AI interactions
- **Components**: shadcn/ui component library

### Backend (`/src/mastra`)
- **Framework**: Mastra AI Framework
- **Language**: TypeScript
- **Storage**: Upstash Redis + Vector
- **Logging**: Dual system (PinoLogger + Upstash)
- **Observability**: Langfuse + OpenTelemetry
- **Model Provider**: Google AI (Gemini 2.5)

## Core Architecture

### Agent Ecosystem (22+ Specialized Agents)
```
Core Agents:
├── Master Agent (Central orchestrator)
├── Strategizer Agent (Strategic planning)
├── Analyzer Agent (Data analysis)
├── Evolve Agent (Agent improvement)
└── Supervisor Agent (Quality assurance)

Development Agents:
├── Code Agent (Analysis & generation)
├── Git Agent (Version control)
├── Docker Agent (Containerization)
├── Debug Agent (Troubleshooting)
└── Documentation Agent (Technical writing)

Data & Analysis:
├── Data Agent (Processing & analysis)
├── Graph Agent (Knowledge graphs)
├── Processing Agent (Workflow automation)
├── Research Agent (Information gathering)
└── Weather Agent (Forecasting)

Management:
├── Manager Agent (Project coordination)
├── Marketing Agent (Content creation)
└── Supervisor Agent (Coordination)

Operations:
├── Sysadmin Agent (System operations)
├── Browser Agent (Web automation)
└── Utility Agent (General utilities)

Creative:
├── Design Agent (UI/UX creation)
└── Special Agent (Multi-domain expert)
```

### Tool Ecosystem (67+ Tools)
- **Agentic Tools**: Arxiv, Reddit, Wikipedia, Brave Search, Exa, Diffbot
- **Development Tools**: Code execution, Git operations, File management
- **Data Tools**: Vector search, GraphRAG, Chunking, Reranking
- **Web Tools**: Browser automation, Web scraping
- **MCP Integration**: Model Context Protocol server

### Workflow System
- **Weather Workflow**: Information and forecasting
- **Research Analysis**: Comprehensive research with visualization
- **Code Graph Maker**: Basic and advanced code analysis
- **Full-Stack Development**: Complete application development

## Upstash Integration (Primary Focus)

### Storage Architecture
```
Upstash Redis (Memory & Sessions)
├── Agent conversations and context
├── User sessions and threads
├── Cross-agent memory sharing
└── Distributed logging aggregation

Upstash Vector (Semantic Search)
├── 384-dimension fastembed embeddings
├── Cosine similarity search
├── Metadata filtering (MongoDB-style)
└── Knowledge graph integration
```

### Environment Configuration
```bash
# Core Upstash Services
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
UPSTASH_VECTOR_REST_URL=
UPSTASH_VECTOR_REST_TOKEN=

# Logging Configuration
UPSTASH_LOG_LIST_NAME=mastra-application-logs
UPSTASH_MAX_LIST_LENGTH=10000
UPSTASH_BATCH_SIZE=100
UPSTASH_FLUSH_INTERVAL=10000
```

## Key Features

### Multi-Agent Coordination
- **Dynamic Routing**: LLM-based agent selection
- **Shared Memory**: Cross-agent context and learning
- **Network Orchestration**: Dean Machines Network for complex tasks
- **Real-time Collaboration**: Multiple agents working together

### Advanced Memory Management
- **Attention-Guided Processing**: Intelligent conversation pruning
- **Contextual Relevance**: Topic continuity analysis
- **Semantic Recall**: Vector-powered memory retrieval
- **Working Memory**: Persistent user information

### Developer Experience
- **Playground Environment**: Interactive agent interfaces
- **CopilotKit Integration**: AI-powered UI components
- **Real-time Chat**: Dynamic endpoint switching
- **Code Generation**: AI-assisted development

## Current Status
- **Phase**: Analysis and optimization
- **Focus**: Upstash integration deep dive
- **Goals**: Understanding architecture, improving performance
- **Documentation**: Building comprehensive knowledge base

## Deployment Targets
- **Development**: Local with hot reload
- **Staging**: Vercel preview deployments
- **Production**: Vercel with global edge distribution
- **MCP Server**: Standalone server for external integrations

---
*This overview provides context for understanding the project scope and architecture*
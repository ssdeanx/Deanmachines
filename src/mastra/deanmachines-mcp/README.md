# Dean Machines MCP Server

Welcome to the **Dean Machines MCP Server**, a comprehensive integration of the Mastra AI Framework with the Model Context Protocol (MCP). This server exposes the full capabilities of the Dean Machines AI ecosystem to external MCP clients such as Cursor, Windsurf, or Claude Desktop, enabling seamless interaction with over 20 specialized agents, advanced tools, and intelligent workflows.

## Overview

Dean Machines MCP Server is built on the Mastra framework (v0.10.5) and provides a robust platform for AI-powered development. It allows external clients to connect and leverage the following features:

- **Agent Registry Exposure**: Access to 20+ specialized agents across various domains including development, data analysis, management, operations, and creative tasks.
- **Advanced Tool Ecosystem**: Direct exposure to a suite of powerful tools for tasks such as text chunking, knowledge graph operations, web scraping, and more.
- **Workflow Orchestration**: Execute complex multi-agent workflows for comprehensive task management.
- **Resource and Prompt Management**: Access project documentation, system status, and customizable prompt templates for interacting with agents and workflows.
- **Multiple Transport Protocols**: Supports stdio, SSE, and HTTP transports for flexible integration.
- **Observability**: Full integration with Mastra observability for logging and monitoring.

## Architecture

The architecture of the Dean Machines MCP Server is designed to facilitate easy access to its components through MCP:

- **Agents → MCP Tools**: Agents are exposed as tools using the `ask_<agentName>` pattern, allowing clients to interact with specific agents.
- **Workflows → MCP Tools**: Workflows are exposed as tools using the `run_<workflowName>` pattern for executing complex task sequences.
- **Native Tools → Direct Exposure**: Tools are directly accessible for specific operations.
- **Resources → Document and Data Access**: Provides access to system resources like documentation and configuration.
- **Prompts → Template Management**: Offers templates for common operations and interactions.

## Installation

To set up the Dean Machines MCP Server, follow these steps:

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/ssdeanx/deanmachines-rsc.git
   cd deanmachines-rsc
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the `.env.example` file to `.env` and update the necessary variables such as API keys and database URLs.

4. **Run the Server**:
   - For stdio transport:

     ```bash
     npm run start:stdio
     ```

   - For HTTP transport (adjust the script as needed):

     ```bash
     npm run start:http
     ```

## Usage

Once the server is running, MCP clients can connect to it and access the exposed tools, agents, and workflows. Below are some common usage patterns:

- **Interacting with Agents**:
  Use the `ask_<agentName>` tool to send queries to specific agents. For example, `ask_code` to interact with the code agent for development tasks.

- **Executing Workflows**:
  Use the `run_<workflowName>` tool to execute predefined workflows. For example, `run_fullStackDevelopmentWorkflow` for a complete development lifecycle.

- **Accessing Resources**:
  Retrieve system resources like documentation or status using URIs such as `deanmachines://docs/readme`.

- **Using Prompt Templates**:
  Leverage predefined prompts for structured interactions with agents or workflows, customizable with arguments.

## Available Agents

The Dean Machines MCP Server includes the following categories of agents:

- **Core**: `master`, `strategizer`, `analyzer`, `evolve`, `supervisor`
- **Development**: `code`, `git`, `docker`, `debug`
- **Data**: `data`, `graph`, `processing`, `research`, `weather`
- **Management**: `manager`, `marketing`
- **Operations**: `sysadmin`, `browser`, `utility`
- **Creative**: `design`, `documentation`
- **Specialized**: `special`, `react`, `langgraph`

## Available Tools

Some of the key tools exposed by the server include:

- **chunkerTool**: Text chunking and segmentation
- **graphRAGTool**: Knowledge graph RAG operations
- **hybridVectorSearchTool**: Hybrid vector search
- **rerankTool**: Search result reranking
- **stockPriceTool**: Stock price data retrieval
- **weatherTool**: Weather data and forecasting
- **webScraperTool**: Web scraping and extraction

## Available Workflows

Key workflows for complex task orchestration:

- **weatherWorkflow**: Weather information processing and analysis
- **codeGraphMakerWorkflow**: Basic code analysis and graph generation
- **advancedCodeGraphMakerWorkflow**: Advanced code analysis with comprehensive graph generation
- **fullStackDevelopmentWorkflow**: Complete full-stack development lifecycle
- **researchAnalysisWorkflow**: Comprehensive research and analysis workflow

## Contributing

Contributions to the Dean Machines MCP Server are welcome. Please follow the standard pull request process:

1. Fork the repository.
2. Create a branch for your feature or bug fix.
3. Commit your changes with descriptive messages.
4. Push your branch to your fork.
5. Submit a pull request to the main repository.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For support or inquiries, please reach out via the GitHub issues page or contact the maintainers directly.

---

*Dean Machines AI Ecosystem - Empowering development with AI*

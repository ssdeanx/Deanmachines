This is the [assistant-ui](https://github.com/Yonom/assistant-ui) starter project.

## Getting Started

First, add your OpenAI API key to `.env.local` file:

```
GOOGLE_GENERATIVE_AI_API_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

```mermaid
graph TD

    1727["User<br>External Actor"]
    subgraph 1725["External Systems"]
        1737["LLM APIs<br>Vertex AI, OpenAI, etc."]
        1738["Weather APIs<br>OpenWeatherMap, AccuWeather, etc."]
        1739["Financial Data APIs<br>Alpha Vantage, IEX Cloud, etc."]
        1740["Knowledge Graph Services<br>Neo4j, Custom RAG tech, etc."]
        1741["Vector Databases<br>LibSQL/SQLite, FAISS, etc."]
        1742["MCP Services<br>Proprietary/Internal"]
    end
    subgraph 1726["Dean Machines Application<br>Next.js, React, TS"]
        1728["Main Page<br>Next.js Page"]
        1729["Root Layout<br>Next.js Layout"]
        1730["Assistant UI Orchestrator<br>React Component"]
        1731["Chat API Endpoint<br>Next.js API Route"]
        1732["Mastra Library Facade<br>TypeScript Module"]
        1733["Master Agent Logic<br>TypeScript Module"]
        1734["Agent Memory &amp; Storage<br>TypeScript, SQLite"]
        1735["Agent Tools<br>TypeScript"]
        1736["Application Components<br>React, Shadcn UI"]
        %% Edges at this level (grouped by source)
        1729["Root Layout<br>Next.js Layout"] -->|renders| 1728["Main Page<br>Next.js Page"]
        1728["Main Page<br>Next.js Page"] -->|displays| 1730["Assistant UI Orchestrator<br>React Component"]
        1730["Assistant UI Orchestrator<br>React Component"] -->|requests data via| 1731["Chat API Endpoint<br>Next.js API Route"]
        1730["Assistant UI Orchestrator<br>React Component"] -->|uses| 1736["Application Components<br>React, Shadcn UI"]
        1731["Chat API Endpoint<br>Next.js API Route"] -->|delegates to| 1732["Mastra Library Facade<br>TypeScript Module"]
        1732["Mastra Library Facade<br>TypeScript Module"] -->|uses| 1733["Master Agent Logic<br>TypeScript Module"]
        1733["Master Agent Logic<br>TypeScript Module"] -->|uses| 1734["Agent Memory &amp; Storage<br>TypeScript, SQLite"]
        1733["Master Agent Logic<br>TypeScript Module"] -->|employs| 1735["Agent Tools<br>TypeScript"]
    end
    %% Edges at this level (grouped by source)
    1727["User<br>External Actor"] -->|interacts with| 1728["Main Page<br>Next.js Page"]
    1733["Master Agent Logic<br>TypeScript Module"] -->|calls| 1737["LLM APIs<br>Vertex AI, OpenAI, etc."]
    1735["Agent Tools<br>TypeScript"] -->|calls| 1738["Weather APIs<br>OpenWeatherMap, AccuWeather, etc."]
    1735["Agent Tools<br>TypeScript"] -->|calls| 1739["Financial Data APIs<br>Alpha Vantage, IEX Cloud, etc."]
    1735["Agent Tools<br>TypeScript"] -->|queries| 1740["Knowledge Graph Services<br>Neo4j, Custom RAG tech, etc."]
    1735["Agent Tools<br>TypeScript"] -->|queries| 1741["Vector Databases<br>LibSQL/SQLite, FAISS, etc."]
    1735["Agent Tools<br>TypeScript"] -->|interacts with| 1742["MCP Services<br>Proprietary/Internal"]
```
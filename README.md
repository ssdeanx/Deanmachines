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

    772["User<br>External Actor"]
    subgraph 761["External Systems"]
        770["AI Services<br>Google AI, etc."]
        771["Application Database<br>LibSQL (SQLite)"]
    end
    subgraph 762["Dean Machines Web App<br>Next.js, React, TypeScript"]
        763["Main Page &amp; Layout<br>Next.js Page, React"]
        764["Assistant UI Orchestrator<br>React Component"]
        765["Application GUI Components<br>React Components"]
        766["Base UI Library<br>React (Shadcn UI)"]
        767["Chat API Route<br>Next.js API Route"]
        768["Mastra Core Logic<br>TypeScript AI Library"]
        769["Common Utilities<br>TypeScript Helpers"]
        %% Edges at this level (grouped by source)
        763["Main Page &amp; Layout<br>Next.js Page, React"] -->|Renders| 764["Assistant UI Orchestrator<br>React Component"]
        764["Assistant UI Orchestrator<br>React Component"] -->|Uses| 765["Application GUI Components<br>React Components"]
        764["Assistant UI Orchestrator<br>React Component"] -->|Initiates calls via| 767["Chat API Route<br>Next.js API Route"]
        764["Assistant UI Orchestrator<br>React Component"] -->|Uses| 769["Common Utilities<br>TypeScript Helpers"]
        765["Application GUI Components<br>React Components"] -->|Uses| 766["Base UI Library<br>React (Shadcn UI)"]
        765["Application GUI Components<br>React Components"] -->|Uses| 769["Common Utilities<br>TypeScript Helpers"]
        767["Chat API Route<br>Next.js API Route"] -->|Delegates to| 768["Mastra Core Logic<br>TypeScript AI Library"]
    end
    %% Edges at this level (grouped by source)
    772["User<br>External Actor"] -->|Interacts with| 763["Main Page &amp; Layout<br>Next.js Page, React"]
    768["Mastra Core Logic<br>TypeScript AI Library"] -->|Calls| 770["AI Services<br>Google AI, etc."]
    768["Mastra Core Logic<br>TypeScript AI Library"] -->|Accesses| 771["Application Database<br>LibSQL (SQLite)"]
```
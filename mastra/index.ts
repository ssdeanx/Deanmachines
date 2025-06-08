import { Mastra } from "@mastra/core";
import { masterAgent } from "./agents/master-agent";
import { LangSmithExporter } from "@mastra/langsmith";

export const mastra = new Mastra({
    agents: { masterAgent },
    telemetry: {
        serviceName: process.env.LANGSMITH_PROJECT || "pr-warmhearted-jewellery-74",
        enabled: process.env.LANGSMITH_TRACING === "true",
        export: {
            type: "custom",
            exporter: new LangSmithExporter({
                apiKey: process.env.LANGSMITH_API_KEY!,
                baseUrl: process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com",
                projectName: process.env.LANGSMITH_PROJECT || "pr-warmhearted-jewellery-74",
            }),
        },
    },
});
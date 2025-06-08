import { Mastra } from "@mastra/core";
import { masterAgent } from "./agents/master-agent";
import { AISDKExporter } from "langsmith/vercel";
import { Client } from "langsmith";
import { PinoLogger } from "@mastra/loggers";

const logger = new PinoLogger({ name: 'mastra' , level: 'info' });

export const mastra = new Mastra({
    agents: { masterAgent },
    logger,
    telemetry: {
        serviceName: process.env.LANGSMITH_PROJECT || "pr-warmhearted-jewellery-74",
        enabled: process.env.LANGSMITH_TRACING === "true",
        export: {
            type: "custom",
            exporter: new AISDKExporter({
                client: new Client({
                    apiKey: process.env.LANGSMITH_API_KEY!,
                    apiUrl: process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com",
                }),
                projectName: process.env.LANGSMITH_PROJECT || "pr-warmhearted-jewellery-74",
            }),
        },
    },
});
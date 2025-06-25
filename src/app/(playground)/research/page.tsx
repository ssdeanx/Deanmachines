"use client";

import { CopilotKit } from "@copilotkit/react-core";
import Main from "./Main";
import {
    ModelSelectorProvider,
    useModelSelectorContext,
} from "@/lib/model-selector-provider";
import { ModelSelector } from "@/components/researchCanvas/ModelSelector";

export default function ModelSelectorWrapper() {
    return (
        <ModelSelectorProvider>
            <Home />
            <ModelSelector />
        </ModelSelectorProvider>
    );
}

function Home() {
    const { agent } = useModelSelectorContext();

    // This logic is implemented to demonstrate multi-agent frameworks in this demo project.
    // There are cleaner ways to handle this in a production environment.
    const runtimeUrl = `/api/copilotkit${agent.includes("mastra") ? "?coAgentsModel=mastra" : ""}`;

    return (
        <CopilotKit runtimeUrl={runtimeUrl} showDevConsole={false} agent={agent}>
            <Main />
        </CopilotKit>
    );
}

"use client";

import "@/app/globals.css";
import { ResearchCanvas } from "@/components/researchCanvas/ResearchCanvas";
import { useModelSelectorContext } from "@/lib/model-selector-provider";
import { AgentState } from "@/lib/types";
import { useCoAgent } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotChatSuggestions } from "@copilotkit/react-ui";

/**
 * Main research playground page for Mastra coagent research workflows.
 *
 * Uses global theme from globals.css and avoids inline CSS for variables.
 *
 * @returns {JSX.Element} The research helper main page
 * @example
 * <Main />
 * @see ResearchCanvas
 * @see useModelSelectorContext
 * @see useCoAgent
 * @see CopilotChat
 * [EDIT: 2025-06-13] [BY: GitHub Copilot]
 */
export default function Main() {
  const { model, agent } = useModelSelectorContext();
  const { state, setState } = useCoAgent<AgentState>({
    name: agent,
    initialState: {
      model,
      research_question: "",
      resources: [],
      report: "",
      logs: [],
    },
  });

  useCopilotChatSuggestions({
    instructions: "Lifespan of penguins",
  });

  return (
    <>
      <h1 className="flex h-[60px] bg-[#0E103D] text-white items-center px-10 text-2xl font-medium">
        Research Helper
      </h1>
      <div className="flex flex-1 border min-h-screen pt-[60px]">
        <div className="flex-1 overflow-hidden">
          <ResearchCanvas />
        </div>
        <div className="w-[500px] h-full flex-shrink-0 bg-background text-foreground">
          <CopilotChat
            className="h-full"
            onSubmitMessage={async (message) => {
              setState({
                ...state,
                logs: [],
                research_question: message
              });
              await new Promise((resolve) => setTimeout(resolve, 30));
            }}
            labels={{
              initial: "Hi! How can I assist you with your research today?",
            }}
          />
        </div>
      </div>
    </>
  );
}

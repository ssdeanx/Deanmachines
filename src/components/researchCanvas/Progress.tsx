import { cn } from "@/lib/utils";
import { CheckIcon, LoaderCircle } from "lucide-react";
import { truncateUrl } from "@/lib/utils";

export function Progress({
  logs,
  currentNode,
  agentStatus,
}: {
  logs: {
    message: string;
    done: boolean;
  }[];
  currentNode?: string;
  agentStatus?: "inProgress" | "complete";
}) {
  if (logs.length === 0) {
    return null;
  }

  return (
    <div data-test-id="progress-steps">
      {/* Agent Status Header */}
      {(agentStatus || currentNode) && (
        <div className="mb-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between text-xs">
            {agentStatus && (
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  agentStatus === "complete" ? "bg-green-500" : "bg-blue-500 animate-pulse"
                )} />
                <span className="font-medium text-slate-700">
                  {agentStatus === "complete" ? "Complete" : "Processing"}
                </span>
              </div>
            )}
            {currentNode && (
              <div className="text-slate-500">
                Current: <span className="font-medium">{currentNode}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border border-slate-200 bg-slate-100/30 shadow-md rounded-lg overflow-hidden text-sm py-2">
        {logs.map((log, index) => (
          <div
            key={index}
            data-test-id="progress-step-item"
            className={`flex ${log.done || index === logs.findIndex((log) => !log.done)
                ? ""
                : "opacity-50"
              }`}
          >
            <div className="w-8">
              <div
                className="w-4 h-4 bg-slate-700 flex items-center justify-center rounded-full mt-[10px] ml-[12px]"
                data-test-id={log.done ? 'progress-step-item_done' : 'progress-step-item_loading'}
              >
                {log.done ? (
                  <CheckIcon className="w-3 h-3 text-white" />
                ) : (
                  <LoaderCircle className="w-3 h-3 text-white animate-spin" />
                )}
              </div>
              {index < logs.length - 1 && (
                <div
                  className={cn("h-full w-[1px] bg-slate-200 ml-[20px]")}
                ></div>
              )}
            </div>
            <div className="flex-1 flex justify-center py-2 pl-2 pr-4">
              <div className="flex-1 flex items-center text-xs">
                {log.message.replace(
                  /https?:\/\/[^\s]+/g, // Regex to match URLs
                  (url) => truncateUrl(url) // Replace with truncated URL
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

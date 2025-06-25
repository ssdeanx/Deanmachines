"use client";

import { WindowProps, useChatContext } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

export function Window({ children }: WindowProps) {
  const { open, setOpen } = useChatContext();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full h-[80vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {children}
        </div>
      </div>
    </div>
  );
}

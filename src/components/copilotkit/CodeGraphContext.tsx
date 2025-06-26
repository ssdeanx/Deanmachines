use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useCopilotAction } from '@copilotkit/react-core';
import { toast } from 'sonner';

// Define a type for log entries
interface LogEntry {
    timestamp: string;
    message: string;
    type: 'info' | 'error' | 'success' | 'warning';
}

// 1. Define the shape of the context's state and actions
interface CodeGraphState {
    repoUrl: string;
    graphData: string;
    analysisResults: string;
    workflowStatus: LogEntry[]; // Changed to array of LogEntry
    isGenerating: boolean;
    filterType: string;
    searchTerm: string;
    layoutType: 'hierarchical' | 'force' | 'circular';
}

interface CodeGraphActions {
    setRepoUrl: (url: string) => void;
    generateGraph: (repoUrl: string, graphType: string, analysisDepth: string) => Promise<void>;
    setFilterType: (type: string) => void;
    setSearchTerm: (term: string) => void;
    setLayoutType: (type: 'hierarchical' | 'force' | 'circular') => void;
    addWorkflowLog: (message: string, type?: LogEntry['type']) => void; // New action to add log entries
}

// 2. Create the context with a default value
const CodeGraphContext = createContext<(CodeGraphState & CodeGraphActions) | undefined>(undefined);

// 3. Define the props for the provider
interface CodeGraphProviderProps {
    children: ReactNode;
}

// 4. Create the Provider component
export function CodeGraphProvider({ children }: CodeGraphProviderProps) {
    const [repoUrl, setRepoUrl] = useState('');
    const [graphData, setGraphData] = useState<string>('');
    const [analysisResults, setAnalysisResults] = useState<string>('');
    const [workflowStatus, setWorkflowStatus] = useState<LogEntry[]>([]); // Initialized as empty array
    const [isGenerating, setIsGenerating] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchTerm, setSearchTem] = useState('');
    const [layoutType, setLayoutType] = useState<'hierarchical' | 'force' | 'circular'>('hierarchical');

    // Helper to add log entries
    const addWorkflowLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const newEntry: LogEntry = { timestamp: new Date().toISOString(), message, type };
        setWorkflowStatus(prev => [...prev, newEntry]);
        if (type === 'error') {
            toast.error(message);
        } else if (type === 'success') {
            toast.success(message);
        } else {
            toast.info(message);
        }
    }, []);

    // Centralized action for generating the graph
    const generateGraph = useCallback(async (url: string, graphType: string, analysisDepth: string) => {
        if (!url) {
            addWorkflowLog('Error: Repository URL is not set.', 'error');
            return;
        }

        setIsGenerating(true);
        addWorkflowLog(`Starting ${graphType} graph generation with ${analysisDepth} analysis...`, 'info');

        try {
            const response = await fetch('/api/copilotkit/advancedCodeGraphMakerWorkflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ githubRepoUrl: url, options: { analysisDepth, graphType } }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Workflow failed: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const result = await response.json();

            if (result.result?.graphData) {
                setGraphData(JSON.stringify(result.result.graphData, null, 2));
                addWorkflowLog('Graph generated successfully!', 'success');
            } else {
                addWorkflowLog('Workflow completed but no graph data was returned.', 'warning');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addWorkflowLog(`ERROR: ${errorMessage}`, 'error');
        } finally {
            setIsGenerating(false);
        }
    }, [addWorkflowLog]);

    // Expose Copilot actions that modify our centralized state
    useCopilotAction({
        name: "setRepositoryUrl",
        description: "Set the repository URL for analysis",
        parameters: [{ name: "url", type: "string", description: "GitHub repository URL" }],
        handler: async ({ url }) => {
            setRepoUrl(url);
            addWorkflowLog(`Repository URL set to: ${url}`, 'info');
        },
    });

    useCopilotAction({
        name: "recordAnalysisResults",
        description: "Record code analysis results",
        parameters: [{ name: "results", type: "string" }, { name: "analysisType", type: "string" }],
        handler: async ({ results, analysisType }) => {
            const entry = `${analysisType.toUpperCase()} ANALYSIS:\n${results}`;
            setAnalysisResults(prev => prev ? `${prev}\n\n${entry}` : entry);
            addWorkflowLog(`Recorded ${analysisType} analysis results`, 'info');
        },
    });

    useCopilotAction({
        name: "updateWorkflowStatus",
        description: "Update the current workflow status",
        parameters: [{ name: "status", type: "string" }],
        handler: async ({ status }) => {
            addWorkflowLog(status, 'info');
        },
    });

    // The value that will be supplied to any descendants of this provider
    const value = {
        repoUrl,
        graphData,
        analysisResults,
        workflowStatus,
        isGenerating,
        filterType,
        searchTerm,
        layoutType,
        setRepoUrl,
        generateGraph,
        setFilterType,
        setSearchTerm,
        setLayoutType,
        addWorkflowLog,
    };


    // Centralized action for generating the graph
    const generateGraph = useCallback(async (url: string, graphType: string, analysisDepth: string) => {
        if (!url) {
            setWorkflowStatus('Error: Repository URL is not set.');
            return;
        }

        setIsGenerating(true);
        const startTime = new Date().toISOString();
        setWorkflowStatus(`[${startTime}] Starting ${graphType} graph generation with ${analysisDepth} analysis...`);

        try {
            const response = await fetch('/api/copilotkit/advancedCodeGraphMakerWorkflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ githubRepoUrl: url, options: { analysisDepth, graphType } }),
            });

            if (!response.ok) {
                throw new Error(`Workflow failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            const endTime = new Date().toISOString();

            if (result.result?.graphData) {
                setGraphData(JSON.stringify(result.result.graphData, null, 2));
                setWorkflowStatus(`[${endTime}] Graph generated successfully!`);
            } else {
                setWorkflowStatus(`[${endTime}] Workflow completed but no graph data was returned.`);
            }
        } catch (error) {
            const endTime = new Date().toISOString();
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setWorkflowStatus(`[${endTime}] ERROR: ${errorMessage}`);
        } finally {
            setIsGenerating(false);
        }
    }, []);

    // Expose Copilot actions that modify our centralized state
    useCopilotAction({
        name: "setRepositoryUrl",
        description: "Set the repository URL for analysis",
        parameters: [{ name: "url", type: "string", description: "GitHub repository URL" }],
        handler: async ({ url }) => {
            setRepoUrl(url);
            setWorkflowStatus(`Repository URL set to: ${url}`);
        },
    });

    useCopilotAction({
        name: "recordAnalysisResults",
        description: "Record code analysis results",
        parameters: [{ name: "results", type: "string" }, { name: "analysisType", type: "string" }],
        handler: async ({ results, analysisType }) => {
            const entry = `[${new Date().toISOString()}] ${analysisType.toUpperCase()} ANALYSIS:\n${results}`;
            setAnalysisResults(prev => prev ? `${prev}\n\n${entry}` : entry);
        },
    });

    useCopilotAction({
        name: "updateWorkflowStatus",
        description: "Update the current workflow status",
        parameters: [{ name: "status", type: "string" }],
        handler: async ({ status }) => {
            setWorkflowStatus(`[${new Date().toISOString()}] ${status}`);
        },
    });

    // The value that will be supplied to any descendants of this provider
    const value = {
        repoUrl,
        graphData,
        analysisResults,
        workflowStatus,
        isGenerating,
        filterType,
        searchTerm,
        layoutType,
        setRepoUrl,
        generateGraph,
        setFilterType,
        setSearchTerm,
        setLayoutType,
    };

    return (
        <CodeGraphContext.Provider value={value}>
            {children}
        </CodeGraphContext.Provider>
    );
}

// 5. Create a custom hook for easy context consumption
export function useCodeGraph() {
    const context = useContext(CodeGraphContext);
    if (context === undefined) {
        throw new Error('useCodeGraph must be used within a CodeGraphProvider');
    }
    return context;
}
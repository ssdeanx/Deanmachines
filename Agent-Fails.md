ERROR [2025-04-27 12:37:46.831 -0400] (notion_get_self): [Agent:Master Agent] - Failed tool execution
    runId: "masterAgent"
    threadId: "796d5527-2885-4e37-9a2e-3b3105d6c6cc"
    resourceId: "masterAgent"
    agentName: "Master Agent"
    description: "Get current user."
    args: {}
    error: {}
2025-04-27T16:38:03.449Z [Runner] Sending heartbeat ping...
2025-04-27T16:38:03.558Z [Runner] Sending heartbeat ping...
Exception in PromiseRejectCallback:
file:///C:/Users/dm/Documents/Deanmachines/.mastra/output/index.mjs:11475
}
^

RangeError: Maximum call stack size exceeded

Exception in PromiseRejectCallback:
file:///C:/Users/dm/Documents/Deanmachines/.mastra/output/index.mjs:11453
    const res = await net.execute(input, opts);
                          ^

RangeError: Maximum call stack size exceeded

Exception in PromiseRejectCallback:
file:///C:/Users/dm/Documents/Deanmachines/.mastra/output/index.mjs:11475
}
^

RangeError: Maximum call stack size exceeded

Exception in PromiseRejectCallback:
file:///C:/Users/dm/Documents/Deanmachines/.mastra/output/index.mjs:11453
    const res = await net.execute(input, opts);
                          ^

RangeError: Maximum call stack size exceeded

Exception in PromiseRejectCallback:
file:///C:/Users/dm/Documents/Deanmachines/.mastra/output/index.mjs:11475
}
^

RangeError: Maximum call stack size exceeded

Exception in PromiseRejectCallback:
file:///C:/Users/dm/Documents/Deanmachines/.mastra/output/index.mjs:11453
    const res = await net.execute(input, opts);
                          ^

RangeError: Maximum call stack size exceeded

file:///C:/Users/dm/Documents/Deanmachines/.mastra/output/index.mjs:11437
async function executeWithThread(net, input, opts = {}) {
                                ^





'docker_obsidian_list_files_in_dir',
    'docker_obsidian_list_files_in_vault',
    'docker_obsidian_get_file_contents',
    'docker_obsidian_simple_search',
    'docker_obsidian_patch_content',
    'docker_obsidian_append_content',
    'docker_obsidian_delete_file',
    'docker_get_current_time',
    'docker_convert_time',
    'docker_add_observations',
    'docker_delete_entities',
    'docker_delete_observations',
    'docker_delete_relations',
    'docker_read_graph',
    'docker_search_nodes',
    'docker_open_nodes',
    'docker_create_relations',
    'docker_create_entities',
    'docker_start-chrome',
    'docker_curl',
    'docker_curl-manual',
    'docker_interact-with-chrome',
    'mcp-pandoc_convert-contents',
    'mcp-painter_drawing_generateCanvas',
    'mcp-painter_drawing_fillRectangle',
    'mcp-painter_drawing_getCanvasPng',
    'mcp-painter_drawing_getCanvasData',
    'claudedesktopcommander_execute_command',
    'claudedesktopcommander_read_output',
    'claudedesktopcommander_force_terminate',
    'claudedesktopcommander_list_sessions',
    'claudedesktopcommander_list_processes',
    'claudedesktopcommander_kill_process',
    'claudedesktopcommander_block_command',
    'claudedesktopcommander_unblock_command',
    'claudedesktopcommander_list_blocked_commands',
    'claudedesktopcommander_read_file',
    'claudedesktopcommander_read_multiple_files',
    'claudedesktopcommander_write_file',
    'claudedesktopcommander_create_directory',
    'claudedesktopcommander_list_directory',
    'claudedesktopcommander_move_file',
    'claudedesktopcommander_search_files',
    'claudedesktopcommander_get_file_info',
    'claudedesktopcommander_list_allowed_directories',
    'claudedesktopcommander_edit_block',
    'clear-thought_sequentialthinking',
    'clear-thought_mentalmodel',
    'clear-thought_debuggingapproach',
    'n8n-workflow-builder_create_workflow',
    'deepview-mcp_deepview',
    'mermaid-mcp-server_generate',
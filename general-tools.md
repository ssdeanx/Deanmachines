# General Purpose Tools for Mastra AI Agents (Final Version)

**Overview:** This document catalogs implementable, general-purpose tools for Mastra AI agents, focusing on utilities, system interactions, diagramming, version control (Git), basic web fetching, and remote interaction (SSH). This document intentionally **excludes** complex data processing, detailed file system operations, and advanced browser automation, which should be covered in separate, dedicated documents. The emphasis here is on tools primarily using Node.js capabilities, standard libraries, or controlled external processes, operating securely where applicable (e.g., within the `.mastra` workspace for path-related operations). This is the final, consolidated version based on previous refinements.

**Key Considerations:**

*   **Security is Paramount:** Tools executing external commands (`git*`, diagram CLIs, network tools, `performSshCommand`) or interacting with sensitive system resources carry **EXTREME RISK**. Implement **ONLY** with rigorous input validation, command/script allowlisting, ensure the agent process runs with minimal privileges, and utilize sandboxing where feasible (see Notes). **Enabling direct execution of risky tools means accepting the associated risks.**
*   **Environment Dependencies:** Ensure external CLIs (`git`, `mmc`, `plantuml.jar`+Java, `dot`, `d2`, `blockdiag`+etc., `ping`, `nmap`, `ssh`) are installed and accessible in the agent's `PATH` (e.g., via Dockerfile). Verify library installations (`npm install ...`).
*   **API Keys & Secrets:** Securely manage credentials (SSH keys/passwords, API keys for indirect use via MCP) using environment variables (`process.env`) or secrets management, loaded securely within the tool's execution context.
*   **Error Handling:** Implement robust `try...catch` blocks. Return structured error objects (`{ success: false, error: 'Message', code: 'ERROR_CODE', details?: any }`) indicating the source (`COMMAND_EXECUTION_ERROR`, `SSH_ERROR`, `GIT_ERROR`, `NETWORK_ERROR`, `DIAGRAM_ERROR`, `FETCH_ERROR`, etc.).
*   **Input Validation:** **Strictly** validate all inputs (URLs, commands, file paths, network targets, hostnames, SSH parameters). Sanitize command arguments (`shell-quote` or similar). Ensure paths are validated against the `.mastra` workspace where applicable using a helper like `isPathInsideWorkspace` (defined conceptually in `filesystem-tools.md`).
*   **Resource Management:** Monitor resource usage. Implement reasonable timeouts for potentially long-running operations (commands, SSH, network checks).
*   **Implementation Sketches:** The provided "How to Use" sections offer conceptual starting points. Actual implementation requires detailed error handling, validation, and adapting to specific library versions/environment constraints.

---

## Section 1: Model Context Protocol (MCP) Integration Pattern

**Concept:** MCP allows Mastra agents to discover and use tools hosted externally on "MCP Servers" without needing direct implementation within the agent's codebase. This promotes modularity, reusability, and security. Integration is configured at the agent level using `@mastra/mcp`, rather than defining a specific "call MCP" tool *in this document*. It enables access to tools potentially covered in other documents (like browser automation via Hyperbrowser MCP) or external services (Apify, Composio).

*   **Purpose:** To enable the agent to leverage external tools exposed via the MCP standard.
*   **How to Use (`@mastra/mcp`):**
    1.  **Configure:** Use `MCPConfiguration` from `@mastra/mcp` in your agent setup code to define connections to one or more MCP servers (via local command `stdio` or remote URL `sse`). Securely pass necessary tokens or keys in the configuration.
        ```typescript
        import { MCPConfiguration } from "@mastra/mcp";

        // Example Configuration (Adapt with your actual server details)
        const mcpConfig = new MCPConfiguration({
          servers: {
            // Example: Apify Actor server connection
            apifyTasks: {
               url: new URL("https://actors-mcp-server.apify.actor/sse?token=<YOUR_APIFY_TOKEN>&actors=user/my-actor"),
               // Optional requestInit for headers etc.
            },
            // Example: Local tool server started via command
            myLocalToolServer: {
               name: "local-tool-server", // Optional name for logging
               server: {
                 command: "node", args: ["./path/to/my-mcp-server.js"] // Command to start the server process
               },
               log: (logMsg) => console.log(`[MCP Log - ${logMsg.serverName}]: ${logMsg.message}`) // Optional logger
            }
            // Add other configured MCP servers...
          },
        });
        ```
    2.  **Provide Tools to Agent:**
        *   For static/single-user tools: Fetch tools on agent initialization: `const mcpTools = await mcpConfig.getTools();`. Pass this array to the `tools` option when creating the agent: `new Agent({ ..., tools: [...yourDirectTools, ...mcpTools] })`.
        *   For dynamic/multi-user tools (e.g., user-specific configurations): Fetch toolsets within the request/generation context: `const toolsets = await mcpConfig.getToolsets();`. Pass these via the `toolsets` option in the agent's generate method: `agent.generate(prompt, { toolsets: toolsets })`.
*   **When & Why:** To access pre-built tool ecosystems (Apify, Composio), securely connect to internal tools, share tools across agents, or abstract complex functionality behind a standard interface. It separates tool implementation/hosting from the agent logic.
*   **What Used For:** Agent Task: "Use the Apify 'website-content-crawler' actor (via MCP) to get text from example.com.", Agent Task: "Call the internal 'getUserProfile' MCP tool.", Agent Task: "Use Composio (via MCP) to add a row to Google Sheets."

---

## Section 2: Diagramming & Visualization Tools

**Note:** These require specific external CLI tools or libraries installed in the agent's execution environment. Output files should be saved within the `.mastra/output` or `.mastra/temp` workspace directories. **Output paths MUST be validated** using a helper like `isPathInsideWorkspace`.

### Tool: `generateMermaidDiagram`

*   **Purpose:** Renders Mermaid syntax into diagrams (SVG/PNG).
*   **Approach:** Executes Mermaid CLI (`mmc`). Requires `mmc` in `PATH`.
*   **Libraries:** Node.js `child_process` or `execa`, `fs/promises` (for temp files).
*   **How to Use:** (Schema: `mermaidSyntax: z.string().describe("Diagram definition in Mermaid syntax. Example: 'graph TD; A-->B; B-->C;'")`, `outputFormat: z.enum(['SVG', 'PNG']).default('SVG')`, `outputFileName: z.string().describe("Filename relative to .mastra/output (e.g., 'my_diagram.svg'). MUST be validated.")`)
    *   `execute`: **Validate `outputFileName` path using `isPathInsideWorkspace`**. If invalid, return error. Write `input.mermaidSyntax` to a temporary file within `.mastra/temp` (e.g., using `createTemporaryFileOrDirectory` logic). Construct the full output path using the validated relative path and the workspace root. Use `execa` to run `mmc -i <temp_input_path> -o <full_output_path>`. Check `execa` result for errors (`stderr`, `exitCode`). Clean up the temporary input file using `deletePath` logic. Return `{ success: true, outputPath: validated_relative_output_path, format: input.outputFormat }` or structured error (`'MMC_ERROR'`, `'FILE_ERROR'`, `'PATH_VALIDATION_FAILED'`).
*   **When & Why:** Generating flowcharts, sequence diagrams, etc., programmatically from descriptions or analysis performed by the agent.
*   **What Used For:** "Create a sequence diagram using the syntax 'sequenceDiagram; A->>B: Request; B-->>A: Response;' and save it as `.mastra/output/seq.svg`."

---

### Tool: `generatePlantUMLDiagram`

*   **Purpose:** Renders PlantUML syntax into diagrams.
*   **Approach:** Executes `plantuml.jar` via Java CLI. Requires Java Runtime Environment and `plantuml.jar` accessible.
*   **Libraries:** `child_process`/`execa`, `fs/promises`.
*   **How to Use:** (Schema: `plantUmlSyntax: z.string()`, `outputFormat: z.enum(['png', 'svg', 'txt']).default('png')`, `outputFileName: z.string().describe("Filename relative to .mastra/output (e.g., 'classes.png'). MUST be validated.")`)
    *   `execute`: **Validate `outputFileName` path using `isPathInsideWorkspace`**. Write `input.plantUmlSyntax` to a temporary file (e.g., `.mastra/temp/input.puml`). Determine the full validated output directory path. Run command `java -jar /path/to/plantuml.jar -t<outputFormat> <temp_input_path> -o <validated_output_dir>` using `execa`. PlantUML often names the output based on the input; determine the expected final output path. Verify output file creation. Return `{ success: true, outputPath: determined_relative_output_path }`. Handle Java/PlantUML errors (`'PLANTUML_ERROR'`). Clean up temp input file.
*   **When & Why:** Generating UML diagrams (sequence, class, use case, etc.) when PlantUML syntax is preferred or required.
*   **What Used For:** "Generate a class diagram from this PlantUML code, save as `.mastra/output/classes.png`."

---

### Tool: `generateGraphvizDiagram`

*   **Purpose:** Renders DOT language descriptions into graphs/networks.
*   **Approach:** Executes Graphviz `dot` command. Requires `dot` (from Graphviz suite) in `PATH`.
*   **Libraries:** `child_process`/`execa`, `fs/promises`.
*   **How to Use:** (Schema: `dotSyntax: z.string()`, `outputFormat: z.enum(['png', 'svg', 'jpg', 'pdf']).default('png')`, `outputFileName: z.string().describe("Filename relative to .mastra/output (e.g., 'deps.svg'). MUST be validated.")`)
    *   `execute`: **Validate `outputFileName` path using `isPathInsideWorkspace`**. Write `input.dotSyntax` to temp file (`.dot`). Construct full validated output path. Run command `dot -T<outputFormat> <temp_input_path> -o <full_output_path>` using `execa`. Check command result. Return `{ success: true, outputPath: validated_relative_output_path }`. Handle `dot` command errors (`'GRAPHVIZ_ERROR'`). Clean up temp input file.
*   **When & Why:** Visualizing graph structures, dependencies, networks described in DOT language.
*   **What Used For:** "Render this DOT graph definition as an SVG file named `.mastra/output/dependency_graph.svg`."

---

### Tool: `generateD2Diagram`

*   **Purpose:** Renders D2 (Declarative Diagramming) language syntax into diagrams.
*   **Approach:** Executes the D2 CLI tool. Requires `d2` CLI in `PATH`.
*   **Libraries:** `child_process`/`execa`, `fs/promises`.
*   **How to Use:** (Schema: `d2Syntax: z.string()`, `layoutEngine: z.enum(['dagre', 'elk']).optional().default('dagre')`, `outputFileName: z.string().describe("Filename relative to .mastra/output (e.g., 'arch.svg'). MUST end in .svg or .png and be validated.")`)
    *   `execute`: **Validate `outputFileName` path and extension using `isPathInsideWorkspace`**. Write `input.d2Syntax` to temp file (`.d2`). Construct full validated output path. Run `d2 --layout=<layoutEngine> <temp_input_path> <full_output_path>` via `execa`. Check command result. Return `{ success: true, outputPath: validated_relative_output_path }`. Handle `d2` errors (`'D2_ERROR'`). Clean up temp input file.
*   **When & Why:** Creating various diagrams (sequence, architecture, etc.) using the modern D2 language.
*   **What Used For:** "Render this D2 diagram description to `.mastra/output/architecture.svg` using the ELK layout engine."

---

### Tool: `generateNomnomlDiagram`

*   **Purpose:** Renders Nomnoml syntax (text-based UML-like diagrams) into SVG directly in Node.js.
*   **Approach:** Uses the `nomnoml` Node.js library directly. Does *not* require an external CLI.
*   **Libraries:** `nomnoml` (`npm install nomnoml`).
*   **How to Use:** (Schema: `nomnomlSyntax: z.string()`)
    *   `execute`: Import `nomnoml`. Use `try...catch`. `const svg = nomnoml.renderSvg(input.nomnomlSyntax);`. Return `{ success: true, diagramData: svg, format: 'SVG' }`. Handle syntax errors caught by the library (`'NOMNOML_SYNTAX_ERROR'`).
*   **When & Why:** Quickly generating simpler UML-style diagrams directly within Node.js without external CLI dependencies. Useful for simpler environments.
*   **What Used For:** "Generate an SVG diagram from this Nomnoml syntax."

---

### Tool: `generateBlockDiagram` (BlockDiag Family)

*   **Purpose:** Renders diagrams from BlockDiag, SeqDiag, ActDiag, NwDiag syntax.
*   **Approach:** Executes respective Python CLIs (`blockdiag`, `seqdiag`, etc.). Requires Python and `blockdiag`/`seqdiag`/etc. installed (`pip install blockdiag seqdiag ...`).
*   **Libraries:** `child_process`/`execa`, `fs/promises`.
*   **How to Use:** (Schema: `diagramType: z.enum(['block', 'sequence', 'activity', 'network'])`, `diagramSyntax: z.string()`, `outputFormat: z.enum(['png', 'svg']).default('png')`, `outputFileName: z.string().describe("Filename relative to .mastra/output. MUST be validated.")`)
    *   `execute`: **Validate `outputFileName` path using `isPathInsideWorkspace`**. Determine correct command (`blockdiag`, `seqdiag`, etc.) based on `input.diagramType`. Write `input.diagramSyntax` to temp file. Construct full validated output path. Run `<command> -T <outputFormat> -o <full_output_path> <temp_input_path>` via `execa`. Check command result. Return `{ success: true, outputPath: validated_relative_output_path }`. Handle errors (`'BLOCKDIAG_ERROR'`). Clean up temp input file.
*   **When & Why:** Creating specific diagram types supported by the BlockDiag family using their simple text syntax.
*   **What Used For:** "Generate a block diagram from this spec, save as `.mastra/output/overview.png`.", "Create sequence diagram using `seqdiag` syntax."

---

## Section 3: Version Control (Git) Tools

**CRITICAL SECURITY WARNING:** Direct Git execution is **EXTREMELY RISKY**. Use **ONLY** in controlled environments, targeting specific repositories **within the `.mastra` workspace**, with rigorous validation of inputs (repo URLs, paths, command options). Requires `git` CLI in `PATH`. Enabling write operations significantly increases risk.

**Library:** `simple-git` (`npm install simple-git`). **Path Validation Helper (`isPathInsideWorkspace`) is REQUIRED here.**

### Tool: `gitCloneRepository`

*   **Purpose:** Clones a Git repository into a specified directory within the `.mastra` workspace.
*   **Approach:** Executes `git clone` via `simple-git`.
*   **How to Use:** (Schema: `repoUrl: z.string().url().describe("URL of the repository (HTTPS recommended). Consider allowlisting.")`, `targetDirectory: z.string().describe("Directory path relative to .mastra workspace (e.g., 'clones/my-repo'). MUST be validated.")`, `options: z.object({ depth: z.number().int().positive().optional() }).optional().describe("Git clone options like depth. Validate carefully.")`)
    *   `execute`: **CRITICAL VALIDATION:** Use `isPathInsideWorkspace` to validate and resolve the full `targetDirectory` path. Validate `input.repoUrl` against an allowlist if restricting sources. Sanitize/validate `input.options`. Use `try...catch`. `await simpleGit().clone(input.repoUrl, validatedTargetDirectoryFullPath, validatedOptions);`. Return `{ success: true, path: input.targetDirectory }` (relative path for user reference) or structured error (`'GIT_AUTH_ERROR'`, `'REPO_NOT_FOUND'`, `'PATH_EXISTS'`, `'PATH_VALIDATION_FAILED'`, `'GIT_CLONE_ERROR'`).
*   **When & Why:** Fetching codebase for analysis, review, or modification within the secured workspace.
*   **What Used For:** *(With extreme caution & allowlisting)* "Clone the repository `allowlisted-repo-url` into `.mastra/clones/repo`."

---

### Tool: `gitStatus`

*   **Purpose:** Checks the status (modified, staged, untracked files) of a Git repository within the `.mastra` workspace.
*   **Approach:** Executes `git status` via `simple-git`.
*   **How to Use:** (Schema: `repoPath: z.string().describe("Path relative to .mastra workspace (e.g., 'clones/my-repo'). MUST be validated.")`)
    *   `execute`: **Validate `input.repoPath` using `isPathInsideWorkspace`**. If invalid, return error. `const git = simpleGit(validatedFullPath);`. Use `try...catch`. `const status = await git.status();`. Format the `status` object (e.g., `{ modified: status.modified, staged: status.staged, untracked: status.untracked, currentBranch: status.current }`). Return `{ success: true, status: formattedStatus }`. Handle errors (`'NOT_A_REPO'`, `'PATH_VALIDATION_FAILED'`, `'GIT_STATUS_ERROR'`).
*   **When & Why:** Checking repository state before performing other Git actions or code analysis.
*   **What Used For:** "What is the git status of the repository at `.mastra/clones/my-project`?", "Are there any uncommitted changes in `.mastra/workspace/code`?".

---

### Tool: `gitDiff`

*   **Purpose:** Shows changes between commits, branches, or the working directory within a repository inside the `.mastra` workspace.
*   **Approach:** Executes `git diff` via `simple-git`.
*   **How to Use:** (Schema: `repoPath: z.string().describe("Path relative to .mastra. MUST be validated.")`, `options: z.array(z.string()).optional().default([]).describe("Array of diff options/targets (e.g., ['HEAD~1'], ['main..develop', '--', 'src/file.ts']). MUST BE VALIDATED/SANITIZED.")`)
    *   `execute`: **Validate `input.repoPath` using `isPathInsideWorkspace`**. **Validate/Sanitize `input.options` array against allowed/safe arguments** (e.g., prevent execution flags). If valid, `const git = simpleGit(validatedFullPath);`. Use `try...catch`. `const diff = await git.diff(validatedOptions);`. Return `{ success: true, diff: diff }`. Handle Git errors (`'GIT_DIFF_ERROR'`, `'PATH_VALIDATION_FAILED'`).
*   **When & Why:** Reviewing specific code changes programmatically.
*   **What Used For:** "Show the diff between `HEAD` and `HEAD~1` in repo `.mastra/clones/my-project`.", "What changed in `src/main.ts` in the current working directory?".

---

### Tool: `gitLog`

*   **Purpose:** Retrieves commit history for a repository within the `.mastra` workspace.
*   **Approach:** Executes `git log` via `simple-git`.
*   **How to Use:** (Schema: `repoPath: z.string().describe("Path relative to .mastra. MUST be validated.")`, `options: z.object({ maxCount: z.number().int().positive().optional().default(10), file: z.string().optional().describe("Optional file path relative to repo root.") /* Other safe log options */ }).optional().describe("Options for the log command. Must be validated.")`)
    *   `execute`: **Validate `input.repoPath` using `isPathInsideWorkspace`**. **Validate `input.options`**, potentially validating `options.file` path as well relative to the repo. If valid, `const git = simpleGit(validatedFullPath);`. Use `try...catch`. `const log = await git.log(validatedOptions);`. Return `{ success: true, log: log.all }` (array of commit objects). Handle Git errors (`'GIT_LOG_ERROR'`, `'PATH_VALIDATION_FAILED'`).
*   **When & Why:** Reviewing recent changes, finding specific commits, tracking history.
*   **What Used For:** "Show the last 5 commit messages for the repo at `.mastra/clones/mastra`.", "Get the commit history for the file `README.md`."

---
*(Note: Higher-risk Git write operations like `gitCommit`, `gitPush`, `gitPull`, `gitCheckout` require extreme caution, granular validation of all inputs (messages, file paths, branch names), potentially branch restrictions enforced by the tool, and careful authentication handling. Carefully consider the security implications before implementing.)*

---

## Section 4: Basic Web Fetching

**Note:** This tool is for simple HTTP GET requests. For POST/PUT/DELETE, complex headers, authentication, or sites requiring JavaScript rendering, use more advanced HTTP clients (`axios` wrapped in a tool with allowlisting) or Browser Automation tools documented separately.

### Tool: `basicFetchUrl`

*   **Purpose:** Fetches the content of a URL using a simple HTTP GET request, returning text or parsed JSON.
*   **Approach:** Uses Node.js built-in `fetch`.
*   **Libraries:** Native `fetch` (Node.js 18+).
*   **How to Use (Implementation Sketch):**
    *   Define using `new Tool`. Schema (`zod`):
      ```typescript
      z.object({
        url: z.string().url().describe("The URL to fetch (GET request). Consider implementing an allowlist."),
        responseType: z.enum(['text', 'json']).default('text').describe("How to parse the response body."),
        timeoutMs: z.number().int().positive().default(10000).describe("Request timeout in milliseconds."),
        headers: z.record(z.string()).optional().describe("Basic non-sensitive headers like 'Accept'.")
      })
      ```
    *   `execute`:
        1.  **Validate `input.url`:** Implement an allowlist/blocklist check if needed for security.
        2.  Use `try...catch`. Create `AbortController`: `const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs);`.
        3.  Make the request:
            ```typescript
            const response = await fetch(input.url, {
              method: 'GET',
              signal: controller.signal,
              headers: {
                'User-Agent': 'MastraAgent/1.0', // Example basic UA
                ...(input.headers ?? {}) // Merge non-sensitive headers
              }
            });
            clearTimeout(timeoutId);
            ```
        4.  Check status: `if (!response.ok) { throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`); }`. Capture `response.status`.
        5.  Process body based on `input.responseType` (use `try...catch` for `response.json()`):
            *   If `'json'`: `const data = await response.json();`
            *   Else (`'text'`): `const data = await response.text();`
        6.  Get content type: `const contentType = response.headers.get('content-type');`
        7.  Return `{ success: true, data: data, contentType: contentType, status: response.status }`.
        8.  In `catch` block: Determine error type (Timeout via `error.name === 'AbortError'`, network, HTTP status, JSON parse). Return structured error: `{ success: false, error: message, code: 'FETCH_ERROR' / 'TIMEOUT_ERROR' / 'JSON_PARSE_ERROR' / 'HTTP_ERROR', details: { status: response?.status ?? null } }`.
*   **When & Why:** Quickly retrieving content from public APIs, simple web pages (HTML, XML, text files), or RSS feeds. Faster and less resource-intensive than browser automation.
*   **What Used For:** "Fetch `example.com/robots.txt`.", "Get JSON from `api.example.com/data`.", "Retrieve RSS feed from `blog.example.com/feed` as text."

---

## Section 5: System Interaction & General Utilities

### Tool: `getCurrentDateTime`

*   **Purpose:** Retrieves current system date/time, optionally formatted.
*   **Approach:** `Date` object or date library (`date-fns`).
*   **Libraries:** `date-fns` (`npm install date-fns`).
*   **How to Use:** (Schema: optional `formatString`)
    *   `execute`: Import `format` from `date-fns`. Get `const now = new Date();`. Format: `const formattedDateTime = format(now, input.formatString ?? "yyyy-MM-dd'T'HH:mm:ssXXX");`. Return `{ success: true, currentDateTime: formattedDateTime, timestampMs: now.getTime() }`.
*   **What Used For:** Timestamps, logging, context. "What time is it?".

---

### Tool: `getSystemInfo`

*   **Purpose:** Retrieves basic OS/hardware info.
*   **Approach:** Node.js `os` module.
*   **How to Use:** (Schema: optional `includeNetwork`)
    *   `execute`: Import `os`. Gather info (`os.platform()`, `os.arch()`, `os.cpus().length`, `os.totalmem()`, `os.freemem()`, optionally `os.networkInterfaces()`). Return `{ success: true, info: {...} }`. Handle potential minor errors.
*   **What Used For:** Environment context, debugging. "What OS?", "Available memory?".

---

### Tool: `compressFiles` (e.g., Zip)

*   **Purpose:** Creates archives (e.g., ZIP) from files/dirs within `.mastra`.
*   **Approach:** `archiver` library (`npm install archiver`) or system `zip` command (`execa`).
*   **How to Use:** (Schema: `outputArchivePath`, `filesToCompress` array [`{path, nameInArchive?}`], `compressionLevel`)
    *   `execute`: **Validate all paths inside `.mastra`**. Use `archiver` (create write stream, pipe archive, loop `archive.file`/`archive.directory`, `archive.finalize`) or `execa('zip', ...)` (requires careful arg construction/sanitization). Return `{ success: true, archivePath: validated_relative_path }` or structured error (`'ARCHIVE_ERROR'`, `'FILE_NOT_FOUND'`).
*   **What Used For:** Packaging outputs. "Compress `.mastra/output/reports` to `.mastra/archives/reports.zip`."

---

### Tool: `decompressArchive` (e.g., Unzip)

*   **Purpose:** Extracts archives (e.g., ZIP) into directory within `.mastra`.
*   **Approach:** `extract-zip` library (`npm install extract-zip`) or system `unzip` command (`execa`).
*   **How to Use:** (Schema: `archivePath`, `outputDirectory`)
    *   `execute`: **Validate both paths inside `.mastra`**. Ensure output dir exists (`fs.promises.mkdir` or `fs-extra.ensureDir`). Use `extract(validatedArchivePath, { dir: validatedOutputDir })` or `execa('unzip', ...)`. Return `{ success: true, extractedTo: validated_relative_output_dir }` or structured error (`'ARCHIVE_INVALID'`, `'EXTRACT_ERROR'`).
*   **What Used For:** Processing archives. "Extract `.mastra/downloads/data.zip` into `.mastra/temp/extracted_data`."

---

### Tool: `getEnvironmentVariable`

*   **Purpose:** Retrieves value of **allowlisted** environment variable.
*   **Approach:** Accesses `process.env` after checking allowlist.
*   **How to Use:** (Schema: `variableName`)
    *   `execute`: **Define `ALLOWED_ENV_VARS` in config**. Check `input.variableName` against list. If allowed, return `{ success: true, variableName: ..., value: process.env[variableName] ?? null }`. Else, return `{ success: false, error: 'Variable not allowed', code: 'ENV_VAR_NOT_ALLOWED' }`.
*   **What Used For:** Controlled config access. "Read 'AGENT_MODE' env var."

---

### Tool: `performNetworkCheck`

*   **Purpose:** Basic network diagnostics (`ping`, `dns`). Requires CLIs & validation.
*   **Approach:** Executes system commands (`ping`, `nslookup`/`dig`) via `execa`.
*   **How to Use:** (Schema: `checkType`, `target`, `options`)
    *   `execute`: **Validate/Sanitize `target` (allowlist recommended)**. Sanitize options (e.g., ping count). Use `execa` to run appropriate command (`ping -c count target`, `nslookup target`). Parse `stdout` for relevant info. Return `{ success: true, results: parsedOutput }` or structured error (`'NETWORK_CHECK_FAILED'`, `'COMMAND_NOT_FOUND'`).
*   **What Used For:** *(With safeguards)* "Ping `allowlisted-host.com`.", "DNS lookup for `mastra.ai`."

---

### Tool: `generateUUID`

*   **Purpose:** Generates a standard UUID.
*   **Approach:** Node.js `crypto` module.
*   **How to Use:** (Schema: none)
    *   `execute`: Import `crypto`. `const uuid = crypto.randomUUID();`. Return `{ success: true, uuid: uuid }`.
*   **What Used For:** Creating unique IDs.

---

### Tool: `compareJsonObjects`

*   **Purpose:** Deep comparison of two JSON objects, returning differences.
*   **Approach:** Diffing library.
*   **Libraries:** `deep-diff` (`npm install deep-diff`).
*   **How to Use:** (Schema: `jsonObject1: z.any()`, `jsonObject2: z.any()`)
    *   `execute`: Import `diff` from `deep-diff`. `const differences = diff(input.jsonObject1, input.jsonObject2);`. Return `{ success: true, differences: differences ?? [] }`. Handle non-object inputs.
*   **What Used For:** Comparing configs, API responses.

---

### Tool: `calculateHash`

*   **Purpose:** Calculates cryptographic hash (MD5, SHA-256) of text.
*   **Approach:** Node.js `crypto` module.
*   **How to Use:** (Schema: `text`, `algorithm`)
    *   `execute`: Import `crypto`. `const hash = crypto.createHash(input.algorithm).update(input.text).digest('hex');`. Return `{ success: true, hash: hash }`.
*   **What Used For:** Checksums, simple identifiers.

---

### Tool: `encodeDecodeText`

*   **Purpose:** Encodes/decodes text (Base64, URL).
*   **Approach:** Node.js `Buffer`, `encode/decodeURIComponent`.
*   **How to Use:** (Schema: `text`, `encoding`, `action`)
    *   `execute`: Use `Buffer.from/toString` or `encode/decodeURIComponent`. Return `{ success: true, result: outputText }`. Handle errors (e.g., invalid base64).
*   **What Used For:** Handling web data, simple encoding.

---

### Tool: `manipulateDateTime`

*   **Purpose:** Date/time calculations, formatting, parsing.
*   **Approach:** Date/time library (`date-fns`, `dayjs`, `luxon`).
*   **Libraries:** `date-fns` (`npm install date-fns`) recommended.
*   **How to Use:** (Schema: `dateString`, `inputFormat`, `action` enum ['format', 'add', 'subtract', 'difference', 'parse'], `outputFormat`, `addSubtractAmount`, `addSubtractUnit`, `compareDateString`)
    *   `execute`: Import functions (`parse`, `format`, `addDays`, etc.). Parse input date. Perform action. Format output. Return `{ success: true, result: ... }`. Handle parsing/calculation errors (`'DATE_PARSE_ERROR'`, `'DATE_CALC_ERROR'`).
*   **What Used For:** Scheduling, durations, date formatting/parsing.

---

### Tool: `queryJsonData` (using JSONPath)

*   **Purpose:** Extracts data from JSON using JSONPath expressions.
*   **Approach:** JSONPath library.
*   **Libraries:** `jsonpath-plus` (`npm install jsonpath-plus`).
*   **How to Use:** (Schema: `jsonData: z.any()`, `pathExpression: z.string()`)
    *   `execute`: Import `JSONPath`. Use `try...catch`. `const result = JSONPath({ path: input.pathExpression, json: input.jsonData });`. Return `{ success: true, result: result }`. Handle invalid paths/JSON (`'JSONPATH_ERROR'`).
*   **What Used For:** Precisely extracting nested data from JSON.

---

### Tool: `generateRandomValue`

*   **Purpose:** Generates random numbers or strings.
*   **Approach:** Node.js `crypto` (for secure random strings) or `Math.random`.
*   **How to Use:** (Schema: `type: z.enum(['number', 'string'])`, optional `min`, `max`, `length`, `charset`)
    *   `execute`: Use `Math.random()` for numbers in range. Use `crypto.randomBytes` and map to charset for strings (more secure than `Math.random` for strings). Return `{ success: true, value: ... }`.
*   **What Used For:** Test data, simulations, temporary credentials (use crypto!).

---

### Tool: `loadStructuredConfigFile`

*   **Purpose:** Reads and parses JSON/YAML config file from `.mastra` workspace.
*   **Approach:** `fs/promises` and parsing libraries.
*   **Libraries:** `js-yaml` (`npm install js-yaml`).
*   **How to Use:** (Schema: `filePath`, optional `fileType`)
    *   `execute`: **Validate path inside `.mastra`**. Read file (`fs.promises.readFile`). Parse content (`JSON.parse` / `yaml.load`). Return `{ success: true, configData: parsedData }` or error (`'FILE_NOT_FOUND'`, `'PARSE_ERROR'`, `'PATH_VALIDATION_FAILED'`).
*   **What Used For:** Loading agent config/parameters. "Load `.mastra/config/settings.json`."

---

### Tool: `simpleTemplateFill`

*   **Purpose:** Fills placeholders (e.g., `{{key}}`) in a template string with data.
*   **Approach:** Basic string replacement or simple templating library.
*   **Libraries:** Native string `replace`, or `mustache` (`npm install mustache`).
*   **How to Use:** (Schema: `templateString`, `data: z.record(z.string())`, `placeholderSyntax`)
    *   `execute`: If using mustache: `mustache.render(templateString, data)`. If basic replace: Iterate `data` keys, use regex `replace` based on `placeholderSyntax`. Return `{ success: true, renderedText: resultString }`. Handle missing keys gracefully.
*   **What Used For:** Generating simple reports, messages, config snippets. "Fill 'Hello {{name}}!'."

---

### Tool: `cleanAndNormalizeText`

*   **Purpose:** Common text cleaning: remove extra whitespace, convert case, optionally remove punctuation or HTML tags.
*   **Approach:** Deterministic string manipulation, regex.
*   **Libraries:** Native string methods, `striptags` (`npm install striptags`).
*   **How to Use:** (Schema: `text`, optional flags `toLowerCase`, `removePunctuation`, `trimWhitespace`, `stripHtml`).
    *   `execute`: Apply selected operations sequentially using `trim()`, `toLowerCase()`, regex `replace()`, `striptags()`. Return `{ success: true, cleanedText: result }`.
*   **What Used For:** Pre-processing text for LLMs, comparison, indexing. "Normalize comment: lowercase, remove punctuation."

---

## Section 6: Remote Interaction Tools (HIGH RISK)

### Tool: `performSshCommand`

*   **Purpose:** Executes **allowlisted** command on **allowlisted** remote server via SSH. **EXTREME RISK.**
*   **Approach:** SSH client library (`node-ssh`, `ssh2`). Requires secure credential management (keys preferred) and host key verification.
*   **Libraries:** `node-ssh` (`npm install node-ssh`), `ssh2`.
*   **How to Use:** (Schema: `hostKey`, `commandKey`, optional sanitized `commandArgs`)
    *   `execute`: **CRITICAL:** Use allowlists for hosts & commands defined securely in config. Load credentials securely (e.g., key path from env var). **SANITIZE `commandArgs` using `shell-quote` or similar**. Connect using library (`ssh.connect`), **verify host key** (important!). Execute allowlisted command (`ssh.execCommand`). Dispose connection in `finally`. Return output/status or structured error (`'SSH_CONNECTION_ERROR'`, `'SSH_AUTH_ERROR'`, `'SSH_HOST_KEY_ERROR'`, `'SSH_COMMAND_ERROR'`).
*   **When & Why:** **LAST RESORT** for remote automation on pre-approved systems with pre-approved commands. Requires significant security setup and understanding.
*   **What Used For:** *(Only with extreme safeguards)* "Run allowlisted 'restart_service' on 'webserver_prod'.", "Execute allowlisted 'check_disk' script via SSH on 'app_server_1'."

---

## Section 7: Troubleshooting & Notes

*   **Command Not Found:** Ensure CLIs (`git`, `mmc`, etc.) are installed and in `PATH`. Check Dockerfile/environment.
*   **Process Errors (`COMMAND_EXECUTION_ERROR`):** Check `stderr`. Verify command/args/permissions. Use `execa` for better error/argument handling than `child_process.exec`.
*   **SSH Errors (`SSH_*_ERROR`):** Verify host, port, user, keys/passwords, host key verification. Check network/firewalls. Consult library docs (`node-ssh`, `ssh2`).
*   **Fetch Errors (`FETCH_ERROR`, etc.):** Check URL, network, server status, rate limits. Verify `responseType`. Implement allowlists.
*   **Resource Limits/Timeouts (`TIMEOUT_ERROR`):** Increase tool timeouts cautiously. Monitor agent CPU/memory.
*   **Input Validation Failures:** Check agent logic generating inputs against tool schemas and allowlists (env vars, Git URLs, SSH hosts/commands, file paths). Ensure paths are correctly handled for validation.
*   **Dependency Issues:** Ensure Node.js libraries are installed (`npm install ...`). Check versions.
*   **Configuration:** Externalize allowlists (SSH, Git, Env Vars, URLs), paths (`plantuml.jar`), API keys. Use `loadStructuredConfigFile` or env vars.
*   **Sandboxing (Security Enhancement):** For high-risk tools (`performSshCommand`, Git writes, potentially diagram CLIs if parsing untrusted input), strongly consider infrastructure-level sandboxing (Docker, VM) or Node.js-level (`isolated-vm` - advanced) to limit potential damage propagation.
*   **Tool Composability:** Remember agents orchestrate these tools; ensure clear inputs/outputs for effective chaining (e.g., `getCurrentDateTime` -> `simpleTemplateFill` -> `writeFileContent`).

---
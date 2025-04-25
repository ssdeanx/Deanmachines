import { Tool } from '@mastra/core';
import { z } from 'zod';
import { execa } from 'execa';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getWorkspacePath, isPathInsideWorkspace, ensureDirectoryExists } from '../../utils/workspace'; // Placeholder for actual path utils
import { run } from "@mermaid-js/mermaid-cli"

await run(
   "input.mmd", "output.svg", // {optional options},
)
// Assume these helpers exist and are configured correctly
// You might need to create these utility functions based on your project structure
// and how you manage workspace paths.

const mermaidSchema = z.object({
    mermaidSyntax: z.string().describe("Diagram definition in Mermaid syntax. Example: 'graph TD; A-->B; B-->C;'"),
    outputFormat: z.enum(['svg', 'png']).default('svg').describe("Output format (svg or png). Mermaid CLI uses lowercase."),
    outputFileName: z.string().describe("Filename relative to the workspace output directory (e.g., 'my_diagram.svg'). MUST end in .svg or .png."),
});

type MermaidInput = z.infer<typeof mermaidSchema>;
type MermaidOutput =
    | { success: true; outputPath: string; format: 'svg' | 'png' }
    | { success: false; error: string; code: 'PATH_VALIDATION_FAILED' | 'FILE_ERROR' | 'MMC_ERROR' | 'INVALID_INPUT' };

/**
 * Tool to generate diagrams from Mermaid syntax using the Mermaid CLI (mmc).
 * Requires `mmc` to be installed and accessible in the system PATH.
 * Saves the output file within the designated '.mastra/output' directory.
 */
export const generateMermaidDiagramTool = new Tool<MermaidInput, MermaidOutput>({
    name: 'generateMermaidDiagram',
    description: 'Renders Mermaid syntax into an SVG or PNG diagram using the Mermaid CLI (mmc). Saves the output to the workspace output directory.',
    schema: mermaidSchema,
    execute: async (input): Promise<MermaidOutput> => {
        const { mermaidSyntax, outputFormat, outputFileName } = input;

        // 1. Validate Input Filename Extension matches format
        const expectedExtension = `.${outputFormat}`;
        if (!outputFileName.toLowerCase().endsWith(expectedExtension)) {
                return { success: false, error: `Output filename "${outputFileName}" must end with "${expectedExtension}" for the selected format.`, code: 'INVALID_INPUT' };
        }

        // 2. Validate Output Path is safe and within the workspace output directory
        const outputDir = path.join(getWorkspacePath(), 'output'); // Get path like /path/to/project/.mastra/output
        const validatedRelativePath = await isPathInsideWorkspace(outputFileName, 'output'); // Validates and returns the cleaned relative path or null

        if (!validatedRelativePath) {
            // isPathInsideWorkspace should log the specific reason for failure
            return { success: false, error: `Invalid output path: "${outputFileName}". Must be relative and within the workspace output directory.`, code: 'PATH_VALIDATION_FAILED' };
        }
        // Construct the full, validated absolute path for the output file
        const fullOutputPath = path.join(outputDir, validatedRelativePath);

        // 3. Prepare Temporary Input File in the workspace temp directory
        const tempDir = path.join(getWorkspacePath(), 'temp'); // Get path like /path/to/project/.mastra/temp
        let tempInputPath: string | undefined;
        try {
            // Ensure the temp directory and the specific output directory exist
            await ensureDirectoryExists(tempDir);
            await ensureDirectoryExists(path.dirname(fullOutputPath)); // Ensure directory for the output file exists

            // Create a uniquely named temporary file for the mermaid syntax
            const tempFileName = `mermaid-input-${crypto.randomUUID()}.mmd`;
            tempInputPath = path.join(tempDir, tempFileName);
            await fs.writeFile(tempInputPath, mermaidSyntax, 'utf8');

            // 4. Execute Mermaid CLI (mmc) command
            // Example: mmc -i /path/to/.mastra/temp/input.mmd -o /path/to/.mastra/output/diag.svg -f svg
            const args = ['-i', tempInputPath, '-o', fullOutputPath, '-f', outputFormat];
            // Optional: Add theme, background color etc. via args if needed: ['-t', 'dark', '-b', 'transparent', ...]

            console.log(`Executing mmc with args: ${args.join(' ')}`); // Logging for debug
            const { stdout, stderr, exitCode, failed } = await execa('mmc', args, { reject: false }); // reject: false to handle errors manually

            if (failed || exitCode !== 0) {
                console.error(`mmc execution failed. Exit Code: ${exitCode}`);
                console.error(`mmc stderr: ${stderr}`);
                console.error(`mmc stdout: ${stdout}`);
                // Attempt to provide a more specific error message if possible
                let errorMessage = `Mermaid CLI failed with exit code ${exitCode}.`;
                if (stderr) {
                        errorMessage += ` Error: ${stderr}`;
                } else if (stdout) {
                        // Sometimes errors might appear on stdout
                         errorMessage += ` Output: ${stdout}`;
                }
                 if (stderr?.includes('command not found') || stderr?.includes('ENOENT')) {
                         errorMessage = 'Mermaid CLI (mmc) command not found. Please ensure it is installed and in the system PATH.';
                 }
                return { success: false, error: errorMessage, code: 'MMC_ERROR' };
            }

            // 5. Verify Output File Exists (Optional but recommended)
            try {
                await fs.access(fullOutputPath);
                console.log(`Successfully generated diagram: ${validatedRelativePath}`);
            } catch (accessError) {
                 console.error(`Output file verification failed for ${fullOutputPath}:`, accessError);
                 // This case indicates mmc reported success, but the file isn't there/accessible.
                 return { success: false, error: `Mermaid CLI reported success, but output file "${validatedRelativePath}" could not be accessed or wasn't created.`, code: 'FILE_ERROR' };
            }

            // Return the validated relative path for user reference
            return { success: true, outputPath: validatedRelativePath, format: outputFormat };

        } catch (error: any) {
            console.error("Error during Mermaid diagram generation process:", error);
            // Distinguish file system errors from other potential errors
            if (error.code && ['ENOENT', 'EACCES', 'EISDIR', 'EPERM'].includes(error.code)) {
                 return { success: false, error: `File system error: ${error.message}`, code: 'FILE_ERROR' };
            }
            // Check if it's an error from execa before the command ran (e.g., command not found)
            if (error.shortMessage && error.shortMessage.includes('command not found') || error.code === 'ENOENT') {
                     return { success: false, error: 'Mermaid CLI (mmc) command not found. Please ensure it is installed and in the system PATH.', code: 'MMC_ERROR' };
            }
            // Generic fallback error
            return { success: false, error: `An unexpected error occurred: ${error.message || error}`, code: 'MMC_ERROR' };
        } finally {
            // 6. Clean up the temporary input file regardless of success or failure
            if (tempInputPath) {
                try {
                    await fs.unlink(tempInputPath);
                    // console.log(`Cleaned up temporary file: ${tempInputPath}`);
                } catch (cleanupError) {
                    // Log cleanup error but don't mask the original error
                    console.error(`Failed to clean up temporary file ${tempInputPath}:`, cleanupError);
                }
            }
        }
    },
});


// ==========================================================================
// Placeholder implementations for workspace utilities.
// IMPORTANT: Replace these with your actual, robust implementations,
// especially for path validation which is critical for security.
// These should likely reside in a shared `src/mastra/utils/workspace.ts` file.
// ==========================================================================

/**
 * Gets the absolute path to the Mastra workspace directory (e.g., '.mastra').
 * This might involve searching up the directory tree or using environment variables.
 * @returns {string} Absolute path to the .mastra directory.
 */
function getWorkspacePath(): string {
        // Example: Assume workspace is '.mastra' in the project root determined by cwd()
        // In a real app, this might use find-up package or check env vars.
        const projectRoot = process.cwd(); // Adjust if your project root is determined differently
        const mastraDir = path.resolve(projectRoot, '.mastra');
        // It's good practice to ensure this base directory exists on startup or here.
        // try { fs.mkdirSync(mastraDir, { recursive: true }); } catch {}
        return mastraDir;
}

/**
 * Ensures a directory exists, creating it recursively if necessary.
 * @param {string} dirPath - The absolute path to the directory.
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
                await fs.mkdir(dirPath, { recursive: true });
        } catch (error: any) {
                if (error.code !== 'EEXIST') { // Ignore error if directory already exists
                        console.error(`Failed to create directory ${dirPath}:`, error);
                        throw error; // Re-throw other errors (e.g., permission errors)
                }
        }
}

/**
 * **CRITICAL SECURITY FUNCTION:** Validates that a given relative path resolves
 * to a location *strictly within* the specified workspace subdirectory (e.g., 'output', 'temp').
 * Prevents directory traversal attacks (e.g., '../../etc/passwd').
 *
 * @param {string} relativePath - The user-provided relative path (e.g., 'diagrams/my_diag.svg').
 * @param {'output' | 'temp' | 'input' | 'clones' | 'archives'} subDirectory - The target subdirectory within '.mastra'.
 * @returns {Promise<string | null>} The validated and normalized relative path if safe, otherwise null.
 */
async function isPathInsideWorkspace(relativePath: string, subDirectory: 'output' | 'temp' | 'input' | 'clones' | 'archives'): Promise<string | null> {
        try {
                const workspaceDir = getWorkspacePath(); // e.g., /home/user/project/.mastra
                const targetBaseDir = path.resolve(workspaceDir, subDirectory); // e.g., /home/user/project/.mastra/output

                // Resolve the user-provided path relative to the target base directory
                // path.resolve automatically handles normalization and absolute paths.
                const resolvedFullPath = path.resolve(targetBaseDir, relativePath);

                // **The core security check:**
                // Ensure the resolved path starts with the target base directory path followed by a separator,
                // or is exactly the target base directory (if relativePath was '.' or empty).
                // This prevents traversal upwards (e.g., /home/user/project/.mastra/output/../input).
                if (!resolvedFullPath.startsWith(targetBaseDir + path.sep) && resolvedFullPath !== targetBaseDir) {
                        console.warn(`Security Violation: Path "${relativePath}" resolves to "${resolvedFullPath}", which is outside the allowed directory "${targetBaseDir}".`);
                        return null;
                }

                // Optional: Check for potentially harmful characters (adjust regex as needed)
                // This is less critical than the path traversal check but can prevent issues.
                if (/[<>:"\\|?*\x00-\x1F]/g.test(relativePath)) {
                         console.warn(`Security Warning: Path "${relativePath}" contains potentially problematic characters.`);
                         // Decide whether to reject or sanitize based on policy
                         // return null; // Uncomment to reject
                }

                // Return the *relative path* from the base directory to the resolved path.
                // This ensures we return a value like 'diagrams/my_diag.svg', not an absolute path.
                const finalRelativePath = path.relative(targetBaseDir, resolvedFullPath);

                // Final safety check: Ensure the calculated relative path doesn't somehow start with '..'
                // This shouldn't happen if the startsWith check above is correct, but adds defense in depth.
                if (finalRelativePath.startsWith('..') || path.isAbsolute(finalRelativePath)) {
                         console.error(`Internal Security Error: Calculated relative path "${finalRelativePath}" unexpectedly points outside target directory "${targetBaseDir}".`);
                         return null;
                }

                // If all checks pass, return the cleaned, safe relative path
                return finalRelativePath;

        } catch (error) {
                console.error(`Error during path validation for "${relativePath}" in "${subDirectory}":`, error);
                return null; // Treat any unexpected error during validation as unsafe
        }
}
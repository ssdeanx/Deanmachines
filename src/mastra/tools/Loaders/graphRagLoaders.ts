import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { createLogger } from "@mastra/core/logger";
// LAZY LANGFUSE: see below for dynamic import in each function that uses langfuse
import { getTracer } from "../../services/tracing";


// === Configure Logger ===
const logger = createLogger({ name: "graphRagLoaders", level: "info" });
const tracer = getTracer();




// Allowed directory and extensions
const ALLOWED_DIR = path.resolve(__dirname); // Explicitly set to the loaders directory
const ALLOWED_EXTS = [".csv", ".dot", ".gexf", ".graphml", ".json"];

// Utility: Restrict file access to allowed directory and extension
function validateGraphRagFile(filePath: string, allowedExt: string) {
  const absPath = path.resolve(filePath);
  // Ensure file is inside allowed directory (robust against symlinks/..)
  const rel = path.relative(ALLOWED_DIR, absPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`File must be in ${ALLOWED_DIR}`);
  }
  // Ensure extension is allowed and matches the tool's expected extension
  const ext = path.extname(absPath);
  if (!ALLOWED_EXTS.includes(ext)) {
    throw new Error(`File must have one of the allowed extensions: ${ALLOWED_EXTS.join(", ")}`);
  }
  if (ext !== allowedExt) {
    throw new Error(`File extension must be ${allowedExt} for this tool`);
  }
  return absPath;
}

/**
 * CSV Loader: Loads a graph from a CSV file with edges (source,target)
 */
export const graphRagCsvLoader = createTool({
  id: "graph-rag-csv-loader",
  description: "Loads a graph from a CSV file with edges (source,target)",
  inputSchema: z.object({
    filePath: z.string(),
  }),
  execute: async ({ context }) => {
    const absPath = validateGraphRagFile(context.filePath, ".csv");
    const csvContent = await fs.readFile(absPath, "utf8");
    if (!csvContent.trim()) throw new Error("CSV file is empty");
    const lines = csvContent.split("\n").filter(Boolean);
    const edges = lines.map(line => {
      const [source, target] = line.split(",");
      if (!source || !target) throw new Error(`Malformed line: ${line}`);
      return { source: source.trim(), target: target.trim() };
    });
    const nodes = Array.from(new Set(edges.flatMap(e => [e.source, e.target]))).map(id => ({ id }));
    return { nodes, edges };
  },
});

/**
 * DOT Loader: Loads a graph from a DOT file (basic support)
 */
export const graphRagDotLoader = createTool({
  id: "graph-rag-dot-loader",
  description: "Loads a graph from a DOT file (basic support)",
  inputSchema: z.object({
    filePath: z.string(),
  }),
  execute: async ({ context }) => {
    const absPath = validateGraphRagFile(context.filePath, ".dot");
    const dotContent = await fs.readFile(absPath, "utf8");
    if (!dotContent.trim()) throw new Error("DOT file is empty");
    const edgeRegex = /(\w+)\s*->\s*(\w+)/g;
    let match: RegExpExecArray | null;
    const edges: { source: string; target: string }[] = [];
    while ((match = edgeRegex.exec(dotContent)) !== null) {
      edges.push({ source: match[1], target: match[2] });
    }
    const nodes = Array.from(new Set(edges.flatMap(e => [e.source, e.target]))).map(id => ({ id }));
    return { nodes, edges };
  },
});

/**
 * GEXF Loader: Loads a graph from a GEXF XML string
 */
export const graphRagGexfLoader = createTool({
  id: "graph-rag-gexf-loader",
  description: "Loads a graph from a GEXF XML string",
  inputSchema: z.object({
    filePath: z.string(),
  }),
  execute: async ({ context }) => {
    const absPath = validateGraphRagFile(context.filePath, ".gexf");
    const gexfContent = await fs.readFile(absPath, "utf8");
    if (!gexfContent.trim()) throw new Error("GEXF file is empty");
    let doc;
    try {
      const parser = new (typeof window !== 'undefined' && window.DOMParser ? window.DOMParser : (require('xmldom').DOMParser))();
      doc = parser.parseFromString(gexfContent, "text/xml");
    } catch (e) {
      throw new Error("Failed to parse GEXF XML");
    }
    const nodeEls = Array.from(doc.getElementsByTagName("node"));
    const edgeEls = Array.from(doc.getElementsByTagName("edge"));
    const nodes = nodeEls.map((n: any) => ({ id: n.getAttribute("id") }));
    const edges = edgeEls.map((e: any) => ({ source: e.getAttribute("source"), target: e.getAttribute("target") }));
    return { nodes, edges };
  },
});

/**
 * GRAPHML Loader: Loads a graph from a GraphML XML string
 */
export const graphRagGraphmlLoader = createTool({
  id: "graph-rag-graphml-loader",
  description: "Loads a graph from a GraphML XML string",
  inputSchema: z.object({
    filePath: z.string(),
  }),
  execute: async ({ context }) => {
    const absPath = validateGraphRagFile(context.filePath, ".graphml");
    const graphmlContent = await fs.readFile(absPath, "utf8");
    if (!graphmlContent.trim()) throw new Error("GraphML file is empty");
    let doc;
    try {
      const parser = new (typeof window !== 'undefined' && window.DOMParser ? window.DOMParser : (require('xmldom').DOMParser))();
      doc = parser.parseFromString(graphmlContent, "text/xml");
    } catch (e) {
      throw new Error("Failed to parse GraphML XML");
    }
    const nodeEls = Array.from(doc.getElementsByTagName("node"));
    const edgeEls = Array.from(doc.getElementsByTagName("edge"));
    const nodes = nodeEls.map((n: any) => ({ id: n.getAttribute("id") }));
    const edges = edgeEls.map((e: any) => ({ source: e.getAttribute("source"), target: e.getAttribute("target") }));
    return { nodes, edges };
  },
});

/**
 * JSON Loader: Loads a graph from a JSON string or object
 */
export const graphRagJsonLoader = createTool({
  id: "graph-rag-json-loader",
  description: "Loads a graph from a JSON string or object with { nodes, edges } arrays",
  inputSchema: z.object({
    filePath: z.string(),
  }),
  execute: async ({ context }) => {
    const absPath = validateGraphRagFile(context.filePath, ".json");
    const jsonContent = await fs.readFile(absPath, "utf8");
    let json;
    try {
      json = JSON.parse(jsonContent);
    } catch {
      throw new Error("Invalid JSON file");
    }
    if (!json.nodes || !json.edges) throw new Error("JSON must have nodes and edges arrays");
    return { nodes: json.nodes, edges: json.edges };
  },
});

// Export all loaders as an array
export const graphRagLoaders = [
  graphRagCsvLoader,
  graphRagDotLoader,
  graphRagGexfLoader,
  graphRagGraphmlLoader,
  graphRagJsonLoader,
];

/**
 * Exporters (write tools) for each format
 */

// CSV Exporter
export const graphRagCsvExporter = createTool({
  id: "graph-rag-csv-exporter",
  description: "Exports a graph to a CSV file (edges: source,target)",
  inputSchema: z.object({
    filePath: z.string(),
    edges: z.array(z.object({ source: z.string(), target: z.string() })),
  }),
  execute: async ({ context }) => {
    const absPath = validateGraphRagFile(context.filePath, ".csv");
    if (!tracer) {
      logger.error("Tracer is not initialized for CSV exporter", { filePath: absPath });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("Tracer is not initialized for CSV exporter", { filePath: absPath });
      throw new Error("Tracer is not initialized (observability critical error)");
    }
    const span = tracer.startSpan("graphRagCsvExporter.write", {
      attributes: { filePath: absPath, ext: ".csv", operation: "write" }
    });
    try {
      const csvContent = context.edges.map(e => `${e.source},${e.target}`).join("\n");
      await fs.writeFile(absPath, csvContent, "utf8");
      logger.info("Successfully wrote CSV graph file", { filePath: absPath });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("CSV graph file written", { filePath: absPath });
      span.setStatus({ code: 1 });
      return { success: true, filePath: absPath, traceId: span.spanContext().traceId, spanId: span.spanContext().spanId };
    } catch (err) {
      logger.error("Failed to write CSV graph file", { filePath: absPath, error: err });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("CSV graph file write failed", { filePath: absPath, error: String(err) });
      span.setStatus({ code: 2, message: String(err) });
      throw err;
    } finally {
      span.end();
    }
  },
});

// DOT Exporter
export const graphRagDotExporter = createTool({
  id: "graph-rag-dot-exporter",
  description: "Exports a graph to a DOT file (digraph with edges)",
  inputSchema: z.object({
    filePath: z.string(),
    edges: z.array(z.object({ source: z.string(), target: z.string() })),
  }),
  execute: async ({ context }) => {
    const absPath = validateGraphRagFile(context.filePath, ".dot");
    if (!tracer) {
      logger.error("Tracer is not initialized for DOT exporter", { filePath: absPath });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("Tracer is not initialized for DOT exporter", { filePath: absPath });
      throw new Error("Tracer is not initialized (observability critical error)");
    }
    const span = tracer.startSpan("graphRagDotExporter.write", {
      attributes: { filePath: absPath, ext: ".dot", operation: "write" }
    });
    try {
      const dotContent = [
        "digraph {",
        ...context.edges.map(e => `  ${e.source} -> ${e.target};`),
        "}"
      ].join("\n");
      await fs.writeFile(absPath, dotContent, "utf8");
      logger.info("Successfully wrote DOT graph file", { filePath: absPath });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("DOT graph file written", { filePath: absPath });
      span.setStatus({ code: 1 });
      return { success: true, filePath: absPath, traceId: span.spanContext().traceId, spanId: span.spanContext().spanId };
    } catch (err) {
      logger.error("Failed to write DOT graph file", { filePath: absPath, error: err });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("DOT graph file write failed", { filePath: absPath, error: String(err) });
      span.setStatus({ code: 2, message: String(err) });
      throw err;
    } finally {
      span.end();
    }
  },
});

// GEXF Exporter (minimal)
export const graphRagGexfExporter = createTool({
  id: "graph-rag-gexf-exporter",
  description: "Exports a graph to a GEXF XML file",
  inputSchema: z.object({
    filePath: z.string(),
    nodes: z.array(z.object({ id: z.string() })),
    edges: z.array(z.object({ source: z.string(), target: z.string() })),
  }),
  execute: async ({ context }) => {
    const absPath = validateGraphRagFile(context.filePath, ".gexf");
    if (!tracer) {
      logger.error("Tracer is not initialized for GEXF exporter", { filePath: absPath });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("Tracer is not initialized for GEXF exporter", { filePath: absPath });
      throw new Error("Tracer is not initialized (observability critical error)");
    }
    const span = tracer.startSpan("graphRagGexfExporter.write", {
      attributes: { filePath: absPath, ext: ".gexf", operation: "write" }
    });
    try {
      const gexfContent = `<?xml version="1.0" encoding="UTF-8"?>\n<gexf version="1.2">\n  <graph mode="static" defaultedgetype="directed">\n    <nodes>\n${context.nodes.map(n => `      <node id=\"${n.id}\"/>`).join("\n")}\n    </nodes>\n    <edges>\n${context.edges.map((e, i) => `      <edge id=\"${i}\" source=\"${e.source}\" target=\"${e.target}\"/>`).join("\n")}\n    </edges>\n  </graph>\n</gexf>`;
      await fs.writeFile(absPath, gexfContent, "utf8");
      logger.info("Successfully wrote GEXF graph file", { filePath: absPath });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("GEXF graph file written", { filePath: absPath });
      span.setStatus({ code: 1 });
      return { success: true, filePath: absPath, traceId: span.spanContext().traceId, spanId: span.spanContext().spanId };
    } catch (err) {
      logger.error("Failed to write GEXF graph file", { filePath: absPath, error: err });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("GEXF graph file write failed", { filePath: absPath, error: String(err) });
      span.setStatus({ code: 2, message: String(err) });
      throw err;
    } finally {
      span.end();
    }
  },
});

// GRAPHML Exporter (minimal)
export const graphRagGraphmlExporter = createTool({
  id: "graph-rag-graphml-exporter",
  description: "Exports a graph to a GraphML XML file",
  inputSchema: z.object({
    filePath: z.string(),
    nodes: z.array(z.object({ id: z.string() })),
    edges: z.array(z.object({ source: z.string(), target: z.string() })),
  }),
  execute: async ({ context }) => {
    const absPath = validateGraphRagFile(context.filePath, ".graphml");
    if (!tracer) {
      logger.error("Tracer is not initialized for GraphML exporter", { filePath: absPath });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("Tracer is not initialized for GraphML exporter", { filePath: absPath });
      throw new Error("Tracer is not initialized (observability critical error)");
    }
    const span = tracer.startSpan("graphRagGraphmlExporter.write", {
      attributes: { filePath: absPath, ext: ".graphml", operation: "write" }
    });
    try {
      const graphmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<graphml xmlns=\"http://graphml.graphdrawing.org/xmlns\">\n  <graph id=\"G\" edgedefault=\"directed\">\n${context.nodes.map(n => `    <node id=\"${n.id}\"/>`).join("\n")}\n${context.edges.map(e => `    <edge source=\"${e.source}\" target=\"${e.target}\"/>`).join("\n")}\n  </graph>\n</graphml>`;
      await fs.writeFile(absPath, graphmlContent, "utf8");
      logger.info("Successfully wrote GraphML graph file", { filePath: absPath });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("GraphML graph file written", { filePath: absPath });
      span.setStatus({ code: 1 });
      return { success: true, filePath: absPath, traceId: span.spanContext().traceId, spanId: span.spanContext().spanId };
    } catch (err) {
      logger.error("Failed to write GraphML graph file", { filePath: absPath, error: err });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("GraphML graph file write failed", { filePath: absPath, error: String(err) });
      span.setStatus({ code: 2, message: String(err) });
      throw err;
    } finally {
      span.end();
    }
  },
});

// JSON Exporter
export const graphRagJsonExporter = createTool({
  id: "graph-rag-json-exporter",
  description: "Exports a graph to a JSON file with { nodes, edges } arrays",
  inputSchema: z.object({
    filePath: z.string(),
    nodes: z.array(z.object({ id: z.string() })),
    edges: z.array(z.object({ source: z.string(), target: z.string() })),
  }),
  execute: async ({ context }) => {
    const absPath = validateGraphRagFile(context.filePath, ".json");
    if (!tracer) {
      logger.error("Tracer is not initialized for JSON exporter", { filePath: absPath });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("Tracer is not initialized for JSON exporter", { filePath: absPath });
      throw new Error("Tracer is not initialized (observability critical error)");
    }
    const span = tracer.startSpan("graphRagJsonExporter.write", {
      attributes: { filePath: absPath, ext: ".json", operation: "write" }
    });
    try {
      const jsonContent = JSON.stringify({ nodes: context.nodes, edges: context.edges }, null, 2);
      await fs.writeFile(absPath, jsonContent, "utf8");
      logger.info("Successfully wrote JSON graph file", { filePath: absPath });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("JSON graph file written", { filePath: absPath });
      span.setStatus({ code: 1 });
      return { success: true, filePath: absPath, traceId: span.spanContext().traceId, spanId: span.spanContext().spanId };
    } catch (err) {
      logger.error("Failed to write JSON graph file", { filePath: absPath, error: err });
      (await import("../../services/langfuse")).langfuse.logWithTraceContext("JSON graph file write failed", { filePath: absPath, error: String(err) });
      span.setStatus({ code: 2, message: String(err) });
      throw err;
    } finally {
      span.end();
    }
  },
});

export const graphRagExporters = [
  graphRagCsvExporter,
  graphRagDotExporter,
  graphRagGexfExporter,
  graphRagGraphmlExporter,
  graphRagJsonExporter,
];

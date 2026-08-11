import z from "zod";
import * as fs from "fs";
import * as path from "path";
import { tool, zodSchema } from "ai";
import { spawnSync } from "child_process";
import { createTwoFilesPatch } from "diff";
import { webSearch } from "@exalabs/ai-sdk";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function resolveWorkspacePath(
  workspacePath: string,
  targetPath?: string,
): string {
  const workspaceRoot = path.resolve(workspacePath);
  const resolved = targetPath
    ? path.resolve(workspaceRoot, targetPath)
    : workspaceRoot;
  const relative = path.relative(workspaceRoot, resolved);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Path must stay inside the workspace");
  }
  return resolved;
}

function getRelativePath(workspacePath: string, targetPath: string): string {
  return normalizeRelativePath(
    path.relative(path.resolve(workspacePath), targetPath) || ".",
  );
}

function getPatchStats(patch: string) {
  let additions = 0,
    deletions = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }
  return { additions, deletions };
}

function getPatchedWriteResult(params: {
  workspacePath: string;
  fullPath: string;
  previousContent: string;
  nextContent: string;
  existed: boolean;
  editCount?: number;
  action?: "created" | "edited";
}) {
  const {
    workspacePath,
    fullPath,
    previousContent,
    nextContent,
    existed,
    editCount = existed ? 1 : 0,
    action = existed ? "edited" : "created",
  } = params;
  const prevLines = existed ? previousContent.split("\n").length : 0;
  const newLines = nextContent.split("\n").length;
  const relPath =
    getRelativePath(workspacePath, fullPath) || path.basename(fullPath);
  const patch = createTwoFilesPatch(
    relPath,
    relPath,
    previousContent,
    nextContent,
  );
  const stats = getPatchStats(patch);
  return {
    filePath: fullPath,
    relativePath: relPath,
    action,
    previousLineCount: prevLines,
    newLineCount: newLines,
    linesAdded: newLines - prevLines,
    linesRemoved: stats.deletions,
    patch,
    patchAdditions: stats.additions,
    patchDeletions: stats.deletions,
    editCount,
  };
}

function ensureHttpUrl(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("Only HTTP(S) URLs supported");
  return url;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 2000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; EditBot/1.0)" },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeUrl(url: string, maxChars = 8000) {
  try {
    const validatedUrl = ensureHttpUrl(url);
    const response = await fetchWithTimeout(validatedUrl.toString(), 20000);
    if (!response.ok)
      return { url: validatedUrl.toString(), error: `HTTP ${response.status}` };
    const contentType = response.headers.get("content-type") || "";
    const raw = await response.text();
    if (!/html/i.test(contentType)) {
      return {
        url: validatedUrl.toString(),
        contentType,
        content: raw.slice(0, maxChars),
        truncated: raw.length > maxChars,
        length: raw.length,
      };
    }
    const textContent = stripHtml(raw);
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = raw.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i,
    );
    return {
      url: validatedUrl.toString(),
      title: titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : null,
      description: descMatch ? descMatch[1].trim() : null,
      contentType,
      content: textContent.slice(0, maxChars),
      truncated: textContent.length > maxChars,
      length: textContent.length,
    };
  } catch (error) {
    return { url, error: errorMessage(error) };
  }
}

const IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".cache",
  "*.log",
  ".DS_Store",
  "Thumbs.db",
  "coverage",
  ".nyc_output",
  ".env",
  ".env.local",
  "*.lock",
  "bun.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
];

export function buildAgentSystemPrompt(workspacePath: string): string {
  return [
    "You are Edit, a coding agent. You have a terminal, browser, file preview, and multiple chats.",
    "You can view and control the browser via 'bunx agent-browser'.",
    `Use: bunx agent-browser --session ${process.env.AGENT_BROWSER_SESSION?.trim() || "edit-shared"}`,
    `Browser stream port: ${process.env.AGENT_BROWSER_STREAM_PORT?.trim() || "56901"}`,
    `Working directory: ${workspacePath}`,
    "Use bash for all file ops: reading files, searching content (grep/findstr), globbing (ls/dir wildcards), listing dirs.",
    "Use read to inspect file contents with offset/limit, or list git-tracked files.",
    "Use write to create new files. Use update to replace old_str with new_str in existing files.",
    "Use bash for validation, diagnostics, builds, and tests.",
    "Before updating, read first. If update fails, re-read for exact snippet.",
    "Do not claim tests passed unless you ran them.",
    "Ignore patterns:",
    ...IGNORE_PATTERNS.map((p) => `- ${p}`),
  ].join("\n");
}

const updateSchema = z
  .object({
    path: z.string().describe("Path to the file"),
    old_str: z.string().describe("Text to find - must match exactly"),
    new_str: z.string().describe("Replacement text"),
  })
  .superRefine((v, ctx) => {
    if (!v.path || v.old_str === v.new_str)
      ctx.addIssue({
        code: "custom",
        message: "path required and old_str must differ from new_str",
      });
  });

export function createTools(workspacePath: string) {
  return {
    todos: tool({
      description:
        "Inspect and manage workspace todos through the project-scoped `to` CLI.",
      inputSchema: zodSchema(
        z.object({
          action: z
            .enum(["summary", "tree", "add", "done", "do"])
            .describe("Todo action to run"),
          id: z
            .number()
            .int()
            .positive()
            .optional()
            .describe("Todo id for tree, done, or do"),
          text: z
            .string()
            .optional()
            .describe("Todo text for add"),
          parent: z
            .number()
            .int()
            .positive()
            .optional()
            .describe("Parent todo id for add"),
          priority: z
            .enum(["high", "medium", "low"])
            .optional()
            .describe("Priority for add"),
          label: z.string().optional().describe("Label for add"),
          createBranch: z
            .boolean()
            .optional()
            .describe("For action=do, pass --create-branch"),
        }),
      ),
      execute: async ({
        action,
        id,
        text,
        parent,
        priority,
        label,
        createBranch,
      }) => {
        try {
          const cwd = resolveWorkspacePath(workspacePath);
          const args =
            action === "summary"
              ? ["ls"]
              : action === "tree"
                ? ["tree", String(id ?? "")]
                : action === "done"
                  ? ["done", String(id ?? "")]
                  : action === "do"
                    ? [
                        "do",
                        String(id ?? ""),
                        ...(createBranch ? ["--create-branch"] : []),
                      ]
                    : [
                        "add",
                        text ?? "",
                        ...(parent ? ["--parent", String(parent)] : []),
                        ...(priority ? ["--priority", priority] : []),
                        ...(label ? ["--label", label] : []),
                      ];

          if (
            (action === "tree" || action === "done" || action === "do") &&
            !id
          ) {
            return { error: `action=${action} requires id` };
          }
          if (action === "add" && !text?.trim()) {
            return { error: "action=add requires text" };
          }

          const result = spawnSync("to", args, {
            cwd,
            encoding: "utf8",
            shell: true,
            timeout: 30000,
            maxBuffer: 2 * 1024 * 1024,
          });

          return {
            action,
            args,
            stdout: result.stdout ?? "",
            stderr: result.stderr ?? "",
            exitCode: typeof result.status === "number" ? result.status : -1,
            success: result.status === 0,
            path: cwd,
            error: result.error ? errorMessage(result.error) : undefined,
          };
        } catch (error) {
          return { error: errorMessage(error) };
        }
      },
    }),

    write: tool({
      description: "Create a new file. Fails if already exists.",
      inputSchema: zodSchema(
        z.object({
          path: z.string().describe("Relative path for new file"),
          content: z.string().describe("Full file content"),
        }),
      ),
      execute: async ({ path: filePath, content }) => {
        try {
          const fullPath = resolveWorkspacePath(workspacePath, filePath);
          if (fs.existsSync(fullPath))
            return { error: `File exists: ${filePath}. Use update to modify.` };
          const parentDir = path.dirname(fullPath);
          if (!fs.existsSync(parentDir))
            fs.mkdirSync(parentDir, { recursive: true });
          fs.writeFileSync(fullPath, content, "utf-8");
          return {
            ...getPatchedWriteResult({
              workspacePath,
              fullPath,
              previousContent: "",
              nextContent: content,
              existed: false,
            }),
            message: `Created ${filePath}`,
          };
        } catch (error) {
          return { error: errorMessage(error) };
        }
      },
    }),

    update: tool({
      description: "Edit an existing file by replacing old_str with new_str.",
      inputSchema: zodSchema(updateSchema),
      execute: async ({ path: filePath, old_str, new_str }) => {
        try {
          const fullPath = resolveWorkspacePath(workspacePath, filePath);
          if (!fs.existsSync(fullPath))
            return {
              error: `File not found: ${filePath}. Use write to create.`,
            };
          const previousContent = fs.readFileSync(fullPath, "utf-8");
          const count = previousContent.split(old_str).length - 1;
          if (count === 0) return { error: "old_str not found in file" };
          const nextContent = previousContent.split(old_str).join(new_str);
          fs.writeFileSync(fullPath, nextContent, "utf-8");
          return {
            ...getPatchedWriteResult({
              workspacePath,
              fullPath,
              previousContent,
              nextContent,
              existed: true,
              editCount: count,
            }),
            replacements: count,
          };
        } catch (error) {
          return { error: errorMessage(error) };
        }
      },
    }),

    read: tool({
      description:
        "Read a file with optional offset/limit, or list git-tracked files when filePath is omitted.",
      inputSchema: zodSchema(
        z.object({
          filePath: z
            .string()
            .optional()
            .describe("Relative path to file. Omit to list git-tracked files."),
          offset: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe("1-based start line (default: 1)"),
          limit: z
            .number()
            .int()
            .min(1)
            .max(5000)
            .optional()
            .describe("Max lines (default: 250)"),
          git: z
            .boolean()
            .optional()
            .describe(
              "Set true to list git-tracked files (defaults to true when filePath is omitted)",
            ),
        }),
      ),
      execute: async ({ filePath, offset = 1, limit = 250, git }) => {
        try {
          if (!filePath || git) {
            const result = spawnSync("git", ["ls-files"], {
              cwd: workspacePath,
              encoding: "utf8",
              maxBuffer: 5 * 1024 * 1024,
            });
            if (result.error)
              return {
                error: "Not a git repository or git not available",
                files: [],
              };
            const allFiles = result.stdout.trim().split("\n").filter(Boolean);
            const total = allFiles.length;
            const start = Math.max(0, offset - 1);
            const files = allFiles.slice(start, start + limit);
            return {
              files,
              total,
              range: `${start + 1}-${start + files.length}`,
              truncated: start + limit < total,
            };
          }

          const fullPath = resolveWorkspacePath(workspacePath, filePath);
          if (!fs.existsSync(fullPath))
            return { error: `File not found: ${filePath}` };
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");
          const start = Math.max(0, offset - 1);
          const end = Math.min(start + limit, lines.length);
          return {
            filePath,
            content: lines.slice(start, end).join("\n"),
            totalLines: lines.length,
            range: `${start + 1}-${end}`,
            truncated: end < lines.length,
          };
        } catch (error) {
          return { error: errorMessage(error) };
        }
      },
    }),

    bash: tool({
      description:
        "Run a shell command. Use for file ops (reading, grep, glob, ls), validation, builds, tests. Do NOT use to write/edit files.",
      inputSchema: zodSchema(
        z.object({
          command: z.string().describe("Shell command to execute"),
          timeout: z
            .number()
            .optional()
            .describe("Timeout in ms (default: 60000)"),
        }),
      ),
      execute: async ({ command, timeout }) => {
        try {
          const cwd = resolveWorkspacePath(workspacePath);
          const result = spawnSync(command, {
            cwd,
            encoding: "utf8",
            shell: true,
            timeout: timeout || 60000,
            maxBuffer: 10 * 1024 * 1024,
            env: {
              ...process.env,
              AGENT_BROWSER_SESSION:
                process.env.AGENT_BROWSER_SESSION || "edit-shared",
              AGENT_BROWSER_STREAM_PORT:
                process.env.AGENT_BROWSER_STREAM_PORT || "56901",
            },
          });
          const truncated =
            result.error instanceof Error &&
            "code" in result.error &&
            (result.error as any).code === "ENOBUFS";
          return {
            stdout: result.stdout ?? "",
            stderr: result.stderr ?? "",
            exitCode: typeof result.status === "number" ? result.status : -1,
            signal: result.signal ?? null,
            success: result.status === 0,
            truncated,
            path: cwd,
            error: result.error ? errorMessage(result.error) : undefined,
          };
        } catch (error: unknown) {
          return {
            stdout: "",
            stderr: "",
            exitCode: -1,
            success: false,
            signal: null,
            truncated: false,
            error: errorMessage(error),
            path: workspacePath,
          };
        }
      },
      needsApproval: true,
    }),

    web: webSearch(),

    scrape: tool({
      description: "Fetch URLs and extract readable text in parallel.",
      inputSchema: zodSchema(
        z.object({
          urls: z
            .union([z.string().url(), z.array(z.string().url())])
            .describe("Single URL or array of URLs"),
          maxChars: z
            .number()
            .int()
            .min(500)
            .max(50000)
            .optional()
            .describe("Max chars per URL (default: 8000)"),
        }),
      ),
      execute: async ({ urls, maxChars = 8000 }) => {
        try {
          const urlArray = Array.isArray(urls) ? urls : [urls];
          const results = await Promise.all(
            urlArray.map((url) => scrapeUrl(url, maxChars)),
          );
          return {
            pages: results,
            count: results.length,
            successCount: results.filter((r) => !r.error).length,
            errorCount: results.filter((r) => r.error).length,
            totalChars: results.reduce((s, r) => s + (r.length ?? 0), 0),
          };
        } catch (error) {
          return { error: errorMessage(error) };
        }
      },
    }),
  };
}

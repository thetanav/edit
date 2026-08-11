import type { ReactNode } from "react";
import type { ToolUIPart } from "ai";
import {
    Check,
    CircleAlert,
    FilePenLine,
    FilePlus2,
    FileText,
    Globe,
    ListTodo,
    Search,
    Terminal,
    Wrench,
} from "lucide-react";

export type ToolApprovalResponse = { id: string; approved: boolean };

export type ToolPartUiProps = {
    part: ToolUIPart;
    addToolApprovalResponseAction: (response: ToolApprovalResponse) => void;
};

type JsonRecord = Record<string, unknown>;

function input(part: ToolUIPart): JsonRecord {
    return typeof part.input === "object" && part.input !== null
        ? (part.input as JsonRecord)
        : {};
}

function value(part: ToolUIPart, key: string): unknown {
    return input(part)[key];
}

function stringValue(part: ToolUIPart, key: string): string | undefined {
    const item = value(part, key);
    if (typeof item === "string") return item;
    if (Array.isArray(item) && item.length === 1 && typeof item[0] === "string") {
        return item[0];
    }
    return undefined;
}

function stringsValue(part: ToolUIPart, key: string): string[] {
    const item = value(part, key);
    if (typeof item === "string") return [item];
    return Array.isArray(item) && item.every((entry) => typeof entry === "string")
        ? (item as string[])
        : [];
}

function output(part: ToolUIPart): JsonRecord {
    return typeof part.output === "object" && part.output !== null
        ? (part.output as JsonRecord)
        : {};
}

function short(value: unknown, fallback: string): string {
    if (typeof value !== "string" || !value.trim()) return fallback;
    const compact = value.replace(/\s+/g, " ").trim();
    return compact.length > 100 ? `${compact.slice(0, 97)}…` : compact;
}

function pathLabel(part: ToolUIPart, key = "path"): string {
    return stringValue(part, key) ?? ".";
}

function status(part: ToolUIPart): { label: string; icon: typeof Check } {
    if (part.state === "output-error") return { label: "Failed", icon: CircleAlert };
    if (part.state === "input-streaming" || part.state === "input-available") {
        return { label: "Running", icon: Wrench };
    }
    return { label: "Done", icon: Check };
}

function ToolRow({
    icon: Icon,
    label,
    detail,
    part,
}: {
    icon: typeof Check;
    label: string;
    detail?: string;
    part: ToolUIPart;
}) {
    const state = status(part);
    const StateIcon = state.icon;
    return (
        <div className="flex min-w-0 items-center gap-2 py-1 text-sm text-muted-foreground/90">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="shrink-0 font-medium text-foreground/80">{label}</span>
            {detail && (
                <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                    {detail}
                </span>
            )}
            <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground/70">
                <StateIcon className="size-3" />
                {state.label}
            </span>
        </div>
    );
}

export function TodosToolPartUi({ part }: ToolPartUiProps) {
    const action = stringValue(part, "action") ?? "summary";
    const id = value(part, "id");
    const text = stringValue(part, "text");
    const details = action === "add" ? short(text, "new task") : id ? `#${String(id)}` : undefined;
    const labels: Record<string, string> = {
        summary: "List todos",
        tree: "Open todo",
        add: "Add todo",
        done: "Complete todo",
        do: "Start todo",
    };
    return <ToolRow icon={ListTodo} label={labels[action] ?? "Manage todos"} detail={details} part={part} />;
}

export function WriteToolPartUi({ part }: ToolPartUiProps) {
    return <ToolRow icon={FilePlus2} label="Create file" detail={pathLabel(part)} part={part} />;
}

export function UpdateToolPartUi({ part }: ToolPartUiProps) {
    const result = output(part);
    const changes = typeof result.replacements === "number" ? `${result.replacements} replacement${result.replacements === 1 ? "" : "s"}` : undefined;
    return <ToolRow icon={FilePenLine} label="Update file" detail={[pathLabel(part), changes].filter(Boolean).join(" · ")} part={part} />;
}

export function EditToolPartUi({ part }: ToolPartUiProps) {
    return <ToolRow icon={FilePenLine} label="Edit file" detail={pathLabel(part, "filePath")} part={part} />;
}

export function ReadToolPartUi({ part }: ToolPartUiProps) {
    const file = stringValue(part, "filePath");
    const detail = file ?? (value(part, "git") ? "tracked files" : "workspace files");
    return <ToolRow icon={FileText} label={file ? "Read file" : "List files"} detail={detail} part={part} />;
}

export function BashToolPartUi({ part }: ToolPartUiProps) {
    return <ToolRow icon={Terminal} label="Run command" detail={short(stringValue(part, "command"), "shell command")} part={part} />;
}

export function WebToolPartUi({ part }: ToolPartUiProps) {
    const queries = stringsValue(part, "queries");
    const query = stringValue(part, "query");
    return <ToolRow icon={Search} label="Search web" detail={short(queries[0] ?? query, queries.length > 1 ? `${queries.length} queries` : "web search")} part={part} />;
}

export function ScrapeToolPartUi({ part }: ToolPartUiProps) {
    const urls = stringsValue(part, "urls");
    const url = stringValue(part, "url");
    const providedDetail = urls[0] ?? url;
    let detail = providedDetail;
    try {
        detail = providedDetail ? new URL(providedDetail).hostname : "";
    } catch {
        // Keep the provided value when it is not a valid URL.
    }
    return <ToolRow icon={Globe} label="Fetch page" detail={short(detail, urls.length > 1 ? `${urls.length} pages` : "URL")} part={part} />;
}

export function GenericToolPartUi({ part }: ToolPartUiProps) {
    return <ToolRow icon={Wrench} label={part.type.replace(/^tool-/, "")} part={part} />;
}

export const toolPartUi: Record<string, (props: ToolPartUiProps) => ReactNode> = {
    todos: TodosToolPartUi,
    write: WriteToolPartUi,
    update: UpdateToolPartUi,
    edit: EditToolPartUi,
    read: ReadToolPartUi,
    bash: BashToolPartUi,
    web: WebToolPartUi,
    scrape: ScrapeToolPartUi,
    generic: GenericToolPartUi,
};

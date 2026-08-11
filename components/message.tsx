"use client";

import React, { useMemo } from "react";
import { useJsonRenderMessage } from "@json-render/react";
import { PatchDiff } from "@pierre/diffs/react";
import { type ToolUIPart } from "ai";
import {
    Link,
    File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toolPartUi, type ToolApprovalResponse } from "@/components/toolPartUi";

import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { mermaid } from "@streamdown/mermaid";
import { math } from "@streamdown/math";
import { cjk } from "@streamdown/cjk";

type MessagePart = {
    type: string;
    state?: string;
    text?: string;
    title?: string;
    filename?: string;
    url?: string;
    toolCallId?: string;
    input?: unknown;
    output?: unknown;
};

export default function MessageUI({
    parts,
    addToolApprovalResponseAction,
}: {
    parts: MessagePart[];
    addToolApprovalResponseAction: (response: ToolApprovalResponse) => void;
}) {
    useJsonRenderMessage(parts);

    const renderedParts = useMemo(() => {
        const result: React.ReactNode[] = [];
        const summaryItems: React.ReactNode[] = [];
        const inlineItems: React.ReactNode[] = [];
        const lastTextIndex = [...parts]
            .map((part, index) =>
                part.type === "text" && part.text?.trim() ? index : -1,
            )
            .filter((index) => index >= 0)
            .pop();
        let toolCount = 0;
        let hiddenTextCount = 0;

        parts.forEach((part, partIndex) => {
            const key = part.toolCallId ?? `part-${partIndex}`;
            const isTool = part.type.startsWith("tool-");
            const isEdit = part.type === "tool-edit";
            const needsApproval =
                isTool &&
                typeof (part as ToolUIPart).state === "string" &&
                (part as ToolUIPart).state === "approval-requested";
            let rendered: React.ReactNode = null;

            switch (part.type) {
                case "text":
                    rendered = (
                        <div key={key} className="text-sm my-3">
                            <Streamdown
                                plugins={{
                                    code: code,
                                    mermaid: mermaid,
                                    math: math,
                                    cjk: cjk,
                                }}
                                shikiTheme={["github-light", "github-dark"]}
                                mermaid={{ config: { theme: "dark" } }}
                            >
                                {part.text}
                            </Streamdown>
                        </div>
                    );
                    if (partIndex !== lastTextIndex) {
                        hiddenTextCount += 1;
                    }
                    break;

                case "reasoning":
                    rendered = <p key={key}>Thinking...</p>;
                    break;

                case "source-document":
                    rendered = (
                        <div
                            key={key}
                            className="inline-flex items-center gap-1.5 text-xs bg-card border border-border/50 rounded-md px-2 py-1 text-muted-foreground"
                        >
                            <File className="size-3" />
                            <span className="font-mono">{part.filename}</span>
                        </div>
                    );
                    break;

                case "source-url":
                    rendered = (
                        <a
                            key={key}
                            href={part.url}
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Link className="size-3" />
                            <span className="underline underline-offset-2">
                                {part.title}
                            </span>
                        </a>
                    );
                    break;

                default:
                    if (
                        part.type == "tool-edit" &&
                        part.state === "output-available" &&
                        part.output
                    ) {
                        rendered = (
                            <div
                                key={key}
                                className="w-full max-h-108 mt-2 overflow-y-scroll border rounded-lg overflow-hidden"
                            >
                                <PatchDiff
                                    patch={
                                        (part.output as { patch: string }).patch
                                    }
                                    options={{
                                        overflow: "wrap",
                                        theme: "aurora-x",
                                        diffStyle: "unified",
                                        unsafeCSS:
                                            "* { font-family: var(--font-geist-mono), monospace !important; }",
                                    }}
                                />
                            </div>
                        );
                    } else if (part.type.startsWith("tool-")) {
                        rendered = (
                            <ToolPart
                                key={key}
                                part={part as ToolUIPart}
                                addToolApprovalResponseAction={
                                    addToolApprovalResponseAction
                                }
                            />
                        );
                    }
                    break;
            }

            if (rendered == null) {
                return;
            }

            if (isTool) {
                if (!isEdit) {
                    toolCount += 1;
                }
                if (needsApproval) {
                    inlineItems.push(rendered);
                } else {
                    summaryItems.push(rendered);
                }
                return;
            }

            if (part.type === "text" && partIndex !== lastTextIndex) {
                summaryItems.push(
                    <div key={`summary-${key}`} className="text-sm opacity-80">
                        {rendered}
                    </div>,
                );
                return;
            }

            inlineItems.push(rendered);
        });

        result.push(...inlineItems);

        if (summaryItems.length > 0) {
            const segments: string[] = [];
            if (toolCount > 0) {
                segments.push(
                    `${toolCount} ${toolCount === 1 ? "tool call" : "tool calls"}`,
                );
            }
            if (hiddenTextCount > 0) {
                segments.push(
                    `${hiddenTextCount} earlier ${hiddenTextCount === 1 ? "update" : "updates"}`,
                );
            }

            result.push(
                <details
                    key="message-summary"
                    className="mt-2 flex flex-col text-sm text-muted-foreground/90 select-none outline-none"
                >
                    <summary className="flex items-center gap-2 font-mono">
                        <span>Summary</span>
                        {segments.length > 0 && (
                            <span className="text-xs text-muted-foreground/70">
                                {segments.join(" • ")}
                            </span>
                        )}
                    </summary>
                    <div className="flex flex-col gap-2 py-3 px-2">
                        {summaryItems}
                    </div>
                </details>,
            );
        }

        return result;
    }, [parts, addToolApprovalResponseAction]);

    return <>{renderedParts}</>;
}

function ToolPart({
    part,
    addToolApprovalResponseAction,
}: {
    part: ToolUIPart;
    addToolApprovalResponseAction: (response: ToolApprovalResponse) => void;
}) {
    if (part.state === "approval-requested") {
        const toolName = part.type.replace("tool-", "");
        const ToolUi = toolPartUi[toolName] ?? toolPartUi.generic;
        return (
            <div className="tool-card rounded-xl p-3.5 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-amber-400">!</span>
                    </div>
                    <span className="text-xs font-medium text-foreground/90">
                        {toolName}
                    </span>
                    <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                        needs approval
                    </span>
                </div>

                <div className="rounded-lg border border-border/30 bg-background/60 px-2.5">
                    {ToolUi({ part, addToolApprovalResponseAction })}
                </div>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={() => {
                            addToolApprovalResponseAction({
                                id: part.approval.id,
                                approved: true,
                            });
                        }}
                        className="rounded-lg text-xs"
                    >
                        Approve
                        <kbd>A</kbd>
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            addToolApprovalResponseAction({
                                id: part.approval.id,
                                approved: false,
                            });
                        }}
                        className="rounded-lg text-xs"
                    >
                        Decline
                        <kbd>D</kbd>
                    </Button>
                </div>
            </div>
        );
    }

    const toolName = part.type.replace("tool-", "");
    const ToolUi = toolPartUi[toolName] ?? toolPartUi.generic;
    return ToolUi({ part, addToolApprovalResponseAction });
}

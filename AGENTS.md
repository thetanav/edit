<!-- to:tool-instructions:start -->
## Tool Usage

Available tools: `bash`, `write`, `update`.

Use `bash` for ALL file operations: reading files (`type` on Windows, `cat` otherwise), searching content (`findstr` on Windows, `grep` otherwise), globbing (`ls`/`dir` with wildcards), and listing directories (`ls`/`dir`). Use `write` to create new files and `update` to edit existing files.

Machine: Windows (MSYS2/MSYS_NT-10.0-26200 on x86_64). Use appropriate Windows/MSYS2 commands in bash (e.g., `type` instead of `cat`, Windows paths with forward slashes, `.exe` suffix where applicable).
<!-- to:tool-instructions:end -->

<!-- to:todo-instructions:start -->
## Project TODOs

This project uses the `to` CLI for project-scoped task tracking.

- Run `to ls` to inspect current tasks before starting work.
- Run `to tree <number>` to inspect a task and its subtasks.
- Run `to add "task text"` to add follow-up work.
- Run `to add "task text" --parent <number>` to add subtasks.
- Use `--priority <high|medium|low>` and `--label <label>` for task metadata.
- Run `to done <number>` when a task is complete.
- Prefer `to do <number> --create-branch` when starting agent-driven work.
<!-- to:todo-instructions:end -->

# Antigravity Session Viewer

English | [中文](README-ZH.md)

A pure front-end (HTML5) viewer for Antigravity's local conversation history. No server required — your data never leaves the browser.

## Usage

1. Open `index.html` directly in Chrome / Edge (`file://` works).
2. Click "选择目录" (Choose folder) and select `C:\Users\<username>\.gemini\antigravity` (selecting `.gemini` also works).
3. The sidebar lists conversations grouped by project, with subagent conversations nested under their parent. Click a conversation to view the full transcript. The "全部折叠 / 全部展开" (Collapse all / Expand all) button next to the search box folds or unfolds every project at once.

Chrome / Edge remember the folder, so next time just click "打开上次目录" (Open last folder). Other browsers fall back to a folder-upload picker.

## Data layout

| Location | Contents |
| --- | --- |
| `conversation_summaries.db` → `conversation_summaries` | One row per conversation: `conversation_id` (UUID), `title`, `project_id`, `workspace_uris`, `parent_conversation_id` (subagents), etc. |
| `conversations/<UUID>.db` → `steps` | Each step of the conversation; `step_payload` is schemaless protobuf |
| `conversations/<UUID>.db-wal` | Data not yet checkpointed into the main file; merged automatically on load |
| `conversations/<UUID>.pb` | Legacy format, encrypted, cannot be decoded |

Fields identified in `step_payload` (by field number):

- `1` step type, `4` status, `5` metadata (`5.1` timestamp, `5.4` tool call `{1 id, 2 name, 3 args JSON}`)
- Type 14, user input: `19.2` text
- Type 15, assistant response: `20.1`/`20.8` body, `20.3` thinking, `20.7` tool calls
- Type 21, run command: `28.23` command, `28.2` working directory, `28.21.1` output
- Type 132, generic tool result: `140.2.1` output
- Type 127, invoke subagent: `143.9` tasks, `143.10.1` subagent conversation UUIDs
- Other types are shown generically; every step has a "原始数据" (raw data) toggle showing the full decoded tree

## Files

- `index.html`, `css/style.css`
- `js/app.js` UI and data loading, `js/proto.js` protobuf decoder, `js/wal.js` WAL merging
- `lib/` sql.js 1.10.3 (wasm embedded as base64 so it works under `file://`), marked 12.0.2

# Antigravity 会话查看器

[English](README.md) | 中文

纯前端（H5）的 Antigravity 本地会话记录查看器，不需要服务器，数据不离开浏览器。

## 使用

1. 用 Chrome / Edge 直接双击打开 `index.html`（`file://` 即可）。
2. 点击「选择目录」，选择 `C:\Users\<用户名>\.gemini\antigravity`（选 `.gemini` 也可以）。
3. 左侧按工程列出会话，子代理会话挂在父会话下；点击会话查看完整记录。搜索框旁的「全部折叠 / 全部展开」按钮可一键折叠或展开所有工程。

Chrome / Edge 会记住目录，下次点「打开上次目录」即可；其他浏览器会退回到文件夹上传方式。

## 数据结构

| 位置 | 内容 |
| --- | --- |
| `conversation_summaries.db` → `conversation_summaries` | 每个会话一行：`conversation_id`(UUID)、`title`、`project_id`、`workspace_uris`、`parent_conversation_id`(子代理) 等 |
| `conversations/<UUID>.db` → `steps` | 会话的每一步，`step_payload` 是无 schema 的 protobuf |
| `conversations/<UUID>.db-wal` | 尚未写回的数据，加载时自动合并 |
| `conversations/<UUID>.pb` | 旧版格式，内容已加密，无法解码 |

`step_payload` 中已识别的字段（字段号）：

- `1` 步骤类型，`4` 状态，`5` 元数据（`5.1` 时间戳，`5.4` 工具调用 `{1 id, 2 名称, 3 参数 JSON}`）
- 类型 14 用户输入：`19.2` 文本
- 类型 15 助手回复：`20.1`/`20.8` 正文，`20.3` 思考过程，`20.7` 工具调用
- 类型 21 运行命令：`28.23` 命令，`28.2` 工作目录，`28.21.1` 输出
- 类型 132 通用工具结果：`140.2.1` 输出
- 类型 127 调用子代理：`143.9` 任务，`143.10.1` 子会话 UUID
- 其他类型按通用方式展示；每一步都可展开「原始数据」查看完整解码树

## 文件

- `index.html`、`css/style.css`
- `js/app.js` 界面与数据读取，`js/proto.js` protobuf 解码，`js/wal.js` WAL 合并
- `lib/` sql.js 1.10.3（wasm 以 base64 内嵌，保证 `file://` 下可用）、marked 12.0.2

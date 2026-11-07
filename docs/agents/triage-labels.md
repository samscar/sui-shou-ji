# 分诊标签

工程类 skill 使用五种规范的分诊角色。本文件把这些角色映射到本仓库实际使用的标签字符串。

| mattpocock/skills 中的标签 | 本仓库追踪器中的标签 | 含义 |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | 维护者需要先评估该 issue |
| `needs-info` | `needs-info` | 等待报告者补充信息 |
| `ready-for-agent` | `ready-for-agent` | 规格已完整，可交给 AFK agent 执行 |
| `ready-for-human` | `ready-for-human` | 需要人来实现 |
| `wontfix` | `wontfix` | 不予处理 |

当 skill 提到某个角色（例如「打上 AFK-ready 的分诊标签」）时，使用本表中对应的标签字符串。

## 本仓库的落地形式

本仓库使用本地 markdown 追踪器（见 `issue-tracker.md`），因此标签不落在追踪器平台的 label 字段上，
而是记为 issue 或 spec 文件靠顶部的 `Status:` 行。例如 `.scratch/trip-range/spec.md` 的首行为
`Status: ready-for-agent`，对应上表第三行。

用于 wayfinding 子工单时，`Status:` 行记录的是 `claimed` / `resolved`，属于工单生命周期状态，
与本节的分诊角色是两套取值，不要混用。

若将来需要改用其他说法（例如追踪器已有 `bug:triage` 这类既有标签），编辑上表右侧一列即可。

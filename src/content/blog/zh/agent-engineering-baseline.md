---
title: AI Agent 应用的第一条工程原则
description: 在追求自主性之前，先让系统的边界、状态与失败变得可观察。
pubDate: 2026-07-15
lang: zh
tags: [AI Agent, 软件工程]
featured: true
translationKey: agent-engineering-baseline
---

一个 Agent 能够调用更多工具、执行更长任务，并不等于它更可靠。真正进入工程环境后，首先需要解决的不是“还能让它做什么”，而是“当它没有按预期工作时，我们能否准确知道发生了什么”。

## 从可观察性开始

至少记录四类信息：用户目标、模型决策、工具输入输出，以及最终状态。它们组成一次任务的完整轨迹。没有这条轨迹，调试只能依赖猜测。

```ts
type AgentTrace = {
  goal: string;
  steps: Array<{ tool: string; input: unknown; output: unknown }>;
  status: 'completed' | 'failed' | 'needs_input';
};
```

## 明确失败语义

“没有完成”可能意味着工具超时、权限不足、输入缺失，也可能只是模型选择了错误路径。系统应当把这些状态区分开，而不是统一返回一个模糊的错误。

## 自主性应当逐级开放

先让 Agent 在可回放、可中断、可确认的流程中工作，再逐步增加自主决策范围。每增加一层能力，都应同时增加对应的观测与约束。

工程化的目标不是消除不确定性，而是让不确定性可以被发现、理解和处理。

---
title: 快速开始
description: 安装部署 RTC Agent Server
---

> 🚧 **文档建设中** — 快速上手指南、API 文档、部署教程即将推出。

## 安装

RTC Agent Server 使用 Go 编写，支持多种安装方式。

### 从源码构建

```bash
git clone https://github.com/rtc-agent/rtc-agent.git
cd rtc-agent/server
go build -o rtc-agent
```

### 配置文件

创建 `config.yaml`：

```yaml
server:
  port: 8080
  host: 0.0.0.0

database:
  driver: postgres
  dsn: "postgresql://user:pass@localhost:5432/rtc_agent?sslmode=disable"

redis:
  addr: "localhost:6379"

ai:
  provider: anthropic
  api_key: "${ANTHROPIC_API_KEY}"
```

## 运行

```bash
./rtc-agent serve --config config.yaml
```

## 前端接入

在你的网站中添加 Web Component：

```html
<script type="module">
  import '@rtc-agent/web-components';
</script>

<rtc-agent-chat server-url="ws://localhost:8080"></rtc-agent-chat>
```

## 下一步

- [什么是 RTC Agent](/introduction/) — 了解核心概念和架构
- GitHub — 查看源码和示例
- 联系我们 — 如有问题，欢迎提交 Issue

---

如有兴趣提前体验或参与共建，欢迎 [提交 Issue](https://github.com/rtc-agent/rtc-agent/issues) 或联系维护者。

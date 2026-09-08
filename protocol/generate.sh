#!/bin/bash
# 使用 redocly bundle 合并文件，然后用 oapi-codegen / openapi-typescript 生成代码
# Go 代码输出到 rtc-agent/pkg/protocol/
# TypeScript 代码输出到 rtc-agent-component/packages/protocol/

set -e

PROTOCOL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$PROTOCOL_DIR/../../" && pwd)"

GO_OUT="$REPO_ROOT/server/pkg/protocol"
TS_OUT="$REPO_ROOT/web-components/packages/protocol"

echo "=== Protocol 源码目录: $PROTOCOL_DIR ==="
echo ""

if [ ! -f "$PROTOCOL_DIR/api.yaml" ]; then
    echo "⚠ api.yaml 不存在，跳过"
    exit 0
fi

echo "=== Go 代码生成 ==="
echo "输出到: $GO_OUT/models.gen.go"
oapi-codegen -config "$PROTOCOL_DIR/oapi-codegen.yaml" \
    -o "$GO_OUT/models.gen.go" \
    "$PROTOCOL_DIR/api.yaml"
echo "  ✓ models.gen.go"

echo ""
echo "=== TypeScript 代码生成 ==="
echo "输出到: $TS_OUT/models.gen.ts"
openapi-typescript "$PROTOCOL_DIR/api.yaml" -o "$TS_OUT/models.gen.ts"
echo "  ✓ models.gen.ts"

echo ""
echo "✓ 生成完成"

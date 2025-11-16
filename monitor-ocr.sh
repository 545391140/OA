#!/bin/bash
# 实时监控 OCR 请求日志

echo "正在监控 OCR 请求..."
echo "请在浏览器中进行 OCR 识别测试"
echo "========================================"
tail -f /tmp/oa-server.log | grep --line-buffered -E "OCR|recognize|收到|识别|Error|error|mistral|dashscope" --color=auto



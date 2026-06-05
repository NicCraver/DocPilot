#!/bin/bash
APP="/Applications/DocPilot.app"

echo ""
echo "  DocPilot — 解除 macOS 隔离属性"
echo "  ─────────────────────────────────"
echo ""

if [ ! -d "$APP" ]; then
  echo "  ⚠  未找到应用程序："
  echo "     $APP"
  echo ""
  echo "  请先将 DocPilot 拖入「应用程序」文件夹，"
  echo "  再双击「解除隔离」图标。"
  echo ""
  read -p "  按回车键关闭..." _
  exit 1
fi

xattr -d com.apple.quarantine "$APP" 2>/dev/null
if [ $? -ne 0 ]; then
  xattr -cr "$APP" 2>/dev/null
fi

echo "  ✓  已处理隔离属性"
echo ""
echo "  现在可以从启动台或「应用程序」打开 DocPilot。"
echo ""
read -p "  按回车键关闭..." _

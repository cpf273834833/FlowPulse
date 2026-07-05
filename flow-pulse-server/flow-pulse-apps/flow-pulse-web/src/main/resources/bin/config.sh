#!/bin/bash
# OMP 参数配置脚本
# OMP 在模块安装成功、启动之前调用此脚本，将 bootstrap 参数写入启停管理脚本的 bootstrap.options

SCRIPT_DIR=$(cd "$(dirname "$0")"; pwd)
OPTIONS_FILE="$SCRIPT_DIR/../config/bootstrap.options"

# 确保 config 目录存在
mkdir -p "$(dirname "$OPTIONS_FILE")"

# 初始化文件
> "$OPTIONS_FILE"

# 从 OMP 平台传入的 JVM 参数
if [ -n "$JVM" ]; then
    echo "JVM_OPTS=$JVM" >> "$OPTIONS_FILE"
else
    echo "JVM_OPTS=-Xmx512m -Xms256m -Xss512K -XX:MaxMetaspaceSize=128m" >> "$OPTIONS_FILE"
fi

# Apollo 配置中心相关参数（从 OMP 安装时传入）
if [ -n "$CONFIG_SERVICE_URL" ]; then
    echo "CONFIG_SERVICE_URL=$CONFIG_SERVICE_URL" >> "$OPTIONS_FILE"
fi

if [ -n "$APOLLO_META" ]; then
    echo "APOLLO_META=$APOLLO_META" >> "$OPTIONS_FILE"
fi

echo "INFO: bootstrap.options generated at $OPTIONS_FILE"

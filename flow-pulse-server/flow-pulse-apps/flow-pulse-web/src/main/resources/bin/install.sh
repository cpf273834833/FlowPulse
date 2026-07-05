#!/bin/bash

source ~/.bash_profile

CURRENT_DIR=$(cd "$(dirname "$0")"; pwd)
cd $CURRENT_DIR
chmod 755 common.sh manage.sh config.sh
source ./common.sh

BASE_DIR=${UYUN_ROOT_DIR}/uyun/flowpulse
APP_NAME=flowpulse
MODULE_NAME=flowpulse-main

RUNNING_USER="${RUNNING_USER:-uyun}"

usage() {
    echo "usage:"
    echo "    sh install.sh optstring parameters"
    echo "    sh install.sh [options] [--] optstring parameters"
    echo "    sh install.sh [options] -o|--options optstring [options] [--] parameters"
    echo ""
    echo "Options:"
    echo "    --running-user                     run user, default: uyun"
    echo "    --local-ip                         local node ip, eg: 10.1.241.3"
    echo "    --remote-ips                       remote node ips"
    echo "    --install-role                     install role"
    echo "    --config-address                   apollo config service address"
    echo "    --config-user                      apollo config user"
    echo "    --config-passwd                    apollo config password"
    echo "    --extend-params                    extend params, eg: local-ip=x&install-role=y"
    echo "    -h, --help                         help"
}

ARGS=$(getopt -o h:: --long running-user:,local-ip:,remote-ips:,install-role:,config-address:,config-user:,config-passwd:,extend-params:,help:: -n 'install.sh' -- "$@")

if [ $? != 0 ]; then
    usage
    exit 1
fi

eval set -- "$ARGS"

while true; do
    case "$1" in
        -l|--local-ip)
            LOCAL_IP=$2
            shift 2
            ;;
        --remote-ips)
            REMOTE_IPS=$2
            shift 2
            ;;
        --install-role)
            INSTALL_ROLE=$2
            shift 2
            ;;
        --running-user)
            RUNNING_USER=$2
            shift 2
            ;;
        --config-address)
            CONFIG_ADDRESS=$2
            shift 2
            ;;
        --config-user)
            CONFIG_USER=$2
            shift 2
            ;;
        --config-passwd)
            CONFIG_PASSWD=$2
            shift 2
            ;;
        --extend-params)
            EXTEND_PARAMS=$2
            shift 2
            ;;
        -h|--help)
            usage
            exit 1
            ;;
        --)
            break
            ;;
        *)
            echo "Invalid parameter: $1"
            exit 1
            ;;
    esac
done

# 解析 --extend-params 中的 key=value&key=value 格式参数
parse_extend_params() {
    if [ -n "$EXTEND_PARAMS" ]; then
        echo "Parsing extend params: $EXTEND_PARAMS"
        # 按 & 分割，逐个解析 key=value
        local save_ifs=$IFS
        IFS='&'
        for pair in $EXTEND_PARAMS; do
            local key="${pair%%=*}"
            local val="${pair#*=}"
            case "$key" in
                local-ip)
                    LOCAL_IP="${LOCAL_IP:-$val}"
                    ;;
                install-role)
                    INSTALL_ROLE="${INSTALL_ROLE:-$val}"
                    ;;
                *)
                    echo "Unknown extend param: $key=$val"
                    ;;
            esac
        done
        IFS=$save_ifs
    fi
}

parse_extend_params

update_chmod() {
    ensure_dir "$BASE_DIR"
    chown_dir "$BASE_DIR" "$RUNNING_USER"
    chmod_dir "$BASE_DIR"
}

install_flowpulse() {
    INSTALL_DIR=$BASE_DIR/main

    # 设置生产环境 active profile
    local CONFIG_FILE=$INSTALL_DIR/config/application.yml
    if [ -f "$CONFIG_FILE" ]; then
        sed -i "s/active:.*/active: prod/g" "$CONFIG_FILE"
    fi

   # 替换 Apollo 配置中心地址
    if [ -n "$CONFIG_SERVICE_URL" ] && [ -f "$CONFIG_FILE" ]; then
        sed -i "s|url: http://.*|url: ${CONFIG_SERVICE_URL}|g" "$CONFIG_FILE"
        sed -i "s|-Dwhale\.distributed\.config\.server\.url=[^ \"]*|-Dwhale.distributed.config.server.url=${CONFIG_SERVICE_URL}|g" "$INSTALL_DIR/bin/manage.sh"
        echo "Apollo config server URL updated to: ${CONFIG_SERVICE_URL}"
    fi

    # 确保 data 目录存在（H2 数据库文件存储）
#    ensure_dir "$INSTALL_DIR/data"
#    chown_dir "$INSTALL_DIR/data" "$RUNNING_USER"

    # 如果已有 flowpulse 进程在运行则先停止
    if [ -n "$(ps aux | grep 'app.name=flowpulse' | grep -v grep)" ]; then
        pkill -9 -f 'app.name=flowpulse'
        sleep 2
    fi

    echo "flowpulse starting..."
#    "$INSTALL_DIR"/bin/manage.sh start
}

update_chmod
install_flowpulse

#!/bin/sh

source ~/.bash_profile
umask 077

BIN_DIR=$(cd "$(dirname "$0")"; pwd)
WORK_HOME=$(dirname $BIN_DIR)
APP_NAME=flowpulse
MAIN_CLASS=com.flowpulse.web.FlowPulseApplication
DEBUG_PORT=5008
CLASSPATH="$WORK_HOME/config:$WORK_HOME/lib/*"

mkdir -p "$WORK_HOME/data"

# 默认 JVM 参数
BOOTSTRAP_OPTS="-Xmx512m -Xms256m -Xss512K -XX:MaxMetaspaceSize=128m"

# 从 bootstrap.options 读取参数
if [ -f "$WORK_HOME/config/bootstrap.options" ]; then
    JVM_OPTS_LINE=$(sed -n 's/^JVM_OPTS=//p' "$WORK_HOME/config/bootstrap.options")
    if [ -n "$JVM_OPTS_LINE" ]; then
        BOOTSTRAP_OPTS="$JVM_OPTS_LINE"
    fi
fi

APOLLO_OPTS=""
# distributed-config 读取 whale.distributed.config.server.url=${apollo.url}
# OMP 传入的是 host:port 格式，需补充 http:// 前缀
ensure_protocol() {
    local url="$1"
    case "$url" in
        http://*|https://*) echo "$url" ;;
        *) echo "http://$url" ;;
    esac
}
APOLLO_OPTS="$APOLLO_OPTS -Dwhale.distributed.config.server.url=$CONFIG_SERVICE_URL"
APOLLO_OPTS="$APOLLO_OPTS -Dwhale.distributed.config.namespaces=common.properties"
APOLLO_OPTS="$APOLLO_OPTS -Dwhale.distributed.config.bootstrap.enabled=true"
APOLLO_OPTS="$APOLLO_OPTS -Dwhale.distributed.config.bootstrap.eagerLoad.enabled=true"
JAVA_OPTS="-Dapp.name=$APP_NAME \
           -Dinstall.dir=$WORK_HOME \
           -Dspring.profiles.active=prod \
           -Dlogging.config=$WORK_HOME/config/logback-spring.xml \
           -Dspring.config.location=file:$WORK_HOME/config/ \
           -Duser.dir=$WORK_HOME \
           $BOOTSTRAP_OPTS \
           $APOLLO_OPTS \
           -XX:+UseG1GC \
           -XX:+ExplicitGCInvokesConcurrent"

usage() {
    echo "Usage: $APP_NAME ( commands ... )"
    echo "commands:"
    echo "  -c   command name, optional value: run|start|stop|restart|debug|status"
    echo "       can also call it by '$APP_NAME start'"
    echo "  -m   java home"
    echo "  -d   java opts"
    echo "  -u   running user"
    echo "  -p   debug port"
    echo "  -h   help"
}

ARGS=()
while [ $# -gt 0 ]; do
    unset OPTIND
    unset OPTARG
    while getopts c:m:d:u:p:h options; do
        case $options in
            c) COMMAND="$OPTARG";;
            m) JAVA_HOME="$OPTARG";;
            d) JAVA_OPTS="$JAVA_OPTS $OPTARG";;
            u) RUNNING_USER="$OPTARG";;
            p) DEBUG_PORT="$OPTARG";;
            h) usage
               exit 1;;
           \?) usage
               exit 1;;
        esac
    done
    shift $((OPTIND-1))
    if [ ! -z "$1" ] ; then
        ARGS+=($1)
    fi
    shift
done

type java >/dev/null 2>&1 || { echo >&2 "java command not found."; exit 1; }

eval_pid() {
    PID=0
    if [ -n "$(ps -ef | grep "app.name=$APP_NAME" | grep -v grep)" ]; then
        PID=($(ps -ef | grep "app.name=$APP_NAME" | grep -v grep | awk '{print $2}'))
    fi
}

execute() {
    cd $BIN_DIR
    if [ ! -z "$RUNNING_USER" ]; then
        [[ $(id -un) = "$RUNNING_USER" ]] && sh -c "$1" || su - $RUNNING_USER -c "$1"
    else
        sh -c "$1"
    fi
}

run() {
    eval_pid
    if [ $PID -ne 0 ]; then
        echo "WARN: $APP_NAME already started (PID=${PID[@]})."
    else
        execute "java $JAVA_OPTS -cp $CLASSPATH $MAIN_CLASS"
    fi
}

start() {
    eval_pid
    if [ $PID -ne 0 ]; then
        echo "WARN: $APP_NAME already started (PID=${PID[@]})."
    else
        execute "nohup java $JAVA_OPTS -cp $CLASSPATH $MAIN_CLASS > /dev/null 2>&1 &"
        if [ $? -eq 0 ]; then
            sleep 3
            eval_pid
            if [ $PID -ne 0 ]; then
                echo "INFO: $APP_NAME started (PID=${PID[@]})."
            else
                echo "ERROR: $APP_NAME start failed."
                exit 1
            fi
        else
            echo "ERROR: $APP_NAME start failed."
            exit 1
        fi
    fi
}

stop() {
    eval_pid
    if [ $PID -ne 0 ]; then
        echo -n "INFO: Stopping $APP_NAME (PID=${PID[@]}) ..... "
        execute "kill ${PID[@]}"
        # 等待最多 30 秒让进程优雅退出
        local waited=0
        while [ $waited -lt 30 ]; do
            eval_pid
            if [ $PID -eq 0 ]; then
                echo "[OK]."
                return 0
            fi
            sleep 1
            waited=$((waited + 1))
        done
        # 超时则强制 kill
        echo -n "timeout, force killing... "
        execute "kill -9 ${PID[@]}"
        sleep 2
        eval_pid
        if [ $PID -eq 0 ]; then
            echo "[OK]."
        else
            echo "[Failed]."
            exit 1
        fi
    else
        echo "WARN: $APP_NAME not running."
    fi
}

debug() {
    eval_pid
    if [ $PID -ne 0 ]; then
        echo "WARN: $APP_NAME already started (PID=${PID[@]})."
    else
        DEBUG_OPTS="-Xdebug -Xnoagent -Djava.compiler=NONE -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=$DEBUG_PORT"
        execute "java $JAVA_OPTS $DEBUG_OPTS -cp $CLASSPATH $MAIN_CLASS"
    fi
}

status_cmd() {
    eval_pid
    if [ $PID -ne 0 ]; then
        echo "INFO: $APP_NAME running (PID=${PID[@]})."
        exit 0
    else
        echo "WARN: $APP_NAME not running."
        exit 1
    fi
}

if [ -z "$COMMAND" ]; then
    if [ ${#ARGS[@]} -eq 0 ]; then
        COMMAND=run
    else
        COMMAND=${ARGS[0]}
    fi
fi

case "$COMMAND" in
    'run')
        run
        ;;
    'start')
        start
        ;;
    'stop')
        stop
        ;;
    'restart')
        stop
        sleep 3
        start
        ;;
    'debug')
        debug
        ;;
    'status')
        status_cmd
        ;;
    *)
        exit 1
esac

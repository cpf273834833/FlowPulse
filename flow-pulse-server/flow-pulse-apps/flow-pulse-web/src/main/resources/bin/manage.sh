#!/bin/sh

source ~/.bash_profile
umask 077

BIN_DIR=$(cd "$(dirname "$0")"; pwd)
WORK_HOME=$(dirname "$BIN_DIR")
APP_NAME=flowpulse
MAIN_CLASS=com.flowpulse.web.FlowPulseApplication
DEBUG_PORT=5008
CLASSPATH=":$WORK_HOME/lib/*"

BOOTSTRAP_OPTS="-Xmx512m -Xms256m -Xss512K -XX:MaxMetaspaceSize=128m"
if [ -f "$WORK_HOME/config/bootstrap.options" ]; then
    JVM_OPTS_LINE=$(sed -n 's/^JVM_OPTS=//p' "$WORK_HOME/config/bootstrap.options")
    if [ -n "$JVM_OPTS_LINE" ]; then
        BOOTSTRAP_OPTS="$JVM_OPTS_LINE"
    fi
fi

JAVA_OPTS="-Dapp.name=$APP_NAME \
           -Dinstall.dir=$WORK_HOME \
           -Dspring.profiles.active=prod \
           -Dspring.config.location=file:$WORK_HOME/config/ \
           -Duser.dir=$WORK_HOME \
           $BOOTSTRAP_OPTS \
           -XX:+UseG1GC \
           -XX:+ExplicitGCInvokesConcurrent"

eval_pid() {
    PID=0
    if [ -n "$(ps -ef | grep "app.name=$APP_NAME" | grep -v grep)" ]; then
        PID=$(ps -ef | grep "app.name=$APP_NAME" | grep -v grep | awk '{print $2}')
    fi
}

run() {
    eval_pid
    if [ "$PID" != "0" ]; then
        echo "WARN: $APP_NAME already started (PID=$PID)."
    else
        java $JAVA_OPTS -cp "$CLASSPATH" $MAIN_CLASS
    fi
}

start() {
    eval_pid
    if [ "$PID" != "0" ]; then
        echo "WARN: $APP_NAME already started (PID=$PID)."
    else
        nohup java $JAVA_OPTS -cp "$CLASSPATH" $MAIN_CLASS > /dev/null 2>&1 &
        sleep 3
        eval_pid
        if [ "$PID" != "0" ]; then
            echo "INFO: $APP_NAME started (PID=$PID)."
        else
            echo "ERROR: $APP_NAME start failed."
            exit 1
        fi
    fi
}

stop() {
    eval_pid
    if [ "$PID" != "0" ]; then
        kill $PID
        echo "INFO: $APP_NAME stopped."
    else
        echo "WARN: $APP_NAME not running."
    fi
}

case "$1" in
    start) start ;;
    stop) stop ;;
    restart) stop && sleep 3 && start ;;
    *) run ;;
esac

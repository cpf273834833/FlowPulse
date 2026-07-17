# FlowPulse 开发环境数据基准

> 数据源：`http://10.1.53.201:7508/portal/#/flowpulse`
>
> 采集日期：2026-07-12
>
> 采集原则：仅调用 GET 接口，不执行新增、修改、删除、同步、测试、确认告警等操作。

## 采集状态

门户登录及只读接口认证均已成功。所有接口返回 `code: 200`。接口响应中的
Token、密码、API Key 等认证字段不归档具体值，统一按敏感信息处理。

## 已确认的环境区域数据

- 环境总数：1
- 管理区总数：2
- 计算区总数：3
- 已配置区域：1/5
- 环境：开发环境（编码 `DEV`，描述“我是开发环境”）
  - 亦庄管理区（编码 `YZ`）
    - 平台：未配置
    - OMP：未配置
    - 廊坊计算区（编码 `JSQ-LF`）：平台、OMP 均未配置
  - 合肥管理区（编码 `HF`）
    - 平台：未配置
    - OMP：`http://10.1.56.107:7500/`
    - 滨湖 B 区（编码 `BH-B`）：平台、OMP 均未配置
    - 滨湖 A 区（编码 `BH-A`）：平台、OMP 均未配置

## 配置数据统计

| 数据域 | GET 接口 | 记录数 | 状态 |
| --- | --- | ---: | --- |
| 环境区域 | `/flowpulse/frontapi/v1/environment-region/page` | 1 个环境、5 个区域、1 个接入配置 | 已采集 |
| 基础设施 | `/flowpulse/frontapi/v1/infrastructure/page` | 3 | 已采集 |
| 逻辑对象 | `/flowpulse/frontapi/v1/logical-objects/page` | 2 | 已采集 |
| 执行节点 | `/flowpulse/frontapi/v1/executor-nodes/page` | 12 | 已采集 |
| 指标定义 | `/flowpulse/frontapi/v1/metrics/page` | 10 | 已采集 |
| 指标实现 | `/flowpulse/frontapi/v1/metrics/implementations/page` | 10 | 已采集 |
| 资源指标配置 | `/flowpulse/frontapi/v1/metrics/resource-configs/page` | 8 | 已采集 |
| 阈值规则 | `/flowpulse/frontapi/v1/threshold-rules/page` | 4 | 已采集 |
| 通知渠道 | `/flowpulse/frontapi/v1/notification-channels` | 0 | 已采集 |
| 数据流拓扑 | `/flowpulse/frontapi/v1/topologies/page` | 2 | 已采集 |
| 告警 | `/flowpulse/frontapi/v1/alerts/page` | 298 | 已采集（默认页 10 条） |

## 关键业务数据

### 基础设施

- 平台 Spark：启用、连接正常，最近同步 14 项。
- 平台 Elasticsearch：停用、连接状态未知，最近同步 1713 项；最近一次连接测试通过。
- 平台 Kafka：启用、连接正常，最近同步 262 项。
- 统计卡显示总数 3、正常 3、异常 0、启用 2、类型数 3。

### 逻辑对象与执行节点

- 逻辑对象 2 个：Spark 逻辑作业、Elasticsearch 日期索引。
- Spark 逻辑对象实例 1 个且活动实例 1 个。
- Elasticsearch 逻辑对象实例 18 个，活动实例为 0。
- 执行节点 12 个：1 个连接正常、1 个认证失败、其余显示未知。

### 拓扑、阈值与告警

- 拓扑“统一监控数据流”：11 个节点、10 条连线，告警等级 `CRITICAL`。
- 拓扑“测试”：2 个节点、0 条连线，告警等级 `NORMAL`。
- 阈值规则 4 条，全部启用且全部绑定拓扑元素。
- 告警记录 298 条；统计卡显示活动故障 3、紧急 1、错误 1。
- 默认告警页返回 10 条，所见记录均为已恢复且未确认。

## 后续归档格式

本文件保存经过脱敏的业务基准和验证结论。敏感认证信息不会写入项目文件。

## 本地接口对照结果

本地地址：`http://127.0.0.1:8466/flowpulse/frontapi/v1/`。

| 数据域 | 开发环境 | 本地环境 | 结论 |
| --- | ---: | ---: | --- |
| 环境 | 1 | 0 | 缺少业务配置 |
| 区域 | 5 | 0 | 缺少业务配置 |
| 接入配置 | 1 | 0 | 缺少业务配置 |
| 基础设施 | 3 | 0 | 缺少业务配置 |
| 逻辑对象 | 2 | 0 | 缺少业务配置 |
| 执行节点 | 12 | 0 | 缺少业务配置 |
| 指标定义 | 10 | 10 | 数量一致，待逐字段核对 |
| 指标实现 | 10 | 10 | 数量一致，待逐字段核对 |
| 资源指标配置 | 8 | 0 | 缺少业务配置 |
| 阈值规则 | 4 | 0 | 缺少业务配置 |
| 通知渠道 | 0 | 0 | 一致 |
| 数据流拓扑 | 2 | 0 | 缺少业务配置 |
| 告警 | 298 | 0 | 本地无运行数据 |

### 鉴权验证

- 未携带登录 Cookie 时，除指标相关的 3 个接口外，其余接口均返回业务码 `401`。
- `metrics/page`、`metrics/implementations/page`、`metrics/resource-configs/page` 在未登录时仍返回 `200`。
- 携带有效 Cookie 后，本地所有已验证接口均返回 `200`。
- 指标接口与其他配置接口的鉴权策略不一致，需要确认是否为设计预期。

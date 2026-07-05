package com.flowpulse.web.application;

import com.flowpulse.alert.domain.model.AlertStateEntity;
import com.flowpulse.alert.infrastructure.persistence.mapper.AlertStateMapper;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import com.flowpulse.metric.infrastructure.persistence.mapper.ResourceMetricConfigMapper;
import com.flowpulse.topology.api.response.TopologyRuntimeAlertResponse;
import com.flowpulse.topology.api.response.TopologyRuntimeElementResponse;
import com.flowpulse.topology.api.response.TopologyRuntimeMetricResponse;
import com.flowpulse.topology.api.response.TopologyRuntimeResponse;
import com.flowpulse.topology.api.response.TopologyPageResponse;
import com.flowpulse.topology.api.response.TopologyResponse;
import com.flowpulse.topology.domain.model.TopologyEdgeEntity;
import com.flowpulse.topology.domain.model.TopologyNodeEntity;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyEdgeMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyNodeMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class TopologyRuntimeFacade {
    private final TopologyMapper topologyMapper;
    private final TopologyNodeMapper topologyNodeMapper;
    private final TopologyEdgeMapper topologyEdgeMapper;
    private final ResourceMetricConfigMapper metricConfigMapper;
    private final AlertStateMapper alertStateMapper;

    public TopologyRuntimeFacade(TopologyMapper topologyMapper,
                                 TopologyNodeMapper topologyNodeMapper,
                                 TopologyEdgeMapper topologyEdgeMapper,
                                 ResourceMetricConfigMapper metricConfigMapper,
                                 AlertStateMapper alertStateMapper) {
        this.topologyMapper = topologyMapper;
        this.topologyNodeMapper = topologyNodeMapper;
        this.topologyEdgeMapper = topologyEdgeMapper;
        this.metricConfigMapper = metricConfigMapper;
        this.alertStateMapper = alertStateMapper;
    }

    public TopologyRuntimeResponse snapshot(String tenantId, String topologyId) {
        if (topologyMapper.selectById(tenantId, topologyId) == null) {
            TopologyRuntimeResponse empty = new TopologyRuntimeResponse();
            empty.setTopologyId(topologyId);
            empty.setLevel("UNKNOWN");
            empty.setRefreshedAt(Long.valueOf(System.currentTimeMillis()));
            empty.setAlertElementCount(Integer.valueOf(0));
            empty.setElements(Collections.<TopologyRuntimeElementResponse>emptyList());
            return empty;
        }

        List<TopologyNodeEntity> nodes = topologyNodeMapper.selectByTopologyId(tenantId, topologyId);
        List<TopologyEdgeEntity> edges = topologyEdgeMapper.selectByTopologyId(tenantId, topologyId);
        List<String> objectIds = objectIds(nodes);
        List<String> edgeIds = edgeIds(edges);
        List<ResourceMetricConfigEntity> configs = metricConfigMapper.selectTopologyRuntimeConfigs(tenantId, objectIds, edgeIds);
        List<AlertStateEntity> activeAlerts = alertStateMapper.selectPage(tenantId, "", "", "ACTIVE", "", topologyId, "", 0, 1000);

        Map<String, List<ResourceMetricConfigEntity>> configsByElement = groupConfigsByElement(nodes, edges, configs);
        Map<String, List<AlertStateEntity>> alertsByElement = groupAlertsByElement(activeAlerts);
        List<TopologyRuntimeElementResponse> elements = new ArrayList<TopologyRuntimeElementResponse>();
        for (TopologyNodeEntity node : nodes) {
            elements.add(toElement("NODE", node.getId(), node.getObjectType(), node.getObjectId(), configsByElement, alertsByElement));
        }
        for (TopologyEdgeEntity edge : edges) {
            elements.add(toElement("EDGE", edge.getId(), "TOPOLOGY_EDGE", edge.getId(), configsByElement, alertsByElement));
        }

        TopologyRuntimeResponse response = new TopologyRuntimeResponse();
        response.setTopologyId(topologyId);
        response.setElements(elements);
        response.setRefreshedAt(Long.valueOf(System.currentTimeMillis()));
        response.setLevel(maxLevel(elements));
        response.setAlertElementCount(Integer.valueOf(alertElementCount(elements)));
        return response;
    }

    public void fillTopologyLevels(String tenantId, TopologyPageResponse response) {
        if (response == null || response.getTopologies() == null || response.getTopologies().getRecords() == null) {
            return;
        }
        for (TopologyResponse topology : response.getTopologies().getRecords()) {
            topology.setAlertLevel(snapshot(tenantId, topology.getId()).getLevel());
        }
    }

    private TopologyRuntimeElementResponse toElement(String elementType,
                                                    String elementId,
                                                    String objectType,
                                                    String objectId,
                                                    Map<String, List<ResourceMetricConfigEntity>> configsByElement,
                                                    Map<String, List<AlertStateEntity>> alertsByElement) {
        String key = elementKey(elementType, elementId);
        List<TopologyRuntimeMetricResponse> metrics = toMetrics(configsByElement.get(key));
        List<TopologyRuntimeAlertResponse> alerts = toAlerts(alertsByElement.get(key));
        TopologyRuntimeElementResponse response = new TopologyRuntimeElementResponse();
        response.setElementId(elementId);
        response.setElementType(elementType);
        response.setObjectType(objectType);
        response.setObjectId(objectId);
        response.setMetrics(metrics);
        response.setAlerts(alerts);
        response.setLevel(maxAlertLevel(alerts));
        return response;
    }

    private Map<String, List<ResourceMetricConfigEntity>> groupConfigsByElement(List<TopologyNodeEntity> nodes,
                                                                                List<TopologyEdgeEntity> edges,
                                                                                List<ResourceMetricConfigEntity> configs) {
        Map<String, String> objectToNode = new HashMap<String, String>();
        for (TopologyNodeEntity node : nodes) {
            if (hasText(node.getObjectId())) {
                objectToNode.put(node.getObjectId(), node.getId());
            }
        }
        Set<String> edgeIdSet = new HashSet<String>();
        for (TopologyEdgeEntity edge : edges) {
            edgeIdSet.add(edge.getId());
        }
        Map<String, List<ResourceMetricConfigEntity>> result = new LinkedHashMap<String, List<ResourceMetricConfigEntity>>();
        for (ResourceMetricConfigEntity config : configs) {
            String elementKey = null;
            if ("TOPOLOGY_EDGE".equalsIgnoreCase(config.getObjectType()) && edgeIdSet.contains(config.getObjectId())) {
                elementKey = elementKey("EDGE", config.getObjectId());
            } else if (objectToNode.containsKey(config.getObjectId())) {
                elementKey = elementKey("NODE", objectToNode.get(config.getObjectId()));
            }
            if (elementKey != null) {
                if (!result.containsKey(elementKey)) {
                    result.put(elementKey, new ArrayList<ResourceMetricConfigEntity>());
                }
                result.get(elementKey).add(config);
            }
        }
        return result;
    }

    private Map<String, List<AlertStateEntity>> groupAlertsByElement(List<AlertStateEntity> alerts) {
        Map<String, List<AlertStateEntity>> result = new HashMap<String, List<AlertStateEntity>>();
        for (AlertStateEntity alert : alerts) {
            if (!hasText(alert.getTopologyElementId())) {
                continue;
            }
            String key = elementKey(defaultText(alert.getTopologyElementType(), "NODE"), alert.getTopologyElementId());
            if (!result.containsKey(key)) {
                result.put(key, new ArrayList<AlertStateEntity>());
            }
            result.get(key).add(alert);
        }
        return result;
    }

    private List<TopologyRuntimeMetricResponse> toMetrics(List<ResourceMetricConfigEntity> configs) {
        if (configs == null || configs.isEmpty()) {
            return Collections.emptyList();
        }
        List<ResourceMetricConfigEntity> sorted = new ArrayList<ResourceMetricConfigEntity>(configs);
        Collections.sort(sorted, new Comparator<ResourceMetricConfigEntity>() {
            @Override
            public int compare(ResourceMetricConfigEntity left, ResourceMetricConfigEntity right) {
                int order = intValue(left.getDisplayOrder(), 100) - intValue(right.getDisplayOrder(), 100);
                if (order != 0) return order;
                return defaultText(left.getMetricName(), "").compareTo(defaultText(right.getMetricName(), ""));
            }
        });
        List<TopologyRuntimeMetricResponse> metrics = new ArrayList<TopologyRuntimeMetricResponse>();
        for (ResourceMetricConfigEntity config : sorted) {
            TopologyRuntimeMetricResponse metric = new TopologyRuntimeMetricResponse();
            metric.setConfigId(config.getId());
            metric.setMetricDefinitionId(config.getMetricDefinitionId());
            metric.setMetricCode(config.getMetricCode());
            metric.setMetricName(config.getMetricName());
            metric.setDisplayName(hasText(config.getDisplayName()) ? config.getDisplayName() : config.getMetricName());
            metric.setDisplayOrder(config.getDisplayOrder());
            metric.setShowOnTopology(config.getShowOnTopology());
            metric.setCurrentValue(config.getCurrentValue());
            metric.setCurrentValueAt(config.getCurrentValueAt());
            metric.setCollectStatus(config.getLastCollectStatus());
            metric.setCollectMessage(config.getLastCollectMessage());
            metric.setLastCollectAt(config.getLastCollectAt());
            metrics.add(metric);
        }
        return metrics;
    }

    private List<TopologyRuntimeAlertResponse> toAlerts(List<AlertStateEntity> alerts) {
        if (alerts == null || alerts.isEmpty()) {
            return Collections.emptyList();
        }
        List<TopologyRuntimeAlertResponse> responses = new ArrayList<TopologyRuntimeAlertResponse>();
        for (AlertStateEntity alert : alerts) {
            TopologyRuntimeAlertResponse response = new TopologyRuntimeAlertResponse();
            response.setId(alert.getId());
            response.setMetricDefinitionId(alert.getMetricDefinitionId());
            response.setLevel(alert.getCurrentLevel());
            response.setStatus(alert.getStatus());
            response.setMessage(alert.getMessage());
            response.setTriggerValue(alert.getTriggerValue());
            response.setFirstTriggeredAt(alert.getFirstTriggeredAt());
            response.setLastChangedAt(alert.getLastChangedAt());
            responses.add(response);
        }
        Collections.sort(responses, new Comparator<TopologyRuntimeAlertResponse>() {
            @Override
            public int compare(TopologyRuntimeAlertResponse left, TopologyRuntimeAlertResponse right) {
                int severity = levelWeight(right.getLevel()) - levelWeight(left.getLevel());
                if (severity != 0) return severity;
                return longValue(right.getLastChangedAt()) > longValue(left.getLastChangedAt()) ? 1 : -1;
            }
        });
        return responses;
    }

    private List<String> objectIds(List<TopologyNodeEntity> nodes) {
        List<String> values = new ArrayList<String>();
        for (TopologyNodeEntity node : nodes) {
            if (hasText(node.getObjectId()) && !values.contains(node.getObjectId())) {
                values.add(node.getObjectId());
            }
        }
        return values;
    }

    private List<String> edgeIds(List<TopologyEdgeEntity> edges) {
        List<String> values = new ArrayList<String>();
        for (TopologyEdgeEntity edge : edges) {
            if (hasText(edge.getId())) {
                values.add(edge.getId());
            }
        }
        return values;
    }

    private String maxLevel(List<TopologyRuntimeElementResponse> elements) {
        String level = "NORMAL";
        for (TopologyRuntimeElementResponse element : elements) {
            if (levelWeight(element.getLevel()) > levelWeight(level)) {
                level = element.getLevel();
            }
        }
        return level;
    }

    private String maxAlertLevel(List<TopologyRuntimeAlertResponse> alerts) {
        String level = "NORMAL";
        for (TopologyRuntimeAlertResponse alert : alerts) {
            if (levelWeight(alert.getLevel()) > levelWeight(level)) {
                level = alert.getLevel();
            }
        }
        return level;
    }

    private int alertElementCount(List<TopologyRuntimeElementResponse> elements) {
        int count = 0;
        for (TopologyRuntimeElementResponse element : elements) {
            if (levelWeight(element.getLevel()) > levelWeight("NORMAL")) {
                count++;
            }
        }
        return count;
    }

    private String elementKey(String type, String id) {
        return defaultText(type, "").toUpperCase() + ":" + defaultText(id, "");
    }

    private int levelWeight(String level) {
        if ("EMERGENCY".equalsIgnoreCase(level) || "CRITICAL".equalsIgnoreCase(level)) return 5;
        if ("ERROR".equalsIgnoreCase(level)) return 4;
        if ("WARNING".equalsIgnoreCase(level)) return 3;
        if ("NOTICE".equalsIgnoreCase(level) || "REMIND".equalsIgnoreCase(level)) return 2;
        if ("UNKNOWN".equalsIgnoreCase(level)) return 1;
        return 0;
    }

    private int intValue(Integer value, int fallback) {
        return value == null ? fallback : value.intValue();
    }

    private long longValue(Long value) {
        return value == null ? 0L : value.longValue();
    }

    private String defaultText(String value, String fallback) {
        return hasText(value) ? value : fallback;
    }

    private boolean hasText(String value) {
        return value != null && value.trim().length() > 0;
    }
}

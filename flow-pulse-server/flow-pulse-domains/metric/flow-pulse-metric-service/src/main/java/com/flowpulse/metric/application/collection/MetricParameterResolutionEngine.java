package com.flowpulse.metric.application.collection;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.MissingNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import com.flowpulse.infrastructure.domain.model.InfrastructureEntity;
import com.flowpulse.infrastructure.domain.model.InfrastructureResourceEntity;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureMapper;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureResourceMapper;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import com.flowpulse.topology.domain.model.TopologyEdgeEntity;
import com.flowpulse.topology.domain.model.TopologyNodeEntity;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyEdgeMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyNodeMapper;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

class MetricParameterResolutionEngine {
    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\{([A-Za-z0-9_.-]+)}");

    private final ObjectMapper objectMapper;
    private final InfrastructureMapper infrastructureMapper;
    private final InfrastructureResourceMapper resourceMapper;
    private final TopologyNodeMapper topologyNodeMapper;
    private final TopologyEdgeMapper topologyEdgeMapper;
    private final MetricParameterValueTransformer valueTransformer;

    MetricParameterResolutionEngine(ObjectMapper objectMapper,
                                           InfrastructureMapper infrastructureMapper,
                                           InfrastructureResourceMapper resourceMapper,
                                           TopologyNodeMapper topologyNodeMapper,
                                           TopologyEdgeMapper topologyEdgeMapper,
                                           MetricParameterValueTransformer valueTransformer) {
        this.objectMapper = objectMapper;
        this.infrastructureMapper = infrastructureMapper;
        this.resourceMapper = resourceMapper;
        this.topologyNodeMapper = topologyNodeMapper;
        this.topologyEdgeMapper = topologyEdgeMapper;
        this.valueTransformer = valueTransformer;
    }

    public String resolve(ResourceMetricConfigEntity config) {
        String parameterJson = trim(config.getParameterJson());
        if (parameterJson.length() == 0) {
            return "";
        }
        try {
            JsonNode root = objectMapper.readTree(parameterJson);
            if (root.has("parameters")) {
                return resolveStructuredParameters(root, new ResolutionContext(config));
            }
            if (root.has("template") || root.has("resolvers")) {
                JsonNode resolved = resolveNode(root.path("template"), new ResolutionContext(config), parseResolvers(root.path("resolvers")));
                return objectMapper.writeValueAsString(resolved);
            }
            return parameterJson;
        } catch (Exception exception) {
            throw new IllegalStateException("Metric parameter template is invalid: " + exception.getMessage(), exception);
        }
    }

    private String resolveStructuredParameters(JsonNode root, ResolutionContext context) throws Exception {
        JsonNode parametersNode = root.path("parameters");
        ObjectNode resolved = objectMapper.createObjectNode();
        Iterator<Map.Entry<String, JsonNode>> fields = parametersNode.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            String key = entry.getKey();
            JsonNode parameterNode = entry.getValue();
            String valueMode = defaultText(text(parameterNode, "valueMode"), "FIXED");
            if ("FIELD".equalsIgnoreCase(valueMode)) {
                PlaceholderResolver directResolver = parseResolver(parameterNode, key);
                resolved.put(key, resolvePlaceholder(directResolver, context, ""));
                continue;
            }
            String template = text(parameterNode, "template");
            Map<String, PlaceholderResolver> resolvers = parseParameterResolvers(parameterNode.path("placeholders"));
            resolved.put(key, resolveText(template, context, resolvers));
        }
        return objectMapper.writeValueAsString(resolved);
    }

    private Map<String, PlaceholderResolver> parseResolvers(JsonNode resolversNode) {
        Map<String, PlaceholderResolver> resolvers = new LinkedHashMap<String, PlaceholderResolver>();
        if (!resolversNode.isArray()) {
            return resolvers;
        }
        for (JsonNode node : resolversNode) {
            PlaceholderResolver resolver = parseResolver(node, text(node, "placeholder"));
            if (hasText(resolver.placeholder)) {
                resolvers.put(resolver.placeholder, resolver);
            }
        }
        return resolvers;
    }

    private Map<String, PlaceholderResolver> parseParameterResolvers(JsonNode placeholdersNode) {
        Map<String, PlaceholderResolver> resolvers = new LinkedHashMap<String, PlaceholderResolver>();
        if (!placeholdersNode.isObject()) {
            return resolvers;
        }
        Iterator<Map.Entry<String, JsonNode>> fields = placeholdersNode.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            resolvers.put(entry.getKey(), parseResolver(entry.getValue(), entry.getKey()));
        }
        return resolvers;
    }

    private PlaceholderResolver parseResolver(JsonNode node, String placeholder) {
        PlaceholderResolver resolver = new PlaceholderResolver();
        resolver.placeholder = placeholder;
        resolver.sourceType = defaultText(text(node, "sourceType"), "FIXED_VALUE");
        resolver.fieldName = text(node, "fieldName");
        resolver.value = text(node, "value");
        resolver.format = text(node, "format");
        resolver.operator = text(node, "operator");
        resolver.compareValue = text(node, "compareValue");
        resolver.missingPolicy = defaultText(text(node, "missingPolicy"), "KEEP_PLACEHOLDER");
        parseTransform(resolver, node.path("transform"));
        return resolver;
    }

    private JsonNode resolveNode(JsonNode node, ResolutionContext context, Map<String, PlaceholderResolver> resolvers) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return TextNode.valueOf("");
        }
        if (node.isTextual()) {
            return TextNode.valueOf(resolveText(node.asText(), context, resolvers));
        }
        if (node.isObject()) {
            ObjectNode objectNode = objectMapper.createObjectNode();
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                objectNode.set(field.getKey(), resolveNode(field.getValue(), context, resolvers));
            }
            return objectNode;
        }
        return node;
    }

    private String resolveText(String text, ResolutionContext context, Map<String, PlaceholderResolver> resolvers) {
        Matcher matcher = PLACEHOLDER_PATTERN.matcher(text == null ? "" : text);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            String placeholder = matcher.group(1);
            PlaceholderResolver resolver = resolvers.get(placeholder);
            String replacement = resolver == null ? matcher.group(0) : resolvePlaceholder(resolver, context, matcher.group(0));
            matcher.appendReplacement(buffer, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private String resolvePlaceholder(PlaceholderResolver resolver, ResolutionContext context, String rawPlaceholder) {
        String value = applyTransform(sourceValue(resolver, context), resolver);
        if (matchesOperator(value, resolver)) {
            return value;
        }
        if ("EMPTY".equalsIgnoreCase(resolver.missingPolicy)) {
            return "";
        }
        if ("ERROR".equalsIgnoreCase(resolver.missingPolicy)) {
            throw new IllegalStateException("Metric parameter placeholder {" + resolver.placeholder + "} cannot be resolved.");
        }
        return rawPlaceholder;
    }

    private String sourceValue(PlaceholderResolver resolver, ResolutionContext context) {
        long now = System.currentTimeMillis();
        if ("FIXED_VALUE".equalsIgnoreCase(resolver.sourceType)) {
            return resolver.value;
        }
        if ("CURRENT_TIME_MILLIS".equalsIgnoreCase(resolver.sourceType)) {
            return String.valueOf(now);
        }
        if ("CURRENT_TIME_FORMATTED".equalsIgnoreCase(resolver.sourceType)) {
            return valueTransformer.transform(String.valueOf(now), "TIME_FORMAT", resolver.format,
                    resolver.outputFormat, null, null, null, 0);
        }
        if ("CURRENT_RESOURCE_FIELD".equalsIgnoreCase(resolver.sourceType)) {
            return fieldFromCurrentResource(context, resolver.fieldName);
        }
        if ("INFRA_CONNECTION_FIELD".equalsIgnoreCase(resolver.sourceType)) {
            return fieldFromInfrastructure(context, resolver.fieldName);
        }
        if ("SOURCE_NODE_RESOURCE_FIELD".equalsIgnoreCase(resolver.sourceType)) {
            return fieldFromTopologyNode(context.sourceNode(), resolver.fieldName, context.config.getTenantId());
        }
        if ("TARGET_NODE_RESOURCE_FIELD".equalsIgnoreCase(resolver.sourceType)) {
            return fieldFromTopologyNode(context.targetNode(), resolver.fieldName, context.config.getTenantId());
        }
        if ("TOPOLOGY_EDGE_FIELD".equalsIgnoreCase(resolver.sourceType)) {
            return fieldFromTopologyEdge(context.edge(), resolver.fieldName);
        }
        return "";
    }

    private String applyTransform(String value, PlaceholderResolver resolver) {
        return valueTransformer.transform(value, resolver.transformType, resolver.format, resolver.outputFormat,
                resolver.prefix, resolver.suffix, resolver.regex, resolver.groupIndex);
    }

    private boolean matchesOperator(String value, PlaceholderResolver resolver) {
        return valueTransformer.matches(value, resolver.operator, resolver.compareValue);
    }

    private String fieldFromCurrentResource(ResolutionContext context, String fieldName) {
        String configValue = fieldFromMetricConfig(context.config, fieldName);
        if (hasText(configValue)) {
            return configValue;
        }
        return fieldFromInfrastructureResource(context.currentResource(), fieldName);
    }

    private String fieldFromInfrastructure(ResolutionContext context, String fieldName) {
        InfrastructureEntity entity = context.infrastructure();
        if (entity == null || !hasText(fieldName)) {
            return "";
        }
        if ("id".equalsIgnoreCase(fieldName) || "infrastructureId".equalsIgnoreCase(fieldName)) return entity.getId();
        if ("code".equalsIgnoreCase(fieldName) || "infrastructureCode".equalsIgnoreCase(fieldName)) return entity.getCode();
        if ("name".equalsIgnoreCase(fieldName) || "infrastructureName".equalsIgnoreCase(fieldName)) return entity.getName();
        if ("type".equalsIgnoreCase(fieldName)) return entity.getType();
        if ("endpoint".equalsIgnoreCase(fieldName) || "connectionEndpoint".equalsIgnoreCase(fieldName)) return entity.getEndpoint();
        if ("authType".equalsIgnoreCase(fieldName)) return entity.getAuthType();
        if ("username".equalsIgnoreCase(fieldName)) return entity.getUsername();
        if ("apiKey".equalsIgnoreCase(fieldName)) return entity.getApiKey();
        return "";
    }

    private String fieldFromTopologyNode(TopologyNodeEntity node, String fieldName, String tenantId) {
        if (node == null || !hasText(fieldName)) {
            return "";
        }
        if ("id".equalsIgnoreCase(fieldName) || "nodeId".equalsIgnoreCase(fieldName)) return node.getId();
        if ("nodeKey".equalsIgnoreCase(fieldName)) return node.getNodeKey();
        if ("nodeName".equalsIgnoreCase(fieldName) || "objectName".equalsIgnoreCase(fieldName) || "resourceName".equalsIgnoreCase(fieldName)) return node.getObjectName();
        if ("nodeType".equalsIgnoreCase(fieldName)) return node.getNodeType();
        if ("objectType".equalsIgnoreCase(fieldName) || "resourceType".equalsIgnoreCase(fieldName)) return node.getObjectType();
        if ("objectId".equalsIgnoreCase(fieldName) || "resourceId".equalsIgnoreCase(fieldName)) return node.getObjectId();
        if ("objectCode".equalsIgnoreCase(fieldName) || "resourceCode".equalsIgnoreCase(fieldName) || "code".equalsIgnoreCase(fieldName)) return node.getObjectCode();
        InfrastructureResourceEntity resource = hasText(node.getObjectId()) ? resourceMapper.selectById(tenantId, node.getObjectId()) : null;
        return fieldFromInfrastructureResource(resource, fieldName);
    }

    private String fieldFromTopologyEdge(TopologyEdgeEntity edge, String fieldName) {
        if (edge == null || !hasText(fieldName)) {
            return "";
        }
        if ("id".equalsIgnoreCase(fieldName) || "edgeId".equalsIgnoreCase(fieldName)) return edge.getId();
        if ("edgeKey".equalsIgnoreCase(fieldName)) return edge.getEdgeKey();
        if ("edgeName".equalsIgnoreCase(fieldName)) return edge.getEdgeName();
        if ("edgeType".equalsIgnoreCase(fieldName)) return edge.getEdgeType();
        if ("relationType".equalsIgnoreCase(fieldName)) return edge.getRelationType();
        if ("relationId".equalsIgnoreCase(fieldName)) return edge.getRelationId();
        return "";
    }

    private String fieldFromMetricConfig(ResourceMetricConfigEntity config, String fieldName) {
        if (!hasText(fieldName)) return "";
        if ("tenantId".equalsIgnoreCase(fieldName)) return config.getTenantId();
        if ("objectType".equalsIgnoreCase(fieldName) || "resourceType".equalsIgnoreCase(fieldName)) return config.getObjectType();
        if ("objectId".equalsIgnoreCase(fieldName) || "resourceId".equalsIgnoreCase(fieldName)) return config.getObjectId();
        if ("objectCode".equalsIgnoreCase(fieldName) || "resourceCode".equalsIgnoreCase(fieldName) || "code".equalsIgnoreCase(fieldName)) return config.getObjectCode();
        if ("objectName".equalsIgnoreCase(fieldName) || "resourceName".equalsIgnoreCase(fieldName) || "name".equalsIgnoreCase(fieldName)) return config.getObjectName();
        if ("metricCode".equalsIgnoreCase(fieldName)) return config.getMetricCode();
        return "";
    }

    private String fieldFromInfrastructureResource(InfrastructureResourceEntity resource, String fieldName) {
        if (resource == null || !hasText(fieldName)) {
            return "";
        }
        if ("id".equalsIgnoreCase(fieldName) || "resourceId".equalsIgnoreCase(fieldName)) return resource.getId();
        if ("infrastructureId".equalsIgnoreCase(fieldName)) return resource.getInfrastructureId();
        if ("resourceType".equalsIgnoreCase(fieldName) || "objectType".equalsIgnoreCase(fieldName)) return resource.getResourceType();
        if ("resourceName".equalsIgnoreCase(fieldName) || "objectName".equalsIgnoreCase(fieldName) || "name".equalsIgnoreCase(fieldName)) return resource.getResourceName();
        if ("resourceCode".equalsIgnoreCase(fieldName) || "objectCode".equalsIgnoreCase(fieldName) || "code".equalsIgnoreCase(fieldName)) return resource.getResourceCode();
        if ("status".equalsIgnoreCase(fieldName)) return resource.getStatus();
        if ("lastSyncAt".equalsIgnoreCase(fieldName)) return resource.getLastSyncAt() == null ? "" : String.valueOf(resource.getLastSyncAt());
        return fieldFromMetadata(resource.getMetadataJson(), fieldName);
    }

    private String fieldFromMetadata(String metadataJson, String fieldName) {
        if (!hasText(metadataJson) || !hasText(fieldName)) {
            return "";
        }
        try {
            JsonNode metadata = objectMapper.readTree(metadataJson);
            JsonNode value = metadata.path(fieldName);
            if (value.isMissingNode()) value = findIgnoreCase(metadata, fieldName);
            if (value.isMissingNode() && "startedTime".equalsIgnoreCase(fieldName)) {
                value = firstExisting(metadata, new String[]{"starttime", "startTime", "startedAt", "submissionTime"});
            }
            if (value.isMissingNode() || value.isNull()) {
                return "";
            }
            return value.isValueNode() ? value.asText() : objectMapper.writeValueAsString(value);
        } catch (Exception ignored) {
            return "";
        }
    }

    private JsonNode findIgnoreCase(JsonNode metadata, String fieldName) {
        Iterator<String> names = metadata.fieldNames();
        while (names.hasNext()) {
            String name = names.next();
            if (name.equalsIgnoreCase(fieldName)) {
                return metadata.path(name);
            }
        }
        return MissingNode.getInstance();
    }

    private JsonNode firstExisting(JsonNode metadata, String[] fieldNames) {
        for (String fieldName : fieldNames) {
            JsonNode value = metadata.path(fieldName);
            if (!value.isMissingNode()) return value;
            value = findIgnoreCase(metadata, fieldName);
            if (!value.isMissingNode()) return value;
        }
        return MissingNode.getInstance();
    }

    private String text(JsonNode node, String fieldName) {
        if (node == null) {
            return "";
        }
        JsonNode value = node.path(fieldName);
        return value.isMissingNode() || value.isNull() ? "" : value.asText("");
    }

    private int intValue(JsonNode node, int fallback) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return fallback;
        }
        return node.asInt(fallback);
    }

    private void parseTransform(PlaceholderResolver resolver, JsonNode transformNode) {
        if (transformNode == null || transformNode.isMissingNode() || transformNode.isNull()) {
            resolver.transformType = hasText(resolver.format) ? "TIME_FORMAT" : "NONE";
            return;
        }
        resolver.transformType = defaultText(text(transformNode, "type"), "NONE");
        resolver.outputFormat = defaultText(text(transformNode, "outputFormat"), text(transformNode, "format"));
        resolver.prefix = text(transformNode, "prefix");
        resolver.suffix = text(transformNode, "suffix");
        resolver.regex = text(transformNode, "regex");
        resolver.groupIndex = intValue(transformNode.path("groupIndex"), 1);
    }

    private String defaultText(String value, String fallback) {
        return hasText(value) ? value : fallback;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean hasText(String value) {
        return value != null && value.trim().length() > 0;
    }

    private final class ResolutionContext {
        private final ResourceMetricConfigEntity config;
        private InfrastructureResourceEntity currentResource;
        private InfrastructureEntity infrastructure;
        private TopologyEdgeEntity edge;
        private TopologyNodeEntity sourceNode;
        private TopologyNodeEntity targetNode;

        private ResolutionContext(ResourceMetricConfigEntity config) {
            this.config = config;
        }

        private InfrastructureResourceEntity currentResource() {
            if (currentResource == null && hasText(config.getObjectId())) {
                currentResource = resourceMapper.selectById(config.getTenantId(), config.getObjectId());
            }
            return currentResource;
        }

        private InfrastructureEntity infrastructure() {
            if (infrastructure == null) {
                if (hasText(config.getObjectId()) && ("INFRASTRUCTURE".equalsIgnoreCase(config.getObjectType()) || "INFRA".equalsIgnoreCase(config.getObjectType()))) {
                    infrastructure = infrastructureMapper.selectById(config.getTenantId(), config.getObjectId());
                } else {
                    InfrastructureResourceEntity resource = currentResource();
                    if (resource != null && hasText(resource.getInfrastructureId())) {
                        infrastructure = infrastructureMapper.selectById(config.getTenantId(), resource.getInfrastructureId());
                    }
                }
            }
            return infrastructure;
        }

        private TopologyEdgeEntity edge() {
            if (edge == null && hasText(config.getObjectId()) && "TOPOLOGY_EDGE".equalsIgnoreCase(config.getObjectType())) {
                edge = topologyEdgeMapper.selectById(config.getTenantId(), config.getObjectId());
            }
            return edge;
        }

        private TopologyNodeEntity sourceNode() {
            TopologyEdgeEntity currentEdge = edge();
            if (sourceNode == null && currentEdge != null && hasText(currentEdge.getSourceNodeId())) {
                sourceNode = topologyNodeMapper.selectById(config.getTenantId(), currentEdge.getSourceNodeId());
            }
            return sourceNode;
        }

        private TopologyNodeEntity targetNode() {
            TopologyEdgeEntity currentEdge = edge();
            if (targetNode == null && currentEdge != null && hasText(currentEdge.getTargetNodeId())) {
                targetNode = topologyNodeMapper.selectById(config.getTenantId(), currentEdge.getTargetNodeId());
            }
            return targetNode;
        }
    }

    private static final class PlaceholderResolver {
        private String placeholder;
        private String sourceType;
        private String fieldName;
        private String value;
        private String format;
        private String operator;
        private String compareValue;
        private String transformType;
        private String outputFormat;
        private String prefix;
        private String suffix;
        private String regex;
        private int groupIndex = 1;
        private String missingPolicy;
    }
}

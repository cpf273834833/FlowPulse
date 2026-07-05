import React, { useEffect, useMemo, useRef, useState } from 'react';
import { topologyApi } from '../../api/topologyApi';
import { environmentRegionApi } from '../../api/environmentRegionApi';
import { infrastructureApi } from '../../api/infrastructureApi';
import { logicalObjectApi } from '../../api/logicalObjectApi';
import { metricApi } from '../../api/metricApi';
import { executorNodeApi } from '../../api/executorNodeApi';
import { thresholdApi } from '../../api/thresholdApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import Toast from '../../components/Toast';
import { ElementEditor } from './TopologyInspector';
import kafkaIcon from '../../assets/icons/kafka.png';
import sparkIcon from '../../assets/icons/spark.png';
import elasticsearchIcon from '../../assets/icons/elasticsearch.png';
import applicationIcon from '../../assets/icons/application.png';
import './DataTopologyPage.css';

const DEFAULT_QUERY = { pageNo: 1, pageSize: 10, keyword: '' };
const DEFAULT_FORM = { topologyCode: '', topologyName: '', envId: '', description: '', canvasConfigJson: '{}' };
const NODE_SIZE = { width: 238, height: 104 };
const DEFAULT_VIEWBOX = { x: 0, y: 0, width: 980, height: 560 };
const EMPTY_CONFIG_PAGE = { configs: { records: [], total: 0, pageNo: 1, pageSize: 20 }, stats: [] };
const GRID_SIZE = 20;
const ALIGN_THRESHOLD = 8;
const TOPOLOGY_FIT_DEBUG = true;


export default function DataTopologyPage() {
  const svgRef = useRef(null);
  const userAdjustedCanvasRef = useRef(false);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [page, setPage] = useState({ records: [], total: 0, pageNo: 1, pageSize: 10 });
  const [stats, setStats] = useState([]);
  const [envs, setEnvs] = useState([]);
  const [regions, setRegions] = useState([]);
  const [selectedEnvId, setSelectedEnvId] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [current, setCurrent] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [resources, setResources] = useState([]);
  const [resourceKeyword, setResourceKeyword] = useState('');
  const [resourceCategory, setResourceCategory] = useState('ALL');
  const [resourceType, setResourceType] = useState('');
  const [resourcePage, setResourcePage] = useState({ pageNo: 1, pageSize: 30 });
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [panning, setPanning] = useState(null);
  const [alignmentGuide, setAlignmentGuide] = useState(null);
  const [canvasViewBox, setCanvasViewBox] = useState(DEFAULT_VIEWBOX);
  const [edgeDraft, setEdgeDraft] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('properties');
  const [metricDefinitions, setMetricDefinitions] = useState([]);
  const [applicableMetrics, setApplicableMetrics] = useState([]);
  const [metricImplementations, setMetricImplementations] = useState([]);
  const [executorNodes, setExecutorNodes] = useState([]);
  const [metricConfigs, setMetricConfigs] = useState(EMPTY_CONFIG_PAGE);
  const [thresholdRules, setThresholdRules] = useState([]);
  const [topologyMetricConfigs, setTopologyMetricConfigs] = useState([]);
  const [topologyAlerts, setTopologyAlerts] = useState([]);
  const [showCanvasMetrics, setShowCanvasMetrics] = useState(false);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const [screenFullscreen, setScreenFullscreen] = useState(false);
  const [metricDraft, setMetricDraft] = useState(null);
  const [thresholdDraft, setThresholdDraft] = useState(null);
  const [mode, setMode] = useState('list');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const nodeMap = useMemo(() => indexById(nodes), [nodes]);
  const usedObjectIds = useMemo(() => new Set(nodes.map((node) => node.objectId)), [nodes]);
  const visibleStats = stats.length ? stats : defaultStats(nodes.length, edges.length);
  const selectedScopeTitle = scopeTitle(envs, regions, selectedEnvId, selectedRegionId);
  const metricDefinitionMap = useMemo(() => indexById(metricDefinitions), [metricDefinitions]);
  const canvasRuntime = useMemo(
    () => buildCanvasRuntime(nodes, edges, topologyMetricConfigs, topologyAlerts, metricDefinitionMap),
    [nodes, edges, topologyMetricConfigs, topologyAlerts, metricDefinitionMap],
  );
  const filteredResources = useMemo(() => {
    const keyword = resourceKeyword.trim().toLowerCase();
    let items = resources;
    if (resourceCategory === 'LOGICAL') {
      items = items.filter((item) => item.isLogicalObject);
    } else if (resourceCategory === 'PHYSICAL') {
      items = items.filter((item) => !item.isLogicalObject);
    }
    if (resourceType) {
      items = items.filter((item) => (item.resourceType || item.infrastructureType) === resourceType);
    }
    if (!keyword) return items;
    return items.filter((item) => {
      const text = `${item.resourceName || ''} ${item.resourceCode || ''} ${item.resourceType || ''} ${item.infrastructureName || ''}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [resources, resourceKeyword, resourceCategory, resourceType]);
  const resourceTypes = useMemo(() => Array.from(new Set(resources.map((item) => item.resourceType || item.infrastructureType).filter(Boolean))).sort(), [resources]);
  const pagedResources = useMemo(() => {
    const start = (resourcePage.pageNo - 1) * resourcePage.pageSize;
    return filteredResources.slice(start, start + resourcePage.pageSize);
  }, [filteredResources, resourcePage]);
  const selectedContext = useMemo(() => selectedElementContext(), [current, selected]);

  useEffect(() => {
    loadEnvs();
    loadPage(query);
  }, []);

  useEffect(() => {
    if (current) {
      loadResources(current.envId);
    }
  }, [current?.id]);

  useEffect(() => {
    loadMetricCatalog();
  }, []);

  useEffect(() => {
    setResourcePage((value) => ({ ...value, pageNo: 1 }));
  }, [resourceKeyword, resourceCategory, resourceType]);

  useEffect(() => {
    function syncFullscreen() {
      setScreenFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (mode !== 'canvas' || !current) return undefined;
    const timer = window.setInterval(() => {
      loadTopologyRuntime(current, nodes, edges);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [mode, current?.id, nodes, edges]);

  useEffect(() => {
    if (mode !== 'canvas' || !current || !nodes.length) return undefined;
    userAdjustedCanvasRef.current = false;
    const timers = [0, 80, 220, 420].map((delay) => window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        const skipped = userAdjustedCanvasRef.current;
        debugTopologyFit('initial-fit-timer', {
          delay,
          skipped,
          mode,
          topologyId: current?.id,
          nodeCount: nodes.length,
          showCanvasMetrics,
          svgRect: readSvgRect(svgRef.current),
        });
        if (userAdjustedCanvasRef.current) return;
        setCanvasViewBox(fitTopologyViewBox(nodes, showCanvasMetrics, { mode: 'initial', svg: svgRef.current, reason: `initial-${delay}` }));
      });
    }, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [mode, current?.id, nodes.length, showCanvasMetrics]);

  useEffect(() => {
    if (mode !== 'canvas' || !current || !nodes.length) return undefined;
    const onResize = () => {
      debugTopologyFit('resize-fit', {
        skipped: userAdjustedCanvasRef.current,
        topologyId: current?.id,
        nodeCount: nodes.length,
        showCanvasMetrics,
        svgRect: readSvgRect(svgRef.current),
      });
      if (userAdjustedCanvasRef.current) return;
      setCanvasViewBox(fitTopologyViewBox(nodes, showCanvasMetrics, { mode: 'initial', svg: svgRef.current, reason: 'resize' }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [mode, current?.id, nodes.length, showCanvasMetrics]);

  useEffect(() => {
    setInspectorTab('properties');
    setMetricDraft(null);
    setThresholdDraft(null);
    if (selectedContext) {
      loadApplicableMetrics(selectedContext);
      loadMetricConfigs(selectedContext);
      loadThresholdRules(selectedContext);
    } else {
      setApplicableMetrics([]);
      setMetricConfigs(EMPTY_CONFIG_PAGE);
      setThresholdRules([]);
    }
  }, [
    selectedContext?.topologyElementId,
    selectedContext?.topologyElementType,
    selectedContext?.objectType,
    selectedContext?.relationType,
    selectedContext?.sourceObjectType,
    selectedContext?.targetObjectType,
  ]);

  async function loadMetricCatalog() {
    try {
      const [metricPage, implementationPage, executorNodePage] = await Promise.all([
        metricApi.page({ pageNo: 1, pageSize: 500, enabled: 'true' }),
        metricApi.implementationPage({ pageNo: 1, pageSize: 500, enabled: 'true' }),
        executorNodeApi.page({ pageNo: 1, pageSize: 500 }),
      ]);
      setMetricDefinitions((metricPage.metrics && metricPage.metrics.records) || []);
      setMetricImplementations((implementationPage.implementations && implementationPage.implementations.records) || []);
      setExecutorNodes((executorNodePage.nodes && executorNodePage.nodes.records) || []);
    } catch (error) {
      showError('指标目录加载失败', error);
    }
  }

  async function loadEnvs() {
    try {
      const response = await environmentRegionApi.page();
      setEnvs(response.environments || []);
      setRegions(response.regions || []);
    } catch (error) {
      showError('环境加载失败', error);
    }
  }

  async function loadPage(nextQuery = query) {
    try {
      const response = await topologyApi.page(nextQuery);
      const topologies = response.topologies || { records: [], total: 0, pageNo: nextQuery.pageNo, pageSize: nextQuery.pageSize };
      setPage(topologies);
      setStats(response.stats || []);
      setQuery(nextQuery);
    } catch (error) {
      showError('拓扑加载失败', error);
    }
  }

  async function openTopology(id) {
    try {
      const response = await topologyApi.detail(id);
      setCurrent(response.topology);
      const nextNodes = (response.nodes || []).map(normalizeNode);
      const nextEdges = (response.edges || []).map(normalizeEdge);
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelected(null);
      userAdjustedCanvasRef.current = false;
      setCanvasViewBox(fitTopologyViewBox(nextNodes, showCanvasMetrics, { mode: 'initial', svg: svgRef.current, reason: 'open-topology' }));
      cancelEdgeDraft();
      await loadTopologyRuntime(response.topology, nextNodes, nextEdges);
    } catch (error) {
      showError('拓扑详情加载失败', error);
    }
  }

  async function loadTopologyRuntime(topology = current, nextNodes = nodes, nextEdges = edges) {
    if (!topology) return;
    try {
      const response = await topologyApi.runtime(topology.id);
      const runtime = normalizeTopologyRuntime(response, nextNodes, nextEdges);
      setTopologyMetricConfigs(runtime.configs);
      setTopologyAlerts(runtime.alerts);
    } catch (error) {
      setTopologyMetricConfigs([]);
      setTopologyAlerts([]);
      showError('拓扑运行态加载失败', error);
    }
  }

  async function openCanvas(topology) {
    await openTopology(topology.id);
    setMode('canvas');
  }

  function backToList() {
    setMode('list');
    setSelected(null);
    setCanvasFullscreen(false);
    cancelEdgeDraft();
  }

  async function toggleScreenFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      setCanvasFullscreen(true);
      const target = document.querySelector('.fp-topology-editor-page') || document.documentElement;
      if (target.requestFullscreen) {
        await target.requestFullscreen();
      }
    } catch (error) {
      showError('全屏切换失败', error);
    }
  }

  function selectScope(envId, regionId) {
    setSelectedEnvId(envId);
    setSelectedRegionId(regionId);
    const nextQuery = { ...query, pageNo: 1, envId };
    loadPage(nextQuery);
  }

  async function loadResources(envId) {
    try {
      const infraPage = await infrastructureApi.page({ pageNo: 1, pageSize: 500, envId });
      const infrastructures = ((infraPage || {}).infrastructures || {}).records || [];
      const logicalPage = await logicalObjectApi.page({ pageNo: 1, pageSize: 500, envId, enabled: true });
      const logicalObjects = ((logicalPage || {}).records || []).map((item) => ({
        id: item.id,
        resourceName: item.objectName,
        resourceCode: item.objectCode,
        resourceType: item.objectType,
        infrastructureId: 'logical-object',
        infrastructureName: '逻辑对象',
        infrastructureType: 'LOGICAL_OBJECT',
        isLogicalObject: true,
      }));
      const resourcePages = await Promise.all(infrastructures.map(async (infra) => {
        try {
          const records = await loadAllInfrastructureResources(infra.id);
          return records.map((resource) => ({
            ...resource,
            infrastructureId: infra.id,
            infrastructureName: infra.name,
            infrastructureType: infra.type,
          }));
        } catch (error) {
          return [];
        }
      }));
      const infrastructureNodes = infrastructures.map((infra) => ({
        id: infra.id,
        resourceName: infra.name,
        resourceCode: infra.code,
        resourceType: infra.type,
        infrastructureId: infra.id,
        infrastructureName: infra.name,
        infrastructureType: infra.type,
        isInfrastructure: true,
      }));
      setResources([...logicalObjects, ...infrastructureNodes, ...resourcePages.flat()]);
    } catch (error) {
      setResources([]);
      showError('资源加载失败', error);
    }
  }

  async function loadAllInfrastructureResources(infrastructureId) {
    const pageSize = 200;
    let pageNo = 1;
    let records = [];
    let total = 0;
    do {
      const data = await infrastructureApi.resources(infrastructureId, { pageNo, pageSize });
      const pageRecords = ((data || {}).records || []);
      total = Number((data || {}).total || pageRecords.length);
      records = records.concat(pageRecords);
      pageNo += 1;
    } while (records.length < total && pageNo <= 50);
    return records;
  }

  function openCreate() {
    setEditingId('');
    setForm({ ...DEFAULT_FORM, envId: envs[0]?.id || '' });
    setMode('edit');
  }

  function openEdit() {
    if (!current) return;
    setEditingId(current.id);
    setForm({ ...DEFAULT_FORM, ...current });
    setMode('edit');
  }

  function openEditTopology(topology) {
    setEditingId(topology.id);
    setForm({ ...DEFAULT_FORM, ...topology });
    setMode('edit');
  }

  async function saveTopology() {
    if (!form.topologyCode || !form.topologyName || !form.envId) {
      setToast({ type: 'warning', title: '请补全必填信息', message: '拓扑编码、拓扑名称和所属环境不能为空。' });
      return;
    }
    try {
      const response = editingId ? await topologyApi.update(editingId, form) : await topologyApi.create(form);
      setToast({ type: 'success', title: editingId ? '拓扑已更新' : '拓扑已创建', message: response.topologyName });
      await loadPage(query);
      await openTopology(response.id);
      setMode('canvas');
    } catch (error) {
      showError('拓扑保存失败', error);
    }
  }

  function addResourceNode(resource) {
    if (!current) return;
    if (usedObjectIds.has(resource.id)) {
      setToast({ type: 'warning', title: '节点已存在', message: `${resource.resourceName || resource.resourceCode} 已经在当前拓扑中。` });
      return;
    }
    const index = nodes.length + 1;
    const node = normalizeNode({
      id: nextId(),
      nodeKey: `${resource.resourceType || 'RESOURCE'}-${resource.id}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
      nodeName: resource.resourceName || resource.resourceCode,
      nodeType: resource.isLogicalObject ? 'LOGICAL_OBJECT' : (resource.isInfrastructure ? 'INFRASTRUCTURE' : 'RESOURCE'),
      objectType: resource.resourceType || resource.infrastructureType || 'RESOURCE',
      objectId: resource.id,
      objectCode: resource.resourceCode || resource.id,
      objectName: resource.resourceName || resource.resourceCode,
      x: 80 + ((index - 1) % 3) * 300,
      y: 96 + Math.floor((index - 1) / 3) * 180,
      width: NODE_SIZE.width,
      height: NODE_SIZE.height,
      hidden: false,
      alertLevel: 'NORMAL',
    });
    setNodes((value) => [...value, node]);
    setSelected({ type: 'node', data: node });
  }

  function addManualNode() {
    if (!current) return;
    const index = nodes.length + 1;
    const node = normalizeNode({
      id: nextId(),
      nodeKey: `manual-${index}`,
      nodeName: `手工节点${index}`,
      nodeType: 'MANUAL',
      objectType: 'MANUAL',
      objectId: `manual-${nextId()}`,
      objectCode: `manual-${index}`,
      objectName: `手工节点${index}`,
      x: 90 + ((index - 1) % 3) * 290,
      y: 110 + Math.floor((index - 1) / 3) * 170,
      width: NODE_SIZE.width,
      height: NODE_SIZE.height,
      hidden: false,
      alertLevel: 'NORMAL',
    });
    setNodes((value) => [...value, node]);
    setSelected({ type: 'node', data: node });
  }

  function startEdgeCreate() {
    if (nodes.length < 2) {
      setToast({ type: 'warning', title: '节点不足', message: '请先添加至少两个节点。' });
      return;
    }
    setEdgeDraft(null);
    setSelected(null);
  }

  function startEdgeFromNode(event, node) {
    event.preventDefault();
    event.stopPropagation();
    if (!current) return;
    if (nodes.length < 2) {
      setToast({ type: 'warning', title: '节点不足', message: '请先添加至少两个节点。' });
      return;
    }
    setEdgeDraft({ sourceNodeId: node.id, pointer: svgPoint(event) });
    setSelected(null);
    setToast({ type: 'info', title: '已选择源节点', message: `继续点击目标节点，与 ${node.nodeName} 创建连线。` });
  }

  function pickEdgeNode(node) {
    if (!edgeDraft) {
      setSelected({ type: 'node', data: node });
      return;
    }
    if (!edgeDraft.sourceNodeId) return;
    if (edgeDraft.sourceNodeId === node.id) {
      setToast({ type: 'warning', title: '目标节点无效', message: '源节点和目标节点不能相同。' });
      return;
    }
    saveEdgeDraft(edgeDraft.sourceNodeId, node.id);
  }

  function saveEdgeDraft(sourceNodeId = edgeDraft?.sourceNodeId, targetNodeId = edgeDraft?.targetNodeId) {
    if (!sourceNodeId || !targetNodeId) {
      setToast({ type: 'warning', title: '连线未完成', message: '请在画布上选择源节点和目标节点。' });
      return;
    }
    const source = nodeMap[sourceNodeId];
    const target = nodeMap[targetNodeId];
    if (!source || !target) return;
    const index = edges.length + 1;
    const edge = normalizeEdge({
      id: nextId(),
      edgeKey: `edge-${index}`,
      edgeName: `${source.nodeName} -> ${target.nodeName}`,
      edgeType: 'DATA_FLOW',
      relationType: 'MANUAL',
      relationId: '',
      sourceNodeId: source.id,
      targetNodeId: target.id,
      sourceObjectType: source.objectType,
      sourceObjectId: source.objectId,
      targetObjectType: target.objectType,
      targetObjectId: target.objectId,
      hidden: false,
      alertLevel: 'NORMAL',
    });
    setEdges((value) => [...value, edge]);
    setSelected({ type: 'edge', data: edge });
    cancelEdgeDraft();
  }

  function cancelEdgeDraft() {
    setEdgeDraft(null);
  }

  function deleteSelected() {
    if (!selected) return;
    if (selected.type === 'node') {
      const nodeId = selected.data.id;
      setNodes((value) => value.filter((node) => node.id !== nodeId));
      setEdges((value) => value.filter((edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId));
    } else {
      setEdges((value) => value.filter((edge) => edge.id !== selected.data.id));
    }
    setSelected(null);
  }

  function updateSelected(field, value) {
    if (!selected) return;
    if (selected.type === 'node') {
      setNodes((items) => items.map((node) => (node.id === selected.data.id ? { ...node, [field]: value } : node)));
      setSelected((currentValue) => ({ ...currentValue, data: { ...currentValue.data, [field]: value } }));
    } else {
      setEdges((items) => items.map((edge) => (edge.id === selected.data.id ? { ...edge, [field]: value } : edge)));
      setSelected((currentValue) => ({ ...currentValue, data: { ...currentValue.data, [field]: value } }));
    }
  }

  function startDrag(event, node) {
    if (event.button === 2) {
      return;
    }
    if (edgeDraft) {
      pickEdgeNode(node);
      return;
    }
    const point = svgPoint(event);
    setDragging({ nodeId: node.id, offsetX: point.x - node.x, offsetY: point.y - node.y });
    setSelected({ type: 'node', data: node });
  }

  function startCanvasInteraction(event) {
    if (event.target !== event.currentTarget || dragging) return;
    setSelected(null);
    if (edgeDraft) {
      cancelEdgeDraft();
      return;
    }
    setPanning({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewBox: canvasViewBox,
    });
  }

  function moveDrag(event) {
    if (edgeDraft) {
      setEdgeDraft((draft) => (draft ? { ...draft, pointer: svgPoint(event) } : draft));
    }
    if (panning) {
      userAdjustedCanvasRef.current = true;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = (event.clientX - panning.startClientX) * (panning.startViewBox.width / rect.width);
      const dy = (event.clientY - panning.startClientY) * (panning.startViewBox.height / rect.height);
      setCanvasViewBox({
        ...panning.startViewBox,
        x: panning.startViewBox.x - dx,
        y: panning.startViewBox.y - dy,
      });
      return;
    }
    if (!dragging) return;
    userAdjustedCanvasRef.current = true;
    const point = svgPoint(event);
    const snapped = snapNodePosition(
      point.x - dragging.offsetX,
      point.y - dragging.offsetY,
      dragging.nodeId,
      nodes,
      topologyNodeVisualSize(showCanvasMetrics),
      canvasViewBox,
    );
    const nextX = snapped.x;
    const nextY = snapped.y;
    setAlignmentGuide(snapped.guides);
    setNodes((items) => items.map((node) => (node.id === dragging.nodeId ? { ...node, x: nextX, y: nextY } : node)));
    setSelected((currentValue) => {
      if (!currentValue || currentValue.type !== 'node' || currentValue.data.id !== dragging.nodeId) return currentValue;
      return { ...currentValue, data: { ...currentValue.data, x: nextX, y: nextY } };
    });
  }

  function endDrag() {
    setDragging(null);
    setPanning(null);
    setAlignmentGuide(null);
  }

  function zoomCanvas(factor, anchorPoint = null) {
    userAdjustedCanvasRef.current = true;
    setCanvasViewBox((viewBox) => {
      const nextWidth = Math.max(viewBox.width * factor, 480);
      const nextHeight = Math.max(viewBox.height * factor, 248);
      const anchor = anchorPoint || {
        x: viewBox.x + viewBox.width / 2,
        y: viewBox.y + viewBox.height / 2,
      };
      const widthFactor = nextWidth / viewBox.width;
      const heightFactor = nextHeight / viewBox.height;
      return {
        x: anchor.x - (anchor.x - viewBox.x) * widthFactor,
        y: anchor.y - (anchor.y - viewBox.y) * heightFactor,
        width: nextWidth,
        height: nextHeight,
      };
    });
  }

  function resetCanvasView() {
    userAdjustedCanvasRef.current = false;
    debugTopologyFit('manual-reset-fit', {
      nodeCount: nodes.length,
      showCanvasMetrics,
      svgRect: readSvgRect(svgRef.current),
    });
    setCanvasViewBox(fitTopologyViewBox(nodes, showCanvasMetrics, { mode: 'reset', svg: svgRef.current, reason: 'manual-reset' }));
  }

  function toggleCanvasMetrics() {
    setShowCanvasMetrics((value) => {
      const next = !value;
      userAdjustedCanvasRef.current = false;
      setCanvasViewBox((viewBox) => {
        debugTopologyFit('toggle-metric-fit', {
          from: value,
          to: next,
          currentViewBox: viewBox,
          svgRect: readSvgRect(svgRef.current),
        });
        return fitTopologyViewBox(nodes, next, { mode: 'preserveOrigin', currentViewBox: viewBox, svg: svgRef.current, reason: 'toggle-metrics' });
      });
      return next;
    });
  }

  function handleCanvasWheel(event) {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1.12 : 0.88;
    zoomCanvas(factor, svgPoint(event));
  }

  function selectedElementContext() {
    if (!current || !selected) return null;
    const data = selected.data;
    const isNode = selected.type === 'node';
    const source = isNode ? null : nodeMap[data.sourceNodeId];
    const target = isNode ? null : nodeMap[data.targetNodeId];
    return {
      topologyId: current.id,
      topologyName: current.topologyName,
      topologyElementId: data.id,
      topologyElementType: isNode ? 'NODE' : 'EDGE',
      objectType: isNode ? data.objectType : 'TOPOLOGY_EDGE',
      objectId: isNode ? data.objectId : data.id,
      objectCode: isNode ? data.objectCode : data.edgeKey,
      objectName: isNode ? (data.objectName || data.nodeName) : data.edgeName,
      relationType: isNode ? '' : data.relationType,
      sourceObjectType: source ? source.objectType : data.sourceObjectType,
      targetObjectType: target ? target.objectType : data.targetObjectType,
    };
  }

  function openMetricConfig() {
    const context = selectedElementContext();
    if (!context) return;
    window.sessionStorage.setItem('flowpulse.metric.prefill', JSON.stringify(context));
    window.location.hash = '/metric-center';
  }

  function openThresholdConfig() {
    const context = selectedElementContext();
    if (!context) return;
    window.sessionStorage.setItem('flowpulse.threshold.prefill', JSON.stringify({
      ...context,
      scopeType: 'TOPOLOGY_ELEMENT',
    }));
    window.location.hash = '/threshold-management';
  }

  function svgPoint(event) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    if (svg.createSVGPoint && svg.getScreenCTM) {
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const matrix = svg.getScreenCTM();
      if (matrix) {
        const transformed = point.matrixTransform(matrix.inverse());
        return { x: transformed.x, y: transformed.y };
      }
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: canvasViewBox.x + ((event.clientX - rect.left) / rect.width) * canvasViewBox.width,
      y: canvasViewBox.y + ((event.clientY - rect.top) / rect.height) * canvasViewBox.height,
    };
  }

  async function loadMetricConfigs(context, nextQuery = { pageNo: 1, pageSize: 20 }) {
    if (!context) return;
    try {
      const data = await metricApi.resourceConfigPage({
        ...nextQuery,
        objectType: context.objectType,
        objectId: context.objectId,
      });
      setMetricConfigs(data || EMPTY_CONFIG_PAGE);
    } catch (error) {
      showError('指标配置加载失败', error);
    }
  }

  async function loadApplicableMetrics(context) {
    if (!context) return;
    try {
      const data = await metricApi.applicable({
        scopeType: context.topologyElementType === 'EDGE' ? 'TOPOLOGY_EDGE' : 'RESOURCE',
        objectType: context.objectType,
        relationType: context.relationType,
        sourceObjectType: context.sourceObjectType,
        targetObjectType: context.targetObjectType,
        enabled: 'true',
      });
      setApplicableMetrics(Array.isArray(data) ? data : []);
    } catch (error) {
      setApplicableMetrics([]);
      showError('适用指标加载失败', error);
    }
  }

  async function loadThresholdRules(context) {
    if (!context) return;
    try {
      const data = await thresholdApi.page({
        pageNo: 1,
        pageSize: 100,
        scopeType: 'TOPOLOGY_ELEMENT',
        topologyId: context.topologyId,
        topologyElementId: context.topologyElementId,
      });
      setThresholdRules((data.rules && data.rules.records) || []);
    } catch (error) {
      showError('阈值规则加载失败', error);
    }
  }

  async function saveMetricConfig(form) {
    if (!selectedContext) return;
    if (!form.metricDefinitionId) {
      setToast({ type: 'warning', title: '请选择指标', message: '指标配置必须绑定一个指标定义。' });
      return;
    }
    try {
      const payload = normalizeTopologyMetricConfig(form, selectedContext);
      if (form.id) {
        await metricApi.updateResourceConfig(form.id, payload);
      } else {
        await metricApi.createResourceConfig(payload);
      }
      setMetricDraft(null);
      setToast({ type: 'success', title: '指标配置已保存', message: selectedContext.objectName });
      await loadMetricConfigs(selectedContext);
      await loadTopologyRuntime();
    } catch (error) {
      showError('指标配置保存失败', error);
    }
  }

  async function toggleMetricConfig(metric, config, enabled) {
    if (!selectedContext || !metric) return;
    try {
      if (config?.id) {
        await metricApi.updateResourceConfig(config.id, normalizeTopologyMetricConfig({ ...config, enabled }, selectedContext));
      } else if (enabled) {
        const draft = defaultTopologyMetricConfig(selectedContext, [metric], metricImplementations);
        await metricApi.createResourceConfig(normalizeTopologyMetricConfig({ ...draft, enabled: true }, selectedContext));
      }
      setMetricDraft(null);
      setToast({
        type: 'success',
        title: enabled ? '指标已开启' : '指标已关闭',
        message: metric.metricName || metric.metricCode || selectedContext.objectName,
      });
      await loadMetricConfigs(selectedContext);
      await loadTopologyRuntime();
    } catch (error) {
      showError(enabled ? '指标开启失败' : '指标关闭失败', error);
    }
  }

  function startMetricConfig(nextMetrics = applicableMetrics) {
    if (!selectedContext) return;
    if (!nextMetrics.length) return;
    setInspectorTab('metrics');
    setMetricDraft(defaultTopologyMetricConfig(selectedContext, nextMetrics, metricImplementations));
  }

  async function saveThresholdRule(form) {
    if (!selectedContext) return;
    if (!form.metricDefinitionId) {
      setToast({ type: 'warning', title: '请选择已配置指标', message: '阈值只能配置在当前元素已经启用的指标上。' });
      return;
    }
    const payload = normalizeTopologyThresholdRule(form, selectedContext, metricDefinitions);
    if (!payload.conditionsJson) {
      setToast({ type: 'warning', title: '请配置阈值条件', message: '至少启用一个级别并填写阈值。' });
      return;
    }
    try {
      if (form.id) {
        await thresholdApi.update(form.id, payload);
      } else {
        await thresholdApi.create(payload);
      }
      setThresholdDraft(null);
      setToast({ type: 'success', title: '阈值规则已保存', message: selectedContext.objectName });
      await loadThresholdRules(selectedContext);
      await loadTopologyRuntime();
    } catch (error) {
      showError('阈值规则保存失败', error);
    }
  }

  async function saveCanvas() {
    if (!current) return;
    try {
      const response = await topologyApi.saveCanvas(current.id, { nodes, edges });
      setNodes((response.nodes || []).map(normalizeNode));
      setEdges((response.edges || []).map(normalizeEdge));
      setSelected(null);
      setToast({ type: 'success', title: '拓扑画布已保存', message: current.topologyName });
      await loadTopologyRuntime(current, (response.nodes || []).map(normalizeNode), (response.edges || []).map(normalizeEdge));
    } catch (error) {
      showError('画布保存失败', error);
    }
  }

  function requestDelete() {
    if (!current) return;
    setConfirm({
      title: '确认删除拓扑',
      content: `删除后会同时删除画布节点和连线：${current.topologyName}`,
      onCancel: () => setConfirm(null),
      onConfirm: async () => {
        await topologyApi.delete(current.id);
        setConfirm(null);
        setCurrent(null);
        setNodes([]);
        setEdges([]);
        setToast({ type: 'success', title: '拓扑已删除', message: '' });
        loadPage(query);
      },
    });
  }

  function showError(title, error) {
    setToast({ type: 'error', title, message: error.message });
  }

  if (mode === 'edit') {
    return (
      <div className="fp-page">
        <button className="fp-link-button fp-back-link" type="button" onClick={() => setMode('list')}>返回拓扑</button>
        <div className="fp-form-header">
          <div>
            <span className="fp-kicker">{editingId ? '编辑拓扑' : '新增拓扑'}</span>
            <h1>{form.topologyName || form.topologyCode || '未命名拓扑'}</h1>
            <p>拓扑归属于环境，节点和连线在画布中维护。</p>
          </div>
          <div className="fp-actions">
            <button className="fp-button" type="button" onClick={() => setMode('list')}>取消</button>
            <button className="fp-button fp-button--primary" type="button" onClick={saveTopology}>保存</button>
          </div>
        </div>
        <section className="fp-card">
          <div className="fp-form fp-form--page">
            <label className="fp-field"><span>拓扑编码 *</span><input value={form.topologyCode} onChange={(event) => updateForm('topologyCode', event.target.value)} /></label>
            <label className="fp-field"><span>拓扑名称 *</span><input value={form.topologyName} onChange={(event) => updateForm('topologyName', event.target.value)} /></label>
            <label className="fp-field"><span>所属环境 *</span><select value={form.envId} onChange={(event) => updateForm('envId', event.target.value)}><option value="">请选择环境</option>{envs.map((env) => <option key={env.id} value={env.id}>{env.envName}</option>)}</select></label>
            <label className="fp-field fp-field--wide"><span>描述</span><textarea value={form.description || ''} onChange={(event) => updateForm('description', event.target.value)} /></label>
          </div>
        </section>
        {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      </div>
    );
  }

  if (mode === 'canvas') {
    return (
      <div className={`fp-page fp-topology-page fp-topology-editor-page ${canvasFullscreen ? 'is-canvas-fullscreen' : ''} ${screenFullscreen ? 'is-screen-fullscreen' : ''}`}>
        <header className="fp-topology-canvas-header">
          <button className="fp-link-button fp-back-link" type="button" onClick={backToList}>返回拓扑列表</button>
          <div className="fp-topology-canvas-title">
            <span className="fp-kicker">拓扑编辑</span>
            <h1>{current?.topologyName || '未命名拓扑'}</h1>
            <p>{edgeDraft ? edgeDraftText(edgeDraft, nodeMap) : '右键节点可直接创建连线；点击画布空白区域会取消选中并恢复资源列表。'}</p>
          </div>
          <div className="fp-actions">
            <button className="fp-button" type="button" onClick={openEdit} disabled={!current}>编辑信息</button>
            <button className="fp-button" type="button" onClick={deleteSelected} disabled={!selected}>删除元素</button>
            <button className="fp-button fp-button--primary" type="button" onClick={saveCanvas} disabled={!current}>保存画布</button>
            <button className="fp-button fp-button--danger" type="button" onClick={requestDelete} disabled={!current}>删除拓扑</button>
          </div>
        </header>

        <section className="fp-topology-canvas-layout">
          <main className="fp-topology-stage">
            <div className="fp-topology-canvas-shell">
              {!current ? <EmptyCanvas title="请选择或新增拓扑" desc="拓扑创建后，就可以从右侧资源池添加节点并维护连线。" /> : null}
              {current && nodes.length === 0 ? <EmptyCanvas title="从右侧添加第一个节点" desc="建议先添加 Kafka Topic、Spark 作业、ES Index 等真实资源。" /> : null}
              <div className="fp-canvas-view-toolbar">
                <button title="显示指标" className={showCanvasMetrics ? 'is-active' : ''} type="button" onClick={toggleCanvasMetrics}>指标</button>
                <button title="显示连线名称" className={showEdgeLabels ? 'is-active' : ''} type="button" onClick={() => setShowEdgeLabels((value) => !value)}>线名</button>
                <button title={canvasFullscreen ? '退出全屏看图' : '全屏看图'} type="button" onClick={() => setCanvasFullscreen((value) => !value)}>{canvasFullscreen ? '退出' : '适屏'}</button>
                <button title={screenFullscreen ? '退出投屏全屏' : '投屏全屏'} type="button" onClick={toggleScreenFullscreen}>{screenFullscreen ? '退出' : '投屏'}</button>
                <button title="缩小" type="button" onClick={() => zoomCanvas(1.18)}>−</button>
                <strong>{Math.round((DEFAULT_VIEWBOX.width / canvasViewBox.width) * 100)}%</strong>
                <button title="放大" type="button" onClick={() => zoomCanvas(0.85)}>＋</button>
                <button title="重置视图" type="button" onClick={resetCanvasView}>↻</button>
                <span>{canvasRuntime.alertCount > 0 ? `${canvasRuntime.alertCount} 个告警元素` : '无活动告警'}</span>
              </div>
              <svg
                ref={svgRef}
                className={`fp-topology-canvas ${edgeDraft ? 'is-linking' : ''} ${panning ? 'is-panning' : ''}`}
                viewBox={`${canvasViewBox.x} ${canvasViewBox.y} ${canvasViewBox.width} ${canvasViewBox.height}`}
                onMouseDown={startCanvasInteraction}
                onMouseMove={moveDrag}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                onWheel={handleCanvasWheel}
              >
                <defs>
                  <linearGradient id="fp-node-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(13, 50, 86, 0.98)" />
                    <stop offset="52%" stopColor="rgba(7, 29, 58, 0.98)" />
                    <stop offset="100%" stopColor="rgba(5, 18, 38, 0.98)" />
                  </linearGradient>
                  <marker id="fp-arrow-normal" markerWidth="14" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L12,6 L1,11 L4,6 z" fill="rgba(58,175,255,.88)" /></marker>
                  <marker id="fp-arrow-info" markerWidth="14" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L12,6 L1,11 L4,6 z" fill="rgba(142,171,255,.92)" /></marker>
                  <marker id="fp-arrow-warning" markerWidth="14" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L12,6 L1,11 L4,6 z" fill="rgba(255,202,100,.95)" /></marker>
                  <marker id="fp-arrow-error" markerWidth="14" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L12,6 L1,11 L4,6 z" fill="rgba(255,139,64,.96)" /></marker>
                  <marker id="fp-arrow-critical" markerWidth="14" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L12,6 L1,11 L4,6 z" fill="rgba(255,77,120,.98)" /></marker>
                  <marker id="fp-arrow-unknown" markerWidth="14" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L12,6 L1,11 L4,6 z" fill="rgba(150,165,190,.9)" /></marker>
                </defs>
                {edges.map((edge) => <Edge key={edge.id} edge={edge} nodeMap={nodeMap} runtime={canvasRuntime.byElementId[edge.id]} showMetrics={showCanvasMetrics} showLabel={showEdgeLabels} selected={selected?.type === 'edge' && selected.data.id === edge.id} onSelect={(event) => { event.stopPropagation(); setSelected({ type: 'edge', data: edge }); cancelEdgeDraft(); }} />)}
                {edgeDraft ? <DraftEdge draft={edgeDraft} nodeMap={nodeMap} /> : null}
                <AlignmentGuides guides={alignmentGuide} viewBox={canvasViewBox} />
                {nodes.map((node) => (
                  <Node
                    key={node.id}
                    node={node}
                    runtime={canvasRuntime.byElementId[node.id]}
                    showMetrics={showCanvasMetrics}
                    selected={selected?.type === 'node' && selected.data.id === node.id}
                    linking={edgeDraft && edgeDraft.sourceNodeId === node.id}
                    onMouseDown={(event) => startDrag(event, node)}
                    onContextMenu={(event) => startEdgeFromNode(event, node)}
                  />
                ))}
              </svg>
            </div>
          </main>

          <aside className={`fp-topology-side ${selected ? 'is-inspector' : 'is-resources'}`}>
            {selected ? (
              <>
                <InspectorHeader selected={selected} edgeDraft={edgeDraft} />
                <ElementEditor
                  selected={selected}
                  nodes={nodes}
                  context={selectedContext}
                  alerts={topologyAlerts.filter((alert) => alert.topologyElementId === selected.data.id)}
                  activeTab={inspectorTab}
                  metrics={applicableMetrics}
                  implementations={metricImplementations}
                  executorNodes={executorNodes}
                  metricConfigs={metricConfigs}
                  thresholdRules={thresholdRules}
                  metricDraft={metricDraft}
                  thresholdDraft={thresholdDraft}
                  onTabChange={setInspectorTab}
                  onMetricDraft={setMetricDraft}
                  onStartMetricConfig={startMetricConfig}
                  onToggleMetric={toggleMetricConfig}
                  onThresholdDraft={setThresholdDraft}
                  onSaveMetric={saveMetricConfig}
                  onSaveThreshold={saveThresholdRule}
                  onChange={updateSelected}
                  onMetricConfig={openMetricConfig}
                  onThresholdConfig={openThresholdConfig}
                />
              </>
            ) : (
              <ResourcePanel
                current={current}
                resources={filteredResources}
                pageResources={pagedResources}
                allResources={resources}
                resourcePage={resourcePage}
                category={resourceCategory}
                type={resourceType}
                types={resourceTypes}
                keyword={resourceKeyword}
                usedObjectIds={usedObjectIds}
                onCategoryChange={setResourceCategory}
                onTypeChange={setResourceType}
                onKeywordChange={setResourceKeyword}
                onResourcePageChange={setResourcePage}
                onAddManual={addManualNode}
                onAddResource={addResourceNode}
              />
            )}
          </aside>
        </section>

        {confirm ? <ConfirmDialog {...confirm} /> : null}
        {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      </div>
    );
  }

  return (
    <div className="fp-page fp-topology-page">
      <header className="fp-page__header fp-topology-list-header">
        <div>
          <h1>数据流拓扑</h1>
          <p>按环境和区域查看数据流拓扑，进入二级页面后维护节点、连线、指标和阈值。</p>
        </div>
        <button className="fp-button fp-button--primary" type="button" onClick={openCreate}>新增拓扑</button>
      </header>

      <section className="fp-topology-list-layout">
        <TopologyScopeTree
          environments={envs}
          regions={regions}
          selectedEnvId={selectedEnvId}
          selectedRegionId={selectedRegionId}
          onSelect={selectScope}
        />
        <main className="fp-card fp-topology-list-main">
          <div className="fp-topology-list-bar">
            <div>
              <h2>{selectedScopeTitle}</h2>
              <p>共 {page.total || 0} 个拓扑</p>
            </div>
            <label className="fp-inline-search">
              <span>⌕</span>
              <input value={query.keyword} placeholder="搜索拓扑名称或编码" onChange={(event) => setQuery({ ...query, keyword: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && loadPage({ ...query, pageNo: 1 })} />
            </label>
            <button className="fp-button" type="button" onClick={() => loadPage({ ...query, pageNo: 1 })}>筛选</button>
          </div>
          <TopologyCardGrid page={page} envs={envs} onOpen={openCanvas} onEdit={openEditTopology} />
          <Pagination pageNo={page.pageNo} pageSize={page.pageSize} total={page.total} onChange={(next) => loadPage({ ...query, ...next })} />
        </main>
      </section>

      {confirm ? <ConfirmDialog {...confirm} /> : null}
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </div>
  );

  function updateForm(field, value) {
    setForm((currentValue) => ({ ...currentValue, [field]: value }));
  }
}

function ResourcePanel({
  current,
  resources,
  pageResources,
  allResources,
  resourcePage,
  category,
  type,
  types,
  keyword,
  usedObjectIds,
  onCategoryChange,
  onTypeChange,
  onKeywordChange,
  onResourcePageChange,
  onAddManual,
  onAddResource,
}) {
  const logicalCount = allResources.filter((item) => item.isLogicalObject).length;
  const physicalCount = allResources.length - logicalCount;
  return (
    <div className="fp-topology-panel-body">
      <div className="fp-topology-panel-title">
        <h2>节点资源</h2>
        <p>按物理对象、逻辑对象和资源类型筛选后添加到画布。</p>
      </div>
      <div className="fp-resource-segment">
        <button className={category === 'ALL' ? 'is-active' : ''} type="button" onClick={() => onCategoryChange('ALL')}>全部<em>{allResources.length}</em></button>
        <button className={category === 'PHYSICAL' ? 'is-active' : ''} type="button" onClick={() => onCategoryChange('PHYSICAL')}>物理<em>{physicalCount}</em></button>
        <button className={category === 'LOGICAL' ? 'is-active' : ''} type="button" onClick={() => onCategoryChange('LOGICAL')}>逻辑<em>{logicalCount}</em></button>
      </div>
      <label className="fp-inline-search"><span>⌕</span><input value={keyword} placeholder="搜索资源名称、编码或类型" onChange={(event) => onKeywordChange(event.target.value)} /></label>
      <select className="fp-topology-select" value={type} onChange={(event) => onTypeChange(event.target.value)}>
        <option value="">全部类型</option>
        {types.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <button className="fp-button fp-button--wide" type="button" onClick={onAddManual} disabled={!current}>新增手工节点</button>
      <div className="fp-topology-resource-list">
        {pageResources.map((resource) => (
          <button className="fp-topology-resource" type="button" key={`${resource.infrastructureId}-${resource.id}`} disabled={!current || usedObjectIds.has(resource.id)} onClick={() => onAddResource(resource)}>
            <strong>{resource.resourceName || resource.resourceCode}</strong>
            <span>{resource.isLogicalObject ? '逻辑对象' : '物理对象'} · {resource.resourceType} / {resource.infrastructureName}</span>
          </button>
        ))}
        {resources.length === 0 ? <div className="fp-empty">暂无可选资源</div> : null}
      </div>
      {resources.length > resourcePage.pageSize ? (
        <Pagination
          pageNo={resourcePage.pageNo}
          pageSize={resourcePage.pageSize}
          total={resources.length}
          onChange={(next) => onResourcePageChange({ ...resourcePage, ...next })}
        />
      ) : null}
    </div>
  );
}

function TopologyScopeTree({ environments, regions, selectedEnvId, selectedRegionId, onSelect }) {
  return (
    <aside className="fp-infra-tree fp-topology-scope-tree">
      <div className="fp-infra-tree__title">环境区域</div>
      <button className={!selectedEnvId && !selectedRegionId ? 'is-active' : ''} type="button" onClick={() => onSelect('', '')}>
        <span>全部环境区域</span>
        <em>全部拓扑</em>
      </button>
      {environments.map((env) => {
        const managers = regions.filter((region) => region.envId === env.id && region.regionType === 'MANAGEMENT');
        return (
          <div className="fp-tree-group" key={env.id}>
            <button className={selectedEnvId === env.id && !selectedRegionId ? 'is-active' : ''} type="button" onClick={() => onSelect(env.id, '')}>
              <span>{env.envName}</span>
              <em>{env.envCode}</em>
            </button>
            {managers.map((manager) => {
              const computes = regions.filter((region) => region.parentRegionId === manager.id);
              return (
                <div className="fp-tree-children" key={manager.id}>
                  <button className={`fp-tree-management ${selectedRegionId === manager.id ? 'is-active' : ''}`} type="button" onClick={() => onSelect(env.id, manager.id)}>
                    <span>{manager.regionName}</span>
                    <em>管理区</em>
                  </button>
                  <div className="fp-tree-computes">
                    {computes.map((compute) => (
                      <button className={`fp-tree-compute ${selectedRegionId === compute.id ? 'is-active' : ''}`} key={compute.id} type="button" onClick={() => onSelect(env.id, compute.id)}>
                        <span>{compute.regionName}</span>
                        <em>计算区</em>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}

function TopologyCardGrid({ page, envs, onOpen, onEdit }) {
  if (!page.records.length) {
    return <div className="fp-empty fp-topology-empty-list">暂无拓扑，请先新增拓扑。</div>;
  }
  return (
    <div className="fp-topology-card-grid">
      {page.records.map((topology) => {
        const env = envs.find((item) => item.id === topology.envId);
        return (
          <article className={`fp-topology-card ${severityClass(topology.alertLevel || 'NORMAL')}`} key={topology.id}>
            <button className="fp-topology-card__main" type="button" onClick={() => onOpen(topology)}>
              <div className="fp-topology-card__head">
                <div>
                  <strong>{topology.topologyName}</strong>
                  <span>{topology.topologyCode}</span>
                </div>
                <em>{alertText(topology.alertLevel)}</em>
              </div>
              <p>{topology.description || '暂无描述'}</p>
              <div className="fp-topology-card__meta">
                <span>环境 {topology.envName || env?.envName || '-'}</span>
                <span>节点 {topology.nodeCount ?? topology.nodesCount ?? 0}</span>
                <span>连线 {topology.edgeCount ?? topology.edgesCount ?? 0}</span>
              </div>
            </button>
            <div className="fp-topology-card__actions">
              <button className="fp-link-button" type="button" onClick={() => onOpen(topology)}>进入编辑</button>
              <button className="fp-link-button" type="button" onClick={() => onEdit(topology)}>修改信息</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TopologyListPanel({ page, query, current, onQueryChange, onSearch, onOpen, onPageChange }) {
  return (
    <div className="fp-topology-panel-body">
      <div className="fp-topology-panel-title">
        <h2>拓扑列表</h2>
        <p>切换不同数据流视图。</p>
      </div>
      <label className="fp-inline-search"><span>⌕</span><input value={query.keyword} placeholder="搜索拓扑名称或编码" onChange={(event) => onQueryChange({ ...query, keyword: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && onSearch()} /></label>
      <div className="fp-topology-list__items">
        {page.records.map((item) => <button className={`fp-topology-list__item ${current?.id === item.id ? 'is-active' : ''}`} type="button" key={item.id} onClick={() => onOpen(item.id)}><strong>{item.topologyName}</strong><span>{item.topologyCode}</span></button>)}
      </div>
      <Pagination pageNo={page.pageNo} pageSize={page.pageSize} total={page.total} onChange={onPageChange} />
    </div>
  );
}

function EdgeDraftBar({ form, draft, nodeMap, onChange, onSave, onCancel }) {
  return (
    <div className="fp-topology-edge-draft">
      <div>
        <strong>新增连线</strong>
        <span>{edgeDraftText(draft, nodeMap)}</span>
      </div>
      <input value={form.edgeName} placeholder="连线名称" onChange={(event) => onChange({ ...form, edgeName: event.target.value })} />
      <select value={form.relationType} onChange={(event) => onChange({ ...form, relationType: event.target.value })}>
        <option value="MANUAL">手工关系</option>
        <option value="KAFKA_CONSUME">Kafka 消费</option>
        <option value="ES_WRITE">ES 写入</option>
        <option value="APP_CALL">应用调用</option>
      </select>
      <button className="fp-button fp-button--primary" type="button" onClick={onSave}>确认连线</button>
      <button className="fp-button" type="button" onClick={onCancel}>取消</button>
    </div>
  );
}

function EmptyCanvas({ title, desc }) {
  return (
    <div className="fp-topology-empty-canvas">
      <strong>{title}</strong>
      <span>{desc}</span>
    </div>
  );
}

function InspectorHeader({ selected, edgeDraft }) {
  if (edgeDraft) {
    return <div className="fp-topology-inspector__head"><span className="fp-kicker">连线向导</span><h2>选择源和目标</h2><p>点击画布节点完成连线两端选择。</p></div>;
  }
  if (!selected) {
    return <div className="fp-topology-inspector__head"><span className="fp-kicker">属性面板</span><h2>未选择元素</h2><p>选择节点或连线后在这里修改展示信息。</p></div>;
  }
  return <div className="fp-topology-inspector__head"><span className="fp-kicker">{selected.type === 'node' ? '节点' : '连线'}</span><h2>{selected.type === 'node' ? selected.data.nodeName : selected.data.edgeName}</h2><p>{selected.type === 'node' ? `${nodeTypeText(selected.data.nodeType)} / ${objectTypeText(selected.data.objectType)}` : `${edgeTypeText(selected.data.edgeType)} / ${relationTypeText(selected.data.relationType)}`}</p></div>;
}

function InspectorEmpty({ edgeDraft }) {
  return <div className="fp-empty">{edgeDraft ? '请在画布中点击源节点和目标节点。' : '暂无选中元素'}</div>;
}

function MiniStat({ stat }) {
  return (
    <div className="fp-topology-mini-stat">
      <strong>{stat.value}</strong>
      <span>{stat.title}</span>
    </div>
  );
}

function Node({ node, runtime, showMetrics, selected, linking, onMouseDown, onContextMenu }) {
  const level = runtime?.level || node.alertLevel || 'NORMAL';
  const metrics = (runtime?.metrics || []).slice(0, 3);
  const icon = topologyIcon(node.objectType);
  const size = topologyNodeVisualSize(showMetrics, runtime);
  const metricWidth = metrics.length ? (size.width - 36) / metrics.length : 0;
  const metricTop = size.height - 64;
  return (
    <g className={`fp-topology-node ${selected ? 'is-selected' : ''} ${linking ? 'is-linking' : ''} ${severityClass(level)}`} onMouseDown={onMouseDown} onContextMenu={onContextMenu}>
      <title>{runtimeTooltip(node.nodeName, runtime)}</title>
      <rect className="fp-topology-node-card" x={node.x} y={node.y} width={size.width} height={size.height} rx="16" />
      {icon ? <image className="fp-topology-node-icon" href={icon} x={node.x + 22} y={node.y + 22} width="28" height="28" /> : null}
      <g className={`fp-node-status ${severityClass(level)}`} transform={`translate(${node.x + size.width - 72}, ${node.y + 18})`}>
        <rect width="50" height="22" rx="11" />
        <text x="25" y="15">{alertText(level)}</text>
      </g>
      <text className="fp-node-title" x={node.x + 22} y={node.y + 78}>{nodeNameText(node.nodeName)}</text>
      <text className="fp-node-sub" x={node.x + 22} y={node.y + 104}>{objectTypeText(node.objectType)}</text>
      <line className="fp-node-divider" x1={node.x + 22} y1={node.y + 124} x2={node.x + size.width - 22} y2={node.y + 124} />
      {showMetrics ? (
        <g className="fp-node-metrics">
          {metrics.map((metric, index) => (
            <g className={`fp-node-metric ${severityClass(metric.alertLevel || 'NORMAL')}`} key={metric.id || metric.metricCode || index} transform={`translate(${node.x + 18 + index * metricWidth}, ${node.y + metricTop})`}>
              <title>{`${metric.metricName || metric.metricCode}：${metricValueText(metric)} / ${alertText(metric.alertLevel || 'NORMAL')}`}</title>
              <text className="fp-node-metric-name" x="8" y="18">{metricNameText(metric)}</text>
              <text className="fp-node-metric-value" x="8" y="40">{metricCanvasValueText(metric)}</text>
            </g>
          ))}
        </g>
      ) : null}
    </g>
  );
}

function Edge({ edge, nodeMap, runtime, showMetrics, showLabel, selected, onSelect }) {
  const source = nodeMap[edge.sourceNodeId];
  const target = nodeMap[edge.targetNodeId];
  if (!source || !target) return null;
  const level = runtime?.level || edge.alertLevel || 'NORMAL';
  const sourceSize = topologyNodeVisualSize(showMetrics);
  const targetSize = topologyNodeVisualSize(showMetrics);
  const anchors = edgeAnchors(source, target, sourceSize, targetSize);
  const { x1, y1, x2, y2, orientation } = anchors;
  const distance = orientation === 'horizontal' ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
  const curve = clamp(distance * 0.42, 64, 150);
  const c1 = orientation === 'horizontal' ? x1 + curve * anchors.direction : x1;
  const c1y = orientation === 'horizontal' ? y1 : y1 + curve * anchors.direction;
  const c2 = orientation === 'horizontal' ? x2 - curve * anchors.direction : x2;
  const c2y = orientation === 'horizontal' ? y2 : y2 - curve * anchors.direction;
  const mid = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const path = `M${x1},${y1} C${c1},${c1y} ${c2},${c2y} ${x2},${y2}`;
  const label = edge.edgeName || edge.edgeKey || '连线';
  const labelWidth = clamp(label.length * 13 + 28, 72, 180);
  const labelX = mid;
  const labelY = midY - 10;
  const metric = (runtime?.metrics || [])[0];
  const metricLabel = metric ? `${metricNameText(metric)} ${metricCanvasValueText(metric)}` : '';
  const metricWidth = clamp(metricLabel.length * 8 + 34, 132, 230);
  return (
    <g className={`fp-topology-edge-group ${selected ? 'is-selected' : ''} ${severityClass(level)}`} onMouseDown={onSelect} onClick={onSelect}>
      <title>{runtimeTooltip(label, runtime)}</title>
      <path className="fp-topology-edge-hit" d={path} />
      <path className="fp-topology-edge" d={path} />
      <path className="fp-topology-edge-flow" d={path} />
      {showLabel ? (
        <>
          <rect className="fp-topology-edge-label-hit" x={labelX - labelWidth / 2} y={labelY - 19} width={labelWidth} height="26" rx="13" />
          <text className="fp-topology-edge-label" x={labelX} y={labelY}>{label}</text>
        </>
      ) : null}
      {showMetrics && metric ? (
        <g className={`fp-topology-edge-metric ${severityClass(metric.alertLevel || 'NORMAL')}`}>
          <title>{`${metric.metricName || metric.metricCode}：${metricValueText(metric)} / ${alertText(metric.alertLevel || 'NORMAL')}`}</title>
          <text x={labelX} y={labelY + 24}>{metricLabel}</text>
        </g>
      ) : null}
    </g>
  );
}

function edgeAnchors(source, target, sourceSize, targetSize) {
  const sourceCenter = {
    x: source.x + sourceSize.width / 2,
    y: source.y + sourceSize.height / 2,
  };
  const targetCenter = {
    x: target.x + targetSize.width / 2,
    y: target.y + targetSize.height / 2,
  };
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const gap = 10;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const direction = dx >= 0 ? 1 : -1;
    return {
      orientation: 'horizontal',
      direction,
      x1: direction > 0 ? source.x + sourceSize.width : source.x,
      y1: sourceCenter.y,
      x2: direction > 0 ? target.x - gap : target.x + targetSize.width + gap,
      y2: targetCenter.y,
    };
  }
  const direction = dy >= 0 ? 1 : -1;
  return {
    orientation: 'vertical',
    direction,
    x1: sourceCenter.x,
    y1: direction > 0 ? source.y + sourceSize.height : source.y,
    x2: targetCenter.x,
    y2: direction > 0 ? target.y - gap : target.y + targetSize.height + gap,
  };
}

function DraftEdge({ draft, nodeMap }) {
  const source = nodeMap[draft.sourceNodeId];
  if (!source || !draft.pointer) return null;
  const sourceSize = topologyNodeVisualSize(true);
  const x1 = source.x + sourceSize.width;
  const y1 = source.y + sourceSize.height / 2;
  const x2 = draft.pointer.x;
  const y2 = draft.pointer.y;
  return (
    <g className="fp-topology-draft-edge-group">
      <line className="fp-topology-draft-edge" x1={x1} y1={y1} x2={x2} y2={y2} />
      <circle className="fp-topology-draft-target" cx={x2} cy={y2} r="5" />
    </g>
  );
}

function edgeDraftText(draft, nodeMap) {
  const source = draft.sourceNodeId ? nodeMap[draft.sourceNodeId]?.nodeName : '未选择源节点';
  const target = draft.targetNodeId ? nodeMap[draft.targetNodeId]?.nodeName : '未选择目标节点';
  return `${source} -> ${target}`;
}

function AlignmentGuides({ guides, viewBox }) {
  if (!guides || (!guides.vertical && !guides.horizontal)) return null;
  return (
    <g className="fp-topology-align-guides">
      {guides.vertical != null ? (
        <line x1={guides.vertical} y1={viewBox.y} x2={guides.vertical} y2={viewBox.y + viewBox.height} />
      ) : null}
      {guides.horizontal != null ? (
        <line x1={viewBox.x} y1={guides.horizontal} x2={viewBox.x + viewBox.width} y2={guides.horizontal} />
      ) : null}
    </g>
  );
}

function snapNodePosition(rawX, rawY, nodeId, nodes, size) {
  const activeWidth = size.width;
  const activeHeight = size.height;
  let x = snapToGrid(rawX);
  let y = snapToGrid(rawY);
  const guides = {};
  const activeXPoints = [
    { value: x, offset: 0 },
    { value: x + activeWidth / 2, offset: activeWidth / 2 },
    { value: x + activeWidth, offset: activeWidth },
  ];
  const activeYPoints = [
    { value: y, offset: 0 },
    { value: y + activeHeight / 2, offset: activeHeight / 2 },
    { value: y + activeHeight, offset: activeHeight },
  ];
  let bestX = null;
  let bestY = null;
  nodes.filter((node) => node.id !== nodeId).forEach((node) => {
    const nodeX = Number(node.x || 0);
    const nodeY = Number(node.y || 0);
    const width = Number(node.width || size.width || NODE_SIZE.width);
    const height = Number(node.height || size.height || NODE_SIZE.height);
    const xTargets = [nodeX, nodeX + width / 2, nodeX + width];
    const yTargets = [nodeY, nodeY + height / 2, nodeY + height];
    activeXPoints.forEach((point) => {
      xTargets.forEach((target) => {
        const distance = Math.abs(point.value - target);
        if (distance <= ALIGN_THRESHOLD && (!bestX || distance < bestX.distance)) {
          bestX = { distance, x: target - point.offset, guide: target };
        }
      });
    });
    activeYPoints.forEach((point) => {
      yTargets.forEach((target) => {
        const distance = Math.abs(point.value - target);
        if (distance <= ALIGN_THRESHOLD && (!bestY || distance < bestY.distance)) {
          bestY = { distance, y: target - point.offset, guide: target };
        }
      });
    });
  });
  if (bestX) {
    x = bestX.x;
    guides.vertical = bestX.guide;
  }
  if (bestY) {
    y = bestY.y;
    guides.horizontal = bestY.guide;
  }
  return {
    x,
    y,
    guides: {
      vertical: guides.vertical != null ? guides.vertical : null,
      horizontal: guides.horizontal != null ? guides.horizontal : null,
    },
  };
}

function snapToGrid(value) {
  return Math.round(Number(value || 0) / GRID_SIZE) * GRID_SIZE;
}

function topologyNodeVisualSize(showMetrics) {
  return showMetrics ? { width: 250, height: 210 } : { width: 250, height: 140 };
}

function fitTopologyViewBox(nodes, showMetrics, options = {}) {
  if (!nodes.length) return DEFAULT_VIEWBOX;
  const size = topologyNodeVisualSize(showMetrics);
  const mode = options.mode || 'reset';
  const currentViewBox = options.currentViewBox;
  const svgRect = options.svg ? options.svg.getBoundingClientRect() : null;
  const svgRatio = svgRect && svgRect.width > 0 && svgRect.height > 0
    ? svgRect.width / svgRect.height
    : DEFAULT_VIEWBOX.width / DEFAULT_VIEWBOX.height;
  const padding = showMetrics ? 96 : 82;
  const minViewport = showMetrics
    ? { width: 1120, height: 680 }
    : { width: DEFAULT_VIEWBOX.width, height: DEFAULT_VIEWBOX.height };
  const minX = Math.min(...nodes.map((node) => Number(node.x || 0)));
  const minY = Math.min(...nodes.map((node) => Number(node.y || 0)));
  const maxX = Math.max(...nodes.map((node) => Number(node.x || 0) + size.width));
  const maxY = Math.max(...nodes.map((node) => Number(node.y || 0) + size.height));
  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const desiredWidth = Math.max(contentWidth + padding * 2, minViewport.width);
  const desiredHeight = Math.max(contentHeight + padding * 2, minViewport.height);
  let width = desiredWidth;
  let height = desiredHeight;
  const currentRatio = width / height;
  if (currentRatio > svgRatio) {
    height = width / svgRatio;
  } else {
    width = height * svgRatio;
  }
  width = Math.max(width, minViewport.width);
  height = Math.max(height, minViewport.height);
  const centerX = minX + contentWidth / 2;
  const centerY = minY + contentHeight / 2;
  if (mode === 'preserveOrigin' && currentViewBox) {
    const nextX = centerX - width / 2;
    const nextY = centerY - height / 2;
    const currentCenterX = currentViewBox.x + currentViewBox.width / 2;
    const currentCenterY = currentViewBox.y + currentViewBox.height / 2;
    const result = {
      x: currentCenterX - width / 2 + (nextX - (currentCenterX - width / 2)) * 0.35,
      y: currentCenterY - height / 2 + (nextY - (currentCenterY - height / 2)) * 0.35,
      width,
      height,
    };
    debugTopologyFit('fit-result', {
      reason: options.reason,
      mode,
      showMetrics,
      nodeCount: nodes.length,
      svgRect: readSvgRect(options.svg),
      svgRatio,
      bounds: { minX, minY, maxX, maxY, contentWidth, contentHeight, desiredWidth, desiredHeight, centerX, centerY },
      currentViewBox,
      result,
    });
    return result;
  }
  const result = {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
  debugTopologyFit('fit-result', {
    reason: options.reason,
    mode,
    showMetrics,
    nodeCount: nodes.length,
    svgRect: readSvgRect(options.svg),
    svgRatio,
    bounds: { minX, minY, maxX, maxY, contentWidth, contentHeight, desiredWidth, desiredHeight, centerX, centerY },
    result,
  });
  return result;
}

function readSvgRect(svg) {
  if (!svg || !svg.getBoundingClientRect) return null;
  const rect = svg.getBoundingClientRect();
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    left: Math.round(rect.left),
    top: Math.round(rect.top),
  };
}

function debugTopologyFit(stage, payload) {
  if (!TOPOLOGY_FIT_DEBUG || typeof console === 'undefined') return;
  console.log('[FlowPulse][TopologyFit]', stage, payload);
}

function defaultMetricDisplayName(metric) {
  return compactMetricName(metric?.metricName || metric?.metricCode || '指标');
}

function defaultTopologyMetricConfig(context, metrics = [], implementations = []) {
  const firstMetric = metrics[0];
  const firstImplementation = firstMetric
    ? implementations.find((item) => item.metricDefinitionId === firstMetric.id && item.defaultImplementation)
      || implementations.find((item) => item.metricDefinitionId === firstMetric.id)
    : null;
  return {
    objectType: context?.objectType || 'TOPOLOGY_NODE',
    objectId: context?.objectId || '',
    objectCode: context?.objectCode || '',
    objectName: context?.objectName || '',
    metricDefinitionId: firstMetric?.id || '',
    implementationId: firstImplementation?.id || '',
    executionMode: firstImplementation?.executionMode || 'SERVER',
    intervalSec: 60,
    parameterJson: '',
    showOnTopology: true,
    displayName: defaultMetricDisplayName(firstMetric),
    displayOrder: 100,
    enabled: true,
  };
}

function normalizeTopologyMetricConfig(form, context) {
  return {
    ...form,
    objectType: context.objectType,
    objectId: context.objectId,
    objectCode: context.objectCode,
    objectName: context.objectName,
    intervalSec: Number(form.intervalSec || 60),
    showOnTopology: form.showOnTopology !== false,
    displayName: String(form.displayName || '').trim(),
    displayOrder: Number.isFinite(Number(form.displayOrder)) ? Number(form.displayOrder) : 100,
    enabled: form.enabled !== false,
  };
}

function normalizeTopologyThresholdRule(form, context, metrics) {
  const metric = metrics.find((item) => item.id === form.metricDefinitionId) || {};
  const conditions = (form.conditions || [])
    .filter((condition) => condition.enabled && condition.value !== '')
    .map((condition) => ({
      severity: condition.severity,
      enabled: true,
      operator: condition.operator || '>=',
      value: Number(condition.value),
    }))
    .filter((condition) => Number.isFinite(condition.value));
  return {
    ruleCode: form.ruleCode || buildTopologyThresholdRuleCode(context, metric, form),
    ruleName: form.ruleName || `${context.objectName} - ${metric.metricName || form.metricDefinitionId}`,
    metricDefinitionId: form.metricDefinitionId,
    scopeType: 'TOPOLOGY_ELEMENT',
    objectType: context.objectType,
    objectId: context.objectId,
    objectCode: context.objectCode,
    objectName: context.objectName,
    topologyId: context.topologyId,
    topologyElementId: context.topologyElementId,
    topologyElementType: context.topologyElementType,
    conditionsJson: conditions.length ? JSON.stringify(conditions) : '',
    evaluationWindowSec: Number(form.evaluationWindowSec || 60),
    consecutiveCount: Number(form.consecutiveCount || 1),
    recoveryPolicy: form.recoveryPolicy || 'AUTO',
    enabled: form.enabled !== false,
    description: form.description || '',
  };
}

function buildTopologyThresholdRuleCode(context, metric, form) {
  const parts = [
    'topology',
    context?.topologyId,
    context?.topologyElementId,
    metric?.metricCode || form.metricDefinitionId,
  ];
  return parts
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 128);
}

function filterTopologyMetrics(metrics, context) {
  if (!context) return [];
  const topologyType = context.topologyElementType === 'EDGE' ? 'TOPOLOGY_EDGE' : 'TOPOLOGY_NODE';
  const compatibleTypes = compatibleMetricObjectTypes(context.objectType, topologyType);
  return metrics.filter((metric) => {
    if (metric.enabled === false) return false;
    return !metric.objectType
      || compatibleTypes.has(metric.objectType)
      || metric.metricCategory === topologyType
      || metric.metricCategory === 'DERIVED';
  });
}

function compatibleMetricObjectTypes(objectType, topologyType) {
  const values = new Set([objectType, topologyType]);
  const groups = {
    KAFKA_TOPIC: ['KAFKA', 'KAFKA_TOPIC', 'RESOURCE', 'TOPOLOGY_NODE'],
    KAFKA_GROUP: ['KAFKA', 'KAFKA_GROUP', 'RESOURCE', 'TOPOLOGY_NODE'],
    SPARK_JOB: ['SPARK', 'SPARK_JOB', 'RESOURCE', 'TOPOLOGY_NODE'],
    SPARK_LOGICAL_JOB: ['SPARK', 'SPARK_JOB', 'SPARK_LOGICAL_JOB', 'LOGICAL_OBJECT', 'RESOURCE', 'TOPOLOGY_NODE'],
    ES_INDEX: ['ELASTICSEARCH', 'ES_INDEX', 'RESOURCE', 'TOPOLOGY_NODE'],
    ES_LOGICAL_INDEX: ['ELASTICSEARCH', 'ES_INDEX', 'ES_LOGICAL_INDEX', 'LOGICAL_OBJECT', 'RESOURCE', 'TOPOLOGY_NODE'],
    ELASTICSEARCH: ['ELASTICSEARCH', 'ES_INDEX', 'RESOURCE', 'TOPOLOGY_NODE'],
    APPLICATION: ['APPLICATION', 'RESOURCE', 'TOPOLOGY_NODE'],
    TOPOLOGY_EDGE: ['TOPOLOGY_EDGE', 'DERIVED'],
  };
  (groups[objectType] || []).forEach((item) => values.add(item));
  return values;
}

function nodeTypeText(value) {
  const map = {
    RESOURCE: '资源节点',
    LOGICAL_OBJECT: '逻辑对象',
    INFRASTRUCTURE: '基础设施',
    MANUAL: '手工节点',
  };
  return map[value] || value || '-';
}

function objectTypeText(value) {
  const map = {
    KAFKA: 'Kafka 集群',
    SPARK: 'Spark 平台',
    ELASTICSEARCH: 'Elasticsearch 集群',
    KAFKA_TOPIC: 'Kafka Topic',
    KAFKA_GROUP: 'Kafka 消费组',
    SPARK_JOB: 'Spark 作业',
    SPARK_LOGICAL_JOB: 'Spark 逻辑作业',
    ES_INDEX: 'ES 索引',
    ES_LOGICAL_INDEX: 'ES 逻辑索引',
    APPLICATION: '应用服务',
    EXECUTOR_NODE: '执行节点',
    TOPOLOGY_NODE: '拓扑节点',
    TOPOLOGY_EDGE: '拓扑连线',
    MANUAL: '手工对象',
  };
  return map[value] || value || '-';
}

function topologyIcon(type) {
  const value = String(type || '').toUpperCase();
  if (value.includes('KAFKA')) return kafkaIcon;
  if (value.includes('SPARK')) return sparkIcon;
  if (value.includes('ES') || value.includes('ELASTIC')) return elasticsearchIcon;
  return applicationIcon;
}

function edgeTypeText(value) {
  const map = {
    DATA_FLOW: '数据流',
    DEPENDENCY: '依赖关系',
  };
  return map[value] || value || '-';
}

function relationTypeText(value) {
  const map = {
    MANUAL: '手工关系',
    KAFKA_CONSUME: 'Kafka 消费',
    ES_WRITE: 'ES 写入',
    APP_CALL: '应用调用',
  };
  return map[value] || value || '-';
}

function defaultEdgeForm(index = 1) {
  return {
    edgeKey: `edge-${index}`,
    edgeName: `数据流${index}`,
    edgeType: 'DATA_FLOW',
    relationType: 'MANUAL',
    relationId: '',
  };
}

function normalizeNode(node) {
  return {
    ...node,
    width: Number(node.width || NODE_SIZE.width),
    height: Number(node.height || NODE_SIZE.height),
    x: Number(node.x || 100),
    y: Number(node.y || 100),
  };
}

function normalizeEdge(edge) {
  return {
    ...edge,
    edgeType: edge.edgeType || 'DATA_FLOW',
    relationType: edge.relationType || 'MANUAL',
    edgeName: edge.edgeName || edge.edgeKey,
  };
}

function normalizeTopologyRuntime(response, nodes, edges) {
  const configs = [];
  const alerts = [];
  const elements = Array.isArray(response?.elements) ? response.elements : [];
  const elementById = {};
  nodes.forEach((node) => { elementById[node.id] = { type: 'NODE', objectType: node.objectType, objectId: node.objectId }; });
  edges.forEach((edge) => { elementById[edge.id] = { type: 'EDGE', objectType: 'TOPOLOGY_EDGE', objectId: edge.id }; });
  elements.forEach((element) => {
    const fallback = elementById[element.elementId] || {};
    const objectType = element.objectType || fallback.objectType;
    const objectId = element.objectId || fallback.objectId;
    (element.metrics || []).forEach((metric) => {
      configs.push({
        ...metric,
        id: metric.configId,
        objectType,
        objectId,
        enabled: true,
      });
    });
    (element.alerts || []).forEach((alert) => {
      alerts.push({
        ...alert,
        currentLevel: alert.level,
        topologyElementId: element.elementId,
        topologyElementType: element.elementType || fallback.type,
        objectType,
        objectId,
      });
    });
  });
  return { configs, alerts };
}

function buildCanvasRuntime(nodes, edges, configs, alerts, metricDefinitionMap) {
  const byElementId = {};
  nodes.forEach((node) => {
    const key = runtimeKey(node.objectType, node.objectId);
    byElementId[node.id] = {
      elementId: node.id,
      level: 'NORMAL',
      metrics: metricDisplayItems(configs.filter((config) => runtimeKey(config.objectType, config.objectId) === key), metricDefinitionMap),
      alerts: [],
    };
  });
  edges.forEach((edge) => {
    const key = runtimeKey('TOPOLOGY_EDGE', edge.id);
    byElementId[edge.id] = {
      elementId: edge.id,
      level: 'NORMAL',
      metrics: metricDisplayItems(configs.filter((config) => runtimeKey(config.objectType, config.objectId) === key), metricDefinitionMap),
      alerts: [],
    };
  });
  alerts.forEach((alert) => {
    const elementId = alert.topologyElementId || alert.objectId;
    if (!elementId) return;
    if (!byElementId[elementId]) {
      byElementId[elementId] = { elementId, level: 'NORMAL', metrics: [], alerts: [] };
    }
    byElementId[elementId].alerts.push(alert);
    byElementId[elementId].level = highestSeverity([byElementId[elementId].level, alert.currentLevel]);
  });
  Object.values(byElementId).forEach((runtime) => {
    const alertByMetric = {};
    runtime.alerts.forEach((alert) => {
      if (!alert.metricDefinitionId) return;
      alertByMetric[alert.metricDefinitionId] = highestSeverity([alertByMetric[alert.metricDefinitionId] || 'NORMAL', alert.currentLevel]);
    });
    runtime.metrics = runtime.metrics
      .map((metric) => ({ ...metric, alertLevel: alertByMetric[metric.metricDefinitionId] || 'NORMAL' }))
      .sort((left, right) => {
        const levelDiff = severityRank(right.alertLevel) - severityRank(left.alertLevel);
        if (levelDiff !== 0) return levelDiff;
        const orderDiff = Number(left.displayOrder ?? 100) - Number(right.displayOrder ?? 100);
        if (orderDiff !== 0) return orderDiff;
        const leftTime = Number(left.currentValueAt || left.lastCollectAt || 0);
        const rightTime = Number(right.currentValueAt || right.lastCollectAt || 0);
        return rightTime - leftTime;
      });
  });
  return {
    byElementId,
    alertCount: Object.values(byElementId).filter((item) => severityRank(item.level) > severityRank('NORMAL')).length,
  };
}

function runtimeKey(objectType, objectId) {
  return `${objectType || ''}::${objectId || ''}`;
}

function metricDisplayItems(configs, metricDefinitionMap) {
  return configs
    .filter((config) => config.enabled !== false && config.showOnTopology !== false)
    .map((config) => {
      const metric = metricDefinitionMap[config.metricDefinitionId] || {};
      return {
        ...config,
        displayName: config.displayName || defaultMetricDisplayName(metric),
        displayOrder: Number.isFinite(Number(config.displayOrder)) ? Number(config.displayOrder) : 100,
        unit: metric.valueUnit || config.valueUnit || '',
        precision: Number.isFinite(Number(metric.valuePrecision)) ? Number(metric.valuePrecision) : 2,
      };
    })
    .sort((left, right) => {
      const orderDiff = Number(left.displayOrder ?? 100) - Number(right.displayOrder ?? 100);
      if (orderDiff !== 0) return orderDiff;
      return Number(right.currentValueAt || right.lastCollectAt || 0) - Number(left.currentValueAt || left.lastCollectAt || 0);
    });
}

function metricShortText(metric) {
  return `${metricNameText(metric)} ${metricValueText(metric)}`;
}

function nodeNameText(name) {
  const value = String(name || '未命名节点');
  return value.length > 15 ? `${value.slice(0, 15)}…` : value;
}

function metricNameText(metric) {
  if (metric.displayName) return compactMetricName(metric.displayName);
  const name = metric.metricName || metric.metricCode || '指标';
  return compactMetricName(name);
}

function compactMetricName(name) {
  const normalized = String(name || '指标')
    .replace(/^Kafka\s*/i, '')
    .replace(/^Spark\s*/i, '')
    .replace(/^ES\s*/i, '')
    .replace(/\s+/g, '');
  return normalized.length > 7 ? `${normalized.slice(0, 7)}…` : normalized;
}

function metricValueText(metric) {
  const value = metric.currentValue === null || metric.currentValue === undefined ? '-' : formatMetricValue(metric.currentValue, metric.precision);
  return `${value}${metric.unit || ''}`;
}

function metricCanvasValueText(metric) {
  const number = Number(metric.currentValue);
  if (!Number.isFinite(number)) return `-${metric.unit || ''}`;
  const unit = metric.unit || '';
  if (unit.toLowerCase() === 'ms' && number > 946684800000) {
    return new Date(number).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  if (Math.abs(number) >= 100000000) return `${(number / 100000000).toLocaleString('zh-CN', { maximumFractionDigits: 1 })}亿${unit}`;
  if (Math.abs(number) >= 10000) return `${(number / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 1 })}万${unit}`;
  return metricValueText(metric);
}

function formatMetricValue(value, precision = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  if (Math.abs(number) >= 1000) return number.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  return number.toLocaleString('zh-CN', { maximumFractionDigits: Math.min(Math.max(precision, 0), 4) });
}

function runtimeTooltip(title, runtime) {
  const level = alertText(runtime?.level || 'NORMAL');
  const alerts = runtime?.alerts || [];
  const metrics = runtime?.metrics || [];
  const lines = [`${title} / ${level}`];
  alerts.slice(0, 3).forEach((alert) => lines.push(`告警：${alert.message || alert.currentLevel}`));
  metrics.slice(0, 4).forEach((metric) => lines.push(`指标：${metric.metricName || metric.metricCode} = ${formatMetricValue(metric.currentValue, metric.precision)}${metric.unit || ''}`));
  return lines.join('\n');
}

function highestSeverity(levels) {
  return levels.reduce((highest, level) => (severityRank(level) > severityRank(highest) ? level : highest), 'NORMAL');
}

function severityRank(level) {
  const map = { NORMAL: 0, UNKNOWN: 1, INFO: 2, REMIND: 2, WARNING: 3, ERROR: 4, CRITICAL: 5 };
  return map[level] ?? 1;
}

function severityClass(level) {
  const normalized = level === 'REMIND' ? 'INFO' : (level || 'NORMAL');
  return `is-alert-${String(normalized).toLowerCase()}`;
}

function indexById(items) {
  const map = {};
  items.forEach((item) => { map[item.id] = item; });
  return map;
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function stringifyParameter(value) {
  return JSON.stringify(value || {}, null, 2);
}

function labelExecutionMode(value) {
  const map = {
    SERVER: '服务端',
    SSH: 'SSH',
    AGENT: 'Agent',
    EXPRESSION: '表达式',
  };
  return map[value] || value || '-';
}

function nextId() {
  if (window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now()}${Math.random().toString(16).slice(2)}`.slice(0, 32).padEnd(32, '0');
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function scopeTitle(envs, regions, envId, regionId) {
  if (regionId) {
    const region = regions.find((item) => item.id === regionId);
    const env = envs.find((item) => item.id === region?.envId || item.id === envId);
    return `${env?.envName || '环境'} / ${region?.regionName || '区域'}`;
  }
  if (envId) {
    return envs.find((item) => item.id === envId)?.envName || '当前环境';
  }
  return '全部环境区域';
}

function alertText(level) {
  const map = {
    NORMAL: '正常',
    INFO: '提醒',
    REMIND: '提醒',
    WARNING: '警告',
    ERROR: '错误',
    CRITICAL: '紧急',
    UNKNOWN: '未知',
  };
  return map[level] || '未知';
}

function defaultStats(nodeCount = 0, edgeCount = 0) {
  return [
    { title: '拓扑图', value: '0', description: '已维护的数据流视图' },
    { title: '节点', value: String(nodeCount), description: '画布节点' },
    { title: '连线', value: String(edgeCount), description: '画布连线' },
    { title: '异常', value: '0', description: '异常元素' },
  ];
}

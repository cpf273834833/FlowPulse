import React, { useEffect, useMemo, useRef, useState } from 'react';
import { topologyApi } from '../../api/topologyApi';
import { environmentRegionApi } from '../../api/environmentRegionApi';
import { infrastructureApi } from '../../api/infrastructureApi';
import { logicalObjectApi } from '../../api/logicalObjectApi';
import { metricApi } from '../../api/metricApi';
import { thresholdApi } from '../../api/thresholdApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import Toast from '../../components/Toast';
import './DataTopologyPage.css';

const DEFAULT_QUERY = { pageNo: 1, pageSize: 10, keyword: '' };
const DEFAULT_FORM = { topologyCode: '', topologyName: '', envId: '', description: '', canvasConfigJson: '{}' };
const NODE_SIZE = { width: 238, height: 104 };
const DEFAULT_VIEWBOX = { x: 0, y: 0, width: 1200, height: 620 };
const EMPTY_CONFIG_PAGE = { configs: { records: [], total: 0, pageNo: 1, pageSize: 20 }, stats: [] };
const QUICK_THRESHOLD_SEVERITIES = [
  ['REMIND', '提醒'],
  ['WARNING', '警告'],
  ['ERROR', '错误'],
  ['CRITICAL', '紧急'],
];

export default function DataTopologyPage() {
  const svgRef = useRef(null);
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
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [panning, setPanning] = useState(null);
  const [canvasViewBox, setCanvasViewBox] = useState(DEFAULT_VIEWBOX);
  const [edgeDraft, setEdgeDraft] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('properties');
  const [metricDefinitions, setMetricDefinitions] = useState([]);
  const [metricImplementations, setMetricImplementations] = useState([]);
  const [metricConfigs, setMetricConfigs] = useState(EMPTY_CONFIG_PAGE);
  const [thresholdRules, setThresholdRules] = useState([]);
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
    setInspectorTab('properties');
    setMetricDraft(null);
    setThresholdDraft(null);
    if (selectedContext) {
      loadMetricConfigs(selectedContext);
      loadThresholdRules(selectedContext);
    } else {
      setMetricConfigs(EMPTY_CONFIG_PAGE);
      setThresholdRules([]);
    }
  }, [selectedContext?.topologyElementId]);

  async function loadMetricCatalog() {
    try {
      const [metricPage, implementationPage] = await Promise.all([
        metricApi.page({ pageNo: 1, pageSize: 500, enabled: 'true' }),
        metricApi.implementationPage({ pageNo: 1, pageSize: 500, enabled: 'true' }),
      ]);
      setMetricDefinitions((metricPage.metrics && metricPage.metrics.records) || []);
      setMetricImplementations((implementationPage.implementations && implementationPage.implementations.records) || []);
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
      setNodes((response.nodes || []).map(normalizeNode));
      setEdges((response.edges || []).map(normalizeEdge));
      setSelected(null);
      setCanvasViewBox(DEFAULT_VIEWBOX);
      cancelEdgeDraft();
    } catch (error) {
      showError('拓扑详情加载失败', error);
    }
  }

  async function openCanvas(topology) {
    await openTopology(topology.id);
    setMode('canvas');
  }

  function backToList() {
    setMode('list');
    setSelected(null);
    cancelEdgeDraft();
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
          const data = await infrastructureApi.resources(infra.id, { pageNo: 1, pageSize: 500 });
          return (((data || {}).records || [])).map((resource) => ({
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
    const point = svgPoint(event);
    const nextX = clamp(point.x - dragging.offsetX, 20, 1180 - NODE_SIZE.width);
    const nextY = clamp(point.y - dragging.offsetY, 20, 600 - NODE_SIZE.height);
    setNodes((items) => items.map((node) => (node.id === dragging.nodeId ? { ...node, x: nextX, y: nextY } : node)));
    setSelected((currentValue) => {
      if (!currentValue || currentValue.type !== 'node' || currentValue.data.id !== dragging.nodeId) return currentValue;
      return { ...currentValue, data: { ...currentValue.data, x: nextX, y: nextY } };
    });
  }

  function endDrag() {
    setDragging(null);
    setPanning(null);
  }

  function zoomCanvas(factor, anchorPoint = null) {
    setCanvasViewBox((viewBox) => {
      const nextWidth = clamp(viewBox.width * factor, 480, 2600);
      const nextHeight = clamp(viewBox.height * factor, 248, 1344);
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
    setCanvasViewBox(DEFAULT_VIEWBOX);
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
    return {
      topologyId: current.id,
      topologyName: current.topologyName,
      topologyElementId: data.id,
      topologyElementType: isNode ? 'NODE' : 'EDGE',
      objectType: isNode ? data.objectType : 'TOPOLOGY_EDGE',
      objectId: isNode ? data.objectId : data.id,
      objectCode: isNode ? data.objectCode : data.edgeKey,
      objectName: isNode ? (data.objectName || data.nodeName) : data.edgeName,
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
      x: ((event.clientX - rect.left) / rect.width) * 1200,
      y: ((event.clientY - rect.top) / rect.height) * 620,
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
    } catch (error) {
      showError('指标配置保存失败', error);
    }
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
      <div className="fp-page fp-topology-page fp-topology-editor-page">
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
              <div className="fp-canvas-controls">
                <button type="button" onClick={() => zoomCanvas(0.85)}>＋</button>
                <span>{Math.round((DEFAULT_VIEWBOX.width / canvasViewBox.width) * 100)}%</span>
                <button type="button" onClick={() => zoomCanvas(1.18)}>－</button>
                <button type="button" onClick={resetCanvasView}>重置</button>
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
                <defs><marker id="fp-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="rgba(138,180,226,.78)" /></marker></defs>
                {edges.map((edge) => <Edge key={edge.id} edge={edge} nodeMap={nodeMap} selected={selected?.type === 'edge' && selected.data.id === edge.id} onClick={() => { setSelected({ type: 'edge', data: edge }); cancelEdgeDraft(); }} />)}
                {edgeDraft ? <DraftEdge draft={edgeDraft} nodeMap={nodeMap} /> : null}
                {nodes.map((node) => (
                  <Node
                    key={node.id}
                    node={node}
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
                  activeTab={inspectorTab}
                  metrics={metricDefinitions}
                  implementations={metricImplementations}
                  metricConfigs={metricConfigs}
                  thresholdRules={thresholdRules}
                  metricDraft={metricDraft}
                  thresholdDraft={thresholdDraft}
                  onTabChange={setInspectorTab}
                  onMetricDraft={setMetricDraft}
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
                allResources={resources}
                category={resourceCategory}
                type={resourceType}
                types={resourceTypes}
                keyword={resourceKeyword}
                usedObjectIds={usedObjectIds}
                onCategoryChange={setResourceCategory}
                onTypeChange={setResourceType}
                onKeywordChange={setResourceKeyword}
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
  allResources,
  category,
  type,
  types,
  keyword,
  usedObjectIds,
  onCategoryChange,
  onTypeChange,
  onKeywordChange,
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
        {resources.map((resource) => (
          <button className="fp-topology-resource" type="button" key={`${resource.infrastructureId}-${resource.id}`} disabled={!current || usedObjectIds.has(resource.id)} onClick={() => onAddResource(resource)}>
            <strong>{resource.resourceName || resource.resourceCode}</strong>
            <span>{resource.isLogicalObject ? '逻辑对象' : '物理对象'} · {resource.resourceType} / {resource.infrastructureName}</span>
          </button>
        ))}
        {resources.length === 0 ? <div className="fp-empty">暂无可选资源</div> : null}
      </div>
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
          <article className="fp-topology-card" key={topology.id}>
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
  return <div className="fp-topology-inspector__head"><span className="fp-kicker">{selected.type === 'node' ? '节点' : '连线'}</span><h2>{selected.type === 'node' ? selected.data.nodeName : selected.data.edgeName}</h2><p>修改后需要保存画布。</p></div>;
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

function Node({ node, selected, linking, onMouseDown, onContextMenu }) {
  return (
    <g className={`fp-topology-node ${selected ? 'is-selected' : ''} ${linking ? 'is-linking' : ''}`} onMouseDown={onMouseDown} onContextMenu={onContextMenu}>
      <rect x={node.x} y={node.y} width={node.width} height={node.height} rx="18" />
      <text x={node.x + 18} y={node.y + 36}>{node.nodeName}</text>
      <text className="fp-node-sub" x={node.x + 18} y={node.y + 67}>{objectTypeText(node.objectType)} / {alertText(node.alertLevel || 'NORMAL')}</text>
    </g>
  );
}

function Edge({ edge, nodeMap, selected, onClick }) {
  const source = nodeMap[edge.sourceNodeId];
  const target = nodeMap[edge.targetNodeId];
  if (!source || !target) return null;
  const x1 = source.x + source.width;
  const y1 = source.y + source.height / 2;
  const x2 = target.x;
  const y2 = target.y + target.height / 2;
  const mid = (x1 + x2) / 2;
  const path = `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
  return (
    <g className={`fp-topology-edge-group ${selected ? 'is-selected' : ''}`} onClick={onClick}>
      <path className="fp-topology-edge-hit" d={path} />
      <path className="fp-topology-edge" d={path} />
      <text className="fp-topology-edge-label" x={mid} y={(y1 + y2) / 2 - 8}>{edge.edgeName}</text>
    </g>
  );
}

function DraftEdge({ draft, nodeMap }) {
  const source = nodeMap[draft.sourceNodeId];
  if (!source || !draft.pointer) return null;
  const x1 = source.x + source.width;
  const y1 = source.y + source.height / 2;
  const x2 = draft.pointer.x;
  const y2 = draft.pointer.y;
  return (
    <g className="fp-topology-draft-edge-group">
      <line className="fp-topology-draft-edge" x1={x1} y1={y1} x2={x2} y2={y2} />
      <circle className="fp-topology-draft-target" cx={x2} cy={y2} r="5" />
    </g>
  );
}

function ElementEditor({
  selected,
  nodes,
  context,
  activeTab,
  metrics,
  implementations,
  metricConfigs,
  thresholdRules,
  metricDraft,
  thresholdDraft,
  onTabChange,
  onMetricDraft,
  onThresholdDraft,
  onSaveMetric,
  onSaveThreshold,
  onChange,
}) {
  return (
    <div className="fp-topology-editor">
      <div className="fp-inspector-tabs">
        <button className={activeTab === 'properties' ? 'is-active' : ''} type="button" onClick={() => onTabChange('properties')}>属性</button>
        <button className={activeTab === 'metrics' ? 'is-active' : ''} type="button" onClick={() => onTabChange('metrics')}>指标</button>
        <button className={activeTab === 'thresholds' ? 'is-active' : ''} type="button" onClick={() => onTabChange('thresholds')}>阈值</button>
        <button className={activeTab === 'alerts' ? 'is-active' : ''} type="button" onClick={() => onTabChange('alerts')}>告警</button>
      </div>
      {activeTab === 'properties' ? <TopologyElementProperties selected={selected} nodes={nodes} onChange={onChange} /> : null}
      {activeTab === 'metrics' ? <TopologyMetricPanel context={context} metrics={metrics} implementations={implementations} metricConfigs={metricConfigs} metricDraft={metricDraft} onMetricDraft={onMetricDraft} onSaveMetric={onSaveMetric} /> : null}
      {activeTab === 'thresholds' ? <TopologyThresholdPanel context={context} metrics={metrics} metricConfigs={metricConfigs} thresholdRules={thresholdRules} thresholdDraft={thresholdDraft} onThresholdDraft={onThresholdDraft} onSaveThreshold={onSaveThreshold} /> : null}
      {activeTab === 'alerts' ? <TopologyAlertPanel context={context} /> : null}
    </div>
  );
}

function TopologyAlertPanel({ context }) {
  return (
    <div className="fp-topology-config-panel">
      <div className="fp-topology-config-head">
        <div>
          <strong>告警状态</strong>
          <span>当前元素：{context?.objectName || '-'}</span>
        </div>
      </div>
      <div className="fp-topology-alert-empty">
        <strong>暂无活动告警</strong>
        <span>后续这里会展示当前节点或连线的活动告警、最近恢复记录和故障解释。</span>
      </div>
    </div>
  );
}

function TopologyElementProperties({ selected, nodes, onChange }) {
  const data = selected.data;
  if (selected.type === 'node') {
    return (
      <div className="fp-topology-property-grid">
        <label><span>节点名称</span><input value={data.nodeName || ''} onChange={(event) => onChange('nodeName', event.target.value)} /></label>
        <InfoBox label="节点类型" value={nodeTypeText(data.nodeType)} code={data.nodeType} />
        <InfoBox label="对象类型" value={objectTypeText(data.objectType)} code={data.objectType} />
        <label><span>对象编码</span><input value={data.objectCode || ''} disabled /></label>
      </div>
    );
  }
  return (
    <div className="fp-topology-property-grid">
      <label><span>连线名称</span><input value={data.edgeName || ''} onChange={(event) => onChange('edgeName', event.target.value)} /></label>
      <InfoBox label="连线类型" value={edgeTypeText(data.edgeType)} code={data.edgeType} />
      <InfoBox label="关系类型" value={relationTypeText(data.relationType)} code={data.relationType} />
      <label><span>关系 ID</span><input value={data.relationId || ''} onChange={(event) => onChange('relationId', event.target.value)} /></label>
      <label><span>源节点</span><select value={data.sourceNodeId} onChange={(event) => onChange('sourceNodeId', event.target.value)}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.nodeName}</option>)}</select></label>
      <label><span>目标节点</span><select value={data.targetNodeId} onChange={(event) => onChange('targetNodeId', event.target.value)}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.nodeName}</option>)}</select></label>
    </div>
  );
}

function InfoBox({ label, value, code }) {
  return (
    <div className="fp-topology-info-box">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
      {code && code !== value ? <em>{code}</em> : null}
    </div>
  );
}

function TopologyMetricPanel({ context, metrics, implementations, metricConfigs, metricDraft, onMetricDraft, onSaveMetric }) {
  const configs = metricConfigs.configs.records || [];
  const availableMetrics = filterTopologyMetrics(metrics, context);
  const draft = metricDraft;
  const selectedMetricId = draft && draft.metricDefinitionId ? draft.metricDefinitionId : '';
  const availableImplementations = implementations.filter((item) => item.metricDefinitionId === selectedMetricId);
  return (
    <div className="fp-topology-config-panel">
      <div className="fp-topology-config-head">
        <div><strong>指标配置</strong><span>当前元素：{context?.objectName || '-'}</span></div>
        <button className="fp-button fp-button--small fp-button--primary" type="button" onClick={() => onMetricDraft(defaultTopologyMetricConfig(context))}>配置指标</button>
      </div>
      <div className="fp-topology-config-list">
        {configs.map((config) => (
          <button className="fp-topology-config-item" key={config.id} type="button" onClick={() => onMetricDraft(config)}>
            <strong>{config.metricName || config.metricCode}</strong>
            <span>{config.implementationName || '默认实现'} · {config.executionMode || '-'} · {config.intervalSec || 60}s</span>
            <em>{config.enabled === false ? '停用' : '启用'}</em>
          </button>
        ))}
        {configs.length === 0 ? <div className="fp-empty">当前元素还没有配置指标</div> : null}
      </div>
      {draft ? (
        <div className="fp-topology-inline-form">
          <label><span>指标定义</span><select value={draft.metricDefinitionId || ''} onChange={(event) => onMetricDraft({ ...draft, metricDefinitionId: event.target.value, implementationId: '' })}><option value="">请选择指标</option>{availableMetrics.map((metric) => <option key={metric.id} value={metric.id}>{metric.metricName} / {metric.metricCode}</option>)}</select></label>
          <label><span>采集实现</span><select value={draft.implementationId || ''} onChange={(event) => onMetricDraft({ ...draft, implementationId: event.target.value })}><option value="">默认实现</option>{availableImplementations.map((impl) => <option key={impl.id} value={impl.id}>{impl.implementationName}</option>)}</select></label>
          <label><span>执行方式</span><select value={draft.executionMode || 'SERVER'} onChange={(event) => onMetricDraft({ ...draft, executionMode: event.target.value })}><option value="SERVER">SERVER</option><option value="SSH">SSH</option><option value="AGENT">AGENT</option><option value="EXPRESSION">EXPRESSION</option></select></label>
          <label><span>采集周期</span><input type="number" min="10" value={draft.intervalSec || 60} onChange={(event) => onMetricDraft({ ...draft, intervalSec: Number(event.target.value) })} /></label>
          <label><span>状态</span><select value={String(draft.enabled !== false)} onChange={(event) => onMetricDraft({ ...draft, enabled: event.target.value === 'true' })}><option value="true">启用</option><option value="false">停用</option></select></label>
          <label className="is-wide"><span>参数 JSON</span><textarea value={draft.parameterJson || ''} onChange={(event) => onMetricDraft({ ...draft, parameterJson: event.target.value })} placeholder='{"topic":"dw_order","groupId":"order-consumer"}' /></label>
          <div className="fp-actions"><button className="fp-button" type="button" onClick={() => onMetricDraft(null)}>取消</button><button className="fp-button fp-button--primary" type="button" onClick={() => onSaveMetric(draft)}>保存指标</button></div>
        </div>
      ) : null}
    </div>
  );
}

function TopologyThresholdPanel({ context, metrics, metricConfigs, thresholdRules, thresholdDraft, onThresholdDraft, onSaveThreshold }) {
  const configs = metricConfigs.configs.records || [];
  const metricIndex = indexById(metrics);
  const thresholdByMetric = {};
  thresholdRules.forEach((rule) => { thresholdByMetric[rule.metricDefinitionId] = rule; });
  return (
    <div className="fp-topology-config-panel">
      <div className="fp-topology-config-head"><div><strong>阈值配置</strong><span>只能基于已配置指标创建阈值</span></div></div>
      <div className="fp-topology-config-list">
        {configs.map((config) => {
          const metric = metricIndex[config.metricDefinitionId] || config;
          const rule = thresholdByMetric[config.metricDefinitionId];
          return (
            <button className="fp-topology-config-item" key={config.id} type="button" onClick={() => onThresholdDraft(defaultTopologyThresholdRule(context, metric, rule))}>
              <strong>{metric.metricName || config.metricName || config.metricCode}</strong>
              <span>{summarizeTopologyThreshold(rule)}</span>
              <em>{rule ? '已配置' : '未配置'}</em>
            </button>
          );
        })}
        {configs.length === 0 ? <div className="fp-empty">请先在“指标”页配置指标，再配置阈值。</div> : null}
      </div>
      {thresholdDraft ? <TopologyThresholdForm draft={thresholdDraft} onDraft={onThresholdDraft} onCancel={() => onThresholdDraft(null)} onSave={onSaveThreshold} /> : null}
    </div>
  );
}

function TopologyThresholdForm({ draft, onDraft, onCancel, onSave }) {
  function updateCondition(severity, patch) {
    onDraft({ ...draft, conditions: draft.conditions.map((item) => (item.severity === severity ? { ...item, ...patch } : item)) });
  }
  return (
    <div className="fp-topology-inline-form">
      <label className="is-wide"><span>规则名称</span><input value={draft.ruleName || ''} onChange={(event) => onDraft({ ...draft, ruleName: event.target.value })} /></label>
      <div className="fp-threshold-mini-table">
        {draft.conditions.map((condition) => (
          <div className={'fp-threshold-mini-row ' + (condition.enabled ? 'is-enabled' : '')} key={condition.severity}>
            <label><input type="checkbox" checked={condition.enabled} onChange={(event) => updateCondition(condition.severity, { enabled: event.target.checked })} />{severityText(condition.severity)}</label>
            <select value={condition.operator} disabled={!condition.enabled} onChange={(event) => updateCondition(condition.severity, { operator: event.target.value })}><option value=">">&gt;</option><option value=">=">&gt;=</option><option value="<">&lt;</option><option value="<=">&lt;=</option><option value="==">=</option><option value="!=">!=</option></select>
            <input type="number" value={condition.value} disabled={!condition.enabled} onChange={(event) => updateCondition(condition.severity, { value: event.target.value })} />
          </div>
        ))}
      </div>
      <label><span>判定窗口</span><input type="number" min="10" value={draft.evaluationWindowSec || 60} onChange={(event) => onDraft({ ...draft, evaluationWindowSec: Number(event.target.value) })} /></label>
      <label><span>连续命中</span><input type="number" min="1" value={draft.consecutiveCount || 1} onChange={(event) => onDraft({ ...draft, consecutiveCount: Number(event.target.value) })} /></label>
      <div className="fp-actions"><button className="fp-button" type="button" onClick={onCancel}>取消</button><button className="fp-button fp-button--primary" type="button" onClick={() => onSave(draft)}>保存阈值</button></div>
    </div>
  );
}

function edgeDraftText(draft, nodeMap) {
  const source = draft.sourceNodeId ? nodeMap[draft.sourceNodeId]?.nodeName : '未选择源节点';
  const target = draft.targetNodeId ? nodeMap[draft.targetNodeId]?.nodeName : '未选择目标节点';
  return `${source} -> ${target}`;
}

function defaultTopologyMetricConfig(context) {
  return {
    objectType: context?.objectType || 'TOPOLOGY_NODE',
    objectId: context?.objectId || '',
    objectCode: context?.objectCode || '',
    objectName: context?.objectName || '',
    metricDefinitionId: '',
    implementationId: '',
    executionMode: 'SERVER',
    intervalSec: 60,
    parameterJson: '',
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
    enabled: form.enabled !== false,
  };
}

function defaultTopologyThresholdRule(context, metric, rule = null) {
  const conditions = parseThresholdConditions(rule?.conditionsJson);
  const conditionMap = {};
  conditions.forEach((condition) => { conditionMap[condition.severity] = condition; });
  return {
    id: rule?.id || '',
    ruleCode: rule?.ruleCode || `topology_${context.topologyElementType}_${context.topologyElementId}_${metric.id}`.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
    ruleName: rule?.ruleName || `${context.objectName} - ${metric.metricName || metric.metricCode}`,
    metricDefinitionId: metric.id || metric.metricDefinitionId,
    evaluationWindowSec: rule?.evaluationWindowSec || 60,
    consecutiveCount: rule?.consecutiveCount || 1,
    recoveryPolicy: rule?.recoveryPolicy || 'AUTO',
    enabled: rule ? rule.enabled !== false : true,
    description: rule?.description || '',
    conditions: QUICK_THRESHOLD_SEVERITIES.map(([severity]) => {
      const condition = conditionMap[severity] || {};
      return {
        severity,
        enabled: Boolean(conditionMap[severity]),
        operator: condition.operator || '>=',
        value: condition.value !== undefined && condition.value !== null ? String(condition.value) : '',
      };
    }),
  };
}

function normalizeTopologyThresholdRule(form, context, metrics) {
  const metric = metrics.find((item) => item.id === form.metricDefinitionId) || {};
  const conditions = (form.conditions || [])
    .filter((condition) => condition.enabled && condition.value !== '')
    .map((condition) => ({ severity: condition.severity, operator: condition.operator || '>=', value: Number(condition.value) }))
    .filter((condition) => Number.isFinite(condition.value));
  return {
    ruleCode: form.ruleCode,
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

function filterTopologyMetrics(metrics, context) {
  if (!context) return [];
  const topologyType = context.topologyElementType === 'EDGE' ? 'TOPOLOGY_EDGE' : 'TOPOLOGY_NODE';
  return metrics.filter((metric) => {
    if (metric.enabled === false) return false;
    return !metric.objectType || metric.objectType === context.objectType || metric.objectType === topologyType || metric.metricCategory === topologyType;
  });
}

function parseThresholdConditions(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function summarizeTopologyThreshold(rule) {
  if (!rule) return '未配置阈值';
  const conditions = parseThresholdConditions(rule.conditionsJson);
  if (!conditions.length) return rule.enabled === false ? '已停用' : '已配置';
  const text = conditions.slice(0, 3).map((item) => `${severityText(item.severity)} ${item.operator || ''} ${item.value ?? '-'}`).join(' / ');
  return rule.enabled === false ? `${text}（停用）` : text;
}

function severityText(value) {
  const map = {
    REMIND: '提醒',
    WARNING: '警告',
    ERROR: '错误',
    CRITICAL: '紧急',
    URGENT: '紧急',
  };
  return map[value] || value;
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

function indexById(items) {
  const map = {};
  items.forEach((item) => { map[item.id] = item; });
  return map;
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

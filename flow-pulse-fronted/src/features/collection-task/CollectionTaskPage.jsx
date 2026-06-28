import React, { useEffect, useState } from 'react';
import Toast from '../../components/Toast';
import { metricApi } from '../../api/metricApi';
import { t } from '../../i18n';
import ResourceMetricConfigPanel from '../metric-center/ResourceMetricConfigPanel';

const EMPTY_DEFINITION_PAGE = { metrics: { records: [] } };
const EMPTY_IMPLEMENTATION_PAGE = { implementations: { records: [] } };

export default function CollectionTaskPage() {
  const [definitions, setDefinitions] = useState([]);
  const [implementations, setImplementations] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function loadOptions() {
    const metricPage = await metricApi.page({ pageNo: 1, pageSize: 100 });
    const implementationPage = await metricApi.implementationPage({ pageNo: 1, pageSize: 100 });
    setDefinitions(((metricPage || EMPTY_DEFINITION_PAGE).metrics || {}).records || []);
    setImplementations(((implementationPage || EMPTY_IMPLEMENTATION_PAGE).implementations || {}).records || []);
  }

  return (
    <section className="fp-page">
      <div className="fp-page__header">
        <div>
          <h1>{t('menuCollectionTask')}</h1>
          <p>{t('collectionTask.pageDesc')}</p>
        </div>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
      <ResourceMetricConfigPanel metrics={definitions} implementations={implementations} onMessage={setMessage} />
    </section>
  );
}

import React from 'react';

export default function EnvironmentScopeTree({
  environments = [],
  regions = [],
  selectedEnvId = '',
  selectedRegionId = '',
  onSelect,
  title = '环境区域',
  allLabel = '全部范围',
  allHint = '',
  managementLabel = '管理区',
  computeLabel = '计算区',
  className = '',
}) {
  return (
    <aside className={`fp-infra-tree ${className}`}>
      <div className="fp-infra-tree__title">{title}</div>
      <button className={!selectedEnvId && !selectedRegionId ? 'is-active' : ''} type="button" onClick={() => onSelect('', '')}>
        <span>{allLabel}</span>{allHint ? <em>{allHint}</em> : null}
      </button>
      {environments.map((environment) => {
        const managementRegions = regions.filter((region) => region.envId === environment.id && region.regionType === 'MANAGEMENT');
        return (
          <div className="fp-tree-group" key={environment.id}>
            <button className={selectedEnvId === environment.id && !selectedRegionId ? 'is-active' : ''} type="button" onClick={() => onSelect(environment.id, '')}>
              <span>{environment.envName}</span><em>{environment.envCode}</em>
            </button>
            {managementRegions.map((management) => {
              const computeRegions = regions.filter((region) => region.parentRegionId === management.id);
              return (
                <div className="fp-tree-children" key={management.id}>
                  <button className={`fp-tree-management ${selectedRegionId === management.id ? 'is-active' : ''}`} type="button" onClick={() => onSelect(environment.id, management.id)}>
                    <span>{management.regionName}</span><em>{managementLabel}</em>
                  </button>
                  <div className="fp-tree-computes">
                    {computeRegions.map((compute) => (
                      <button className={`fp-tree-compute ${selectedRegionId === compute.id ? 'is-active' : ''}`} key={compute.id} type="button" onClick={() => onSelect(environment.id, compute.id)}>
                        <span>{compute.regionName}</span><em>{computeLabel}</em>
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

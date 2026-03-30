import React from 'react';

const formatJson = (value) => {
  try {
    const json = JSON.stringify(value, null, 2);
    if (!json) return '';
    if (json.length <= 2200) return json;
    return `${json.slice(0, 2200)}\n... [truncated]`;
  } catch (_error) {
    return String(value || '');
  }
};

const statusPillClasses = (success) =>
  success
    ? 'bg-green-100 text-green-700 border-green-200'
    : 'bg-red-100 text-red-700 border-red-200';

const AgentActionsPanel = ({ toolRuns = [] }) => {
  if (!Array.isArray(toolRuns) || toolRuns.length === 0) {
    return null;
  }

  return (
    <details className="mt-3 rounded-md border border-blue-200 bg-blue-50/60">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-blue-900">
        Agent Actions ({toolRuns.length})
      </summary>

      <div className="space-y-2 px-3 pb-3 pt-1">
        {toolRuns.map((run, index) => (
          <div key={`${run?.tool || 'tool'}-${index}`} className="rounded border border-blue-200 bg-white p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-gray-900">{run?.tool || 'Unknown tool'}</div>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${statusPillClasses(run?.success)}`}>
                {run?.success ? 'success' : 'failed'}
              </span>
            </div>

            {run?.reason ? (
              <p className="mt-1 text-[11px] text-gray-600">{run.reason}</p>
            ) : null}

            {run?.error ? (
              <p className="mt-1 text-[11px] text-red-700">Error: {run.error}</p>
            ) : null}

            {run?.result ? (
              <pre className="mt-2 max-h-44 overflow-auto rounded bg-gray-900 p-2 text-[10px] text-gray-100">
                {formatJson(run.result)}
              </pre>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  );
};

export default AgentActionsPanel;

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const CHART_COLORS = [
  '#2563EB',
  '#16A34A',
  '#DC2626',
  '#CA8A04',
  '#7C3AED',
  '#0F766E'
];

const MarkdownChart = ({ spec }) => {
  if (!spec || !Array.isArray(spec.data) || spec.data.length === 0) {
    return (
      <div className="my-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Unable to render chart: no data rows were provided.
      </div>
    );
  }

  const hasNumericSeries = spec.series.some((series) =>
    spec.data.some((row) => typeof row[series.key] === 'number')
  );

  if (!hasNumericSeries) {
    return (
      <div className="my-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Unable to render chart: series values must be numeric.
      </div>
    );
  }

  const ChartComponent = spec.type === 'bar' ? BarChart : LineChart;

  return (
    <div className="my-4 rounded-lg border border-gray-200 bg-white p-3">
      {spec.title && (
        <h4 className="mb-2 text-sm font-semibold text-gray-800">{spec.title}</h4>
      )}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={spec.data} margin={{ top: 8, right: 24, left: 8, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={spec.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {spec.type === 'bar'
              ? spec.series.map((series, index) => (
                  <Bar
                    key={series.key}
                    dataKey={series.key}
                    name={series.name || series.key}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))
              : spec.series.map((series, index) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.name || series.key}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MarkdownChart;

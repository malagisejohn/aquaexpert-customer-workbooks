import { Chart } from 'chart.js/auto';

const CHART_COLORS = [
  '#2563EB',
  '#16A34A',
  '#DC2626',
  '#CA8A04',
  '#7C3AED',
  '#0F766E'
];

export const generateChartImageDataUrl = async (spec) => {
  if (typeof document === 'undefined' || !spec) {
    return null;
  }

  const labels = (spec.data || []).map((row) => String(row?.[spec.xKey] ?? ''));
  const datasets = (spec.series || [])
    .map((series, index) => {
      const values = (spec.data || []).map((row) => {
        const rawValue = row?.[series.key];
        if (typeof rawValue === 'number') return rawValue;
        if (typeof rawValue === 'string') {
          const numeric = Number(rawValue.replace(/,/g, ''));
          return Number.isFinite(numeric) ? numeric : null;
        }
        return null;
      });

      const hasNumericValues = values.some((value) => typeof value === 'number');
      if (!hasNumericValues) return null;

      const color = CHART_COLORS[index % CHART_COLORS.length];
      return {
        label: series.name || series.key,
        data: values,
        borderColor: color,
        backgroundColor: `${color}33`,
        fill: false,
        borderWidth: 2,
        tension: 0.25
      };
    })
    .filter(Boolean);

  if (datasets.length === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 700;

  const chart = new Chart(canvas, {
    type: spec.type === 'bar' ? 'bar' : 'line',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: {
          display: datasets.length > 1
        },
        title: {
          display: Boolean(spec.title),
          text: spec.title || ''
        }
      },
      scales: {
        x: {
          title: {
            display: Boolean(spec.xLabel),
            text: spec.xLabel || ''
          }
        },
        y: {
          title: {
            display: Boolean(spec.yLabel),
            text: spec.yLabel || ''
          }
        }
      }
    }
  });

  chart.update('none');
  const dataUrl = canvas.toDataURL('image/png');
  chart.destroy();
  return dataUrl;
};

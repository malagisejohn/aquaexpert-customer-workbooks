const SUPPORTED_CHART_TYPES = new Set(['line', 'bar']);

const toNumberIfNumeric = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const normalized = trimmed.replace(/,/g, '');
  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  return value;
};

const parseCsvLine = (line) => {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

export const parseCsvText = (csvText = '') => {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = toNumberIfNumeric(values[index] ?? '');
    });
    return row;
  });

  return { headers, rows };
};

const buildSeries = ({ data, xKey, parsed }) => {
  const sampleRow = data[0] || {};
  const availableKeys = Object.keys(sampleRow).filter((key) => key !== xKey);

  if (Array.isArray(parsed.series) && parsed.series.length > 0) {
    const mappedSeries = parsed.series
      .map((seriesItem) => {
        if (!seriesItem) return null;
        if (typeof seriesItem === 'string') {
          return availableKeys.includes(seriesItem)
            ? { key: seriesItem, name: seriesItem }
            : null;
        }
        if (typeof seriesItem === 'object') {
          const key = seriesItem.key || seriesItem.dataKey;
          if (!key || !availableKeys.includes(key)) return null;
          return {
            key,
            name: seriesItem.name || key
          };
        }
        return null;
      })
      .filter(Boolean);

    if (mappedSeries.length > 0) {
      return mappedSeries;
    }
  }

  if (Array.isArray(parsed.yKeys) && parsed.yKeys.length > 0) {
    const mapped = parsed.yKeys
      .filter((key) => typeof key === 'string' && availableKeys.includes(key))
      .map((key) => ({ key, name: key }));
    if (mapped.length > 0) {
      return mapped;
    }
  }

  return availableKeys.map((key) => ({ key, name: key }));
};

export const parseChartBlock = (rawContent = '', language = 'chart') => {
  let parsed = null;
  const normalizedLanguage = String(language || 'chart').toLowerCase();

  if (
    normalizedLanguage === 'csv-chart' ||
    normalizedLanguage === 'csvchart' ||
    normalizedLanguage === 'csv'
  ) {
    parsed = {
      type: 'line',
      title: null,
      csv: rawContent
    };
  } else {
    try {
      parsed = JSON.parse(rawContent);
    } catch (error) {
      return {
        error:
          'Unable to parse chart block. Use JSON in ```chart or CSV in ```csv-chart.',
      };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { error: 'Chart block must be an object (JSON) or valid CSV.' };
  }

  const type = SUPPORTED_CHART_TYPES.has(parsed.type) ? parsed.type : 'line';
  let data = Array.isArray(parsed.data) ? parsed.data : [];

  if ((!data || data.length === 0) && typeof parsed.csv === 'string') {
    const { rows } = parseCsvText(parsed.csv);
    data = rows;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { error: 'Chart block has no rows. Provide data[] or csv.' };
  }

  const normalizedData = data.map((row) => {
    const normalizedRow = {};
    Object.keys(row || {}).forEach((key) => {
      normalizedRow[key] = toNumberIfNumeric(row[key]);
    });
    return normalizedRow;
  });

  const sampleRow = normalizedData[0] || {};
  const keys = Object.keys(sampleRow);
  if (keys.length < 2) {
    return { error: 'Chart needs at least 2 columns: one x-axis and one data series.' };
  }

  const xKey = parsed.xKey || parsed.x || keys[0];
  if (!keys.includes(xKey)) {
    return { error: `xKey "${xKey}" is not present in chart data.` };
  }

  const series = buildSeries({ data: normalizedData, xKey, parsed });
  if (series.length === 0) {
    return { error: 'No valid series keys found in chart data.' };
  }

  return {
    type,
    title: parsed.title || null,
    xKey,
    xLabel: parsed.xLabel || xKey,
    yLabel: parsed.yLabel || series.map((item) => item.name || item.key).join(', '),
    data: normalizedData,
    series
  };
};

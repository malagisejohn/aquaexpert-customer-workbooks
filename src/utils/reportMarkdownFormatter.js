import { parseChartBlock } from './chartMarkdown';
import { generateChartImageDataUrl } from './chartImageRenderer';

const escapeHtml = (unsafe = '') =>
  String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const applyInlineMarkdown = (text = '') => {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
};

const normalizeFlattenedTables = (markdown = '') =>
  markdown
    .split('\n')
    .map((line) => {
      const pipeCount = (line.match(/\|/g) || []).length;
      if (pipeCount >= 8 && line.includes('| |')) {
        return line.replace(/\|\s+\|/g, '|\n|');
      }
      return line;
    })
    .join('\n');

const isTableSeparatorRow = (cells = []) =>
  cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));

const parseTableRow = (line = '') =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const parseStructuredTableRow = (line = '') => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('|') && (trimmed.match(/\|/g) || []).length >= 2) {
    return parseTableRow(trimmed);
  }

  if (trimmed.includes('\t')) {
    return trimmed.split('\t').map((cell) => cell.trim());
  }

  return null;
};

const renderMarkdownTable = (tableRows = []) => {
  const rows = tableRows.filter((row) => row.length > 0);
  if (rows.length === 0) return '';

  let headerRow = [...rows[0]];
  let bodyRows = rows.slice(1);

  if (rows.length > 1 && isTableSeparatorRow(rows[1])) {
    bodyRows = rows.slice(2);
  }

  const columnCount = Math.max(headerRow.length, ...bodyRows.map((row) => row.length), 0);
  if (columnCount === 0) return '';

  if (headerRow.length < columnCount) {
    const missing = columnCount - headerRow.length;
    for (let i = 0; i < missing; i += 1) {
      headerRow.push(i === missing - 1 ? 'Notes' : `Column ${headerRow.length + 1}`);
    }
  }

  const thead = `<thead><tr>${headerRow
    .map((cell) => `<th>${applyInlineMarkdown(cell)}</th>`)
    .join('')}</tr></thead>`;
  const tbody = `<tbody>${bodyRows
    .map(
      (row) =>
        `<tr>${headerRow
          .map((_, index) => `<td>${applyInlineMarkdown(row[index] || '')}</td>`)
          .join('')}</tr>`
    )
    .join('')}</tbody>`;

  return `<table>${thead}${tbody}</table>`;
};

const renderChartBlock = async (rawContent, language) => {
  const spec = parseChartBlock(rawContent, language);
  if (spec.error) {
    return `<pre>${escapeHtml(rawContent)}</pre>`;
  }

  const dataUrl = await generateChartImageDataUrl(spec);
  const title = spec.title || `${spec.series[0]?.name || spec.series[0]?.key || 'Series'} Trend`;
  const xAxisTitle = spec.xLabel || spec.xKey || 'X Axis';
  const yAxisTitle =
    spec.yLabel ||
    spec.series.map((series) => series.name || series.key).join(', ') ||
    'Y Axis';
  const embedSpec = {
    ...spec,
    title,
    xLabel: xAxisTitle,
    yLabel: yAxisTitle
  };
  const encodedSpec = encodeURIComponent(JSON.stringify(embedSpec));

  const tableHeaders = [spec.xKey, ...spec.series.map((series) => series.name || series.key)];
  const tableRows = spec.data.map((row) => [
    row[spec.xKey],
    ...spec.series.map((series) => row[series.key] ?? '')
  ]);

  const dataTableHtml = `
<table>
  <thead>
    <tr>${tableHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
  </thead>
  <tbody>
    ${tableRows
      .map(
        (tableRow) =>
          `<tr>${tableRow
            .map((value) => `<td>${escapeHtml(value)}</td>`)
            .join('')}</tr>`
      )
      .join('')}
  </tbody>
</table>`;

  if (!dataUrl) {
    return `
<div class="ai-chart-block" data-chart-spec="${escapeHtml(encodedSpec)}">
  <h3 class="ai-chart-title">${escapeHtml(title)}</h3>
  <p><strong>X Axis Title:</strong> <span class="ai-chart-x-label">${escapeHtml(xAxisTitle)}</span></p>
  <p><strong>Y Axis Title:</strong> <span class="ai-chart-y-label">${escapeHtml(yAxisTitle)}</span></p>
  ${dataTableHtml}
</div>
    `;
  }

  return `
<div class="ai-chart-block" data-chart-spec="${escapeHtml(encodedSpec)}">
  <h3 class="ai-chart-title">${escapeHtml(title)}</h3>
  <p><strong>X Axis Title:</strong> <span class="ai-chart-x-label">${escapeHtml(xAxisTitle)}</span></p>
  <p><strong>Y Axis Title:</strong> <span class="ai-chart-y-label">${escapeHtml(yAxisTitle)}</span></p>
  <div style="margin: 12px 0; text-align: center;">
    <img class="ai-chart-image" src="${dataUrl}" alt="${escapeHtml(title)}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 4px;" />
  </div>
  ${dataTableHtml}
</div>
  `;
};

const parseMarkdownTextSegment = (segment = '') => {
  const lines = segment.split('\n');
  const htmlParts = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      index += 1;
      continue;
    }

    const structuredRow = parseStructuredTableRow(rawLine);
    if (structuredRow) {
      const tableRows = [];
      while (index < lines.length) {
        const candidate = parseStructuredTableRow(lines[index]);
        if (!candidate) break;
        tableRows.push(candidate);
        index += 1;
      }
      htmlParts.push(renderMarkdownTable(tableRows));
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      htmlParts.push(`<h${level}>${applyInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length) {
        const listLine = lines[index].trim();
        if (!/^[-*]\s+/.test(listLine)) break;
        items.push(`<li>${applyInlineMarkdown(listLine.replace(/^[-*]\s+/, '').trim())}</li>`);
        index += 1;
      }
      htmlParts.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length) {
        const listLine = lines[index].trim();
        if (!/^\d+\.\s+/.test(listLine)) break;
        items.push(`<li>${applyInlineMarkdown(listLine.replace(/^\d+\.\s+/, '').trim())}</li>`);
        index += 1;
      }
      htmlParts.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length) {
      const paragraphLine = lines[index].trim();
      if (!paragraphLine) break;
      if (/^(#{1,6})\s+/.test(paragraphLine)) break;
      if (/^[-*]\s+/.test(paragraphLine)) break;
      if (/^\d+\.\s+/.test(paragraphLine)) break;
      if (parseStructuredTableRow(paragraphLine)) break;
      paragraphLines.push(paragraphLine);
      index += 1;
    }

    if (paragraphLines.length > 0) {
      htmlParts.push(`<p>${applyInlineMarkdown(paragraphLines.join(' '))}</p>`);
    } else {
      index += 1;
    }
  }

  return htmlParts.join('\n');
};

export const markdownToServiceHtml = async (markdown = '') => {
  const normalizedMarkdown = normalizeFlattenedTables(markdown).replace(/\r\n/g, '\n');
  const codeBlockRegex = /```([a-zA-Z0-9-]+)?\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match = codeBlockRegex.exec(normalizedMarkdown);

  while (match) {
    const [fullMatch, language = '', codeContent = ''] = match;
    const textBefore = normalizedMarkdown.slice(lastIndex, match.index);
    if (textBefore.trim()) {
      parts.push(parseMarkdownTextSegment(textBefore));
    }

    const normalizedLanguage = language.toLowerCase();
    if (
      normalizedLanguage === 'chart' ||
      normalizedLanguage === 'csv-chart' ||
      normalizedLanguage === 'csvchart' ||
      normalizedLanguage === 'csv'
    ) {
      const chartHtml = await renderChartBlock(codeContent.trim(), normalizedLanguage);
      parts.push(chartHtml);
    } else {
      parts.push(`<pre>${escapeHtml(codeContent.trim())}</pre>`);
    }

    lastIndex = match.index + fullMatch.length;
    match = codeBlockRegex.exec(normalizedMarkdown);
  }

  const trailing = normalizedMarkdown.slice(lastIndex);
  if (trailing.trim()) {
    parts.push(parseMarkdownTextSegment(trailing));
  }

  return parts.filter(Boolean).join('\n');
};

export const buildAiServiceReportHtml = async ({ customerName, content }) => {
  const generatedDate = new Date().toLocaleDateString('en-US');
  const reportBody = await markdownToServiceHtml(content);

  return `
<h1 style="text-align: center; font-size: 32pt;">Customer Service Report</h1>
<p style="text-align: center; font-size: 20pt; font-weight: bold; margin: 20px 0;">${escapeHtml(customerName || 'Customer')}</p>
<p style="text-align: center; margin-bottom: 30px;">Generated: ${generatedDate}</p>
<h2>Executive Summary</h2>
${reportBody}
  `;
};

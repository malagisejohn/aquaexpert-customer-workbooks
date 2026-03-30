import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Save, Eye, FileText, CheckCircle, AlertCircle, Loader2,
  Bold, Italic, Underline, List, ListOrdered, 
  Undo2, Redo2, AlignLeft, AlignCenter, AlignRight,
  Trash2, Plus, Table, BarChart3
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { generateChartImageDataUrl } from '../../utils/chartImageRenderer';

const ReportEditor = ({
  isOpen,
  onClose,
  initialContent = '',
  reportData = {},
  existingReportId = null,
  existingContent = null,
  existingReportData = null,
  onFinalized
}) => {
  const [content, setContent] = useState('');
  const [reportId, setReportId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState(null);
  const [activeChartContext, setActiveChartContext] = useState(null);
  const [chartPanelValues, setChartPanelValues] = useState({
    title: '',
    xLabel: '',
    yLabel: ''
  });
  const [chartUpdating, setChartUpdating] = useState(false);
  
  const editorRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const lastSavedContentRef = useRef('');
  const activeChartRef = useRef(null);
  const chartPanelRef = useRef(null);
  const chartUpdateTimeoutRef = useRef(null);
  const chartUpdateRequestIdRef = useRef(0);

  // Get effective data based on whether editing existing or creating new
  const effectiveContent = existingContent || initialContent;
  const effectiveReportData = existingReportData || reportData;

  useEffect(() => {
    activeChartRef.current = activeChartContext;
  }, [activeChartContext]);

  // Initialize content when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent(effectiveContent);
      lastSavedContentRef.current = effectiveContent;
      setHasUnsavedChanges(false);
      setError(null);
      setActiveChartContext(null);
      setChartPanelValues({ title: '', xLabel: '', yLabel: '' });
      setChartUpdating(false);
      
      // Set the HTML content directly in the editor ref
      if (editorRef.current) {
        editorRef.current.innerHTML = effectiveContent;
      }
      
      if (existingReportId) {
        setReportId(existingReportId);
      } else {
        setReportId(null);
      }
    }
  }, [isOpen, effectiveContent, existingReportId]);

  // Create draft if we have content but no reportId
  useEffect(() => {
    const createDraft = async () => {
      if (isOpen && !reportId && content && effectiveReportData?.title) {
        try {
          const response = await axios.post('/api/reports/draft', {
            reportType: effectiveReportData.reportType || 'workbook',
            title: effectiveReportData.title,
            customerId: effectiveReportData.customerId,
            systemIds: effectiveReportData.systemIds || [],
            draftContent: content,
            serviceDate: effectiveReportData.serviceDate,
            aiGeneratedSummary: effectiveReportData.aiGeneratedSummary,
            workbookSnapshotId: effectiveReportData.workbookSnapshotId,
            metadata: effectiveReportData.metadata || {}
          });
          
          setReportId(response.data.report._id);
          setLastSaved(new Date());
          lastSavedContentRef.current = content;
        } catch (err) {
          console.error('Error creating draft:', err);
          setError('Failed to create draft. Changes may not be saved.');
        }
      }
    };
    
    createDraft();
  }, [isOpen, reportId, content, effectiveReportData]);

  // Auto-save function
  const autoSave = useCallback(async (contentToSave) => {
    if (!reportId || saving || contentToSave === lastSavedContentRef.current) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await axios.put(`/api/reports/${reportId}/draft`, {
        draftContent: contentToSave
      });
      
      setLastSaved(new Date());
      lastSavedContentRef.current = contentToSave;
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error auto-saving:', err);
      setError('Failed to save draft');
    } finally {
      setSaving(false);
    }
  }, [reportId, saving]);

  // Debounced auto-save on content change
  useEffect(() => {
    if (!isOpen || !reportId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (content !== lastSavedContentRef.current) {
      setHasUnsavedChanges(true);
      saveTimeoutRef.current = setTimeout(() => {
        autoSave(content);
      }, 2000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, isOpen, reportId, autoSave]);

  // Handle content change from contentEditable
  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  }, []);

  const decodeChartSpecFromElement = useCallback((chartElement) => {
    if (!chartElement) return null;
    const encodedSpec = chartElement.getAttribute('data-chart-spec');
    if (!encodedSpec) return null;

    try {
      const decoded = decodeURIComponent(encodedSpec);
      const parsed = JSON.parse(decoded);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse chart spec:', parseError);
      return null;
    }
  }, []);

  const syncActiveChartFromSelection = useCallback(() => {
    if (!isOpen || !editorRef.current) return;
    if (chartPanelRef.current?.contains(document.activeElement)) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setActiveChartContext(null);
      return;
    }

    const anchorNode = selection.anchorNode;
    if (!anchorNode) {
      setActiveChartContext(null);
      return;
    }

    const anchorElement = anchorNode.nodeType === window.Node.TEXT_NODE
      ? anchorNode.parentElement
      : anchorNode;

    if (!(anchorElement instanceof Element)) {
      setActiveChartContext(null);
      return;
    }

    const chartElement = anchorElement.closest('.ai-chart-block');
    if (!chartElement || !editorRef.current.contains(chartElement)) {
      setActiveChartContext(null);
      return;
    }

    const chartSpec = decodeChartSpecFromElement(chartElement);
    if (!chartSpec) {
      setActiveChartContext(null);
      return;
    }

    setActiveChartContext({
      element: chartElement,
      spec: chartSpec
    });
    setChartPanelValues({
      title: chartSpec.title || '',
      xLabel: chartSpec.xLabel || '',
      yLabel: chartSpec.yLabel || ''
    });
  }, [decodeChartSpecFromElement, isOpen]);

  const applyChartSpecToElement = useCallback(
    async (chartElement, nextSpec) => {
      if (!chartElement || !nextSpec) return;

      chartElement.setAttribute(
        'data-chart-spec',
        encodeURIComponent(JSON.stringify(nextSpec))
      );

      const titleElement = chartElement.querySelector('.ai-chart-title');
      if (titleElement) {
        titleElement.textContent = nextSpec.title || '';
      }

      const xLabelElement = chartElement.querySelector('.ai-chart-x-label');
      if (xLabelElement) {
        xLabelElement.textContent = nextSpec.xLabel || '';
      }

      const yLabelElement = chartElement.querySelector('.ai-chart-y-label');
      if (yLabelElement) {
        yLabelElement.textContent = nextSpec.yLabel || '';
      }

      const requestId = chartUpdateRequestIdRef.current + 1;
      chartUpdateRequestIdRef.current = requestId;
      setChartUpdating(true);

      try {
        const imageUrl = await generateChartImageDataUrl(nextSpec);
        if (chartUpdateRequestIdRef.current !== requestId) {
          return;
        }

        let imageElement = chartElement.querySelector('.ai-chart-image');
        if (!imageElement && imageUrl) {
          const imageWrapper = document.createElement('div');
          imageWrapper.style.margin = '12px 0';
          imageWrapper.style.textAlign = 'center';

          imageElement = document.createElement('img');
          imageElement.className = 'ai-chart-image';
          imageElement.style.maxWidth = '100%';
          imageElement.style.border = '1px solid #ddd';
          imageElement.style.borderRadius = '4px';
          imageWrapper.appendChild(imageElement);

          const tableElement = chartElement.querySelector('table');
          chartElement.insertBefore(imageWrapper, tableElement || null);
        }

        if (imageElement && imageUrl) {
          imageElement.setAttribute('src', imageUrl);
          imageElement.setAttribute('alt', nextSpec.title || 'Chart');
        }

        handleContentChange();
      } catch (updateError) {
        console.error('Failed to regenerate chart image:', updateError);
      } finally {
        if (chartUpdateRequestIdRef.current === requestId) {
          setChartUpdating(false);
        }
      }
    },
    [handleContentChange]
  );

  const handleChartPanelChange = useCallback(
    (field, value) => {
      setChartPanelValues((prev) => ({ ...prev, [field]: value }));

      const currentChart = activeChartRef.current;
      if (!currentChart?.element || !currentChart?.spec) {
        return;
      }

      const nextSpec = {
        ...currentChart.spec,
        [field]: value
      };
      const nextContext = {
        element: currentChart.element,
        spec: nextSpec
      };
      activeChartRef.current = nextContext;
      setActiveChartContext(nextContext);

      if (chartUpdateTimeoutRef.current) {
        clearTimeout(chartUpdateTimeoutRef.current);
      }

      chartUpdateTimeoutRef.current = setTimeout(() => {
        applyChartSpecToElement(nextContext.element, nextSpec);
      }, 180);
    },
    [applyChartSpecToElement]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleSelectionChange = () => {
      syncActiveChartFromSelection();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    const editorElement = editorRef.current;
    editorElement?.addEventListener('keyup', handleSelectionChange);
    editorElement?.addEventListener('mouseup', handleSelectionChange);
    const syncTimeout = setTimeout(handleSelectionChange, 0);

    return () => {
      clearTimeout(syncTimeout);
      document.removeEventListener('selectionchange', handleSelectionChange);
      editorElement?.removeEventListener('keyup', handleSelectionChange);
      editorElement?.removeEventListener('mouseup', handleSelectionChange);
    };
  }, [isOpen, syncActiveChartFromSelection]);

  // Execute formatting command
  const execCommand = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  }, [handleContentChange]);

  // Toolbar button component
  const ToolbarButton = ({ onClick, icon: Icon, title, active = false }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded hover:bg-gray-200 transition-colors ${active ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  // Delete selected table row
  const deleteTableRow = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    let node = selection.anchorNode;
    while (node && node.tagName !== 'TR') {
      node = node.parentElement;
    }
    
    if (node && node.tagName === 'TR') {
      const table = node.closest('table');
      // Don't delete header row
      if (table && node !== table.querySelector('tr')) {
        node.remove();
        handleContentChange();
        toast.success('Row deleted');
      } else {
        toast.error('Cannot delete header row');
      }
    } else {
      toast.error('Place cursor in a table row to delete');
    }
  }, [handleContentChange]);

  // Add table row after current
  const addTableRow = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    let node = selection.anchorNode;
    while (node && node.tagName !== 'TR') {
      node = node.parentElement;
    }
    
    if (node && node.tagName === 'TR') {
      const newRow = node.cloneNode(true);
      // Clear cell contents
      newRow.querySelectorAll('td').forEach(td => {
        td.textContent = '';
      });
      node.after(newRow);
      handleContentChange();
      toast.success('Row added');
    } else {
      toast.error('Place cursor in a table to add row');
    }
  }, [handleContentChange]);

  // Delete selected table column
  const deleteTableColumn = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    let cell = selection.anchorNode;
    // Find the cell (TD or TH)
    while (cell && cell.tagName !== 'TD' && cell.tagName !== 'TH') {
      cell = cell.parentElement;
    }
    
    if (cell && (cell.tagName === 'TD' || cell.tagName === 'TH')) {
      const table = cell.closest('table');
      if (!table) {
        toast.error('Could not find table');
        return;
      }
      
      // Get the column index
      const row = cell.parentElement;
      const columnIndex = Array.from(row.children).indexOf(cell);
      
      // Check if table has only one column
      const firstRow = table.querySelector('tr');
      if (firstRow && firstRow.children.length <= 1) {
        toast.error('Cannot delete the last column');
        return;
      }
      
      // Delete the cell at this index from every row
      const rows = table.querySelectorAll('tr');
      rows.forEach(r => {
        const cellToDelete = r.children[columnIndex];
        if (cellToDelete) {
          cellToDelete.remove();
        }
      });
      
      handleContentChange();
      toast.success('Column deleted');
    } else {
      toast.error('Place cursor in a table cell to delete column');
    }
  }, [handleContentChange]);

  // Add table column after current
  const addTableColumn = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    let cell = selection.anchorNode;
    // Find the cell (TD or TH)
    while (cell && cell.tagName !== 'TD' && cell.tagName !== 'TH') {
      cell = cell.parentElement;
    }
    
    if (cell && (cell.tagName === 'TD' || cell.tagName === 'TH')) {
      const table = cell.closest('table');
      if (!table) {
        toast.error('Could not find table');
        return;
      }
      
      // Get the column index
      const row = cell.parentElement;
      const columnIndex = Array.from(row.children).indexOf(cell);
      
      // Add a new cell after this index in every row
      const rows = table.querySelectorAll('tr');
      rows.forEach(r => {
        const currentCell = r.children[columnIndex];
        if (currentCell) {
          const newCell = document.createElement(currentCell.tagName);
          newCell.textContent = '';
          // Copy styles for header cells
          if (currentCell.tagName === 'TH') {
            newCell.style.cssText = currentCell.style.cssText;
          }
          currentCell.after(newCell);
        }
      });
      
      handleContentChange();
      toast.success('Column added');
    } else {
      toast.error('Place cursor in a table cell to add column');
    }
  }, [handleContentChange]);

  // Preview PDF
  const handlePreviewPdf = async () => {
    setPreviewing(true);
    setError(null);

    try {
      const response = await axios.post('/api/reports/preview-pdf', {
        htmlContent: content,
        title: effectiveReportData?.title || 'Report Preview'
      }, {
        responseType: 'blob'
      });

      // Create blob URL and open in new tab
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up blob URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Error generating preview:', err);
      toast.error('Failed to generate PDF preview');
      setError('Failed to generate PDF preview');
    } finally {
      setPreviewing(false);
    }
  };

  // Finalize report
  const handleFinalize = async () => {
    if (!reportId) {
      toast.error('No draft to finalize. Please wait for draft to save.');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to finalize this report? Once finalized, it cannot be edited.'
    );

    if (!confirmed) return;

    setFinalizing(true);
    setError(null);

    try {
      const response = await axios.post(`/api/reports/${reportId}/finalize`, {
        htmlContent: content
      });

      toast.success('Report finalized successfully!');
      
      if (onFinalized) {
        onFinalized(response.data.report);
      }
    } catch (err) {
      console.error('Error finalizing report:', err);
      toast.error(err.response?.data?.message || 'Failed to finalize report');
      setError('Failed to finalize report');
    } finally {
      setFinalizing(false);
    }
  };

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    
    // Clear timeout and reset state
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (chartUpdateTimeoutRef.current) {
      clearTimeout(chartUpdateTimeoutRef.current);
    }
    
    setContent('');
    setReportId(null);
    setLastSaved(null);
    setHasUnsavedChanges(false);
    setError(null);
    setActiveChartContext(null);
    setChartPanelValues({ title: '', xLabel: '', yLabel: '' });
    setChartUpdating(false);
    activeChartRef.current = null;
    
    onClose();
  };

  // Format last saved time
  const formatLastSaved = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    return date.toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="absolute inset-4 lg:inset-8 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {effectiveReportData?.title || 'Report Editor'}
              </h2>
              <div className="flex items-center space-x-3 text-sm">
                {/* Save Status */}
                {saving ? (
                  <span className="flex items-center text-yellow-600">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Saving...
                  </span>
                ) : hasUnsavedChanges ? (
                  <span className="flex items-center text-yellow-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unsaved changes
                  </span>
                ) : lastSaved ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Saved {formatLastSaved(lastSaved)}
                  </span>
                ) : (
                  <span className="text-gray-500">Draft</span>
                )}
                
                {error && (
                  <span className="flex items-center text-red-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {error}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Preview PDF Button */}
            <button
              onClick={handlePreviewPdf}
              disabled={previewing || !content}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {previewing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Preview PDF
            </button>
            
            {/* Save Final Button */}
            <button
              onClick={handleFinalize}
              disabled={finalizing || !reportId || hasUnsavedChanges}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {finalizing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Final
            </button>
            
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex items-center px-4 py-2 border-b bg-gray-50 space-x-1 flex-wrap gap-y-1">
          {/* Undo/Redo */}
          <div className="flex items-center border-r pr-2 mr-2">
            <ToolbarButton onClick={() => execCommand('undo')} icon={Undo2} title="Undo (Ctrl+Z)" />
            <ToolbarButton onClick={() => execCommand('redo')} icon={Redo2} title="Redo (Ctrl+Y)" />
          </div>

          {/* Text Formatting */}
          <div className="flex items-center border-r pr-2 mr-2">
            <ToolbarButton onClick={() => execCommand('bold')} icon={Bold} title="Bold (Ctrl+B)" />
            <ToolbarButton onClick={() => execCommand('italic')} icon={Italic} title="Italic (Ctrl+I)" />
            <ToolbarButton onClick={() => execCommand('underline')} icon={Underline} title="Underline (Ctrl+U)" />
          </div>

          {/* Lists */}
          <div className="flex items-center border-r pr-2 mr-2">
            <ToolbarButton onClick={() => execCommand('insertUnorderedList')} icon={List} title="Bullet List" />
            <ToolbarButton onClick={() => execCommand('insertOrderedList')} icon={ListOrdered} title="Numbered List" />
          </div>

          {/* Alignment */}
          <div className="flex items-center border-r pr-2 mr-2">
            <ToolbarButton onClick={() => execCommand('justifyLeft')} icon={AlignLeft} title="Align Left" />
            <ToolbarButton onClick={() => execCommand('justifyCenter')} icon={AlignCenter} title="Align Center" />
            <ToolbarButton onClick={() => execCommand('justifyRight')} icon={AlignRight} title="Align Right" />
          </div>

          {/* Headings */}
          <div className="flex items-center border-r pr-2 mr-2">
            <select 
              onChange={(e) => execCommand('formatBlock', e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue=""
            >
              <option value="" disabled>Heading</option>
              <option value="p">Normal</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>
          </div>

          {/* Table Operations */}
          <div className="flex items-center flex-wrap gap-1">
            <span className="text-xs text-gray-500 mr-2 flex items-center">
              <Table className="h-4 w-4 mr-1" />
              Table:
            </span>
            <button
              type="button"
              onClick={addTableRow}
              title="Add Row Below"
              className="p-2 rounded hover:bg-green-100 text-green-700 transition-colors flex items-center text-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Add Row</span>
            </button>
            <button
              type="button"
              onClick={deleteTableRow}
              title="Delete Row"
              className="p-2 rounded hover:bg-red-100 text-red-700 transition-colors flex items-center text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Delete Row</span>
            </button>
            <span className="text-gray-300 mx-1">|</span>
            <button
              type="button"
              onClick={addTableColumn}
              title="Add Column After"
              className="p-2 rounded hover:bg-green-100 text-green-700 transition-colors flex items-center text-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Add Column</span>
            </button>
            <button
              type="button"
              onClick={deleteTableColumn}
              title="Delete Column"
              className="p-2 rounded hover:bg-red-100 text-red-700 transition-colors flex items-center text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Delete Column</span>
            </button>
          </div>
        </div>

        {activeChartContext && (
          <div ref={chartPanelRef} className="px-4 py-3 border-b bg-blue-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center text-sm font-semibold text-blue-900">
                <BarChart3 className="h-4 w-4 mr-2" />
                Edit Chart
              </div>
              {chartUpdating && (
                <span className="inline-flex items-center text-xs text-blue-700">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Updating preview...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chart Title</label>
                <input
                  type="text"
                  value={chartPanelValues.title}
                  onChange={(e) => handleChartPanelChange('title', e.target.value)}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">X Axis Title</label>
                <input
                  type="text"
                  value={chartPanelValues.xLabel}
                  onChange={(e) => handleChartPanelChange('xLabel', e.target.value)}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Y Axis Title</label>
                <input
                  type="text"
                  value={chartPanelValues.yLabel}
                  onChange={(e) => handleChartPanelChange('yLabel', e.target.value)}
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Editor Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          <div className="max-w-4xl mx-auto">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-full bg-white shadow-lg rounded-lg p-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 report-editor-content"
              style={{
                minHeight: 'calc(100vh - 350px)',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '11pt',
                lineHeight: '1.6',
                color: '#333'
              }}
              onInput={handleContentChange}
              onBlur={handleContentChange}
            />
          </div>
        </div>
        
        {/* Footer with tips */}
        <div className="px-6 py-2 bg-gray-50 border-t text-xs text-gray-500">
          <span className="font-medium">Tips:</span> Use the toolbar to format text. Click in a table cell, then use "Add/Delete Row" or "Add/Delete Column" for table editing. Ctrl+Z to undo, Ctrl+Y to redo. Changes auto-save every 2 seconds.
        </div>
      </div>

      {/* Editor-specific styles */}
      <style>{`
        .report-editor-content h1 {
          color: #2563EB;
          font-size: 24pt;
          margin-bottom: 10px;
          font-weight: bold;
        }
        .report-editor-content h2 {
          color: #2563EB;
          font-size: 18pt;
          margin-top: 20px;
          margin-bottom: 10px;
          font-weight: bold;
        }
        .report-editor-content h3 {
          color: #1E3A8A;
          font-size: 14pt;
          margin-top: 15px;
          margin-bottom: 8px;
          font-weight: bold;
        }
        .report-editor-content h4 {
          color: #1E3A8A;
          font-size: 12pt;
          margin-top: 12px;
          margin-bottom: 6px;
          font-weight: bold;
        }
        .report-editor-content p {
          margin-bottom: 10px;
        }
        .report-editor-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          table-layout: fixed;
        }
        .report-editor-content th,
        .report-editor-content td {
          border: 2px solid #999;
          padding: 8px;
          text-align: left;
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 200px;
        }
        .report-editor-content th {
          background-color: #DBEAFE;
          color: #1E3A8A;
          font-weight: bold;
        }
        .report-editor-content tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .report-editor-content .green-cell {
          background-color: #d4f5d4 !important;
        }
        .report-editor-content .amber-cell {
          background-color: #fff9c4 !important;
        }
        .report-editor-content ul,
        .report-editor-content ol {
          margin-left: 20px;
          margin-bottom: 10px;
        }
        .report-editor-content li {
          margin-bottom: 5px;
        }
        .report-editor-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 10px auto;
        }
        /* Wide table wrapper for horizontal scrolling */
        .report-editor-content .table-wrapper {
          overflow-x: auto;
          max-width: 100%;
          margin: 15px 0;
        }
        .report-editor-content .table-wrapper table {
          min-width: 100%;
        }
        .report-editor-content .ai-chart-block {
          border: 1px dashed #93c5fd;
          background: #eff6ff;
          border-radius: 8px;
          padding: 12px;
          margin: 16px 0;
        }
      `}</style>
    </div>
  );
};

export default ReportEditor;

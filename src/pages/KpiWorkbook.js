import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.min.css';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Save, 
  Clock,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  Settings,
  UserCog,
  BarChart3,
  TrendingUp,
  X,
  Upload,
  FileText,
  Droplet,
  Droplets,
  Zap,
  ChevronDown,
  ChevronUp,
  Menu,
  History,
  Trash2
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import WorkbookChatbot from '../components/workbook/WorkbookChatbot';
import WorkbookInventoryToggle from '../components/common/WorkbookInventoryToggle';
import ReportEditor from '../components/reports/ReportEditor';
import { DEFAULT_CHAT_MODEL } from '../constants/aiModels';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Register Handsontable modules
registerAllModules();

const KpiWorkbook = () => {
  const { id: systemId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hotTableRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);
  const rowsToDeleteRef = useRef([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workbook, setWorkbook] = useState(null);
  const [system, setSystem] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [editingRanges, setEditingRanges] = useState(null); // { parameter, locationRanges }
  const [rangeTab, setRangeTab] = useState('green'); // 'green' or 'yellow'
  
  // Mobile UI state
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    serviceVisit: true,
    kpiTable: true,
    correctiveActions: true,
    correctiveActionsNeeded: true,
    comments: true,
    roCalculator: true
  });
  
  // Form fields
  const [correctiveActionsTaken, setCorrectiveActionsTaken] = useState('');
  const [correctiveActionsNeeded, setCorrectiveActionsNeeded] = useState('');
  const [generalComments, setGeneralComments] = useState('');
  const [serviceVisit, setServiceVisit] = useState({
    date: new Date().toISOString().split('T')[0],
    technician: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    visitType: 'routine'
  });
  
  const [lastSaved, setLastSaved] = useState(null);
  
  // UI state
  const [showParameterModal, setShowParameterModal] = useState(false);
  const [showSampleLocationModal, setShowSampleLocationModal] = useState(false);
  const [showWorkbookChatbot, setShowWorkbookChatbot] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showReportEditor, setShowReportEditor] = useState(false);
  const [reportHtmlContent, setReportHtmlContent] = useState('');
  const [reportData, setReportData] = useState({});
  
  // Trends state
  const [showTrends, setShowTrends] = useState(false);
  const [trendData, setTrendData] = useState(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState(3); // months
  const [generatingTrendReport, setGeneratingTrendReport] = useState(false);
  
  // RO Tracking conversion calculator state
  const [showROConverter] = useState(false);
  const [roConverterData, setROConverterData] = useState({
    conductivity: '',
    tds: '',
    conversionType: 'feedConc' // 'feedConc' or 'permeate'
  });
  
  // Image attachment state
  const [correctiveActionsTakenImages, setCorrectiveActionsTakenImages] = useState([]);
  const [correctiveActionsNeededImages, setCorrectiveActionsNeededImages] = useState([]);
  const [generalCommentsImages, setGeneralCommentsImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(null);
  const imageInputRefs = {
    correctiveActionsTaken: useRef(null),
    correctiveActionsNeeded: useRef(null),
    generalComments: useRef(null)
  };
  // Removed unused editingParameter state
  const [newParameter, setNewParameter] = useState({
    name: '',
    unit: '',
    category: 'chemical',
    targetRange: { min: '', max: '' },
    isCalculated: false,
    calculationType: 'none'
  });
  const [selectedCommonParameter, setSelectedCommonParameter] = useState('');
  const [editingSampleLocations, setEditingSampleLocations] = useState([]);
  const [wallchemControllers, setWallchemControllers] = useState([]);
  
  // Common parameters library - ranges based on AWT water treatment standards
  // Note: When adding parameters, the server will apply system-type-specific ranges
  const commonParameters = {
    chemical: [
      { name: 'pH', unit: 'pH units', targetRange: { min: 6.5, max: 8.5 } },
      { name: 'Conductivity', unit: 'µS/cm', targetRange: { min: 500, max: 3000 } },
      { name: 'Total Dissolved Solids', unit: 'ppm', targetRange: { min: 250, max: 1500 } },
      { name: 'Total Hardness', unit: 'ppm as CaCO3', targetRange: { min: 50, max: 300 } },
      { name: 'Calcium Hardness', unit: 'ppm as CaCO3', targetRange: { min: 40, max: 200 } },
      { name: 'Total Alkalinity', unit: 'ppm as CaCO3', targetRange: { min: 100, max: 400 } },
      { name: 'Free Chlorine', unit: 'ppm', targetRange: { min: 0.5, max: 2.0 } },
      { name: 'Total Chlorine', unit: 'ppm', targetRange: { min: 0.5, max: 2.5 } },
      { name: 'ORP', unit: 'mV', targetRange: { min: 650, max: 850 } },
      { name: 'Monochloramine', unit: 'ppm', targetRange: { min: 0.5, max: 2.0 } },
      { name: 'Free Ammonia', unit: 'ppm', targetRange: { min: 0, max: 0.2 } },
      { name: 'Phosphate', unit: 'ppm', targetRange: { min: 10, max: 50 } },
      { name: 'PTSA', unit: 'ppm', targetRange: { min: 10, max: 30 } },
      { name: 'Polymer', unit: 'ppm', targetRange: { min: 90, max: 150 } },
      { name: 'Silica', unit: 'ppm', targetRange: { min: 0, max: 150 } },
      { name: 'Chloride', unit: 'ppm', targetRange: { min: 50, max: 500 } },
      { name: 'Sulfate', unit: 'ppm', targetRange: { min: 50, max: 400 } },
      { name: 'Iron', unit: 'ppm', targetRange: { min: 0, max: 1.0 } },
      { name: 'Copper', unit: 'ppm', targetRange: { min: 0, max: 1.0 } },
      { name: 'Sulfite', unit: 'ppm', targetRange: { min: 20, max: 40 } },
      { name: 'Nitrite', unit: 'ppm', targetRange: { min: 300, max: 900 } },
      { name: 'Molybdate', unit: 'ppm', targetRange: { min: 100, max: 300 } },
      { name: 'Glycol Concentration', unit: '%', targetRange: { min: 25, max: 35 } },
      { name: 'Cyanuric Acid', unit: 'ppm', targetRange: { min: 0, max: 50 } },
      { name: 'Manganese', unit: 'ppm', targetRange: { min: 0, max: 0.05 } },
      { name: 'Nitrate', unit: 'mg/L', targetRange: { min: 0, max: 10 } },
      { name: 'Dissolved Oxygen', unit: 'mg/L', targetRange: { min: 2.0, max: 8.0 } },
      { name: 'BOD', unit: 'mg/L', targetRange: { min: 0, max: 30 } },
      { name: 'COD', unit: 'mg/L', targetRange: { min: 0, max: 125 } },
      { name: 'Ammonia Nitrogen', unit: 'mg/L', targetRange: { min: 0, max: 5 } },
      { name: 'Total Phosphorus', unit: 'mg/L', targetRange: { min: 0, max: 2 } }
    ],
    physical: [
      { name: 'Water Temperature', unit: '°F', targetRange: { min: 70, max: 95 } },
      { name: 'System Temperature', unit: '°F', targetRange: { min: 40, max: 180 } },
      { name: 'Steam Pressure', unit: 'psi', targetRange: { min: 100, max: 200 } },
      { name: 'Total Suspended Solids', unit: 'mg/L', targetRange: { min: 0, max: 30 } },
      { name: 'Turbidity', unit: 'NTU', targetRange: { min: 0, max: 4 } }
    ],
    biological: [
      { name: 'Total Bacteria Count', unit: 'CFU/mL', targetRange: { min: 0, max: 1000 } },
      { name: 'Legionella', unit: 'CFU/mL', targetRange: { min: 0, max: 10 } },
      { name: 'ATP', unit: 'pg/mL', targetRange: { min: 0, max: 1000 } }
    ],
    calculated: [
      { 
        name: 'Conductivity Cycles', 
        unit: 'cycles', 
        targetRange: { min: 2, max: 8 },
        isCalculated: true,
        calculationType: 'conductivity_cycles'
      },
      { 
        name: 'Hardness Cycles', 
        unit: 'cycles', 
        targetRange: { min: 2, max: 8 },
        isCalculated: true,
        calculationType: 'hardness_cycles'
      },
      { 
        name: 'TDS Cycles', 
        unit: 'cycles', 
        targetRange: { min: 2, max: 8 },
        isCalculated: true,
        calculationType: 'tds_cycles'
      },
      { 
        name: 'Langelier Saturation Index', 
        unit: 'index', 
        targetRange: { min: -0.3, max: 0.3 },
        isCalculated: true,
        calculationType: 'lsi'
      }
    ]
  };

  // Fetch workbook data
  useEffect(() => {
    if (systemId) {
      fetchWorkbook();
      fetchWallchemControllers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemId]);

  // Sync Handsontable data when tableData changes (for calculated fields)
  useEffect(() => {
    const hotInstance = hotTableRef.current?.hotInstance;
    if (hotInstance && tableData.length > 0) {
      // Only update if the data has actually changed
      const currentData = hotInstance.getData();
      if (JSON.stringify(currentData) !== JSON.stringify(tableData)) {
        hotInstance.loadData(tableData);
      }
    }
  }, [tableData]);

  const fetchWorkbook = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/kpi-workbook/system/${systemId}`);
      const { workbook } = response.data;
      
      setWorkbook(workbook);
      setSystem(workbook.systemId);
      setCustomer(workbook.customerId);
      setCorrectiveActionsTaken(workbook.correctiveActionsTaken || '');
      setCorrectiveActionsNeeded(workbook.correctiveActionsNeeded || '');
      setGeneralComments(workbook.generalComments || '');
      
      // Load images
      setCorrectiveActionsTakenImages(workbook.correctiveActionsTakenImages || []);
      setCorrectiveActionsNeededImages(workbook.correctiveActionsNeededImages || []);
      setGeneralCommentsImages(workbook.generalCommentsImages || []);
      setServiceVisit({
        date: workbook.serviceVisit?.date ? new Date(workbook.serviceVisit.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        technician: workbook.serviceVisit?.technician || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''),
        visitType: workbook.serviceVisit?.visitType || 'routine'
      });
      
      // Convert workbook data to Handsontable format
      // Filter out status and notes columns (legacy data)
      const tableColumns = (workbook.columns || []).filter(col => 
        col.key !== 'status' && col.key !== 'notes'
      );
      // Filter out any rows with empty or null parameter names
      const tableRows = (workbook.tableData || []).filter(row => 
        row.parameter && row.parameter.trim() !== ''
      );
      
      setColumns(tableColumns);
      
      // Convert table data to 2D array format for Handsontable
      const data = tableRows.map(row => {
        const rowData = [];
        tableColumns.forEach(col => {
          if (col.key === 'parameter') {
            rowData.push(row.parameter || '');
          } else if (col.key === 'unit') {
            rowData.push(row.unit || '');
          } else if (col.key.startsWith('sample_')) {
            const sampleIndex = col.key.replace('sample_', '');
            rowData.push(row.values?.[`sample_${sampleIndex}`] ?? '');
          } else {
            rowData.push('');
          }
        });
        return rowData;
      });
      
      console.log('Initial workbook load:', {
        workbookParams: workbook.parameters?.length || 0,
        workbookTableData: workbook.tableData?.length || 0,
        columnsLength: tableColumns.length,
        dataLength: data.length,
        firstDataRow: data[0],
        firstWorkbookRow: tableRows[0]
      });
      
      setTableData(data);
      
    } catch (error) {
      console.error('Error fetching workbook:', error);
      toast.error('Failed to load KPI workbook');
      
      // Only navigate away if this is the initial load, not a refresh after saving
      if (error.response?.status === 404 && !workbook) {
        navigate('/systems');
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemId, user]);

  const getCityWaterSampleKey = useCallback((sheetColumns) => {
    const sampleColumns = (sheetColumns || []).filter(col => col?.key?.startsWith('sample_'));
    if (sampleColumns.length === 0) return null;

    const cityLike = sampleColumns.find(col => {
      const title = (col.title || '').toLowerCase();
      return title.includes('city') || title.includes('makeup');
    });

    return cityLike?.key || sampleColumns[0].key;
  }, []);

  // Calculate cycles automatically
  const calculateCycles = useCallback((tableData, columns) => {
    if (!workbook) return tableData;
    
    const updatedData = [...tableData];
    
    // City/makeup water is always denominator; fall back to first sample column
    const cityWaterSampleKey = getCityWaterSampleKey(columns);
    const cityWaterCol = columns.findIndex(col => col.key === cityWaterSampleKey);
    
    if (cityWaterCol === -1) return tableData;
    
    // Find parameter rows and their corresponding cycle rows
    const parameterMappings = [
      { base: 'Conductivity', cycles: 'Conductivity Cycles' },
      { base: 'Total Hardness', cycles: 'Hardness Cycles' },
      { base: 'Total Dissolved Solids', cycles: 'TDS Cycles' }
    ];
    
    parameterMappings.forEach(({ base, cycles }) => {
      const baseRowIndex = updatedData.findIndex(row => row[0] === base);
      const cyclesRowIndex = updatedData.findIndex(row => row[0] === cycles);
      
      if (baseRowIndex !== -1 && cyclesRowIndex !== -1) {
        const cityWaterValue = parseFloat(updatedData[baseRowIndex][cityWaterCol]);
        
        // Never keep any cycles value in the denominator column
        updatedData[cyclesRowIndex][cityWaterCol] = '';

        // Calculate cycles for all non-city-water sample points
        columns.forEach((col, colIndex) => {
          if (col && col.key && col.key.startsWith('sample_') && col.key !== cityWaterSampleKey) {
            const sampleValue = parseFloat(updatedData[baseRowIndex][colIndex]);
            
            if (!isNaN(sampleValue) && !isNaN(cityWaterValue) && cityWaterValue > 0) {
              const calculatedCycles = Math.round((sampleValue / cityWaterValue) * 100) / 100;
              updatedData[cyclesRowIndex][colIndex] = calculatedCycles;
            } else {
              // Clear stale values when denominator or sample input is invalid/blank
              updatedData[cyclesRowIndex][colIndex] = '';
            }
          }
        });
      }
    });
    
    return updatedData;
  }, [workbook, getCityWaterSampleKey]);

  // Handle common parameter selection
  const handleCommonParameterSelect = (parameterKey) => {
    if (!parameterKey) {
      setNewParameter({
        name: '',
        unit: '',
        category: 'chemical',
        targetRange: { min: '', max: '' },
        isCalculated: false,
        calculationType: 'none'
      });
      return;
    }

    // Find the parameter in the common parameters
    let selectedParam = null;
    Object.keys(commonParameters).forEach(category => {
      const param = commonParameters[category].find(p => p.name === parameterKey);
      if (param) {
        selectedParam = { ...param, category };
      }
    });

    if (selectedParam) {
      setNewParameter({
        name: selectedParam.name,
        unit: selectedParam.unit,
        category: selectedParam.category,
        targetRange: {
          min: selectedParam.targetRange?.min?.toString() || '',
          max: selectedParam.targetRange?.max?.toString() || ''
        },
        isCalculated: selectedParam.isCalculated || false,
        calculationType: selectedParam.calculationType || 'none'
      });
    }
  };

  // Get all available common parameters as flat list
  const getAllCommonParameters = () => {
    const allParams = [];
    Object.keys(commonParameters).forEach(category => {
      commonParameters[category].forEach(param => {
        allParams.push({
          ...param,
          category,
          key: param.name
        });
      });
    });
    return allParams.sort((a, b) => a.name.localeCompare(b.name));
  };

  // Add new parameter
  const handleAddParameter = async () => {
    if (!newParameter.name.trim()) {
      toast.error('Parameter name is required');
      return;
    }
    
    try {
      await axios.post(`/api/kpi-workbook/system/${systemId}/parameters`, {
        name: newParameter.name.trim(),
        unit: newParameter.unit.trim(),
        category: newParameter.category,
        targetRange: {
          min: parseFloat(newParameter.targetRange.min) || undefined,
          max: parseFloat(newParameter.targetRange.max) || undefined
        },
        isCalculated: newParameter.isCalculated,
        calculationType: newParameter.calculationType
      });
      
      toast.success('Parameter added successfully');
      setShowParameterModal(false);
      setNewParameter({
        name: '',
        unit: '',
        category: 'chemical',
        targetRange: { min: '', max: '' },
        isCalculated: false,
        calculationType: 'none'
      });
      setSelectedCommonParameter('');
      
      // Refresh workbook
      fetchWorkbook();
      
    } catch (error) {
      console.error('Error adding parameter:', error);
      toast.error(error.response?.data?.message || 'Failed to add parameter');
    }
  };

  // Load default ranges for all parameters
  const handleLoadDefaultRanges = async () => {
    if (!window.confirm(
      'This will reset all parameter ranges to their default values for all sample locations. ' +
      'Any custom ranges you have set will be overwritten. Are you sure you want to continue?'
    )) {
      return;
    }
    
    try {
      const response = await axios.post(`/api/kpi-workbook/system/${systemId}/load-default-ranges`);
      
      if (response.data.workbook) {
        setWorkbook(response.data.workbook);
        toast.success(`Default ranges loaded for ${response.data.updatedCount || 0} parameters`);
        
        // Close the ranges modal and refresh
        setEditingRanges(null);
        await fetchWorkbook();
      }
    } catch (error) {
      console.error('Error loading default ranges:', error);
      toast.error(error.response?.data?.message || 'Failed to load default ranges');
    }
  };

  const handleSaveRanges = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!editingRanges?.parameter) {
      toast.error('No parameter selected for range updates');
      return;
    }

    const currentParameter = editingRanges.parameter;
    const currentLocationRanges = editingRanges.locationRanges;
    const button = e.currentTarget;
    const originalText = button?.textContent || 'Save Ranges';

    try {
      if (button) {
        button.textContent = 'Saving...';
        button.disabled = true;
      }

      const response = await axios.put(
        `/api/kpi-workbook/system/${systemId}/parameters/${encodeURIComponent(currentParameter)}/ranges`,
        {
          locationRanges: currentLocationRanges
        }
      );

      if (response.data.parameter) {
        setWorkbook((prevWorkbook) => {
          if (!prevWorkbook) return prevWorkbook;
          return {
            ...prevWorkbook,
            parameters: prevWorkbook.parameters.map((p) =>
              p.name === currentParameter
                ? { ...p, locationRanges: response.data.parameter.locationRanges }
                : p
            )
          };
        });
      }

      toast.success(`Ranges saved for ${currentParameter}`);
    } catch (error) {
      console.error('Error saving ranges:', error);
      toast.error(error.response?.data?.message || 'Failed to save ranges. Please try again.');
    } finally {
      if (button) {
        button.textContent = originalText;
        button.disabled = false;
      }
    }
  };

  // Fetch Wallchem controllers
  const fetchWallchemControllers = async () => {
    try {
      const response = await axios.get(`/api/wallchem/system/${systemId}/controllers`);
      setWallchemControllers(response.data.wallchemControllers || []);
    } catch (error) {
      console.error('Error fetching Wallchem controllers:', error);
      setWallchemControllers([]);
    }
  };

  // Fetch trend data
  const fetchTrends = async (months = trendPeriod) => {
    try {
      setLoadingTrends(true);
      const response = await axios.get(`/api/kpi-workbook/system/${systemId}/trends?months=${months}`);
      setTrendData(response.data);
    } catch (error) {
      console.error('Error fetching trends:', error);
      toast.error('Failed to load trend data');
    } finally {
      setLoadingTrends(false);
    }
  };

  // Generate trend report with charts
  const generateTrendReport = async () => {
    if (!trendData) {
      toast.error('No trend data available');
      return;
    }

    setGeneratingTrendReport(true);
    try {
      // Collect chart images from the rendered charts
      const chartImages = {};
      const chartContainers = document.querySelectorAll('[data-param-chart]');
      
      for (const container of chartContainers) {
        const paramName = container.getAttribute('data-param-chart');
        const canvas = container.querySelector('canvas');
        if (canvas) {
          try {
            chartImages[paramName] = canvas.toDataURL('image/png');
          } catch (e) {
            console.warn(`Failed to capture chart for ${paramName}:`, e);
          }
        }
      }

      const response = await axios.post(
        `/api/kpi-workbook/system/${systemId}/generate-trend-report`,
        {
          months: trendPeriod,
          chartImages
        },
        { responseType: 'blob' }
      );

      // Check if response is actually JSON (error) despite blob request
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const error = JSON.parse(text);
        throw new Error(error.message || 'Failed to generate report');
      }

      // Download the file
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = `${customer?.name || 'Customer'}_${system?.name || 'System'}_TrendReport_${trendPeriod}mo_${new Date().toISOString().slice(0, 10)}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeName}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Trend report generated');
    } catch (error) {
      console.error('Error generating trend report:', error);
      toast.error(error.message || 'Failed to generate trend report');
    } finally {
      setGeneratingTrendReport(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (field, file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingImage(field);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        
        try {
          await axios.post(`/api/kpi-workbook/system/${systemId}/images`, {
            field,
            imageData: base64Data,
            mimeType: file.type,
            filename: file.name
          });

          // Refresh workbook to get updated images
          await fetchWorkbook();
          toast.success('Image uploaded');
        } catch (error) {
          console.error('Error uploading image:', error);
          toast.error('Failed to upload image');
        } finally {
          setUploadingImage(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read image');
      setUploadingImage(null);
    }
  };

  // Handle image paste from clipboard
  const handleImagePaste = async (field, e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleImageUpload(field, file);
        }
        break;
      }
    }
  };

  // Handle image delete
  const handleImageDelete = async (field, index) => {
    try {
      await axios.delete(`/api/kpi-workbook/system/${systemId}/images/${field}/${index}`);
      await fetchWorkbook();
      toast.success('Image deleted');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };


  // Update sample locations and Wallchem controllers
  const handleUpdateSampleLocations = async () => {
    if (editingSampleLocations.some(loc => !loc.trim())) {
      toast.error('All sample location names are required');
      return;
    }
    
    try {
      // Get original sample locations from workbook to compute reorder mapping
      const originalLocations = workbook?.sampleLocations || [];
      
      // Update sample locations with reorder mapping
      await axios.put(`/api/kpi-workbook/system/${systemId}/sample-locations`, {
        sampleLocations: editingSampleLocations,
        originalSampleLocations: originalLocations
      });

      // Update Wallchem controller mappings
      const controllerMappings = wallchemControllers.map((controller, index) => ({
        sampleLocationKey: `sample_${index + 1}`,
        sampleLocationName: editingSampleLocations[index] || `Sample ${index + 1}`,
        controllerSerialNumber: controller.controllerSerialNumber || ''
      })).filter(mapping => mapping.controllerSerialNumber.trim() !== '');

      if (controllerMappings.length > 0) {
        await axios.put(`/api/wallchem/system/${systemId}/controllers`, {
          wallchemControllers: controllerMappings
        });
      }
      
      toast.success('Sample locations and controller mappings updated successfully');
      setShowSampleLocationModal(false);
      fetchWorkbook();
      fetchWallchemControllers();
      
    } catch (error) {
      console.error('Error updating sample locations:', error);
      toast.error('Failed to update sample locations');
    }
  };

  // Add sample location
  const addSampleLocation = () => {
    setEditingSampleLocations([...editingSampleLocations, `Sample Point ${editingSampleLocations.length + 1}`]);
    setWallchemControllers([...wallchemControllers, { controllerSerialNumber: '' }]);
  };

  // Remove sample location
  const removeSampleLocation = (index) => {
    if (editingSampleLocations.length <= 1) {
      toast.error('At least one sample location is required');
      return;
    }
    setEditingSampleLocations(editingSampleLocations.filter((_, i) => i !== index));
    setWallchemControllers(wallchemControllers.filter((_, i) => i !== index));
  };

  // Move sample location up
  const moveSampleLocationUp = (index) => {
    if (index === 0) return;
    const newLocations = [...editingSampleLocations];
    const newControllers = [...wallchemControllers];
    
    // Swap with previous item
    [newLocations[index], newLocations[index - 1]] = [newLocations[index - 1], newLocations[index]];
    [newControllers[index], newControllers[index - 1]] = [newControllers[index - 1], newControllers[index]];
    
    setEditingSampleLocations(newLocations);
    setWallchemControllers(newControllers);
  };

  // Move sample location down
  const moveSampleLocationDown = (index) => {
    if (index === editingSampleLocations.length - 1) return;
    const newLocations = [...editingSampleLocations];
    const newControllers = [...wallchemControllers];
    
    // Swap with next item
    [newLocations[index], newLocations[index + 1]] = [newLocations[index + 1], newLocations[index]];
    [newControllers[index], newControllers[index + 1]] = [newControllers[index + 1], newControllers[index]];
    
    setEditingSampleLocations(newLocations);
    setWallchemControllers(newControllers);
  };

  // Function to determine cell status based on value and ranges (per-location takes precedence)
  const getCellStatus = (rowIndex, colIndex, value) => {
    const column = columns[colIndex];
    if (!column || !column.key || !column.key.startsWith('sample_')) return 'no_value';

    const sampleKey = column.key; // e.g., sample_1
    const tableRow = workbook?.tableData?.[rowIndex];
    if (!tableRow) return 'no_value';

    const parameter = workbook.parameters?.find(p => p.name === tableRow.parameter);
    if (!parameter) return 'no_value';

    // Check for per-location range for this specific sample key
    const locationRange = parameter.locationRanges?.[sampleKey] || {};
    const hasLocationRange = locationRange.min !== undefined || locationRange.max !== undefined;
    
    // If no per-location range is defined, grey out the cell (read-only)
    if (!hasLocationRange) {
      return 'no_range';
    }

    // Qualitative shorthand used by operators: treat "+++" as too high / out of range
    if (typeof value === 'string' && value.trim() === '+++') {
      return 'out_of_range';
    }

    // If we have a range defined, check the value against it
    const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.+-]/g, ''));
    if (Number.isNaN(numericValue)) return 'no_value';

    const min = typeof locationRange.min === 'number' ? locationRange.min : undefined;
    const max = typeof locationRange.max === 'number' ? locationRange.max : undefined;

    if (min !== undefined && numericValue < min) return 'out_of_range';
    if (max !== undefined && numericValue > max) return 'out_of_range';
    return 'in_range';
  };

  // Custom cell renderer for KPI values
  const kpiCellRenderer = function(instance, td, row, col, prop, value, cellProperties) {
    // Call default renderer first
    const defaultRenderer = instance.getSettings().renderer || function(instance, td, row, col, prop, value, cellProperties) {
      const displayValue = value === null || value === undefined ? '' : String(value);
      td.textContent = displayValue;
    };
    defaultRenderer.apply(this, arguments);
    
    const status = getCellStatus(row, col, value);

    // Remove any existing status classes (old and new)
    td.classList.remove('kpi-cell-below-min', 'kpi-cell-above-max', 'kpi-cell-normal', 'kpi-cell-in-range', 'kpi-cell-out-of-range', 'kpi-cell-no-range');

    // Apply new classes without changing cell text
    if (status === 'no_range') {
      td.classList.add('kpi-cell-no-range');
      cellProperties.readOnly = true; // Make cell read-only
    } else if (status === 'out_of_range') {
      td.classList.add('kpi-cell-out-of-range');
      cellProperties.readOnly = false;
    } else if (status === 'in_range') {
      td.classList.add('kpi-cell-in-range');
      cellProperties.readOnly = false;
    } // else leave as default (white) when no_value
    
    return td;
  };


  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!workbook || saving) return;
    
    try {
      // Convert table data back to workbook format
      const updatedTableData = tableData.map((row) => {
        const values = {};
        const paramIdx = columns.findIndex(c => c && c.key === 'parameter');
        const unitIdx = columns.findIndex(c => c && c.key === 'unit');

        columns.forEach((col, colIndex) => {
          const key = col?.key;
          if (typeof key === 'string' && key.startsWith('sample_')) {
            values[key] = row[colIndex] ?? '';
          }
        });

        return {
          parameter: (paramIdx >= 0 ? row[paramIdx] : '') ?? '',
          unit: (unitIdx >= 0 ? row[unitIdx] : '') ?? '',
          values
        };
      });
      
      await axios.post(`/api/kpi-workbook/system/${systemId}/auto-save`, {
        tableData: updatedTableData,
        correctiveActionsTaken,
        correctiveActionsNeeded,
        generalComments,
        serviceVisit
      });
      
      setLastSaved(new Date());
      
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [tableData, correctiveActionsTaken, correctiveActionsNeeded, generalComments, serviceVisit, workbook, columns, systemId, saving]);

  // Debounced auto-save
  const debouncedAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 2000);
  }, [autoSave]);

  // Handle table data changes
  const handleTableChange = (changes, source) => {
    if (changes && source !== 'alter') {
      // Skip processing if this is from a row alteration (like deletion)
      // to prevent conflicts with our custom deletion handling
      
      // Update local table data state
      let newData = [...tableData];
      changes.forEach(([row, col, oldValue, newValue]) => {
        if (newData[row]) {
          newData[row][col] = newValue;
        }
      });
      
      // Calculate cycles automatically for cooling towers
      newData = calculateCycles(newData, columns);
      
      setTableData(newData);
      debouncedAutoSave();
    }
  };

  // Handle row reordering via drag and drop
  const handleRowMove = useCallback(async (movedRows, finalIndex, dropIndex, movePossible, orderChanged) => {
    if (!orderChanged) return;
    
    // Persist order to backend by parameter name sequence
    try {
      const parameterOrder = (hotTableRef.current?.hotInstance?.getData() || []).map(row => row?.[0]).filter(Boolean);
      await axios.post(`/api/kpi-workbook/system/${systemId}/rows/reorder`, { parameterOrder });
      
      // Refresh workbook to get the updated order from server
      await fetchWorkbook();
      toast.success('Rows reordered successfully');
    } catch (error) {
      console.error('Reorder error:', error);
      toast.error('Failed to reorder rows');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemId, fetchWorkbook]);

  // Handle before row removal (for validation)
  const handleBeforeRemoveRow = useCallback((index, amount, physicalRows, source) => {
    const rows = physicalRows || Array.from({ length: amount }, (_, i) => index + i);
    const hot = hotTableRef.current?.hotInstance;
    // Capture names from the live grid before mutation to avoid index drift
    const names = rows.map(r => {
      const rowData = hot?.getDataAtRow(r);
      const nameFromGrid = Array.isArray(rowData) ? rowData[0] : undefined;
      return (nameFromGrid ?? tableData[r]?.[0]) || null;
    }).filter(Boolean);
    rowsToDeleteRef.current = names;
    return true;
  }, [tableData]);

  // Handle after row removal
  const handleAfterRemoveRow = useCallback(async (index, amount, physicalRows, source) => {
    // Sync backend deletions for any built-in row removals (e.g., context menu)
    if (['ContextMenu.removeRow', 'RemoveRow', 'auto'].includes(source)) {
      const names = rowsToDeleteRef.current || [];
      rowsToDeleteRef.current = [];
      if (names.length > 0) {
        try {
          await axios.delete(`/api/kpi-workbook/system/${systemId}/parameters`, { data: { parameterNames: names } });
          await fetchWorkbook();
          toast.success(`Removed ${names.length} parameter${names.length > 1 ? 's' : ''}`);
        } catch (e) {
          toast.error('Failed to delete parameters');
        }
      }
    }
  }, [systemId, fetchWorkbook]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(async (event) => {
    const hotInstance = hotTableRef.current?.hotInstance;
    if (!hotInstance) return;
    
    // Delete or Backspace key pressed
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selected = hotInstance.getSelected();
      if (!selected || selected.length === 0) return;
      
      // Check if we're in a row header context (entire row selected)
      const isRowHeaderSelection = selected.some(([startRow, startCol, endRow, endCol]) => {
        return startCol === -1 || (startCol === 0 && endCol >= hotInstance.countCols() - 1);
      });
      
      if (isRowHeaderSelection) {
        event.preventDefault();
        
        // Get selected rows
        const selectedRows = [];
        selected.forEach(([startRow, startCol, endRow, endCol]) => {
          // If column selection includes row header (-1) or spans full width, treat as row selection
          if (startCol === -1 || (startCol === 0 && endCol >= hotInstance.countCols() - 1)) {
            for (let i = startRow; i <= endRow; i++) {
              if (!selectedRows.includes(i)) {
                selectedRows.push(i);
              }
            }
          }
        });
        
        if (selectedRows.length === 0) return;
        
        // Collect parameter names from live grid to avoid stale state
        const parametersToDelete = selectedRows
          .map(r => {
            const rowData = hotInstance.getDataAtRow(r) || [];
            return rowData[0];
          })
          .filter(v => v !== null && v !== undefined && String(v).trim() !== '');
        
        if (parametersToDelete.length > 0) {
          // Confirm deletion for multiple parameters
          const confirmMessage = selectedRows.length === 1 
            ? `Delete parameter "${parametersToDelete[0]}"?`
            : `Delete ${selectedRows.length} parameters: ${parametersToDelete.join(', ')}?`;
            
          if (window.confirm(confirmMessage)) {
            try {
              await axios.delete(`/api/kpi-workbook/system/${systemId}/parameters`, { data: { parameterNames: parametersToDelete } });
              await fetchWorkbook();
              toast.success(`Deleted ${parametersToDelete.length} parameter${parametersToDelete.length > 1 ? 's' : ''}`);
            } catch (error) {
              toast.error('Failed to delete parameters. Please try again.');
            }
          }
        } else {
          // Fallback: delete by row index for blank/unnamed rows
          try {
            await axios.post(`/api/kpi-workbook/system/${systemId}/rows/delete`, { rowIndices: selectedRows });
            await fetchWorkbook();
            toast.success(`Deleted ${selectedRows.length} row${selectedRows.length > 1 ? 's' : ''}`);
          } catch (e) {
            toast.error('Failed to delete rows. Please try again.');
          }
        }
      }
    }
  }, [systemId, fetchWorkbook]);

  // Attach keyboard event listener and row header click handler
  useEffect(() => {
    const handleKeyDownEvent = (event) => handleKeyDown(event);
    document.addEventListener('keydown', handleKeyDownEvent);
    
    // Add row header click handler for better row selection detection
    const handleRowHeaderClick = (event) => {
      const hotInstance = hotTableRef.current?.hotInstance;
      if (!hotInstance) return;
      
      // Check if clicked element is a row header
      const isRowHeader = event.target.closest('.ht_clone_left th');
      if (isRowHeader) {
        // Mark that we have a row header selected for delete key handling
        setTimeout(() => {
          const selected = hotInstance.getSelected();
          if (selected && selected.length > 0) {
            // Force row selection by selecting entire row
            const [startRow] = selected[0];
            hotInstance.selectRows(startRow);
          }
        }, 10);
      }
    };
    
    document.addEventListener('click', handleRowHeaderClick);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDownEvent);
      document.removeEventListener('click', handleRowHeaderClick);
    };
  }, [handleKeyDown]);

  // Manual save
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Convert table data back to workbook format
      const updatedTableData = tableData.map((row) => {
        const values = {};
        
        columns.forEach((col, colIndex) => {
          if (col.key.startsWith('sample_')) {
            values[col.key] = row[colIndex] ?? '';
          }
        });
        
        return {
          // Whitelist only allowed fields to avoid sending _id or Mongo metadata
          parameter: row[0] ?? '',
          unit: row[1] ?? '',
          values
        };
      });
      
      await axios.put(`/api/kpi-workbook/system/${systemId}`, {
        tableData: updatedTableData,
        correctiveActionsTaken,
        correctiveActionsNeeded,
        generalComments,
        serviceVisit
      });
      
      toast.success('Workbook saved successfully');
      setLastSaved(new Date());
      await fetchWorkbook();
      
    } catch (error) {
      console.error('Error saving workbook:', error);
      const apiMsg = error.response?.data?.message || 'Failed to save workbook';
      const details = error.response?.data?.details;
      const valErrors = error.response?.data?.errors;
      if (details) console.warn('Save details:', details);
      if (Array.isArray(valErrors) && valErrors.length > 0) {
        console.warn('Validation errors:', valErrors);
        toast.error(`${apiMsg}: ${valErrors[0]}`);
      } else {
        toast.error(apiMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  // Handsontable configuration
  const hotSettings = {
    data: tableData,
    colHeaders: (columns || []).map(col => (col && col.title) || ''),
    columns: (columns || []).map(col => ({
      type: (col && col.type) === 'number' ? 'numeric' : 'text',
      width: (col && col.width) || 120,
      ...(((col && col.type) === 'dropdown' && Array.isArray(col.options)) ? {
        type: 'dropdown',
        source: col.options
      } : {}),
      // Add custom renderer for sample columns (KPI values)
      ...(typeof (col && col.key) === 'string' && col.key.startsWith('sample_') ? {
        renderer: kpiCellRenderer
      } : {})
    })),
    cells: function(row, col) {
      const cellProperties = {};
      
      // Check if this is a sample column and if it has no range defined
      const column = columns[col];
      if (column && column.key && column.key.startsWith('sample_')) {
        const sampleKey = column.key;
        const tableRow = workbook?.tableData?.[row];
        
        if (tableRow) {
          const parameter = workbook.parameters?.find(p => p.name === tableRow.parameter);
          
          if (parameter) {
            const isCalculatedCycleRow = parameter.isCalculated && [
              'conductivity_cycles',
              'hardness_cycles',
              'tds_cycles'
            ].includes(parameter.calculationType);

            // Prevent manual editing in calculated cycle rows.
            if (isCalculatedCycleRow) {
              cellProperties.readOnly = true;
              return cellProperties;
            }

            const locationRange = parameter.locationRanges?.[sampleKey] || {};
            const hasLocationRange = locationRange.min !== undefined || locationRange.max !== undefined;
            
            // Make cell read-only if no per-location range is defined
            if (!hasLocationRange) {
              cellProperties.readOnly = true;
            }
          }
        }
      }
      
      return cellProperties;
    },
    rowHeaders: true,
    contextMenu: ['row_above', 'row_below', 'remove_row', '---------', 'copy', 'cut', 'paste'],
    manualColumnResize: true,
    manualRowResize: true,
    manualRowMove: true, // Enable drag and drop row reordering
    afterChange: handleTableChange,
    afterRowMove: handleRowMove,
    beforeRemoveRow: handleBeforeRemoveRow,
    afterRemoveRow: handleAfterRemoveRow,
    licenseKey: 'non-commercial-and-evaluation',
    height: 400,
    stretchH: 'all',
    autoWrapRow: true,
    autoWrapCol: true,
    // Simple row header with just numbers
    rowHeaderWidth: 50
  };
  
  // Debug logging
  console.log('Handsontable Settings:', {
    dataRows: tableData.length,
    dataCols: tableData[0]?.length || 0,
    columns: columns.length,
    columnTitles: columns.map(col => col.title)
  });

  // Helper function to format workbook context for AI
  const formatWorkbookContextForAI = useCallback(() => {
    if (!workbook) return '';

    const sampleLocations = Array.isArray(workbook.sampleLocations) ? workbook.sampleLocations : [];
    const parameters = (workbook.parameters || []).map(p => {
      const locationRanges = p.locationRanges || {};
      const targetRange = p.targetRange || {};
      const effectiveRanges = {};
      sampleLocations.forEach((_, idx) => {
        const key = `sample_${idx + 1}`;
        const lr = locationRanges[key] || {};
        const min = typeof lr.min === 'number' ? lr.min : (typeof targetRange.min === 'number' ? targetRange.min : undefined);
        const max = typeof lr.max === 'number' ? lr.max : (typeof targetRange.max === 'number' ? targetRange.max : undefined);
        if (min !== undefined || max !== undefined) {
          effectiveRanges[key] = { min, max };
        }
      });
      if (typeof targetRange.min === 'number' || typeof targetRange.max === 'number') {
        effectiveRanges.default = {
          min: typeof targetRange.min === 'number' ? targetRange.min : undefined,
          max: typeof targetRange.max === 'number' ? targetRange.max : undefined
        };
      }
      return {
        name: p.name,
        unit: p.unit,
        category: p.category,
        isCalculated: p.isCalculated,
        targetRange,
        locationRanges,
        effectiveRanges
      };
    });

    const context = {
      system: {
        name: system?.name,
        type: system?.type,
        customer: customer?.name
      },
      parameters,
      sampleLocations,
      valueNotation: {
        '+++': 'Well above target range (too high / out-of-range high)'
      },
      tableData: (workbook.tableData || []).map(row => ({
        parameter: row.parameter,
        unit: row.unit,
        values: row.values,
        status: row.status,
        notes: row.notes
      })),
      serviceVisit: workbook.serviceVisit || {},
      correctiveActions: {
        taken: workbook.correctiveActionsTaken || '',
        needed: workbook.correctiveActionsNeeded || ''
      },
      comments: workbook.generalComments || ''
    };

    return JSON.stringify(context, null, 2);
  }, [workbook, system, customer]);
  
  const autoGenerateReport = useCallback(async () => {
    try {
      toast.loading('Generating service report with AI analysis...', { id: 'generating-report' });
      
      // Step 1: Generate AI report
      const workbookContext = formatWorkbookContextForAI();
      const systemPrompt = `You are a professional water treatment analyst. Write a concise, professional report with simple wording.

Context:
${workbookContext}

Format (Markdown headings):
## Executive Summary
- 1–2 short sentences. If no material issues, say: "No material issues observed."
## Findings (only if relevant)
- Bullets for deviations, risks, trends, or missing critical data. Use exact sample location names.
## Actions Taken (only if provided)
- Bullets summarizing actions from the workbook.
## Next Steps (only if essential)
- 1–3 bullets with minimal, actionable guidance.

Rules:
- Max 150 words total. Avoid boilerplate and parameter-by-parameter listings.
- Use exact sample location names from the workbook.
- Judge against location-specific effective ranges when available; otherwise use defaults.
- Interpret sample value "+++" as a qualitative reading meaning well above range (too high, out-of-range).
- Do not mention standards/regulations unless present in the context.
- Treat blank or null sample values as measurements that were not collected this visit; do not label them as missing, overdue, or problematic unless the workbook notes an issue explicitly.
- Turbidity readings are used to measure residual polymer in the system, not water clarity. When analyzing turbidity values, interpret them in the context of polymer dosing and residual measurement.`;

      const message = 'Generate a comprehensive water treatment analysis report based on the current workbook data. Include executive summary, parameter analysis, issues identified, recommendations, and next steps.';
      
      // Call AI to generate report
      const aiResponse = await axios.post('/api/chat/message', {
        message,
        customSystemPrompt: systemPrompt,
        model: DEFAULT_CHAT_MODEL
      });
      
      const aiReport = aiResponse.data.response?.content || '';
      
      // Step 2: Generate HTML content for editor
      const htmlResponse = await axios.post(`/api/kpi-workbook/system/${systemId}/generate-html`, {
        aiReport
      });
      
      const htmlContent = htmlResponse.data.html || '';
      
      // Set up report data for editor
      setReportData({
        reportType: 'workbook',
        title: `${system?.name || 'System'} - Service Report`,
        customerId: customer?._id,
        systemIds: [systemId],
        serviceDate: workbook?.serviceVisit?.date || new Date().toISOString(),
        aiSummary: aiReport,
        systemNames: [system?.name],
        customerName: customer?.name,
        technician: workbook?.serviceVisit?.technician || `${user?.firstName} ${user?.lastName}`,
        tags: [system?.type],
        companyLogo: user?.companyLogo || null
      });
      
      setReportHtmlContent(htmlContent);
      
      toast.dismiss('generating-report');
      toast.success('Report ready for editing');
      
      // Open the report editor
      setShowReportEditor(true);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.dismiss('generating-report');
      toast.error(error.response?.data?.message || error.message || 'Failed to generate report');
    }
  }, [formatWorkbookContextForAI, systemId, customer, system, workbook, user]);

  // Listen for global report generation trigger from top bar
  useEffect(() => {
    const generateHandler = () => {
      // For operators, open chatbot for AI help
      if (user?.accountType === 'customer') {
        setShowWorkbookChatbot(true);
      } else {
        // For enterprise users, auto-generate report
        autoGenerateReport();
      }
    };
    window.addEventListener('generate-workbook-report', generateHandler);
    return () => {
      window.removeEventListener('generate-workbook-report', generateHandler);
    };
  }, [user, autoGenerateReport]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading KPI workbook..." />
      </div>
    );
  }

  if (!workbook || !system) {
    return (
      <div className="px-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Workbook Not Found</h1>
          <p className="text-gray-600 mb-6">
            The requested KPI workbook could not be found.
          </p>
          <button
            onClick={() => navigate('/systems')}
            className="btn-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Systems
          </button>
        </div>
      </div>
    );
  }

  // Check if viewing operator account workbook
  const isOperatorWorkbook = workbook && user && workbook.userId !== user.id;

  // Toggle section helper
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="px-4 sm:px-6 pb-24 sm:pb-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-4">
          {/* Top row: Back button, Title, and Mobile Menu */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <button
                onClick={() => {
                  if (user?.accountType === 'customer') {
                    navigate('/systems');
                  } else {
                    navigate(`/customers/${customer?._id}/systems`);
                  }
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors flex-shrink-0 mt-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  {system.name}
                </h1>
                <p className="text-sm text-gray-500 mt-1">KPI Workbook</p>
              </div>
              {isOperatorWorkbook && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex-shrink-0">
                  <UserCog className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Operator</span>
                </span>
              )}
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
          
          {/* Second row: Customer info and Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pl-0 sm:pl-10">
            <p className="text-sm text-gray-600">
              {customer?.name} • {system.type?.replace('_', ' ')}
            </p>
            <WorkbookInventoryToggle activePage="workbook" />
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-3 flex-wrap">
            {lastSaved && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={async () => {
                setShowHistory(true);
                setLoadingHistory(true);
                try {
                  const res = await axios.get(`/api/kpi-workbook/system/${systemId}/history`);
                  setHistoryItems(res.data.workbooks || []);
                } catch (e) {
                  toast.error('Failed to load history');
                } finally {
                  setLoadingHistory(false);
                }
              }}
              className="btn-secondary"
            >
              <History className="h-4 w-4 mr-2" />
              History
            </button>
            <button
              onClick={async () => {
                setShowTrends(true);
                await fetchTrends(trendPeriod);
              }}
              className="btn-secondary"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Trends
            </button>
            <button
              onClick={async () => {
                if (!window.confirm('Clear all values and comments? Parameters and sample points will remain.')) return;
                try {
                  await axios.post(`/api/kpi-workbook/system/${systemId}/clear`);
                  toast.success('Workbook cleared');
                  await fetchWorkbook();
                } catch (e) {
                  toast.error('Failed to clear workbook');
                }
              }}
              className="btn-secondary"
              title="Clear all values and comments"
            >
              Clear Workbook
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Operator Account Banner */}
      {isOperatorWorkbook && (
        <div className="mb-6 bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <UserCog className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-purple-900 mb-1">
                Managing Operator Account Workbook
              </h3>
              <p className="text-sm text-purple-700">
                You are editing the KPI workbook for <strong>{customer?.name}'s</strong> operator account. 
                All changes will be saved to their account and visible when they log in. This is not your enterprise workbook.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service Visit Info - Collapsible on Mobile */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6 overflow-hidden">
        <button
          onClick={() => toggleSection('serviceVisit')}
          className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Service Visit Information
          </h2>
          {expandedSections.serviceVisit ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {expandedSections.serviceVisit && (
          <div className="p-4 sm:p-6 animate-slide-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Visit Date
            </label>
            <input
              type="date"
              value={serviceVisit.date}
              onChange={(e) => {
                setServiceVisit(prev => ({ ...prev, date: e.target.value }));
                debouncedAutoSave();
              }}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Technician
            </label>
            <div className="input-field bg-gray-50 text-gray-700">
              {serviceVisit.technician || 'Not specified'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visit Type
            </label>
            <select
              value={serviceVisit.visitType}
              onChange={(e) => {
                setServiceVisit(prev => ({ ...prev, visitType: e.target.value }));
                debouncedAutoSave();
              }}
              className="input-field"
            >
              <option value="routine">Routine</option>
              <option value="maintenance">Maintenance</option>
              <option value="emergency">Emergency</option>
              <option value="inspection">Inspection</option>
            </select>
          </div>
            </div>
          </div>
        )}
      </div>

      {/* RO Tracking Conversion Calculator - Only for RO tracking systems */}
      {system?.roTrackingEnabled && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 mb-4 sm:mb-6 overflow-hidden">
          <button
            onClick={() => toggleSection('roCalculator')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between"
          >
            <div className="flex items-center">
              <Droplets className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Two Stage RO Tracking</h2>
              <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                Normalization
              </span>
            </div>
            {expandedSections.roCalculator ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          
          {expandedSections.roCalculator && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 animate-slide-up">
          {showROConverter && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Conductivity to TDS Converter */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                  Conductivity → TDS Conversion
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Water Type</label>
                    <select
                      value={roConverterData.conversionType}
                      onChange={(e) => setROConverterData(prev => ({ ...prev, conversionType: e.target.value }))}
                      className="input-field text-sm"
                    >
                      <option value="feedConc">Feed/Concentrate (Factor: 0.706)</option>
                      <option value="permeate">Permeate (Factor: 0.497)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conductivity (µS/cm)</label>
                    <input
                      type="number"
                      value={roConverterData.conductivity}
                      onChange={(e) => {
                        const cond = parseFloat(e.target.value) || 0;
                        const factor = roConverterData.conversionType === 'feedConc' ? 0.706 : 0.497;
                        const tds = Math.round(cond * factor * 100) / 100;
                        setROConverterData(prev => ({ ...prev, conductivity: e.target.value, tds: tds || '' }));
                      }}
                      className="input-field text-sm"
                      placeholder="Enter conductivity"
                    />
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <label className="block text-sm font-medium text-green-800 mb-1">Calculated TDS (mg/L)</label>
                    <div className="text-2xl font-bold text-green-700">
                      {roConverterData.tds || '—'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* TDS to Conductivity Converter */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Droplet className="h-4 w-4 mr-2 text-blue-500" />
                  TDS → Conductivity Conversion
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Water Type</label>
                    <select
                      value={roConverterData.conversionType}
                      onChange={(e) => setROConverterData(prev => ({ ...prev, conversionType: e.target.value }))}
                      className="input-field text-sm"
                    >
                      <option value="feedConc">Feed/Concentrate (Factor: 1.42)</option>
                      <option value="permeate">Permeate (Factor: 2.01)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TDS (mg/L)</label>
                    <input
                      type="number"
                      value={roConverterData.tds}
                      onChange={(e) => {
                        const tds = parseFloat(e.target.value) || 0;
                        const factor = roConverterData.conversionType === 'feedConc' ? 1.42 : 2.01;
                        const cond = Math.round(tds * factor * 100) / 100;
                        setROConverterData(prev => ({ ...prev, tds: e.target.value, conductivity: cond || '' }));
                      }}
                      className="input-field text-sm"
                      placeholder="Enter TDS"
                    />
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <label className="block text-sm font-medium text-blue-800 mb-1">Calculated Conductivity (µS/cm)</label>
                    <div className="text-2xl font-bold text-blue-700">
                      {roConverterData.conductivity || '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-600 bg-white/50 rounded-lg p-3">
            <p className="font-medium mb-1">About RO Tracking Mode:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Calculated parameters (TDS, pressure conversions, normalized values) are auto-computed when you enter data</li>
              <li>Temperature Correction Factor normalizes flow data to 25°C reference</li>
              <li>Salt rejection and recovery percentages are calculated from conductivity and flow data</li>
              <li>Use View Trends to see normalized flow, rejection, and differential pressure graphs over time</li>
            </ul>
          </div>
        </div>
      )}
        </div>
      )}

      {/* KPI Data Table - Collapsible on Mobile */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6 overflow-hidden">
        <button
          onClick={() => toggleSection('kpiTable')}
          className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="text-left">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              KPI Measurements
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">
              Right-click for context menu • Drag row numbers to reorder • Click row number and press Delete to remove
            </p>
          </div>
          {expandedSections.kpiTable ? (
            <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
          )}
        </button>
        
        {expandedSections.kpiTable && (
          <div className="p-4 sm:p-6 animate-slide-up">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs sm:text-sm text-gray-600 sm:hidden">
                Right-click for menu • Drag rows to reorder • Delete key to remove
              </p>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <button
              onClick={() => {
                setEditingSampleLocations([...workbook.sampleLocations]);
                // Initialize Wallchem controllers array to match sample locations
                const controllers = workbook.sampleLocations.map((location, index) => {
                  const existing = wallchemControllers.find(c => c.sampleLocationKey === `sample_${index + 1}`);
                  return existing || { controllerSerialNumber: '' };
                });
                setWallchemControllers(controllers);
                setShowSampleLocationModal(true);
              }}
              className="btn-secondary text-sm"
              title="Manage Sample Locations"
            >
              <Settings className="h-4 w-4 mr-1" />
              Sample Point
            </button>
            <button
              onClick={() => {
                // Prefer current row under selection; fallback to first available parameter
                const hot = hotTableRef.current?.hotInstance;
                let chosenName = '';
                if (hot) {
                  const sel = hot.getSelected();
                  if (sel && sel.length > 0) {
                    const [r] = sel[0];
                    const name = hot.getDataAtRow(r)?.[0];
                    if (typeof name === 'string' && name.trim()) {
                      chosenName = name.trim();
                    }
                  }
                }
                if (!chosenName) {
                  chosenName = workbook.tableData?.[0]?.parameter || workbook.parameters?.[0]?.name || '';
                }
                const param = (workbook.parameters || []).find(p => p.name === chosenName) || null;
                setEditingRanges({
                  parameter: chosenName,
                  locationRanges: param?.locationRanges || {}
                });
                setRangeTab('green'); // Reset to green tab when opening modal
              }}
              className="btn-secondary text-sm"
              title="Edit per-location ranges"
            >
              <Settings className="h-4 w-4 mr-1" />
              Ranges
            </button>
            <button
              onClick={() => setShowParameterModal(true)}
              className="btn-primary text-sm"
              title="Add Parameter"
            >
              <Plus className="h-4 w-4 mr-1" />
              Parameter
            </button>
              </div>
            </div>
            
            <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
              <HotTable
                ref={hotTableRef}
                settings={hotSettings}
                className="handsontable-container"
              />
            </div>
          </div>
        )}
      </div>

      {/* Corrective Actions and Comments - Collapsible on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Corrective Actions Taken */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('correctiveActions')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Corrective Actions Taken
            </h3>
            {expandedSections.correctiveActions ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          
          {expandedSections.correctiveActions && (
            <div className="p-4 sm:p-6 animate-slide-up">
              <textarea
                value={correctiveActionsTaken}
                onChange={(e) => {
                  setCorrectiveActionsTaken(e.target.value);
                  debouncedAutoSave();
                }}
                onPaste={(e) => handleImagePaste('correctiveActionsTaken', e)}
                className="input-field"
                rows={4}
                placeholder="Describe corrective actions taken... (paste images with Ctrl+V)"
              />
              
              {/* Image upload section */}
              <div className="mt-3">
                <input
                  type="file"
                  ref={imageInputRefs.correctiveActionsTaken}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleImageUpload('correctiveActionsTaken', e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => imageInputRefs.correctiveActionsTaken.current?.click()}
                  disabled={uploadingImage === 'correctiveActionsTaken'}
                  className="btn-secondary text-sm"
                >
                  {uploadingImage === 'correctiveActionsTaken' ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-1" />
                      Attach Image
                    </>
                  )}
                </button>
                <span className="ml-2 text-xs text-gray-500">or paste (Ctrl+V)</span>
              </div>
              
              {/* Display attached images */}
              {correctiveActionsTakenImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {correctiveActionsTakenImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img.data}
                        alt={img.filename || `Image ${idx + 1}`}
                        className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleImageDelete('correctiveActionsTaken', idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate rounded-b-lg">
                        {img.filename || `Image ${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Corrective Actions Needed */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('correctiveActionsNeeded')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <XCircle className="h-5 w-5 mr-2 text-orange-600" />
              Corrective Actions Needed
            </h3>
            {expandedSections.correctiveActionsNeeded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          
          {expandedSections.correctiveActionsNeeded && (
            <div className="p-4 sm:p-6 animate-slide-up">
              <textarea
                value={correctiveActionsNeeded}
                onChange={(e) => {
                  setCorrectiveActionsNeeded(e.target.value);
                  debouncedAutoSave();
                }}
                onPaste={(e) => handleImagePaste('correctiveActionsNeeded', e)}
                className="input-field"
                rows={4}
                placeholder="List corrective actions needed... (paste images with Ctrl+V)"
              />
              
              {/* Image upload section */}
              <div className="mt-3">
                <input
                  type="file"
                  ref={imageInputRefs.correctiveActionsNeeded}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleImageUpload('correctiveActionsNeeded', e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => imageInputRefs.correctiveActionsNeeded.current?.click()}
                  disabled={uploadingImage === 'correctiveActionsNeeded'}
                  className="btn-secondary text-sm"
                >
                  {uploadingImage === 'correctiveActionsNeeded' ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-1" />
                      Attach Image
                    </>
                  )}
                </button>
                <span className="ml-2 text-xs text-gray-500">or paste (Ctrl+V)</span>
              </div>
              
              {/* Display attached images */}
              {correctiveActionsNeededImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {correctiveActionsNeededImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img.data}
                        alt={img.filename || `Image ${idx + 1}`}
                        className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleImageDelete('correctiveActionsNeeded', idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate rounded-b-lg">
                        {img.filename || `Image ${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      {/* General Comments - Collapsible on Mobile */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6 overflow-hidden">
        <button
          onClick={() => toggleSection('comments')}
          className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            General Comments
          </h3>
          {expandedSections.comments ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {expandedSections.comments && (
          <div className="p-4 sm:p-6 animate-slide-up">
            <textarea
              value={generalComments}
              onChange={(e) => {
                setGeneralComments(e.target.value);
                debouncedAutoSave();
              }}
              onPaste={(e) => handleImagePaste('generalComments', e)}
              className="input-field"
              rows={4}
              placeholder="Add general observations, notes, or comments... (paste images with Ctrl+V)"
            />
            
            {/* Image upload section */}
            <div className="mt-3">
              <input
                type="file"
                ref={imageInputRefs.generalComments}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleImageUpload('generalComments', e.target.files[0]);
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => imageInputRefs.generalComments.current?.click()}
                disabled={uploadingImage === 'generalComments'}
                className="btn-secondary text-sm"
              >
                {uploadingImage === 'generalComments' ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Attach Image
                  </>
                )}
              </button>
              <span className="ml-2 text-xs text-gray-500">or paste (Ctrl+V)</span>
            </div>
            
            {/* Display attached images */}
            {generalCommentsImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {generalCommentsImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img.data}
                      alt={img.filename || `Image ${idx + 1}`}
                      className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleImageDelete('generalComments', idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate rounded-b-lg">
                      {img.filename || `Image ${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-2 z-40 shadow-lg">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm min-h-[44px]"
        >
          <Menu className="h-4 w-4" />
          Menu
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm min-h-[44px] disabled:opacity-50"
        >
          {saving ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Workbook
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="sm:hidden fixed inset-0 z-50 bg-white">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Workbook Actions</h2>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <button
              onClick={async () => {
                setShowMobileMenu(false);
                setShowHistory(true);
                setLoadingHistory(true);
                try {
                  const res = await axios.get(`/api/kpi-workbook/system/${systemId}/history`);
                  setHistoryItems(res.data.workbooks || []);
                } catch (e) {
                  toast.error('Failed to load history');
                } finally {
                  setLoadingHistory(false);
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg"
            >
              <History className="h-5 w-5 text-gray-600" />
              <span>View History</span>
            </button>
            <button
              onClick={async () => {
                setShowMobileMenu(false);
                setShowTrends(true);
                await fetchTrends(trendPeriod);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg"
            >
              <TrendingUp className="h-5 w-5 text-gray-600" />
              <span>View Trends</span>
            </button>
            <button
              onClick={async () => {
                setShowMobileMenu(false);
                if (!window.confirm('Clear all values and comments?')) return;
                try {
                  await axios.post(`/api/kpi-workbook/system/${systemId}/clear-values`);
                  toast.success('All values cleared');
                  await fetchWorkbook();
                } catch (error) {
                  toast.error('Failed to clear values');
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg text-red-600"
            >
              <Trash2 className="h-5 w-5" />
              <span>Clear All Values</span>
            </button>
            {lastSaved && (
              <div className="pt-4 border-t text-sm text-gray-500 text-center">
                Last saved: {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Parameter Modal */}
      {showParameterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowParameterModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Add New Parameter
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Common Parameter
                        </label>
                        <select
                          value={selectedCommonParameter}
                          onChange={(e) => {
                            setSelectedCommonParameter(e.target.value);
                            handleCommonParameterSelect(e.target.value);
                          }}
                          className="input-field"
                        >
                          <option value="">-- Select a common parameter or enter custom --</option>
                          {getAllCommonParameters().map((param) => (
                            <option key={param.name} value={param.name}>
                              {param.name} ({param.unit}) - {param.category}
                              {param.isCalculated ? ' [Calculated]' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="border-t pt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Parameter Name *
                          </label>
                          <input
                            type="text"
                            value={newParameter.name}
                            onChange={(e) => setNewParameter({...newParameter, name: e.target.value})}
                            className="input-field"
                            placeholder="e.g., Chloride"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit
                        </label>
                        <input
                          type="text"
                          value={newParameter.unit}
                          onChange={(e) => setNewParameter({...newParameter, unit: e.target.value})}
                          className="input-field"
                          placeholder="e.g., ppm, µS/cm, pH units"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          value={newParameter.category}
                          onChange={(e) => setNewParameter({...newParameter, category: e.target.value})}
                          className="input-field"
                        >
                          <option value="chemical">Chemical</option>
                          <option value="physical">Physical</option>
                          <option value="biological">Biological</option>
                          <option value="calculated">Calculated</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      {newParameter.isCalculated && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-blue-700">
                                This is a calculated parameter. Values will be automatically computed based on other parameters.
                                {newParameter.calculationType === 'conductivity_cycles' && ' (Tower/Basin ÷ Makeup Water Conductivity)'}
                                {newParameter.calculationType === 'hardness_cycles' && ' (Tower/Basin ÷ Makeup Water Hardness)'}
                                {newParameter.calculationType === 'tds_cycles' && ' (Tower/Basin ÷ Makeup Water TDS)'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Ranges removed from Add Parameter; use the Ranges modal to set per-location ranges after layout */}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleAddParameter}
                  className="btn-primary sm:ml-3"
                >
                  Add Parameter
                </button>
                <button
                  onClick={() => setShowParameterModal(false)}
                  className="btn-secondary mt-3 sm:mt-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sample Locations Modal */}
      {showSampleLocationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowSampleLocationModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Manage Sample Locations
                    </h3>
                    
                    <div className="space-y-4">
                      {editingSampleLocations.map((location, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="flex flex-col space-y-1">
                              <button
                                onClick={() => moveSampleLocationUp(index)}
                                disabled={index === 0}
                                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move up"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button
                                onClick={() => moveSampleLocationDown(index)}
                                disabled={index === editingSampleLocations.length - 1}
                                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move down"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                            <input
                              type="text"
                              value={location}
                              onChange={(e) => {
                                const newLocations = [...editingSampleLocations];
                                newLocations[index] = e.target.value;
                                setEditingSampleLocations(newLocations);
                              }}
                              className="input-field flex-1"
                              placeholder={`Sample Location ${index + 1}`}
                            />
                            <button
                              onClick={() => removeSampleLocation(index)}
                              className="p-2 text-red-500 hover:text-red-700"
                              disabled={editingSampleLocations.length <= 1}
                              title="Remove sample location"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Walchem Controller Serial Number (Optional)
                            </label>
                            <input
                              type="text"
                              value={wallchemControllers[index]?.controllerSerialNumber || ''}
                              onChange={(e) => {
                                const newControllers = [...wallchemControllers];
                                if (!newControllers[index]) {
                                  newControllers[index] = {};
                                }
                                newControllers[index].controllerSerialNumber = e.target.value.toUpperCase();
                                setWallchemControllers(newControllers);
                              }}
                              className="input-field w-full"
                              placeholder="Enter controller serial number (e.g., 2504221442)"
                              title="Enter the Walchem controller serial number for automatic alarm notifications"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Link this sample location to a Walchem controller for automatic alarm notifications
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      <button
                        onClick={addSampleLocation}
                        className="btn-secondary text-sm w-full"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Sample Location
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleUpdateSampleLocations}
                  className="btn-primary sm:ml-3"
                >
                  Update Sample Points
                </button>
                <button
                  onClick={() => setShowSampleLocationModal(false)}
                  className="btn-secondary mt-3 sm:mt-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
  )}

      {/* Edit Per-Location Ranges Modal */}
      {editingRanges && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setEditingRanges(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Per-Location Ranges</h3>
                      {editingRanges && workbook.parameters.find(p => p.name === editingRanges.parameter)?.locationRanges && 
                       Object.keys(workbook.parameters.find(p => p.name === editingRanges.parameter).locationRanges).length > 0 && (
                        <div className="flex items-center text-sm text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Custom ranges saved
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parameter</label>
                      <select
                        value={editingRanges.parameter}
                        onChange={(e) => {
                          const param = workbook.parameters.find(p => p.name === e.target.value);
                          setEditingRanges({ parameter: e.target.value, locationRanges: param?.locationRanges || {} });
                        }}
                        className="input-field"
                      >
                        {workbook.tableData?.map(r => r.parameter).filter(Boolean).map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Tabs for Green and Yellow */}
                    <div className="mb-4 border-b border-gray-200">
                      <nav className="-mb-px flex space-x-8">
                        <button
                          type="button"
                          onClick={() => setRangeTab('green')}
                          className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                            rangeTab === 'green'
                              ? 'border-green-500 text-green-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          Green Range (Optimal)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRangeTab('yellow')}
                          className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                            rangeTab === 'yellow'
                              ? 'border-yellow-500 text-yellow-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          Yellow Range (Warning)
                        </button>
                      </nav>
                    </div>

                    <div className="space-y-3">
                      {workbook.sampleLocations.map((loc, idx) => {
                        const key = `sample_${idx + 1}`;
                        const r = (editingRanges.locationRanges && typeof editingRanges.locationRanges === 'object') ? (editingRanges.locationRanges[key] || {}) : {};
                        
                        if (rangeTab === 'green') {
                          return (
                            <div key={key} className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600">{loc} Min</label>
                                <input type="number" value={r.min ?? ''} onChange={(e) => setEditingRanges(prev => ({
                                  ...prev,
                                  locationRanges: { ...prev.locationRanges, [key]: { ...prev.locationRanges[key], min: e.target.value ? parseFloat(e.target.value) : undefined } }
                                }))} className="input-field" placeholder="Green min" />
                              </div>

                              <div>
                                <label className="block text-xs text-gray-600">{loc} Max</label>
                                <input type="number" value={r.max ?? ''} onChange={(e) => setEditingRanges(prev => ({
                                  ...prev,
                                  locationRanges: { ...prev.locationRanges, [key]: { ...prev.locationRanges[key], max: e.target.value ? parseFloat(e.target.value) : undefined } }
                                }))} className="input-field" placeholder="Green max" />
                              </div>
                            </div>
                          );
                        } else {
                          // Yellow tab
                          return (
                            <div key={key} className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600">{loc} Yellow Min</label>
                                <input type="number" value={r.yellowMin ?? ''} onChange={(e) => setEditingRanges(prev => ({
                                  ...prev,
                                  locationRanges: { ...prev.locationRanges, [key]: { ...prev.locationRanges[key], yellowMin: e.target.value ? parseFloat(e.target.value) : undefined } }
                                }))} className="input-field" placeholder="Yellow min" />
                              </div>

                              <div>
                                <label className="block text-xs text-gray-600">{loc} Yellow Max</label>
                                <input type="number" value={r.yellowMax ?? ''} onChange={(e) => setEditingRanges(prev => ({
                                  ...prev,
                                  locationRanges: { ...prev.locationRanges, [key]: { ...prev.locationRanges[key], yellowMax: e.target.value ? parseFloat(e.target.value) : undefined } }
                                }))} className="input-field" placeholder="Yellow max" />
                              </div>
                            </div>
                          );
                        }
                      })}
                      
                      {/* Monitor via Walchem Report Checkbox */}
                      {(() => {
                        // Find controller serial for current location
                        // We need the index of the location
                        // Unfortunately workbook.sampleLocations doesn't give us the index easily if names are duplicate
                        // But here we are iterating in the modal.
                        // Wait, the loop above is iterating through ALL sampleLocations.
                        // We should probably show the checkbox PER location in that loop?
                        // Or is this modal for ONE parameter across all locations? Yes.
                        // So inside the map above, we can add the checkbox.
                        
                        return null;
                      })()}

                      <div className="mt-4 border-t pt-4">
                         <h4 className="text-sm font-medium text-gray-700 mb-2">Walchem Monitoring</h4>
                         <p className="text-xs text-gray-500 mb-3">
                           Parameters are automatically matched to Walchem controller data. If you need to adjust the matching, edit the system prompt on the Walchem Reports page.
                         </p>
                         <div className="space-y-2">
                           {workbook.sampleLocations.map((loc, idx) => {
                             const key = `sample_${idx + 1}`;
                             const controller = wallchemControllers.find(c => c.sampleLocationKey === key);
                             const hasController = controller && controller.controllerSerialNumber;
                             
                             if (!hasController) return null;
                             
                             return (
                               <div key={`monitor-${key}`} className="flex items-center text-xs text-gray-600">
                                 <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                 <span>{loc} is linked to controller {controller.controllerSerialNumber}</span>
                               </div>
                             );
                           })}
                           {/* Show message if no controllers linked */}
                           {!wallchemControllers.some(c => c.controllerSerialNumber) && (
                             <p className="text-xs text-gray-500 italic">
                               No Walchem controllers linked to sample locations. Go to "Sample Point" settings to link controllers.
                             </p>
                           )}
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:justify-between sm:items-center">
                <button
                  onClick={handleLoadDefaultRanges}
                  className="btn-secondary text-sm mb-3 sm:mb-0"
                  title="Reset all parameter ranges to default values"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Load Default Ranges
                </button>
                <div className="flex flex-col-reverse sm:flex-row sm:gap-3">
                  <button onClick={() => setEditingRanges(null)} className="btn-secondary mt-3 sm:mt-0">Cancel</button>
                  <button
                    onClick={handleSaveRanges}
                    className="btn-primary"
                  >
                    Save Ranges
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workbook Chatbot */}
      <WorkbookChatbot
        isOpen={showWorkbookChatbot}
        onClose={() => setShowWorkbookChatbot(false)}
        workbookData={workbook}
        systemData={system}
        customerData={customer}
      />

      {/* Report Editor */}
      <ReportEditor
        isOpen={showReportEditor}
        onClose={() => setShowReportEditor(false)}
        initialContent={reportHtmlContent}
        reportData={reportData}
        onFinalized={(finalReport) => {
          toast.success('Report has been finalized and saved!');
          setShowReportEditor(false);
        }}
      />

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowHistory(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Workbook History</h3>
                    {loadingHistory ? (
                      <div className="text-gray-500">Loading...</div>
                    ) : historyItems.length === 0 ? (
                      <div className="text-gray-500">No saved workbooks yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {historyItems.map((item) => (
                          <div key={item._id} className="flex items-center justify-between border rounded-lg p-3">
                            <div className="text-sm text-gray-700">
                              <div>
                                <span className="font-medium">Saved:</span> {item.savedAt ? new Date(item.savedAt).toLocaleString() : new Date(item.createdAt).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                Version: {item.workbookVersion || 'n/a'} • Visit: {item.serviceVisit?.date ? new Date(item.serviceVisit.date).toLocaleDateString() : 'n/a'}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={async () => {
                                  try {
                                    await axios.post(`/api/kpi-workbook/system/${systemId}/history/${item._id}/restore`);
                                    await fetchWorkbook();
                                    setShowHistory(false);
                                    toast.success('Snapshot opened');
                                  } catch (e) {
                                    toast.error('Failed to open snapshot');
                                  }
                                }}
                                className="btn-primary btn-sm"
                              >
                                Open
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await axios.post(`/api/kpi-workbook/system/${systemId}/history/${item._id}/restore`);
                                    await fetchWorkbook();
                                    setShowHistory(false);
                                    toast.success('Snapshot restored');
                                  } catch (e) {
                                    toast.error('Failed to restore snapshot');
                                  }
                                }}
                                className="btn-secondary btn-sm"
                              >
                                Restore as Current
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button onClick={() => setShowHistory(false)} className="btn-secondary sm:ml-3">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends Modal */}
      {showTrends && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowTrends(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="w-full">
                    <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      <TrendingUp className="h-5 w-5 inline mr-2 text-blue-600" />
                      {trendData?.isROTracking ? 'RO Performance Trends' : 'Parameter Trends'}
                    </h3>
                    <div className="flex items-center space-x-4">
                      <label className="text-sm text-gray-600">Time Period:</label>
                      <select
                        value={trendPeriod}
                        onChange={(e) => {
                          const newPeriod = parseInt(e.target.value);
                          setTrendPeriod(newPeriod);
                          fetchTrends(newPeriod);
                        }}
                        className="input-field w-auto"
                      >
                        <option value={3}>Quarter (3 months)</option>
                        <option value={6}>Half Year (6 months)</option>
                        <option value={9}>3/4 Year (9 months)</option>
                        <option value={12}>1 Year (12 months)</option>
                        <option value={18}>1.5 Years (18 months)</option>
                        <option value={24}>2 Years (24 months)</option>
                      </select>
                      <button
                        onClick={generateTrendReport}
                        disabled={generatingTrendReport || loadingTrends || !trendData}
                        className="btn-primary flex items-center"
                        title="Generate a report with trend charts and service comments"
                      >
                        {generatingTrendReport ? (
                          <LoadingSpinner size="sm" color="white" />
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Report
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {loadingTrends ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="lg" text="Loading trend data..." />
                    </div>
                  ) : !trendData || Object.keys(trendData.trendData || {}).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No historical data available for the selected period.</p>
                      <p className="text-sm mt-2">Save workbook data over time to see trends.</p>
                    </div>
                  ) : trendData?.isROTracking && trendData?.roGraphs ? (
                    // RO Tracking specific graphs
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {trendData.roGraphs.map((graphConfig, graphIdx) => {
                        // Get all dates from all series in this graph
                        const allDates = new Set();
                        graphConfig.series.forEach(seriesConfig => {
                          const paramData = trendData.trendData[seriesConfig.parameter];
                          if (paramData && paramData.series && paramData.series['sample_1']) {
                            paramData.series['sample_1'].data?.forEach(d => {
                              allDates.add(new Date(d.date).toLocaleDateString());
                            });
                          }
                        });

                        const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));
                        
                        if (sortedDates.length === 0) return null;
                        
                        // Build datasets for this graph
                        const datasets = graphConfig.series.map(seriesConfig => {
                          const paramData = trendData.trendData[seriesConfig.parameter];
                          if (!paramData || !paramData.series || !paramData.series['sample_1']) return null;

                          const seriesData = paramData.series['sample_1'];
                          if (!seriesData.data || seriesData.data.length === 0) return null;

                          const dataPoints = sortedDates.map(date => {
                            const point = seriesData.data.find(d => new Date(d.date).toLocaleDateString() === date);
                            return point ? point.y : null;
                          });

                          return {
                            label: seriesConfig.label,
                            data: dataPoints,
                            borderColor: seriesConfig.color,
                            backgroundColor: seriesConfig.color + '20',
                            tension: 0.1,
                            fill: false,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            yAxisID: seriesConfig.axis === 'y2' ? 'y2' : 'y'
                          };
                        }).filter(Boolean);

                        if (datasets.length === 0) return null;

                        const chartData = {
                          labels: sortedDates,
                          datasets
                        };

                        const chartOptions = {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: { 
                                font: { size: 10 },
                                padding: 10,
                                usePointStyle: true
                              }
                            },
                            title: {
                              display: true,
                              text: graphConfig.title,
                              font: { size: 13, weight: 'bold' }
                            },
                            tooltip: {
                              mode: 'index',
                              intersect: false
                            }
                          },
                          scales: {
                            x: {
                              display: true,
                              title: { display: false },
                              ticks: { font: { size: 9 } }
                            },
                            y: {
                              display: true,
                              position: 'left',
                              title: { 
                                display: true, 
                                text: graphConfig.yAxisLabel,
                                font: { size: 10 }
                              },
                              ticks: { font: { size: 9 } }
                            },
                            ...(graphConfig.type === 'dual-axis' && {
                              y2: {
                                display: true,
                                position: 'right',
                                title: { 
                                  display: true, 
                                  text: graphConfig.y2AxisLabel,
                                  font: { size: 10 }
                                },
                                ticks: { font: { size: 9 } },
                                grid: { drawOnChartArea: false }
                              }
                            })
                          },
                          interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                          }
                        };

                        return (
                          <div key={graphIdx} className="bg-gray-50 rounded-lg p-4 border border-gray-200" data-param-chart={graphConfig.title}>
                            <div className="h-64">
                              <Line data={chartData} options={chartOptions} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Regular parameter trends (non-RO systems)
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {Object.entries(trendData.trendData).map(([paramName, paramData]) => {
                        // Skip parameters with no data
                        const hasData = Object.values(paramData.series).some(s => s.data && s.data.length > 0);
                        if (!hasData) return null;

                        // Prepare chart data
                        const colors = [
                          'rgb(59, 130, 246)', // blue
                          'rgb(16, 185, 129)', // green
                          'rgb(245, 158, 11)', // amber
                          'rgb(239, 68, 68)',  // red
                          'rgb(139, 92, 246)', // purple
                          'rgb(236, 72, 153)', // pink
                        ];

                        const datasets = Object.entries(paramData.series)
                          .filter(([_, seriesData]) => seriesData.data && seriesData.data.length > 0)
                          .map(([sampleKey, seriesData], idx) => ({
                            label: seriesData.name,
                            data: seriesData.data.map(d => ({
                              x: new Date(d.date).toLocaleDateString(),
                              y: d.value
                            })),
                            borderColor: colors[idx % colors.length],
                            backgroundColor: colors[idx % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
                            tension: 0.3,
                            fill: false
                          }));

                        // Get all unique dates
                        const allDates = [...new Set(
                          Object.values(paramData.series)
                            .flatMap(s => s.data?.map(d => new Date(d.date).toLocaleDateString()) || [])
                        )].sort((a, b) => new Date(a) - new Date(b));

                        const chartData = {
                          labels: allDates,
                          datasets: datasets.map(ds => ({
                            ...ds,
                            data: allDates.map(date => {
                              const point = ds.data.find(d => d.x === date);
                              return point ? point.y : null;
                            })
                          }))
                        };

                        // Add target range lines if available
                        const range = paramData.targetRange || {};
                        const annotations = {};
                        if (typeof range.min === 'number') {
                          annotations.minLine = {
                            type: 'line',
                            yMin: range.min,
                            yMax: range.min,
                            borderColor: 'rgba(239, 68, 68, 0.5)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: { content: `Min: ${range.min}`, enabled: true }
                          };
                        }
                        if (typeof range.max === 'number') {
                          annotations.maxLine = {
                            type: 'line',
                            yMin: range.max,
                            yMax: range.max,
                            borderColor: 'rgba(239, 68, 68, 0.5)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: { content: `Max: ${range.max}`, enabled: true }
                          };
                        }

                        const chartOptions = {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: { font: { size: 11 } }
                            },
                            title: {
                              display: true,
                              text: `${paramName}${paramData.unit ? ` (${paramData.unit})` : ''}`,
                              font: { size: 14, weight: 'bold' }
                            },
                            tooltip: {
                              mode: 'index',
                              intersect: false
                            }
                          },
                          scales: {
                            x: {
                              display: true,
                              title: { display: true, text: 'Date' }
                            },
                            y: {
                              display: true,
                              title: { display: true, text: paramData.unit || 'Value' }
                            }
                          },
                          interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                          }
                        };

                        return (
                          <div key={paramName} className="bg-gray-50 rounded-lg p-4 border border-gray-200" data-param-chart={paramName}>
                            <div className="h-64">
                              <Line data={chartData} options={chartOptions} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {trendData && (
                    <div className="mt-4 text-sm text-gray-500 text-center">
                      Data points: {trendData.dataPoints || 0} snapshots in the last {trendPeriod} months
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button onClick={() => setShowTrends(false)} className="btn-secondary sm:ml-3">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default KpiWorkbook;

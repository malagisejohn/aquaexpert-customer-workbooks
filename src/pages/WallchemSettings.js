import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Settings,
  Mail,
  Plus,
  X,
  Save,
  ArrowLeft,
  User,
  Building2,
  Edit2,
  Send,
  Clock,
  Activity,
  AlertTriangle,
  TrendingUp,
  FileText,
  Bell,
  ChevronRight
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const TREND_RANGE_OPTIONS = [
  { value: '1d', label: '24h', description: 'Past 24 hours', days: 1 },
  { value: '3d', label: '3d', description: 'Past 3 days', days: 3 },
  { value: '7d', label: '7d', description: 'Past 7 days', days: 7 },
  { value: '30d', label: '30d', description: 'Past 30 days', days: 30 }
];

const PARAMETER_COLORS = [
  '#0ea5e9',
  '#22c55e',
  '#f97316',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
  '#facc15',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6'
];

const FLOW_TREND_KEY = '__flow_status';

const AI_STATUS_META = {
  GREEN: {
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    label: 'Green'
  },
  YELLOW: {
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    label: 'Yellow'
  },
  RED: {
    badge: 'bg-red-100 text-red-600',
    dot: 'bg-red-500',
    label: 'Red'
  }
};

const MANUAL_STATUS_OPTIONS = [
  { value: 'UNKNOWN', label: 'Not Set' },
  { value: 'GREEN', label: 'Green' },
  { value: 'YELLOW', label: 'Yellow' },
  { value: 'RED', label: 'Red' }
];

const FLOW_STATUS_META = {
  FLOW: {
    label: 'Flow',
    badge: 'bg-emerald-100 text-emerald-700'
  },
  NO_FLOW: {
    label: 'No Flow',
    badge: 'bg-red-100 text-red-700'
  },
  UNKNOWN: {
    label: 'Unknown',
    badge: 'bg-gray-100 text-gray-600'
  }
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const resolveStatusMeta = (status) => {
  if (!status || typeof status !== 'string') {
    return null;
  }
  return AI_STATUS_META[status.toUpperCase()] || null;
};

const resolveFlowStatusMeta = (status) => {
  if (!status || typeof status !== 'string') {
    return FLOW_STATUS_META.UNKNOWN;
  }
  return FLOW_STATUS_META[status.toUpperCase()] || FLOW_STATUS_META.UNKNOWN;
};

const normalizeManualStatus = (status) => {
  if (!status || typeof status !== 'string') {
    return 'UNKNOWN';
  }
  const normalized = status.toUpperCase();
  return ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'].includes(normalized)
    ? normalized
    : 'UNKNOWN';
};

const ReportFeedbackRow = React.memo(function ReportFeedbackRow({
  reportId,
  param,
  status,
  comment,
  onStatusChange,
  onCommentBlur
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start rounded-lg border border-gray-200 p-3">
      <div className="text-sm text-gray-900 font-medium flex items-center">
        <span
          className="mr-2 h-3 w-3 rounded-full"
          style={{ backgroundColor: param.color || '#2563eb' }}
        />
        {param.label}
        {param.unit ? (
          <span className="ml-1 text-xs text-gray-500">({param.unit})</span>
        ) : null}
      </div>
      <select
        value={normalizeManualStatus(status)}
        onChange={(e) => onStatusChange(param, normalizeManualStatus(e.target.value))}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
      >
        {MANUAL_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        key={`${reportId}-${param.key}-comment`}
        type="text"
        defaultValue={comment || ''}
        onBlur={(e) => onCommentBlur(param, e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        placeholder="Trendline note"
      />
    </div>
  );
});

const WallchemSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lastOpenedReportParamRef = useRef('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [systems, setSystems] = useState([]);
  const [selectedSystem, setSelectedSystem] = useState('');
  const [controllers, setControllers] = useState([]);
  const [selectedController, setSelectedController] = useState('');
  const [settings, setSettings] = useState(null);
  const [suggestedRecipients, setSuggestedRecipients] = useState([]);
  const [emailRecipients, setEmailRecipients] = useState([]);
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [, setReportPrompt] = useState(''); // Kept for legacy compatibility
  const [enabled, setEnabled] = useState(true);
  const [controllerDataLoading, setControllerDataLoading] = useState(false);
  const [additionalGuidance, setAdditionalGuidance] = useState('');
  const [overallManualStatus, setOverallManualStatus] = useState('UNKNOWN');
  const [overallManualComment, setOverallManualComment] = useState('');
  const [trendlineFeedback, setTrendlineFeedback] = useState({});
  const [generatedCriteria, setGeneratedCriteria] = useState('');
  const [editingFullPrompt, setEditingFullPrompt] = useState(false);
  const [fullPromptText, setFullPromptText] = useState('');
  const [refreshingMatch, setRefreshingMatch] = useState(false);

  useEffect(() => {
    // Reset or fetch prompt logic when settings change
    if (settings) {
        // For backward compatibility, if additionalGuidance is missing but reportPrompt exists 
        // and it's not the old default prompt, we might want to treat reportPrompt as additionalGuidance
        // OR we just use what we have.
        setAdditionalGuidance(settings.additionalGuidance || settings.reportPrompt || '');
    } else {
        setAdditionalGuidance('');
    }
  }, [settings]);

  useEffect(() => {
    // When a controller is selected, try to fetch the generated criteria preview
    // If no criteria exists, automatically trigger parameter matching
    const loadCriteria = async () => {
      if (!selectedSystem || !selectedController) {
        setGeneratedCriteria('');
        return;
      }
      try {
        const response = await axios.get(`/api/wallchem-settings/preview-criteria/${selectedSystem}/${selectedController}`);
        const criteria = response.data.criteria || '';
        setGeneratedCriteria(criteria);
        
        // Check if criteria contains "preview" which means matching hasn't happened
        const isPreview = criteria.includes('preview - will be refined');
        
        // If showing preview and we haven't attempted matching yet, trigger it automatically
        if (isPreview && settings && !settings.autoMatchingAttempted) {
          console.log('Preview criteria found, triggering parameter matching...');
          try {
            const matchResult = await axios.post(`/api/wallchem-settings/trigger-matching/${selectedSystem}/${selectedController}`);
            console.log('Parameter matching triggered:', matchResult.data);
            toast.success(`Matched ${matchResult.data.matched} parameters automatically`);
            
            // Reload criteria after matching
            const reloadResponse = await axios.get(`/api/wallchem-settings/preview-criteria/${selectedSystem}/${selectedController}`);
            setGeneratedCriteria(reloadResponse.data.criteria || '');
            
            // Reload settings to get updated autoMatchingAttempted flag
            await fetchSettings();
          } catch (matchError) {
            console.error('Auto-matching failed:', matchError);
            if (matchError.response?.status === 404) {
              console.log('No report data available yet, will match when first report arrives');
            } else {
              toast.error('Failed to auto-match parameters');
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load criteria preview:', err);
        setGeneratedCriteria('');
      }
    };
    loadCriteria();
  }, [selectedSystem, selectedController, settings?.autoMatchingAttempted]); // eslint-disable-line react-hooks/exhaustive-deps
  const [controllerDataError, setControllerDataError] = useState('');
  const [controllerReports, setControllerReports] = useState([]);
  const [latestReport, setLatestReport] = useState(null);
  const [availableParameters, setAvailableParameters] = useState([]);
  const [selectedParameters, setSelectedParameters] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [trendRange, setTrendRange] = useState('1d');
  
  // Recent reports feed
  const [recentReports, setRecentReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsTotalCount, setReportsTotalCount] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetailLoading, setReportDetailLoading] = useState(false);
  const [reportFeedback, setReportFeedback] = useState({
    overall: { status: 'UNKNOWN', comment: '' },
    trendlines: {}
  });
  const [reportFeedbackLoading, setReportFeedbackLoading] = useState(false);
  const [reportFeedbackSaving, setReportFeedbackSaving] = useState(false);
  const [reportFeedbackQuery, setReportFeedbackQuery] = useState('');
  const [reportFeedbackVisibleCount, setReportFeedbackVisibleCount] = useState(20);
  
  // Notification preferences
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  
  // Settings panel visibility
  const [showSettings, setShowSettings] = useState(false);

  const latestStatusMeta = resolveStatusMeta(latestReport?.aiSummary?.status);
  const latestStatusReason = latestReport?.aiSummary?.statusReason;
  const latestFlowMeta = resolveFlowStatusMeta(latestReport?.flowSummary?.currentStatus);
  const latestStatusIconClass = latestStatusMeta
    ? latestStatusMeta.dot.replace('bg-', 'text-')
    : 'text-blue-600';

  const getRangeWindow = React.useCallback((rangeValue) => {
    const option = TREND_RANGE_OPTIONS.find(opt => opt.value === rangeValue) || TREND_RANGE_OPTIONS[0];
    const end = new Date();
    const start = new Date(end.getTime() - option.days * 24 * 60 * 60 * 1000);
    return {
      start,
      end,
      startIso: start.toISOString(),
      endIso: end.toISOString()
    };
  }, []);

  const deriveParameterOptions = React.useCallback((reports) => {
    if (!reports || reports.length === 0) {
      return [];
    }

    const options = [];
    const seenKeys = new Set();

    // Prefer metadata if available
    const metadataReport = reports.find(report => report.csvMetadata?.columns?.length);

    if (metadataReport) {
      metadataReport.csvMetadata.columns.forEach((col, idx) => {
        const key = col.normalizedKey || col.originalName;
        if (!key || seenKeys.has(key)) {
          return;
        }
        if ((col.dataType || '').toLowerCase() !== 'numeric') {
          return;
        }
        seenKeys.add(key);
        options.push({
          key,
          label: col.originalName || key,
          unit: col.unit || null,
          color: PARAMETER_COLORS[idx % PARAMETER_COLORS.length]
        });
      });
    }

    if (options.length === 0) {
      // Fallback: inspect readings
      const keyList = new Map();
      reports.forEach(report => {
        report.readings?.forEach(reading => {
          Object.entries(reading.parameters || {}).forEach(([key, value]) => {
            if (!key || value === null || value === undefined) return;
            const numericValue = typeof value === 'number' ? value : parseFloat(value);
            if (!Number.isFinite(numericValue)) return;
            if (seenKeys.has(key)) return;
            if (!keyList.has(key)) {
              keyList.set(key, {
                key,
                label: key.replace(/_/g, ' ').toUpperCase(),
                unit: null
              });
            }
          });
        });
      });

      Array.from(keyList.values()).forEach((option, idx) => {
        seenKeys.add(option.key);
        options.push({
          ...option,
          color: PARAMETER_COLORS[idx % PARAMETER_COLORS.length]
        });
      });
    }

    const hasFlowData = reports.some(report =>
      (report.readings || []).some(reading =>
        ['FLOW', 'NO_FLOW'].includes((reading?.flowStatus || '').toUpperCase())
      )
    );

    if (hasFlowData && !options.some(option => option.key === FLOW_TREND_KEY)) {
      options.push({
        key: FLOW_TREND_KEY,
        label: 'Flow / No Flow',
        unit: null,
        color: '#0f766e'
      });
    }

    return options;
  }, []);

  const buildTrendSeries = React.useCallback((reports, params, rangeStart) => {
    if (!reports || reports.length === 0 || params.length === 0) {
      return [];
    }

    const rangeStartMs = rangeStart?.getTime?.() || 0;
    const points = [];

    reports.forEach(report => {
      report.readings?.forEach(reading => {
        if (!reading?.timestamp) return;
        const timestamp = new Date(reading.timestamp);
        if (Number.isNaN(timestamp.getTime())) return;
        if (rangeStartMs && timestamp.getTime() < rangeStartMs) return;

        const point = {
          timestamp: timestamp.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          iso: reading.timestamp
        };

        let hasAnyValue = false;

        params.forEach(paramKey => {
          let value = null;
          if (paramKey === FLOW_TREND_KEY) {
            const flowStatus = (reading.flowStatus || '').toUpperCase();
            if (flowStatus === 'FLOW') {
              value = 1;
            } else if (flowStatus === 'NO_FLOW') {
              value = 0;
            } else {
              value = null;
            }
          } else if (reading.parameters && Object.prototype.hasOwnProperty.call(reading.parameters, paramKey)) {
            value = reading.parameters[paramKey];
          }

          if (typeof value === 'string') {
            const parsed = parseFloat(value);
            value = Number.isNaN(parsed) ? null : parsed;
          }

          if (typeof value === 'number') {
            point[paramKey] = value;
            hasAnyValue = true;
          }
        });

        if (hasAnyValue) {
          points.push(point);
        }
      });
    });

    points.sort((a, b) => new Date(a.iso) - new Date(b.iso));
    return points.slice(-500);
  }, []);

  const normalizeEmail = (email) => (email || '').trim().toLowerCase();

  const buildUserRecipient = () => {
    if (!user?.email) {
      return null;
    }

    const trimmedEmail = user.email.trim();
    if (!trimmedEmail) {
      return null;
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();

    return {
      email: trimmedEmail,
      name: fullName || trimmedEmail,
      source: 'user'
    };
  };

  const sanitizeRecipients = (recipients) => {
    const sanitized = [];
    const seen = new Set();

    (recipients || []).forEach(({ email, name, source }) => {
      if (!email) {
        return;
      }

      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        return;
      }

      const normalized = normalizeEmail(trimmedEmail);
      if (seen.has(normalized)) {
        return;
      }

      const trimmedName = name ? name.trim() : '';
      sanitized.push({
        email: trimmedEmail,
        name: trimmedName || trimmedEmail,
        source: source === 'user' || source === 'customer' ? source : 'manual'
      });
      seen.add(normalized);
    });

    return sanitized;
  };

  const ensureUserRecipient = (recipients) => {
    const userRecipient = buildUserRecipient();

    if (!userRecipient) {
      return recipients;
    }

    const hasUser = recipients.some(
      (recipient) => normalizeEmail(recipient.email) === normalizeEmail(userRecipient.email)
    );

    if (hasUser) {
      return recipients;
    }

    return [...recipients, userRecipient];
  };

  const prepareRecipients = (recipients) => ensureUserRecipient(sanitizeRecipients(recipients));

  const buildManualStatusInputsPayload = React.useCallback(() => {
    const labelLookup = new Map(
      (availableParameters || []).map(param => [param.key, param.label || param.key])
    );

    const trendlines = Object.entries(trendlineFeedback || {})
      .map(([parameterKey, value]) => {
        const status = normalizeManualStatus(value?.status);
        const comment = (value?.comment || '').trim();
        const parameterLabel = (value?.parameterLabel || labelLookup.get(parameterKey) || parameterKey).trim();

        if (status === 'UNKNOWN' && !comment) {
          return null;
        }

        return {
          parameterKey,
          parameterLabel,
          status,
          comment
        };
      })
      .filter(Boolean);

    return {
      overall: {
        status: normalizeManualStatus(overallManualStatus),
        comment: (overallManualComment || '').trim()
      },
      trendlines
    };
  }, [availableParameters, overallManualComment, overallManualStatus, trendlineFeedback]);

  const buildReportFeedbackPayload = React.useCallback((parameterOptions = []) => {
    const labelLookup = new Map(
      (parameterOptions || []).map(param => [param.key, param.label || param.key])
    );

    const trendlines = Object.entries(reportFeedback.trendlines || {})
      .map(([parameterKey, value]) => {
        const status = normalizeManualStatus(value?.status);
        const comment = (value?.comment || '').trim();
        const parameterLabel = (value?.parameterLabel || labelLookup.get(parameterKey) || parameterKey).trim();

        if (status === 'UNKNOWN' && !comment) {
          return null;
        }

        return {
          parameterKey,
          parameterLabel,
          status,
          comment
        };
      })
      .filter(Boolean);

    return {
      overall: {
        status: normalizeManualStatus(reportFeedback.overall?.status),
        comment: (reportFeedback.overall?.comment || '').trim()
      },
      trendlines
    };
  }, [reportFeedback]);

  const defaultPrompt = `Status criteria for this controller:

- GREEN:

     -Conductivity between 1900-2100

     -ORP between 300-450

     -No alarms

- YELLOW:

     -Conductivity between 1500-1900

     -ORP between 250-300

     -No alarms

- RED:

     -Conductivity else

     -ORP else

     -Alarms.



Additional reporting guidance:

- Call out any parameters or alarms that carry extra weight for this site.

- Note seasonal, production, or maintenance context that affects interpretation.`;

  useEffect(() => {
    fetchCustomers();
    fetchRecentReports();
  }, []);
  
  const fetchRecentReports = async () => {
    try {
      setReportsLoading(true);
      const response = await axios.get('/api/wallchem/feed', {
        params: { limit: 20 }
      });
      setRecentReports(response.data.feed || []);
      setReportsTotalCount(response.data.totalCount || 0);
    } catch (error) {
      console.error('Error fetching recent reports:', error);
    } finally {
      setReportsLoading(false);
    }
  };
  
  const fetchReportDetail = async (reportId) => {
    try {
      setReportDetailLoading(true);
      setReportFeedbackLoading(true);
      setReportFeedbackQuery('');
      setReportFeedbackVisibleCount(20);
      const response = await axios.get(`/api/wallchem/report/${reportId}`);
      const report = response.data.report;
      setSelectedReport(report);

      const feedbackResponse = await axios.get(`/api/wallchem-settings/feedback/${reportId}`);
      const manualStatusInputs = feedbackResponse.data?.manualStatusInputs || {
        overall: { status: 'UNKNOWN', comment: '' },
        trendlines: []
      };

      const trendlineMap = {};
      (manualStatusInputs.trendlines || []).forEach((item) => {
        if (!item?.parameterKey) return;
        trendlineMap[item.parameterKey] = {
          parameterLabel: item.parameterLabel || item.parameterKey,
          status: normalizeManualStatus(item.status),
          comment: item.comment || ''
        };
      });

      setReportFeedback({
        overall: {
          status: normalizeManualStatus(manualStatusInputs.overall?.status),
          comment: manualStatusInputs.overall?.comment || ''
        },
        trendlines: trendlineMap
      });
    } catch (error) {
      console.error('Error fetching report detail:', error);
      toast.error('Failed to load report details');
      setReportFeedback({
        overall: { status: 'UNKNOWN', comment: '' },
        trendlines: {}
      });
    } finally {
      setReportDetailLoading(false);
      setReportFeedbackLoading(false);
    }
  };

  // Handle query parameters from notifications
  useEffect(() => {
    const systemParam = searchParams.get('system');
    const controllerParam = searchParams.get('controller');
    
    if (systemParam && systems.length > 0) {
      setSelectedSystem(systemParam);
    }
    if (controllerParam && controllers.length > 0) {
      setSelectedController(controllerParam.toUpperCase());
    }
  }, [searchParams, systems, controllers]);

  // Handle direct deep-link to a specific report modal
  useEffect(() => {
    const reportParam = searchParams.get('report');
    if (!reportParam || lastOpenedReportParamRef.current === reportParam) {
      return;
    }

    lastOpenedReportParamRef.current = reportParam;
    fetchReportDetail(reportParam);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedCustomer) {
      fetchSystems();
    }
  }, [selectedCustomer]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedSystem && systems.length > 0) {
      fetchControllers();
    }
  }, [selectedSystem, systems]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedController && selectedSystem) {
      fetchSettings();
    }
  }, [selectedController, selectedSystem]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedSystem || !selectedController) {
      setControllerReports([]);
      setLatestReport(null);
      setAvailableParameters([]);
      setSelectedParameters([]);
      setTrendData([]);
      setTrendlineFeedback({});
      setOverallManualStatus('UNKNOWN');
      setOverallManualComment('');
      return;
    }

    let isCancelled = false;

    const loadReports = async () => {
      setControllerDataLoading(true);
      setControllerDataError('');
      try {
        const { startIso, endIso } = getRangeWindow(trendRange);
        const response = await axios.get(`/api/wallchem/reports/${selectedSystem}`, {
          params: {
            startDate: startIso,
            endDate: endIso,
            limit: 1000
          }
        });

        if (isCancelled) return;

        const controllerSerial = (selectedController || '').toUpperCase();
        const allReports = Array.isArray(response.data?.reports) ? response.data.reports : [];
        const filtered = allReports
          .filter(report => (report.controllerSerialNumber || '').toUpperCase() === controllerSerial)
          .sort((a, b) => new Date(b.processedAt || 0) - new Date(a.processedAt || 0));

        setControllerReports(filtered);
        setLatestReport(filtered[0] || null);
      } catch (error) {
        if (isCancelled) return;
        console.error('Error loading controller reports:', error);
        setControllerReports([]);
        setLatestReport(null);
        setControllerDataError(error.response?.data?.message || 'Failed to load controller data');
      } finally {
        if (!isCancelled) {
          setControllerDataLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      isCancelled = true;
    };
  }, [selectedController, selectedSystem, trendRange, getRangeWindow]);

  useEffect(() => {
    if (!selectedController || controllerReports.length === 0) {
      setAvailableParameters([]);
      setSelectedParameters([]);
      return;
    }

    const options = deriveParameterOptions(controllerReports);
    setAvailableParameters(options);

    setSelectedParameters(prev => {
      const stillValid = prev.filter(param => options.some(option => option.key === param));
      const arraysEqual =
        stillValid.length === prev.length &&
        stillValid.every((param, index) => param === prev[index]);

      if (arraysEqual && stillValid.length > 0) {
        return prev;
      }

      if (stillValid.length > 0) {
        return stillValid;
      }

      if (options.length > 0) {
        return [options[0].key];
      }

      return [];
    });
  }, [controllerReports, selectedController, deriveParameterOptions]);

  useEffect(() => {
    if (!selectedController || availableParameters.length === 0) {
      return;
    }

    setTrendlineFeedback((prev) => {
      const next = { ...prev };
      availableParameters.forEach((param) => {
        if (!next[param.key]) {
          next[param.key] = {
            parameterLabel: param.label || param.key,
            status: 'UNKNOWN',
            comment: ''
          };
        } else if (!next[param.key].parameterLabel) {
          next[param.key] = {
            ...next[param.key],
            parameterLabel: param.label || param.key
          };
        }
      });
      return next;
    });
  }, [availableParameters, selectedController]);

  useEffect(() => {
    if (!selectedController || selectedParameters.length === 0 || controllerReports.length === 0) {
      setTrendData([]);
      return;
    }

    const { start } = getRangeWindow(trendRange);
    const points = buildTrendSeries(controllerReports, selectedParameters, start);
    setTrendData(points);
  }, [controllerReports, selectedController, selectedParameters, trendRange, getRangeWindow, buildTrendSeries]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data.customers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
      setLoading(false);
    }
  };

  const fetchSystems = async () => {
    try {
      const response = await axios.get(`/api/customers/${selectedCustomer}/systems`);
      const allSystems = response.data.systems || [];
      
      // Filter to only show systems that have Walchem controllers configured
      const systemsWithWalchem = allSystems.filter(system => 
        system.wallchemControllers && system.wallchemControllers.length > 0
      );
      
      setSystems(systemsWithWalchem);
      
      if (systemsWithWalchem.length === 0) {
        toast.error('No systems found with Walchem controllers configured');
      }
    } catch (error) {
      console.error('Error fetching systems:', error);
      toast.error('Failed to load systems');
    }
  };

  const fetchControllers = async () => {
    try {
      // Find the selected system - use String() to ensure proper comparison
      const system = systems.find(s => String(s._id) === String(selectedSystem));
      
      if (!system) {
        setControllers([]);
        return;
      }
      
      // Extract controllers from the system's wallchemControllers configuration
      const configuredControllers = system.wallchemControllers
        .filter(controller => controller.controllerSerialNumber && controller.controllerSerialNumber.trim() !== '')
        .map(controller => controller.controllerSerialNumber);
      
      setControllers(configuredControllers);
      
      if (configuredControllers.length === 0) {
        toast.error('No Walchem controllers configured for this system');
      }
    } catch (error) {
      console.error('Error fetching controllers:', error);
      toast.error('Failed to load controllers');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`/api/wallchem-settings/system/${selectedSystem}`);
      const { settings: allSettings, suggestedRecipients: suggested } = response.data;
      
      // Find settings for selected controller
      const controllerSettings = allSettings.find(
        s => s.controllerSerialNumber === selectedController
      );

      if (controllerSettings) {
        setSettings(controllerSettings);
        setEmailRecipients(prepareRecipients(controllerSettings.emailRecipients || []));
        setReportPrompt(controllerSettings.reportPrompt || defaultPrompt);
        setEnabled(controllerSettings.enabled !== false);
        setOverallManualStatus(normalizeManualStatus(controllerSettings.manualStatusInputs?.overall?.status));
        setOverallManualComment(controllerSettings.manualStatusInputs?.overall?.comment || '');
        const feedbackByKey = {};
        (controllerSettings.manualStatusInputs?.trendlines || []).forEach((item) => {
          if (!item?.parameterKey) return;
          feedbackByKey[item.parameterKey] = {
            parameterLabel: item.parameterLabel || item.parameterKey,
            status: normalizeManualStatus(item.status),
            comment: item.comment || ''
          };
        });
        setTrendlineFeedback(feedbackByKey);
        // Load notification preferences
        setNotifyEmail(controllerSettings.notificationPreferences?.email !== false);
        setNotifyPush(controllerSettings.notificationPreferences?.push !== false);
      } else {
        // No existing settings - set defaults
        setSettings(null);
        setEmailRecipients(prepareRecipients([]));
        setReportPrompt(defaultPrompt);
        setEnabled(true);
        setOverallManualStatus('UNKNOWN');
        setOverallManualComment('');
        setTrendlineFeedback({});
        setNotifyEmail(true);
        setNotifyPush(true);
      }

      setSuggestedRecipients(suggested || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const addSuggestedRecipient = (recipient) => {
    // Check if already added
    if (emailRecipients.some(r => normalizeEmail(r.email) === normalizeEmail(recipient.email))) {
      toast.error('Recipient already added');
      return;
    }

    setEmailRecipients(prev => prepareRecipients([...prev, recipient]));
  };

  const addManualRecipient = () => {
    if (!manualEmail) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(manualEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check if already added
    if (emailRecipients.some(r => normalizeEmail(r.email) === normalizeEmail(manualEmail))) {
      toast.error('Recipient already added');
      return;
    }

    setEmailRecipients(prev =>
      prepareRecipients([
        ...prev,
        {
          email: manualEmail,
          name: manualName || manualEmail,
          source: 'manual'
        }
      ])
    );

    setManualEmail('');
    setManualName('');
  };

  const removeRecipient = (email) => {
    if (normalizeEmail(email) === normalizeEmail(user?.email)) {
      toast.error('Your email address is required for Walchem report notifications');
      return;
    }

    setEmailRecipients(prev =>
      sanitizeRecipients(prev.filter(r => normalizeEmail(r.email) !== normalizeEmail(email)))
    );
  };

  const handleSave = async () => {
    if (!selectedCustomer || !selectedSystem || !selectedController) {
      toast.error('Please select customer, system, and controller');
      return;
    }

    if (emailRecipients.length === 0) {
      toast.error('Please add at least one email recipient');
      return;
    }

    const preparedRecipients = prepareRecipients(emailRecipients);
    if (preparedRecipients.length === 0) {
      toast.error('Please add at least one valid email recipient');
      return;
    }

    setSaving(true);
    try {
      // If user edited the full prompt, use that instead of just additionalGuidance
      const promptToSave = editingFullPrompt ? fullPromptText.trim() : additionalGuidance.trim();
      const manualStatusInputs = buildManualStatusInputsPayload();
      
      await axios.post('/api/wallchem-settings', {
        controllerSerialNumber: selectedController,
        systemId: selectedSystem,
        customerId: selectedCustomer,
        emailRecipients: preparedRecipients,
        reportPrompt: promptToSave, // For legacy support
        additionalGuidance: promptToSave,
        manualStatusInputs,
        enabled,
        notificationPreferences: {
          email: notifyEmail,
          push: notifyPush
        }
      });

      toast.success('Settings saved successfully');
      setEditingFullPrompt(false); // Exit edit mode after saving
      fetchSettings(); // Reload settings
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!selectedCustomer || !selectedSystem || !selectedController) {
      toast.error('Please select customer, system, and controller');
      return;
    }

    // Only require recipients if email notifications are enabled
    if (notifyEmail && emailRecipients.length === 0) {
      toast.error('Please add at least one email recipient to send test to');
      return;
    }

    // Check if any notification method is enabled
    if (!notifyEmail && !notifyPush) {
      toast.error('Enable email or push notifications to send a test report');
      return;
    }

    const preparedRecipients = prepareRecipients(emailRecipients);
    if (notifyEmail && preparedRecipients.length === 0) {
      toast.error('Please add at least one valid email recipient to send test to');
      return;
    }

    setSendingTest(true);
    try {
      const manualStatusInputs = buildManualStatusInputsPayload();
      const response = await axios.post('/api/wallchem-settings/test', {
        controllerSerialNumber: selectedController,
        systemId: selectedSystem,
        customerId: selectedCustomer,
        emailRecipients: preparedRecipients,
        reportPrompt: additionalGuidance.trim(), // legacy
        additionalGuidance: additionalGuidance.trim(),
        manualStatusInputs
      });

      toast.success(response.data.message);
    } catch (error) {
      console.error('Error sending test report:', error);
      toast.error(error.response?.data?.message || 'Failed to send test report');
    } finally {
      setSendingTest(false);
    }
  };

  const handleRefreshMatching = async () => {
    if (!selectedSystem || !selectedController) {
      toast.error('Please select a system and controller');
      return;
    }

    setRefreshingMatch(true);
    try {
      const matchResult = await axios.post(`/api/wallchem-settings/trigger-matching/${selectedSystem}/${selectedController}`);
      console.log('Manual parameter matching:', matchResult.data);
      toast.success(`Successfully matched ${matchResult.data.matched} parameters`);
      
      if (matchResult.data.unmatched && matchResult.data.unmatched.length > 0) {
        toast.error(`${matchResult.data.unmatched.length} parameters could not be matched`);
      }
      
      // Reload criteria after matching
      const reloadResponse = await axios.get(`/api/wallchem-settings/preview-criteria/${selectedSystem}/${selectedController}`);
      setGeneratedCriteria(reloadResponse.data.criteria || '');
      
      // Reload settings
      await fetchSettings();
    } catch (error) {
      console.error('Manual matching failed:', error);
      if (error.response?.status === 404) {
        toast.error('No report data available for this controller');
      } else {
        toast.error(error.response?.data?.message || 'Failed to match parameters');
      }
    } finally {
      setRefreshingMatch(false);
    }
  };

  const handleSaveReportFeedback = async (parameterOptions = []) => {
    if (!selectedReport?._id) {
      toast.error('No report selected');
      return;
    }

    setReportFeedbackSaving(true);
    try {
      const manualStatusInputs = buildReportFeedbackPayload(parameterOptions);

      const response = await axios.patch(
        `/api/wallchem-settings/feedback/${selectedReport._id}`,
        { manualStatusInputs }
      );

      const savedInputs = response.data?.manualStatusInputs || manualStatusInputs;
      const trendlineMap = {};
      (savedInputs.trendlines || []).forEach((item) => {
        if (!item?.parameterKey) return;
        trendlineMap[item.parameterKey] = {
          parameterLabel: item.parameterLabel || item.parameterKey,
          status: normalizeManualStatus(item.status),
          comment: item.comment || ''
        };
      });

      setReportFeedback({
        overall: {
          status: normalizeManualStatus(savedInputs.overall?.status),
          comment: savedInputs.overall?.comment || ''
        },
        trendlines: trendlineMap
      });
      setOverallManualStatus(normalizeManualStatus(savedInputs.overall?.status));
      setOverallManualComment(savedInputs.overall?.comment || '');
      setTrendlineFeedback(trendlineMap);
      setSettings((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          manualStatusInputs: savedInputs
        };
      });

      setSelectedReport((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          aiSummary: {
            ...(prev.aiSummary || {}),
            operatorFeedbackSnapshot: savedInputs
          }
        };
      });

      toast.success('Feedback saved');
    } catch (error) {
      console.error('Error saving report feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to save report feedback');
    } finally {
      setReportFeedbackSaving(false);
    }
  };

  const handleReportTrendlineStatusChange = React.useCallback((param, status) => {
    setReportFeedback((prev) => ({
      ...prev,
      trendlines: {
        ...(prev.trendlines || {}),
        [param.key]: {
          ...(prev.trendlines?.[param.key] || {}),
          parameterLabel: param.label || param.key,
          status: normalizeManualStatus(status),
          comment: prev.trendlines?.[param.key]?.comment || ''
        }
      }
    }));
  }, []);

  const handleReportTrendlineCommentBlur = React.useCallback((param, comment) => {
    setReportFeedback((prev) => {
      const existing = prev.trendlines?.[param.key] || {};
      const nextComment = (comment || '').trim();
      if ((existing.comment || '') === nextComment && existing.parameterLabel === (param.label || param.key)) {
        return prev;
      }

      return {
        ...prev,
        trendlines: {
          ...(prev.trendlines || {}),
          [param.key]: {
            ...existing,
            parameterLabel: param.label || param.key,
            status: normalizeManualStatus(existing.status),
            comment: nextComment
          }
        }
      };
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  const aiStatusStyles = {
    GREEN: {
      badge: 'bg-emerald-100 text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Green'
    },
    YELLOW: {
      badge: 'bg-amber-100 text-amber-700',
      dot: 'bg-amber-500',
      label: 'Yellow'
    },
    RED: {
      badge: 'bg-red-100 text-red-700',
      dot: 'bg-red-500',
      label: 'Red'
    }
  };

  // Extract numeric parameters from report for charting
  const getReportChartData = (report) => {
    if (!report?.readings || report.readings.length === 0) {
      return { chartData: [], parameters: [] };
    }

    // Get numeric parameters from csvMetadata or readings
    const numericParams = new Map();
    
    // Try csvMetadata first
    if (report.csvMetadata?.columns?.length) {
      report.csvMetadata.columns.forEach((col, idx) => {
        if (col.dataType === 'numeric' && col.normalizedKey) {
          numericParams.set(col.normalizedKey, {
            key: col.normalizedKey,
            label: col.originalName || col.normalizedKey,
            unit: col.unit || null,
            color: PARAMETER_COLORS[idx % PARAMETER_COLORS.length]
          });
        }
      });
    }
    
    // Fallback: scan readings for numeric values
    if (numericParams.size === 0) {
      let colorIdx = 0;
      report.readings.forEach(reading => {
        if (reading.parameters) {
          Object.entries(reading.parameters).forEach(([key, value]) => {
            if (typeof value === 'number' && !numericParams.has(key)) {
              numericParams.set(key, {
                key,
                label: key.replace(/_/g, ' ').toUpperCase(),
                unit: null,
                color: PARAMETER_COLORS[colorIdx % PARAMETER_COLORS.length]
              });
              colorIdx++;
            }
          });
        }
      });
    }

    // Build chart data points
    const hasFlowData = report.readings.some(reading =>
      ['FLOW', 'NO_FLOW'].includes((reading?.flowStatus || '').toUpperCase())
    );

    if (hasFlowData && !numericParams.has(FLOW_TREND_KEY)) {
      numericParams.set(FLOW_TREND_KEY, {
        key: FLOW_TREND_KEY,
        label: 'Flow / No Flow',
        unit: null,
        color: '#0f766e'
      });
    }

    const chartData = report.readings
      .filter(r => r.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(reading => {
        const point = {
          timestamp: new Date(reading.timestamp).toLocaleString([], { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          alarm: reading.alarm === 'On' ? 1 : 0
        };
        
        numericParams.forEach((param, key) => {
          if (key === FLOW_TREND_KEY) {
            const flowStatus = (reading.flowStatus || '').toUpperCase();
            if (flowStatus === 'FLOW') {
              point[key] = 1;
            } else if (flowStatus === 'NO_FLOW') {
              point[key] = 0;
            }
            return;
          }

          const numericValue = reading.parameters?.[key];
          if (typeof numericValue === 'number' && Number.isFinite(numericValue)) {
            point[key] = numericValue;
          }
        });
        
        return point;
      });

    const parametersWithData = Array.from(numericParams.values()).filter((param) =>
      chartData.some((point) => typeof point[param.key] === 'number' && Number.isFinite(point[param.key]))
    );

    return {
      chartData,
      parameters: parametersWithData
    };
  };

  const renderReportDetailModal = () => {
    if (!selectedReport) return null;

    const statusMeta = selectedReport.aiSummary?.status 
      ? aiStatusStyles[selectedReport.aiSummary.status.toUpperCase()] 
      : null;
    const flowMeta = resolveFlowStatusMeta(selectedReport.flowSummary?.currentStatus);
    const mlInsights = selectedReport.aiSummary?.mlInsights || null;
    const trendSignals = Array.isArray(selectedReport.aiSummary?.trendSignalsSnapshot)
      ? selectedReport.aiSummary.trendSignalsSnapshot
      : [];
    const operatorFeedback = selectedReport.aiSummary?.operatorFeedbackSnapshot || {};
    const operatorOverall = operatorFeedback?.overall || { status: 'UNKNOWN', comment: '' };
    const operatorTrendlines = Array.isArray(operatorFeedback?.trendlines)
      ? operatorFeedback.trendlines
      : [];
    const notableRsiSignals = trendSignals
      .filter((signal) => signal?.rsiSignal && !['NEUTRAL', 'UNKNOWN'].includes(signal.rsiSignal))
      .slice(0, 6);
    const operatorTrendlineOverrides = operatorTrendlines
      .filter((item) => normalizeManualStatus(item?.status) !== 'UNKNOWN' || (item?.comment || '').trim())
      .slice(0, 6);

    const { chartData, parameters } = getReportChartData(selectedReport);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div className="text-white">
              <h2 className="text-xl font-semibold">Controller Report</h2>
              <p className="text-blue-100 text-sm">Automated Analysis</p>
            </div>
            <button 
              onClick={() => setSelectedReport(null)}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {reportDetailLoading && (
              <div className="mb-4 text-sm text-gray-500">
                Loading report details...
              </div>
            )}
            {/* Status Badge */}
            {statusMeta && (
              <div className={`flex items-center gap-2 p-4 rounded-lg border mb-6 ${
                selectedReport.aiSummary?.status === 'GREEN' ? 'bg-emerald-50 border-emerald-200' :
                selectedReport.aiSummary?.status === 'YELLOW' ? 'bg-amber-50 border-amber-200' :
                'bg-red-50 border-red-200'
              }`}>
                <span className={`h-3 w-3 rounded-full ${statusMeta.dot}`} />
                <span className={`font-semibold ${
                  selectedReport.aiSummary?.status === 'GREEN' ? 'text-emerald-700' :
                  selectedReport.aiSummary?.status === 'YELLOW' ? 'text-amber-700' :
                  'text-red-700'
                }`}>
                  Overall Status: {statusMeta.label}
                </span>
                {selectedReport.aiSummary?.statusReason && (
                  <span className="text-gray-600 text-sm ml-2">
                    — {selectedReport.aiSummary.statusReason}
                  </span>
                )}
              </div>
            )}
            <div className="mb-6">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${flowMeta.badge}`}>
                Flow Status: {flowMeta.label}
              </span>
              {typeof selectedReport.flowSummary?.noFlowPercentage === 'number' && (
                <span className="ml-2 text-xs text-gray-500">
                  No-flow readings: {selectedReport.flowSummary.noFlowPercentage.toFixed(1)}%
                </span>
              )}
            </div>

            {(mlInsights || notableRsiSignals.length > 0 || operatorTrendlineOverrides.length > 0 || normalizeManualStatus(operatorOverall.status) !== 'UNKNOWN' || operatorOverall.comment) && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-indigo-800 mb-3">ML Rationale</h3>

                {mlInsights && (
                  <div className="mb-3 text-sm text-indigo-900">
                    <span className="font-medium">Recommended status:</span>{' '}
                    {mlInsights.recommendedStatus || 'UNKNOWN'}
                    {typeof mlInsights.severityScore === 'number' ? ` (score ${mlInsights.severityScore})` : ''}
                  </div>
                )}

                {Array.isArray(mlInsights?.reasons) && mlInsights.reasons.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">Primary Signals</p>
                    <div className="space-y-1">
                      {mlInsights.reasons.slice(0, 8).map((reason, idx) => (
                        <p key={`${reason}-${idx}`} className="text-sm text-indigo-900">- {reason}</p>
                      ))}
                    </div>
                  </div>
                )}

                {notableRsiSignals.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">RSI Signals</p>
                    <div className="space-y-1">
                      {notableRsiSignals.map((signal) => (
                        <p key={signal.key} className="text-sm text-indigo-900">
                          - {signal.name}: RSI {signal.rsi14} ({signal.rsiSignal})
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {(normalizeManualStatus(operatorOverall.status) !== 'UNKNOWN' || operatorOverall.comment || operatorTrendlineOverrides.length > 0) && (
                  <div>
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">Operator Inputs Used</p>
                    <div className="space-y-1">
                      {(normalizeManualStatus(operatorOverall.status) !== 'UNKNOWN' || operatorOverall.comment) && (
                        <p className="text-sm text-indigo-900">
                          - Overall: {normalizeManualStatus(operatorOverall.status)}
                          {operatorOverall.comment ? ` - ${operatorOverall.comment}` : ''}
                        </p>
                      )}
                      {operatorTrendlineOverrides.map((item, idx) => (
                        <p key={`${item.parameterKey || idx}-${idx}`} className="text-sm text-indigo-900">
                          - {item.parameterLabel || item.parameterKey}: {normalizeManualStatus(item.status)}
                          {item.comment ? ` - ${item.comment}` : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* System Info */}
            <div className="bg-gray-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-700 mb-3">System Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600 font-medium">Customer:</span>
                  <span className="text-gray-900">{selectedReport.customerId?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600 font-medium">System:</span>
                  <span className="text-gray-900">{selectedReport.systemId?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600 font-medium">Controller:</span>
                  <span className="text-gray-900">{selectedReport.controllerSerialNumber}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600 font-medium">Sample Location:</span>
                  <span className="text-gray-900">{selectedReport.sampleLocationName}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-600 font-medium">Report Date:</span>
                  <span className="text-gray-900">{formatDateTime(selectedReport.processedAt)}</span>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            {selectedReport.aiSummary?.summaryMarkdown && (
              <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
                <h3 className="font-semibold text-blue-700 mb-3">AI Analysis</h3>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {selectedReport.aiSummary.summaryMarkdown.replace(/^##\s+/gm, '')}
                </div>
              </div>
            )}

            {/* Data Visualizations */}
            {chartData.length > 0 && parameters.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-blue-700 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Data Visualizations
                </h3>
                
                {/* Render a chart for each numeric parameter */}
                <div className="space-y-6">
                  {parameters.slice(0, 6).map((param) => (
                    <div key={param.key} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <span 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: param.color }}
                        />
                        {param.label}
                        {param.unit && <span className="text-gray-500 ml-1">({param.unit})</span>}
                      </h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="timestamp" 
                              tick={{ fontSize: 10 }} 
                              minTickGap={30}
                              stroke="#9ca3af"
                            />
                            <YAxis 
                              tick={{ fontSize: 10 }} 
                              stroke="#9ca3af"
                              domain={param.key === FLOW_TREND_KEY ? [0, 1] : ['auto', 'auto']}
                              ticks={param.key === FLOW_TREND_KEY ? [0, 1] : undefined}
                              tickFormatter={param.key === FLOW_TREND_KEY ? (value) => (value === 1 ? 'Flow' : 'No Flow') : undefined}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}
                              formatter={(value) => [
                                param.key === FLOW_TREND_KEY
                                  ? (Number(value) >= 0.5 ? 'Flow' : 'No Flow')
                                  : (typeof value === 'number' ? value.toFixed(2) : value),
                                param.label
                              ]}
                            />
                            <Line
                              type="monotone"
                              dataKey={param.key}
                              stroke={param.color}
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
                
                {parameters.length > 6 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Showing first 6 parameters. {parameters.length - 6} more available.
                  </p>
                )}
              </div>
            )}

            {/* Reading Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Report Metadata</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Readings:</span>
                  <span className="ml-2 font-medium">{selectedReport.readings?.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Alarms:</span>
                  <span className={`ml-2 font-medium ${selectedReport.alarmSummary?.hasAlarms ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedReport.alarmSummary?.alarmCount || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Flow status:</span>
                  <span className="ml-2 font-medium">{flowMeta.label}</span>
                </div>
                <div>
                  <span className="text-gray-600">No-flow %:</span>
                  <span className="ml-2 font-medium">
                    {typeof selectedReport.flowSummary?.noFlowPercentage === 'number'
                      ? `${selectedReport.flowSummary.noFlowPercentage.toFixed(1)}%`
                      : '0.0%'}
                  </span>
                </div>
                {selectedReport.emailMetadata?.receivedAt && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Email Received:</span>
                    <span className="ml-2 font-medium">{formatDateTime(selectedReport.emailMetadata.receivedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Report Feedback (Used for ML)</h3>
                <button
                  type="button"
                  onClick={() => handleSaveReportFeedback(parameters)}
                  disabled={reportFeedbackSaving || reportFeedbackLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
                >
                  {reportFeedbackSaving ? 'Saving...' : 'Save Feedback'}
                </button>
              </div>

              {reportFeedbackLoading ? (
                <div className="py-6">
                  <LoadingSpinner size="sm" text="Loading feedback..." />
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-5">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Overall Status</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select
                        value={normalizeManualStatus(reportFeedback.overall?.status)}
                        onChange={(e) => {
                          const status = normalizeManualStatus(e.target.value);
                          setReportFeedback((prev) => ({
                            ...prev,
                            overall: {
                              ...(prev.overall || {}),
                              status
                            }
                          }));
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                      >
                        {MANUAL_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={reportFeedback.overall?.comment || ''}
                        onChange={(e) => {
                          const comment = e.target.value;
                          setReportFeedback((prev) => ({
                            ...prev,
                            overall: {
                              ...(prev.overall || {}),
                              status: normalizeManualStatus(prev.overall?.status),
                              comment
                            }
                          }));
                        }}
                        rows={2}
                        className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Overall notes for this report"
                      />
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Trendline Feedback</h4>
                  {parameters.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      No numeric trendlines available for feedback in this report.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const normalizedQuery = reportFeedbackQuery.trim().toLowerCase();
                        const filteredParameters = normalizedQuery
                          ? parameters.filter((param) => (param.label || param.key).toLowerCase().includes(normalizedQuery))
                          : parameters;
                        const visibleParameters = filteredParameters.slice(0, reportFeedbackVisibleCount);

                        return (
                          <>
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <input
                                type="text"
                                value={reportFeedbackQuery}
                                onChange={(e) => {
                                  setReportFeedbackQuery(e.target.value);
                                  setReportFeedbackVisibleCount(20);
                                }}
                                className="w-full md:max-w-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="Filter parameters..."
                              />
                              <p className="text-xs text-gray-500">
                                Showing {visibleParameters.length} of {filteredParameters.length} parameter{filteredParameters.length === 1 ? '' : 's'}
                              </p>
                            </div>

                            {visibleParameters.map((param) => {
                              const feedback = reportFeedback.trendlines?.[param.key] || {
                                status: 'UNKNOWN',
                                comment: '',
                                parameterLabel: param.label || param.key
                              };

                              return (
                                <ReportFeedbackRow
                                  key={`${selectedReport?._id}-${param.key}`}
                                  reportId={selectedReport?._id}
                                  param={param}
                                  status={feedback.status}
                                  comment={feedback.comment}
                                  onStatusChange={handleReportTrendlineStatusChange}
                                  onCommentBlur={handleReportTrendlineCommentBlur}
                                />
                              );
                            })}

                            {filteredParameters.length > reportFeedbackVisibleCount && (
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => setReportFeedbackVisibleCount((prev) => prev + 20)}
                                  className="px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50"
                                >
                                  Show 20 more
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Report Detail Modal */}
      {selectedReport && renderReportDetailModal()}

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Walchem Reports</h1>
              <p className="text-gray-600 mt-1">View automated controller reports and AI analysis</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showSettings 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Configure</span>
          </button>
        </div>
      </div>

      {/* Recent Reports Feed */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
          </div>
          {reportsTotalCount > 0 && (
            <span className="text-sm text-gray-500">{reportsTotalCount} total reports</span>
          )}
        </div>
        
        {reportsLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" text="Loading reports..." />
          </div>
        ) : recentReports.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {(() => {
              // Helper to check if a date is today
              const isToday = (dateStr) => {
                if (!dateStr) return false;
                const date = new Date(dateStr);
                const today = new Date();
                return date.toDateString() === today.toDateString();
              };
              
              // Find the index where today ends and earlier begins
              const todayEndIndex = recentReports.findIndex((report, idx) => {
                const currentIsToday = isToday(report.processedAt);
                // Look for first non-today report after we've seen today reports
                if (!currentIsToday && idx > 0 && isToday(recentReports[idx - 1]?.processedAt)) {
                  return true;
                }
                return false;
              });
              
              const hasTodayReports = recentReports.some(r => isToday(r.processedAt));
              const hasOlderReports = recentReports.some(r => !isToday(r.processedAt));
              
              return recentReports.map((report, index) => {
                const statusKey = typeof report.aiStatus === 'string' ? report.aiStatus.toUpperCase() : null;
                const statusMeta = statusKey ? aiStatusStyles[statusKey] : null;
                const flowMeta = resolveFlowStatusMeta(report.flowStatus);
                
                // Show "Today" divider between the last today report and first older report
                const showTodayDivider = hasTodayReports && hasOlderReports && index === todayEndIndex;
                
                return (
                  <React.Fragment key={report.id}>
                    {showTodayDivider && (
                      <div className="py-2 -mx-6 px-6 bg-gradient-to-r from-blue-50 to-transparent border-t border-blue-200">
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                          <div className="flex-1 h-px bg-blue-200" />
                          <span>Today</span>
                          <div className="flex-1 h-px bg-blue-200" />
                        </div>
                      </div>
                    )}
                    <div 
                      className="py-4 hover:bg-gray-50 -mx-6 px-6 cursor-pointer transition-colors"
                      onClick={() => fetchReportDetail(report.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 truncate">
                              {report.customerName 
                                ? `${report.customerName} • ${report.systemName || 'Unknown system'}`
                                : (report.systemName || 'Unknown system')}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            Controller {report.controllerSerialNumber}
                            {report.sampleLocationName ? ` • ${report.sampleLocationName}` : ''}
                          </p>
                          <div className="mt-2 flex items-center text-xs text-gray-500 space-x-3">
                            <span className="inline-flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDateTime(report.processedAt)}
                            </span>
                          </div>
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${flowMeta.badge}`}>
                              {flowMeta.label}
                            </span>
                          </div>
                          {report.aiStatusReason && (
                            <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                              {report.aiStatusReason}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {statusMeta ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusMeta.badge}`}>
                              <span className={`mr-2 h-2 w-2 rounded-full ${statusMeta.dot}`} />
                              {statusMeta.label}
                            </span>
                          ) : report.hasAlarms ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Alarms
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <Activity className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              });
            })()}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No Walchem reports yet</p>
            <p className="text-sm">Reports will appear here when data is received from controllers</p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setShowSettings(false)}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <Settings className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Controller Settings</h2>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Selection */}
                <div className="bg-gray-50 rounded-lg p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Select Controller</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Customer Select */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer
                      </label>
                      <select
                        value={selectedCustomer}
                        onChange={(e) => {
                          setSelectedCustomer(e.target.value);
                          setSelectedSystem('');
                          setSelectedController('');
                          setSelectedParameters([]);
                          setControllerReports([]);
                          setLatestReport(null);
                          setTrendData([]);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">Select customer...</option>
                        {customers.map(customer => (
                          <option key={customer._id} value={customer._id}>
                            {customer.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* System Select */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        System
                      </label>
                      <select
                        value={selectedSystem}
                        onChange={(e) => {
                          setSelectedSystem(e.target.value);
                          setSelectedController('');
                          setSelectedParameters([]);
                          setControllerReports([]);
                          setLatestReport(null);
                          setTrendData([]);
                        }}
                        disabled={!selectedCustomer}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 bg-white"
                      >
                        <option value="">Select system...</option>
                        {systems.map(system => (
                          <option key={system._id} value={system._id}>
                            {system.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Controller Select */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Controller
                      </label>
                      <select
                        value={selectedController}
                        onChange={(e) => {
                          setSelectedController(e.target.value);
                          setSelectedParameters([]);
                          setTrendRange('1d');
                        }}
                        disabled={!selectedSystem}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 bg-white"
                      >
                        <option value="">Select controller...</option>
                        {controllers.map(controller => (
                          <option key={controller} value={controller}>
                            {controller}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

          {/* Settings Form */}
          {selectedController && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Last Email Report</h2>
                    <p className="text-sm text-gray-600">
                      Review the most recent automated send and the controller data snapshot it used.
                    </p>
                  </div>
                  {controllerDataLoading ? (
                    <div className="flex items-center text-sm text-gray-500">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Loading data...</span>
                    </div>
                  ) : latestReport ? (
                    latestStatusMeta ? (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${latestStatusMeta.badge}`}>
                        <span className={`mr-2 h-2 w-2 rounded-full ${latestStatusMeta.dot}`} />
                        {latestStatusMeta.label} Status
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <Activity className="h-4 w-4 mr-1" />
                        Status pending
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <Activity className="h-4 w-4 mr-1" />
                      Awaiting controller data
                    </span>
                  )}
                </div>
            {controllerDataError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {controllerDataError}
              </div>
            ) : (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Last email sent</p>
                      <p className="text-sm text-gray-600">
                        {settings?.lastReportSent
                          ? formatDateTime(settings.lastReportSent)
                          : 'No automated emails have been sent yet.'}
                      </p>
                    </div>
                  </div>
                  {latestStatusReason && (
                    <div className="flex items-start space-x-3">
                      <Activity className={`h-5 w-5 mt-1 ${latestStatusIconClass}`} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Status reason</p>
                        <p className="text-sm text-gray-600">
                          {latestStatusReason}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Recipients</p>
                      {emailRecipients.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {emailRecipients.map((recipient, idx) => (
                            <span
                              key={`${recipient.email}-${idx}`}
                              className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                            >
                              {recipient.name || recipient.email}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          Add recipients to enable automated delivery.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Total emails sent</p>
                      <p className="text-sm text-gray-600">{settings?.reportCount || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  {latestReport ? (
                    <div className="space-y-3 text-sm text-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">Dataset processed</span>
                        <span>{formatDateTime(latestReport.processedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Controller email received</span>
                        <span>{formatDateTime(latestReport.emailMetadata?.receivedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Readings ingested</span>
                        <span>{latestReport.readings?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>AI status</span>
                        <span>
                          {latestStatusMeta ? latestStatusMeta.label : 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Flow status</span>
                        <span>{latestFlowMeta.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>No-flow percentage</span>
                        <span>
                          {typeof latestReport.flowSummary?.noFlowPercentage === 'number'
                            ? `${latestReport.flowSummary.noFlowPercentage.toFixed(1)}%`
                            : '0.0%'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      No controller data was found for the selected range. Try expanding the time window
                      to include older reports.
                    </div>
                  )}
                </div>
              </div>
            )}
            {latestReport?.aiSummary?.summaryMarkdown && (
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">AI Summary</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {latestReport.aiSummary.summaryMarkdown.replace(/^##\s+/gm, '')}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Controller Trends</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {TREND_RANGE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTrendRange(option.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      trendRange === option.value
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Trends default to the past 24 hours. Use the quick filters to review up to 30 days of history.
            </p>
            {controllerDataError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {controllerDataError}
              </div>
            ) : controllerDataLoading && trendData.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="lg" text="Loading controller data..." />
              </div>
            ) : trendData.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-600">
                No readings found for this controller in the selected window.
              </div>
            ) : (
              <div className="mt-6">
                {(() => {
                  const visibleSelectedParameters = selectedParameters.filter((paramKey) =>
                    trendData.some((point) => typeof point[paramKey] === 'number' && Number.isFinite(point[paramKey]))
                  );

                  return (
                    <>
                      {visibleSelectedParameters.length === 0 ? (
                        <div className="h-80 flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-600">
                          No data points available for selected parameter(s) in this time window.
                        </div>
                      ) : (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="timestamp" minTickGap={12} tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip
                                formatter={(value, key) => {
                                  const param = availableParameters.find(item => item.key === key);
                                  const label = param ? `${param.label}${param.unit ? ` (${param.unit})` : ''}` : key;
                                  if (key === FLOW_TREND_KEY) {
                                    return [value >= 0.5 ? 'Flow' : 'No Flow', label];
                                  }
                                  if (typeof value === 'number') {
                                    return [Number(value).toFixed(2), label];
                                  }
                                  return [value, label];
                                }}
                              />
                              <Legend />
                              {visibleSelectedParameters.map(paramKey => {
                                const param = availableParameters.find(item => item.key === paramKey);
                                if (!param) return null;
                                return (
                                  <Line
                                    key={paramKey}
                                    type="monotone"
                                    dataKey={paramKey}
                                    stroke={param.color || '#2563eb'}
                                    strokeWidth={2}
                                    dot={false}
                                    name={`${param.label}${param.unit ? ` (${param.unit})` : ''}`}
                                    isAnimationActive={false}
                                  />
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Parameters</h3>
                  {availableParameters.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      No numeric parameters detected for this controller.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {availableParameters.map(param => (
                          <label
                            key={param.key}
                            className="flex items-center space-x-2 text-sm text-gray-700"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedParameters.includes(param.key)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedParameters(prev =>
                                    Array.from(new Set([...prev, param.key]))
                                  );
                                } else {
                                  setSelectedParameters(prev =>
                                    prev.filter(key => key !== param.key)
                                  );
                                }
                              }}
                            />
                            <span className="flex items-center">
                              <span
                                className="mr-2 h-3 w-3 rounded-full"
                                style={{ backgroundColor: param.color || '#2563eb' }}
                              />
                              {param.label}
                              {param.unit ? (
                                <span className="ml-1 text-xs text-gray-500">({param.unit})</span>
                              ) : null}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                        <span>
                          {selectedParameters.length}{' '}
                          parameter{selectedParameters.length === 1 ? '' : 's'} selected
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedParameters(availableParameters.map(param => param.key))
                            }
                            className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            disabled={availableParameters.length === 0}
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedParameters([])}
                            className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Enable/Disable */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Automated Reports</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Enable or disable automated report generation for this controller
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {/* Notification Preferences */}
            {enabled && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center mb-4">
                  <Bell className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-sm font-semibold text-gray-900">Notification Preferences</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Choose how you want to be notified when a new report is generated
                </p>
                
                <div className="space-y-3">
                  {/* Email Notifications */}
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-xs text-gray-500">Send report via email to all recipients</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  
                  {/* Push Notifications */}
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition">
                    <div className="flex items-center">
                      <Bell className="h-5 w-5 text-gray-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">Push Notifications</p>
                        <p className="text-xs text-gray-500">Get in-app notifications for new reports</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyPush}
                      onChange={(e) => setNotifyPush(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
                
                {!notifyEmail && !notifyPush && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      You won't receive any notifications. Reports will still be generated and stored.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Recipients */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Mail className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Email Recipients</h2>
            </div>

            {/* Suggested Recipients */}
            {suggestedRecipients.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Suggested Recipients</h3>
                <div className="space-y-2">
                  {suggestedRecipients.map((recipient, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center">
                        {recipient.source === 'user' ? (
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                        ) : (
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{recipient.name}</p>
                          <p className="text-xs text-gray-500">{recipient.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => addSuggestedRecipient(recipient)}
                        disabled={emailRecipients.some(r => r.email === recipient.email)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg disabled:text-gray-400 disabled:hover:bg-transparent"
                      >
                        {emailRecipients.some(r => r.email === recipient.email) ? 'Added' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Add */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Add Custom Recipient</h3>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Name (optional)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addManualRecipient}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </button>
              </div>
            </div>

            {/* Selected Recipients */}
            {emailRecipients.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Selected Recipients ({emailRecipients.length})
                </h3>
                <div className="space-y-2">
                  {emailRecipients.map((recipient, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-blue-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{recipient.name}</p>
                          <p className="text-xs text-gray-500">{recipient.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeRecipient(recipient.email)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Prompt */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Edit2 className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">AI Report Prompt</h2>
              </div>
              <div className="flex items-center space-x-2">
                {generatedCriteria && (
                  <>
                    <button
                      onClick={handleRefreshMatching}
                      disabled={refreshingMatch}
                      className="text-sm text-gray-600 hover:text-gray-700 font-medium flex items-center disabled:opacity-50"
                      title="Re-run AI parameter matching"
                    >
                      {refreshingMatch ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span className="ml-1">Matching...</span>
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4 mr-1" />
                          Refresh Parameters
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (editingFullPrompt) {
                          // Save the edited prompt back to additionalGuidance
                          setAdditionalGuidance(fullPromptText);
                          setEditingFullPrompt(false);
                        } else {
                          // Switch to edit mode with combined prompt
                          setFullPromptText(generatedCriteria + '\n\n' + (additionalGuidance || ''));
                          setEditingFullPrompt(true);
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {editingFullPrompt ? 'Done Editing' : 'Edit Full Prompt'}
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {editingFullPrompt ? (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Full System Prompt</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Edit the complete prompt that will be sent to the AI. Changes will be saved when you click "Save Settings".
                </p>
                <textarea
                  value={fullPromptText}
                  onChange={(e) => setFullPromptText(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs"
                  placeholder="Enter the complete system prompt..."
                />
              </div>
            ) : (
              <>
                {/* Generated Criteria Preview */}
                {generatedCriteria ? (
                  <div className="mb-6">
                     <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                       <Activity className="h-4 w-4 mr-1 text-green-600" />
                       Auto-Generated Monitoring Criteria
                     </h3>
                     <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                       {generatedCriteria}
                     </div>
                     <p className="text-xs text-gray-500 mt-1">
                       These criteria are automatically generated from matched parameters in your KPI Workbook. Parameters are matched using AI when the first report is received.
                     </p>
                  </div>
                ) : (
                  <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      No criteria generated yet. Parameter matching will occur automatically when the first report is received, or you can wait for it to load.
                    </p>
                  </div>
                )}

                <h3 className="text-sm font-medium text-gray-700 mb-2">Additional Reporting Guidance</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add specific instructions, seasonal notes, or context for the AI to include in the report summary.
                </p>
                <textarea
                  value={additionalGuidance}
                  onChange={(e) => setAdditionalGuidance(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="e.g., Pay special attention to conductivity spikes during the afternoon shift..."
                />
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleSendTest}
              disabled={sendingTest || (!notifyEmail && !notifyPush) || (notifyEmail && emailRecipients.length === 0)}
              className="px-6 py-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 flex items-center disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {sendingTest ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Sending Test...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send Test Report
                </>
              )}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center disabled:bg-gray-400"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Settings
                </>
              )}
              </button>
            </div>
          </div>
          )}

          {/* Instructions */}
          {!selectedController && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">How It Works</h3>
              <ul className="space-y-2 text-blue-800">
                <li>• Select a customer, system, and controller to configure automated reports</li>
                <li>• Add email recipients who will receive the reports</li>
                <li>• Customize the AI prompt to control how reports are generated</li>
                <li>• Use "Send Test Report" to preview what recipients will receive</li>
                <li>• Save settings to enable automatic reports each time new data arrives</li>
              </ul>
            </div>
          )}

                {/* Test Report Info */}
                {selectedController && emailRecipients.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      <strong>💡 Tip:</strong> Use the "Send Test Report" button to preview how your reports will look with the current settings. 
                      The test will use the most recent data from this controller and send to all configured recipients. 
                      You can test as many times as you want before saving.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WallchemSettings;


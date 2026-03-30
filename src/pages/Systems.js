import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import UpgradePrompt from '../components/common/UpgradePrompt';
import ReportEditor from '../components/reports/ReportEditor';
import { 
  Plus, 
  Search, 
  Settings, 
  Thermometer, 
  Droplets, 
  Droplet,
  Zap, 
  Recycle,
  Eye, 
  Edit, 
  Trash2,
  ArrowLeft,
  Factory,
  Gauge,
  Package,
  FileText,
  Upload,
  X,
  Crown,
  Download,
  Check,
  GripVertical,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const formatModifiedDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const SYSTEM_TYPES = {
  pretreatment: {
    name: 'Pretreatment',
    icon: Droplet,
    color: 'teal',
    description: 'Pretreatment systems (e.g., softeners, RO, city & well water)'
  },
  cooling_tower: {
    name: 'Cooling Tower',
    icon: Thermometer,
    color: 'blue',
    description: 'Industrial cooling tower systems for heat rejection'
  },
  steam_boiler: {
    name: 'Steam Boiler',
    icon: Zap,
    color: 'red',
    description: 'Steam generation systems for industrial processes'
  },
  closed_loop: {
    name: 'Closed Loop',
    icon: Recycle,
    color: 'green',
    description: 'Closed loop heating/cooling systems'
  },
  waste_water: {
    name: 'Waste Water',
    icon: Droplets,
    color: 'purple',
    description: 'Waste water treatment systems'
  }
};

const Systems = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [systems, setSystems] = useState([]);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSystemType, setSelectedSystemType] = useState('');
  const [expandedSystem, setExpandedSystem] = useState(null);
  const [usage, setUsage] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Report generation state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [allCustomerSystems, setAllCustomerSystems] = useState([]);
  const [loadingAllSystems, setLoadingAllSystems] = useState(false);
  const [operatorCopyMap, setOperatorCopyMap] = useState({});
  const [workbookSourceBySystemId, setWorkbookSourceBySystemId] = useState({});
  const autoOpenReportRef = useRef(false);
  
  // Report editor state
  const [showReportEditor, setShowReportEditor] = useState(false);
  const [reportHtmlContent, setReportHtmlContent] = useState('');
  const [reportData, setReportData] = useState(null);
  
  // Check if user is an operator account
  const isOperator = user?.accountType === 'customer';

  useEffect(() => {
    if (customerId) {
      fetchCustomerAndSystems();
    } else {
      fetchAllSystems();
    }
    fetchUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, search]);

  const fetchUsage = async () => {
    try {
      const response = await axios.get('/api/subscriptions/usage');
      setUsage(response.data);
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const fetchCustomerAndSystems = async (page = 1) => {
    try {
      setLoading(true);
      // Fetch customer details and systems
      const [customerResponse, systemsResponse] = await Promise.all([
        axios.get(`/api/customers/${customerId}`),
        axios.get(`/api/systems`, {
          params: {
            customerId,
            page,
            limit: 10,
            search,
            excludeOperatorSystems: true // Exclude operator-owned systems from enterprise view
          }
        })
      ]);
      
      setCustomer(customerResponse.data?.customer || customerResponse.data);
      setSystems(systemsResponse.data.systems);
      setPagination(systemsResponse.data.pagination);
    } catch (error) {
      console.error('Error fetching customer and systems:', error);
      toast.error('Failed to load systems');
      if (error.response?.status === 404) {
        navigate('/customers');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSystems = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/systems', {
        params: {
          page,
          limit: 10,
          search
        }
      });
      
      setSystems(response.data.systems);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching systems:', error);
      toast.error('Failed to load systems');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleAddSystem = (systemType) => {
    // Check if at system limit
    if (usage && usage.atLimit?.systems) {
      setShowUpgradeModal(true);
      return;
    }
    setSelectedSystemType(systemType);
    setShowAddModal(true);
  };

  const handleDeleteSystem = async (systemId) => {
    if (!window.confirm('Are you sure you want to delete this system?')) {
      return;
    }

    try {
      await axios.delete(`/api/systems/${systemId}`);
      toast.success('System deleted successfully');
      if (customerId) {
        fetchCustomerAndSystems();
      } else {
        fetchAllSystems();
      }
    } catch (error) {
      console.error('Error deleting system:', error);
      toast.error(error.response?.data?.message || 'Failed to delete system');
    }
  };

  const getSystemTypeConfig = (type) => {
    return SYSTEM_TYPES[type] || {
      name: type,
      icon: Settings,
      color: 'gray',
      description: 'Water treatment system'
    };
  };

  // Report generation handlers
  const handleToggleSystemSelection = (system) => {
    setSelectedSystems(prev => {
      const isSelected = prev.some(s => s._id === system._id);
      if (isSelected) {
        setWorkbookSourceBySystemId(current => {
          const next = { ...current };
          delete next[system._id];
          return next;
        });
        return prev.filter(s => s._id !== system._id);
      } else {
        setWorkbookSourceBySystemId(current => ({
          ...current,
          [system._id]: current[system._id] || 'enterprise'
        }));
        return [...prev, system];
      }
    });
  };

  const handleMoveSystemUp = (index) => {
    if (index === 0) return;
    setSelectedSystems(prev => {
      const newList = [...prev];
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
      return newList;
    });
  };

  const handleMoveSystemDown = (index) => {
    if (index === selectedSystems.length - 1) return;
    setSelectedSystems(prev => {
      const newList = [...prev];
      [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
      return newList;
    });
  };

  // Fetch ALL systems for this customer when opening the report modal
  const handleOpenReportModal = useCallback(async () => {
    setShowReportModal(true);
    setLoadingAllSystems(true);
    try {
      // Fetch all systems without pagination limit
      const response = await axios.get(`/api/systems`, {
        params: {
          customerId,
          limit: 1000, // Get all systems
          excludeOperatorSystems: true,
          includeWorkbookUpdatedAt: true
        }
      });
      setAllCustomerSystems(response.data.systems);

      // Fetch operator-copy mapping so we can offer "Operator workbook" only when it exists
      try {
        const ids = (response.data.systems || []).map(s => s._id);
        if (ids.length > 0) {
          const mapRes = await axios.post('/api/systems/operator-copy-map', {
            customerId,
            systemIds: ids
          });
          setOperatorCopyMap(mapRes.data?.map || {});
        } else {
          setOperatorCopyMap({});
        }
      } catch (mapErr) {
        console.warn('Failed to load operator copy map:', mapErr?.message || mapErr);
        setOperatorCopyMap({});
      }
    } catch (error) {
      console.error('Error fetching all systems:', error);
      toast.error('Failed to load all systems');
      // Fall back to currently loaded systems
      setAllCustomerSystems(systems);
      setOperatorCopyMap({});
    } finally {
      setLoadingAllSystems(false);
    }
  }, [customerId, systems]);

  useEffect(() => {
    if (!customerId) return;
    if (autoOpenReportRef.current) return;

    const params = new URLSearchParams(location.search);
    const shouldOpen = params.get('generateReport') === '1';
    if (shouldOpen) {
      autoOpenReportRef.current = true;
      handleOpenReportModal();
    }
  }, [customerId, location.search, handleOpenReportModal]);

  const handleGenerateCustomerReport = async () => {
    if (selectedSystems.length === 0) {
      toast.error('Please select at least one system');
      return;
    }

    try {
      setGeneratingReport(true);
      toast.loading('Generating report...', { id: 'generating-report' });
      
      const systemsPayload = selectedSystems.map(s => ({
        systemId: s._id,
        workbookSource: workbookSourceBySystemId[s._id] || 'enterprise',
        operatorSystemId: operatorCopyMap[s._id] || null
      }));
      
      // Generate HTML for the in-browser editor
      const response = await axios.post('/api/systems/generate-customer-report-html', {
        systems: systemsPayload,
        customerId
      }, {
        timeout: 600000 // 10 minute timeout for large reports (15+ systems)
      });

      const { html, reportData: data } = response.data;
      
      // Set up report data for editor
      setReportData(data);
      setReportHtmlContent(html);
      
      toast.dismiss('generating-report');
      toast.success('Report ready for editing');
      
      // Close the selection modal and open the editor
      setShowReportModal(false);
      setSelectedSystems([]);
      setWorkbookSourceBySystemId({});
      setOperatorCopyMap({});
      setShowReportEditor(true);
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast.dismiss('generating-report');
      toast.error(error.response?.data?.message || error.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading systems..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Upgrade Banner - show when at system limit */}
      {usage && usage.atLimit?.systems && !isOperator && (
        <div className="mb-4">
          <UpgradePrompt
            type="systems"
            currentUsage={usage.usage?.systems}
            limit={usage.limits?.maxSystems}
            variant="banner"
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            {isOperator ? (
              // Operator view - simplified, no back to customers
              <>
                <h1 className="text-2xl font-bold text-gray-900">My Systems</h1>
                <p className="text-gray-600 mt-1">
                  Your water treatment systems
                </p>
              </>
            ) : customerId && customer ? (
              // Enterprise view with customer context
              <>
                <div className="flex items-center mb-2">
                  <button
                    onClick={() => navigate('/customers')}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors mr-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {customer.name} Systems
                  </h1>
                </div>
                <p className="text-gray-600">
                  Manage water treatment systems for {customer.name}
                </p>
                {/* Usage indicator for free users */}
                {usage && !usage.isUnlimited && (
                  <p className="text-sm text-gray-500 mt-1">
                    <span className={usage.atLimit?.systems ? 'text-red-600 font-medium' : ''}>
                      {usage.usage?.systems || 0} / {usage.limits?.maxSystems} systems used
                    </span>
                    {usage.atLimit?.systems && (
                      <span className="ml-2 text-red-600">• Limit reached</span>
                    )}
                  </p>
                )}
              </>
            ) : (
              // Enterprise view - all systems
              <>
                <h1 className="text-2xl font-bold text-gray-900">All Systems</h1>
                <p className="text-gray-600 mt-1">
                  Manage all water treatment systems across customers
                </p>
                {/* Usage indicator for free users */}
                {usage && !usage.isUnlimited && (
                  <p className="text-sm text-gray-500 mt-1">
                    <span className={usage.atLimit?.systems ? 'text-red-600 font-medium' : ''}>
                      {usage.usage?.systems || 0} / {usage.limits?.maxSystems} systems used
                    </span>
                    {usage.atLimit?.systems && (
                      <span className="ml-2 text-red-600">• Limit reached</span>
                    )}
                  </p>
                )}
              </>
            )}
          </div>
          
          {/* Add System and Generate Report buttons - only for enterprise users with a customer context */}
          {customerId && !isOperator && (
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              {/* Generate Report Button - only show if there are systems */}
              {(systems.length > 0 || pagination.total > 0) && (
                <button
                  onClick={handleOpenReportModal}
                  className="btn-secondary flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </button>
              )}
              
              {usage && usage.atLimit?.systems ? (
                <button
                  onClick={() => navigate('/subscription')}
                  className="btn-primary bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Add More
                </button>
              ) : (
                <SystemTypeSelector onSelect={handleAddSystem} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search systems..."
                value={search}
                onChange={handleSearch}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Systems list */}
      {systems.length > 0 ? (
        <div className="space-y-4">
          {systems.map((system) => {
            const typeConfig = getSystemTypeConfig(system.type);
            const IconComponent = typeConfig.icon;
            
            return (
              <div 
                key={system._id} 
                className="card hover:shadow-medium transition-shadow"
              >
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex items-start space-x-4 flex-1 cursor-pointer"
                      onClick={() => setExpandedSystem(expandedSystem === system._id ? null : system._id)}
                    >
                      <div className={`p-3 bg-${typeConfig.color}-100 rounded-lg`}>
                        <IconComponent className={`h-6 w-6 text-${typeConfig.color}-600`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {system.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {typeConfig.name}
                        </p>
                        {system.description && (
                          <p className="text-gray-600 mb-2">
                            {system.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          {system.location && (
                            <span className="flex items-center">
                              <Factory className="h-4 w-4 mr-1" />
                              {system.location}
                            </span>
                          )}
                          {(system.totalControllerCount !== undefined || system.controllerCount !== undefined) && (
                            <span className="flex items-center">
                              <Gauge className="h-4 w-4 mr-1" />
                              {system.totalControllerCount || system.controllerCount || 0} controllers
                            </span>
                          )}
                          {/* Hide customer name for operators - they only have one customer */}
                          {!customerId && !isOperator && (system.customerId?.name || system.customer?.name) && (
                            <span className="flex items-center">
                              <Settings className="h-4 w-4 mr-1" />
                              {system.customerId?.name || system.customer?.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/systems/${system._id}`);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {/* Hide edit/delete for operators - they can only view */}
                      {!isOperator && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/systems/${system._id}/edit`);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit system"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSystem(system._id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete system"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons when system is expanded */}
                  {expandedSystem === system._id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => navigate(`/systems/${system._id}/workbook`)}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          KPI Workbook
                        </button>
                        <button
                          onClick={() => navigate(`/systems/${system._id}/inventory`)}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Inventory
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {system.tags && system.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {system.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No systems found</h3>
          <p className="text-gray-600 mb-6">
            {search 
              ? 'Try adjusting your search terms' 
              : isOperator
                ? 'No systems have been assigned to your account yet'
                : customerId 
                  ? 'Get started by adding your first system'
                  : 'No systems available'
            }
          </p>
          {!search && customerId && !isOperator && (
            <SystemTypeSelector onSelect={handleAddSystem} />
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {Math.min((pagination.current - 1) * 10 + 1, pagination.total)} to{' '}
            {Math.min(pagination.current * 10, pagination.total)} of {pagination.total} systems
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => customerId ? fetchCustomerAndSystems(pagination.current - 1) : fetchAllSystems(pagination.current - 1)}
              disabled={pagination.current <= 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => customerId ? fetchCustomerAndSystems(pagination.current + 1) : fetchAllSystems(pagination.current + 1)}
              disabled={pagination.current >= pagination.pages}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add System Modal */}
      {showAddModal && (
        <SystemModal
          isOpen={showAddModal}
          systemType={selectedSystemType}
          customerId={customerId}
          onClose={() => {
            setShowAddModal(false);
            setSelectedSystemType('');
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setSelectedSystemType('');
            fetchUsage();
            if (customerId) {
              fetchCustomerAndSystems();
            } else {
              fetchAllSystems();
            }
          }}
          onUpgradeRequired={() => {
            setShowAddModal(false);
            setSelectedSystemType('');
            setShowUpgradeModal(true);
          }}
        />
      )}

      {/* Upgrade Modal - shown when user hits system limit */}
      {showUpgradeModal && (
        <UpgradePrompt
          type="systems"
          currentUsage={usage?.usage?.systems}
          limit={usage?.limits?.maxSystems}
          variant="modal"
          onDismiss={() => setShowUpgradeModal(false)}
        />
      )}

      {/* Generate Report Modal */}
      {showReportModal && (
        <ReportGenerationModal
          isOpen={showReportModal}
          systems={allCustomerSystems}
          selectedSystems={selectedSystems}
          onToggleSystem={handleToggleSystemSelection}
          onMoveUp={handleMoveSystemUp}
          onMoveDown={handleMoveSystemDown}
          onGenerate={handleGenerateCustomerReport}
          operatorCopyMap={operatorCopyMap}
          workbookSourceBySystemId={workbookSourceBySystemId}
          onSetWorkbookSource={(systemId, source) => {
            setWorkbookSourceBySystemId(current => ({
              ...current,
              [systemId]: source
            }));
          }}
          onClose={() => {
            setShowReportModal(false);
            setSelectedSystems([]);
            setAllCustomerSystems([]);
            setWorkbookSourceBySystemId({});
            setOperatorCopyMap({});
          }}
          generating={generatingReport}
          customerName={customer?.name}
          loadingSystems={loadingAllSystems}
        />
      )}

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
    </div>
  );
};

// System Type Selector Component
const SystemTypeSelector = ({ onSelect }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="btn-primary"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add System
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <div className="p-2">
            {Object.entries(SYSTEM_TYPES).map(([type, config]) => {
              const IconComponent = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => {
                    onSelect(type);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`p-2 bg-${config.color}-100 rounded-lg mr-3 flex-shrink-0`}>
                    <IconComponent className={`h-4 w-4 text-${config.color}-600`} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{config.name}</div>
                    <div className="text-sm text-gray-600">{config.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {showDropdown && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

// System Modal Component
const SystemModal = ({ isOpen, systemType, customerId, onClose, onSuccess, onUpgradeRequired }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: systemType,
    description: '',
    location: '',
    specifications: {},
    operatingConditions: {},
    tags: [],
    roTrackingEnabled: false
  });
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const typeConfig = SYSTEM_TYPES[systemType] || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        customerId,
        // Include parsed PDF data if available
        pdfExtractedData: parsedData ? {
          samplePoints: parsedData.samplePoints || [],
          parameters: parsedData.parameters || [],
          parameterRanges: parsedData.parameterRanges || {}
        } : null,
        // Include RO tracking flag for pretreatment systems
        roTrackingEnabled: systemType === 'pretreatment' ? formData.roTrackingEnabled : false
      };
      
      await axios.post('/api/systems', submitData);
      toast.success('System created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating system:', error);
      // Check if this is a limit reached error
      if (error.response?.status === 403 && error.response?.data?.upgradeRequired) {
        toast.error('System limit reached. Please upgrade to add more systems.');
        if (onUpgradeRequired) {
          onUpgradeRequired();
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to create system');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePdfUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setPdfFile(file);
    setParsingPdf(true);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await axios.post('/api/systems/parse-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setParsedData(response.data.data);
      
      // Auto-populate form fields
      if (response.data.data.systemName) {
        setFormData(prev => ({
          ...prev,
          name: response.data.data.systemName
        }));
      }

      // Store parsed data for later use (sample points and ranges)
      toast.success('PDF parsed successfully! System information extracted.');
    } catch (error) {
      console.error('Error parsing PDF:', error);
      toast.error(error.response?.data?.message || 'Failed to parse PDF');
      setPdfFile(null);
    } finally {
      setParsingPdf(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handlePdfUpload(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handlePdfUpload(files[0]);
    }
  };

  const removePdf = () => {
    setPdfFile(null);
    setParsedData(null);
  };

  if (!isOpen) return null;

  const IconComponent = typeConfig.icon || Settings;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen px-4 py-6 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center mb-4">
            <div className={`p-2 bg-${typeConfig.color}-100 rounded-lg mr-3`}>
              <IconComponent className={`h-5 w-5 text-${typeConfig.color}-600`} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              Add {typeConfig.name}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder={`Enter ${typeConfig.name.toLowerCase()} name`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="input-field"
                placeholder="Building, floor, or area"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input-field"
                rows={3}
                placeholder={`Brief description of the ${typeConfig.name.toLowerCase()}`}
              />
            </div>

            {/* Two Stage RO Tracking Option - Only for Pretreatment */}
            {systemType === 'pretreatment' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="roTrackingEnabled"
                      name="roTrackingEnabled"
                      type="checkbox"
                      checked={formData.roTrackingEnabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, roTrackingEnabled: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="roTrackingEnabled" className="text-sm font-medium text-gray-900">
                      Two Stage RO Tracking and Normalization
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      Enable specialized tracking for two-stage reverse osmosis systems. Includes parameters for 
                      feed/concentrate/permeate pressures, flows, conductivity, and automatic calculation of 
                      normalized flow, salt rejection, recovery %, TDS conversions, and differential pressures.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PDF Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto Setup from PDF
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {!pdfFile ? (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Drag and drop a service report PDF here
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      Automatically extract system name, parameters, sample points, and ranges
                    </p>
                    <label className="inline-block">
                      <span className="btn-secondary cursor-pointer text-xs">
                        Browse Files
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </label>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="text-sm text-gray-700">{pdfFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={removePdf}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                {parsingPdf && (
                  <div className="mt-2">
                    <LoadingSpinner size="sm" text="Parsing PDF..." />
                  </div>
                )}

                {parsedData && (
                  <div className="mt-3 text-left bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-xs font-medium text-green-800 mb-2">✓ Extracted Data:</p>
                    {parsedData.systemName && (
                      <p className="text-xs text-green-700 mb-1">
                        <strong>System:</strong> {parsedData.systemName}
                      </p>
                    )}
                    {parsedData.samplePoints && parsedData.samplePoints.length > 0 && (
                      <p className="text-xs text-green-700 mb-1">
                        <strong>Sample Points ({parsedData.samplePoints.length}):</strong> {parsedData.samplePoints.join(', ')}
                      </p>
                    )}
                    {parsedData.parameters && parsedData.parameters.length > 0 && (
                      <p className="text-xs text-green-700 mb-1">
                        <strong>Parameters ({parsedData.parameters.length}):</strong> {parsedData.parameters.join(', ')}
                      </p>
                    )}
                    {parsedData.parameterRanges && Object.keys(parsedData.parameterRanges).length > 0 && (
                      <p className="text-xs text-green-700">
                        <strong>Green ranges found:</strong> {Object.keys(parsedData.parameterRanges).length} parameter(s)
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-2 italic">
                      Sample points, parameters, and ranges will auto-populate the KPI workbook
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? <LoadingSpinner size="sm" color="white" /> : 'Create System'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Report Generation Modal Component
const ReportGenerationModal = ({ 
  isOpen, 
  systems, 
  selectedSystems, 
  onToggleSystem, 
  onMoveUp, 
  onMoveDown, 
  onGenerate, 
  operatorCopyMap = {},
  workbookSourceBySystemId = {},
  onSetWorkbookSource,
  onClose, 
  generating,
  customerName,
  loadingSystems = false
}) => {
  if (!isOpen) return null;

  const getSystemTypeConfig = (type) => {
    return SYSTEM_TYPES[type] || {
      name: type,
      icon: Settings,
      color: 'gray',
      description: 'Water treatment system'
    };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-y-auto max-h-[calc(100vh-4rem)] text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Generate Customer Report
                </h3>
                <p className="text-sm text-gray-600">
                  {customerName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={generating}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Select systems to include in the report. The order you select them determines the order they appear in the final document.
          </p>

          {/* Available Systems List */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Available Systems {!loadingSystems && systems.length > 0 && `(${systems.length} total)`}
            </h4>
            <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
              {loadingSystems ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading all systems...</p>
                </div>
              ) : systems.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">No systems available</p>
              ) : (
                systems.map((system) => {
                  const isSelected = selectedSystems.some(s => s._id === system._id);
                  const typeConfig = getSystemTypeConfig(system.type);
                  const IconComponent = typeConfig.icon;
                  const hasOperatorCopy = !!operatorCopyMap?.[system._id];
                  
                  return (
                    <div
                      key={system._id}
                      className={`flex items-center p-3 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => onToggleSystem(system)}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className={`p-1.5 bg-${typeConfig.color}-100 rounded mr-2`}>
                        <IconComponent className={`h-4 w-4 text-${typeConfig.color}-600`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{system.name}</p>
                        <p className="text-xs text-gray-500">{typeConfig.name}</p>
                        <p className="text-xs text-gray-500">
                          Workbook updated {formatModifiedDate(system.latestWorkbookUpdatedAt)}
                        </p>
                        {hasOperatorCopy && (
                          <p className="text-xs text-purple-600 mt-0.5">
                            Operator workbook available
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          #{selectedSystems.findIndex(s => s._id === system._id) + 1}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Systems Order */}
          {selectedSystems.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Report Order ({selectedSystems.length} selected)
              </h4>
              <p className="text-xs text-gray-500 mb-2">
                Drag or use arrows to reorder. First system will appear first in the report.
              </p>
              <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
                {selectedSystems.map((system, index) => {
                  const typeConfig = getSystemTypeConfig(system.type);
                  const IconComponent = typeConfig.icon;
                  const hasOperatorCopy = !!operatorCopyMap?.[system._id];
                  const workbookSource = workbookSourceBySystemId?.[system._id] || 'enterprise';
                  
                  return (
                    <div
                      key={system._id}
                      className="flex items-center p-3 border-b border-gray-100 last:border-b-0 bg-white"
                    >
                      <div className="text-gray-400 mr-2">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <span className="w-6 h-6 bg-blue-600 text-white text-sm rounded-full flex items-center justify-center mr-2">
                        {index + 1}
                      </span>
                      <div className={`p-1.5 bg-${typeConfig.color}-100 rounded mr-2`}>
                        <IconComponent className={`h-4 w-4 text-${typeConfig.color}-600`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{system.name}</p>
                        <p className="text-xs text-gray-500">
                          Workbook updated {formatModifiedDate(system.latestWorkbookUpdatedAt)}
                        </p>
                        {hasOperatorCopy && (
                          <div className="mt-1">
                            <label className="text-xs text-gray-500 mr-2">Workbook:</label>
                            <select
                              value={workbookSource}
                              onChange={(e) => onSetWorkbookSource?.(system._id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                              disabled={generating}
                            >
                              <option value="enterprise">Enterprise (latest)</option>
                              <option value="operator">Operator (latest)</option>
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveUp(index);
                          }}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveDown(index);
                          }}
                          disabled={index === selectedSystems.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSystem(system);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This will generate individual AI service reports for each selected system, 
              then create an executive summary covering all systems. The report will be downloaded as a .docx file.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={generating}
            >
              Cancel
            </button>
            <button
              onClick={onGenerate}
              className="btn-primary flex items-center"
              disabled={generating || selectedSystems.length === 0}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report ({selectedSystems.length} system{selectedSystems.length !== 1 ? 's' : ''})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Systems;

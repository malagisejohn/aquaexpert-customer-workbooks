import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ArrowLeft, Plus, Settings, Trash2, UserCog, Info, AlertCircle, Copy, Check, FileText, Database, TrendingUp, MessageSquare, Package, RefreshCw, Bot, Calendar, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
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

const OperatorSetup = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [operatorSystems, setOperatorSystems] = useState([]);
  const [enterpriseSystems, setEnterpriseSystems] = useState([]);
  const [accountInfo, setAccountInfo] = useState(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState([]);
  const [copying, setCopying] = useState(false);
  const [showAddSystemModal, setShowAddSystemModal] = useState(false);
  const [newSystemData, setNewSystemData] = useState({
    name: '',
    type: 'cooling_tower',
    description: '',
    location: ''
  });
  const [creating, setCreating] = useState(false);
  
  // Inventory management state
  const [enterpriseInventory, setEnterpriseInventory] = useState({});
  const [operatorInventory, setOperatorInventory] = useState({});
  const [selectedProducts, setSelectedProducts] = useState({});
  const [showCopyInventoryModal, setShowCopyInventoryModal] = useState(false);
  const [copyingInventory, setCopyingInventory] = useState(false);
  
  // Dashboard state
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'setup'
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardPeriod, setDashboardPeriod] = useState(3); // months
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Fetch dashboard data when operator account is active
  useEffect(() => {
    if (accountInfo?.hasAccount && viewMode === 'dashboard') {
      fetchDashboardData();
    }
  }, [accountInfo?.hasAccount, viewMode, dashboardPeriod]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      // Fetch dashboard data without AI summary for immediate display
      const response = await axios.get(`/api/customers/${id}/operator-dashboard?months=${dashboardPeriod}&skipAI=true`);
      setDashboardData(response.data);
      
      // Fetch AI summary separately in the background
      fetchAiSummary();
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoadingDashboard(false);
    }
  };
  
  const fetchAiSummary = async () => {
    try {
      setLoadingAiSummary(true);
      setAiSummary(null);
      const response = await axios.get(`/api/customers/${id}/operator-dashboard-summary?months=${dashboardPeriod}`);
      setAiSummary(response.data.aiSummary);
    } catch (error) {
      console.error('Error fetching AI summary:', error);
    } finally {
      setLoadingAiSummary(false);
    }
  };

  useEffect(() => {
    if (accountInfo?.hasAccount && (enterpriseSystems.length > 0 || operatorSystems.length > 0)) {
      fetchInventoryData();
    }
  }, [accountInfo, enterpriseSystems.length, operatorSystems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInventoryData = async () => {
    try {
      // Fetch inventory for all systems
      const allSystemsList = [...enterpriseSystems, ...operatorSystems];
      const enterpriseInv = {};
      const operatorInv = {};
      
      await Promise.all(allSystemsList.map(async (sys) => {
        try {
          const res = await axios.get(`/api/inventory/system/${sys._id}`);
          if (res.data.success && res.data.inventory) {
            const products = res.data.inventory.products.filter(p => p.isActive);
            if (products.length > 0) {
              if (sys.userId === accountInfo.account?.id) {
                operatorInv[sys._id] = { system: sys, products };
              } else {
                enterpriseInv[sys._id] = { system: sys, products };
              }
            }
          }
        } catch (err) {
          // System might not have inventory yet
        }
      }));
      
      setEnterpriseInventory(enterpriseInv);
      setOperatorInventory(operatorInv);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch customer info and account status
      const [customerRes, accountRes] = await Promise.all([
        axios.get(`/api/customers/${id}`),
        axios.get(`/api/customers/${id}/account`).catch(() => ({ data: { hasAccount: false } }))
      ]);
      
      setCustomer(customerRes.data.customer);
      setAccountInfo(accountRes.data);
      
      // Fetch all systems for this customer (including both enterprise and operator systems)
      const systemsRes = await axios.get('/api/systems', {
        params: { 
          customerId: id, 
          limit: 1000,
          excludeOperatorSystems: false // Get ALL systems to separate them
        }
      });
      
      const allSystems = systemsRes.data.systems || [];
      
      // Separate enterprise systems (owned by enterprise user) from operator systems (owned by child account)
      const childAccountId = accountRes.data.account?.id;
      
      if (childAccountId) {
        const operatorSystemsList = allSystems.filter(s => s.userId === childAccountId);
        const enterpriseSystemsList = allSystems.filter(s => s.userId !== childAccountId);
        setOperatorSystems(operatorSystemsList);
        setEnterpriseSystems(enterpriseSystemsList);
      } else {
        // No operator account yet, all systems are enterprise systems
        setEnterpriseSystems(allSystems);
        setOperatorSystems([]);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load customer data');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSystem = async (systemId) => {
    if (!window.confirm('Are you sure you want to delete this system?')) {
      return;
    }

    try {
      await axios.delete(`/api/systems/${systemId}`);
      toast.success('System deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting system:', error);
      toast.error(error.response?.data?.message || 'Failed to delete system');
    }
  };

  const handleCopySystems = async () => {
    if (selectedSystems.length === 0) {
      toast.error('Please select at least one system to copy');
      return;
    }

    if (!accountInfo?.hasAccount) {
      toast.error('Please create operator account credentials first');
      navigate(`/customers/${customer._id}`);
      return;
    }

    setCopying(true);
    try {
      const response = await axios.post(`/api/customers/${id}/copy-systems`, {
        systemIds: selectedSystems
      });
      
      const results = response.data.results;
      const successCount = results.filter(r => r.status === 'copied').length;
      const existsCount = results.filter(r => r.status === 'already_exists').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      const totalWallchemControllers = results.reduce((sum, r) => sum + (r.wallchemControllersCount || 0), 0);
      
      if (successCount > 0) {
        const workbookMsg = `Successfully copied ${successCount} system(s) and their workbooks`;
        const wallchemMsg = totalWallchemControllers > 0 ? ` (including ${totalWallchemControllers} Walchem controller${totalWallchemControllers !== 1 ? 's' : ''})` : '';
        toast.success(workbookMsg + wallchemMsg);
      }
      if (existsCount > 0) {
        toast.success(`${existsCount} system(s) already exist in operator account`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to copy ${errorCount} system(s)`);
      }
      
      setShowCopyModal(false);
      setSelectedSystems([]);
      fetchData();
    } catch (error) {
      console.error('Error copying systems:', error);
      toast.error(error.response?.data?.message || 'Failed to copy systems');
    } finally {
      setCopying(false);
    }
  };

  const toggleSystemSelection = (systemId) => {
    setSelectedSystems(prev => {
      if (prev.includes(systemId)) {
        return prev.filter(id => id !== systemId);
      } else {
        return [...prev, systemId];
      }
    });
  };

  const selectAllSystems = () => {
    if (selectedSystems.length === enterpriseSystems.length) {
      setSelectedSystems([]);
    } else {
      setSelectedSystems(enterpriseSystems.map(s => s._id));
    }
  };

  const handleCreateSystem = async () => {
    if (!newSystemData.name || !newSystemData.type) {
      toast.error('Please provide system name and type');
      return;
    }

    if (!accountInfo?.hasAccount) {
      toast.error('Please create operator account credentials first');
      navigate(`/customers/${customer._id}`);
      return;
    }

    setCreating(true);
    try {
      // Create system for the operator account
      await axios.post('/api/systems/operator', {
        ...newSystemData,
        customerId: customer._id,
        operatorAccountId: accountInfo.account.id
      });
      
      toast.success('System created successfully for operator account');
      setShowAddSystemModal(false);
      setNewSystemData({
        name: '',
        type: 'cooling_tower',
        description: '',
        location: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating system:', error);
      toast.error(error.response?.data?.message || 'Failed to create system');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading operator setup..." />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Customer not found</h3>
        <button onClick={() => navigate('/customers')} className="btn-primary">
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <UserCog className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {accountInfo?.hasAccount ? 'Operator Account' : 'Operator Account Setup'}
              </h1>
            </div>
            <p className="text-gray-600">
              Customer: <span className="font-medium text-gray-900">{customer.name}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {operatorSystems.length} operator system(s) • {enterpriseSystems.length} enterprise system(s) available to copy
            </p>
          </div>
          
          {/* View Mode Toggle - only show if account is active */}
          {accountInfo?.hasAccount && (
            <div className="flex items-center space-x-2">
              <div className="bg-gray-100 rounded-lg p-1 flex">
                <button
                  onClick={() => setViewMode('dashboard')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'dashboard'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <TrendingUp className="h-4 w-4 inline mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setViewMode('setup')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'setup'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Settings className="h-4 w-4 inline mr-2" />
                  Setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info banner */}
      {accountInfo?.hasAccount ? (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Operator Account Active
              </h3>
              <p className="text-sm text-blue-700">
                <strong>{customer.name}</strong> has an active operator account with username: <span className="font-mono font-medium">{accountInfo.account.username}</span>
                <br />
                Manage their systems below. Systems you add or copy here will be visible when they log in.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-900 mb-1">
                No Operator Account Yet
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                <strong>{customer.name}</strong> doesn't have login credentials yet. You can set up their systems first, 
                then create their login credentials so they can access them.
              </p>
              <button
                onClick={() => navigate(`/customers/${customer._id}`)}
                className="btn-primary text-sm"
              >
                Create Login Credentials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard View - shown when operator account is active and in dashboard mode */}
      {accountInfo?.hasAccount && viewMode === 'dashboard' && (
        <div className="space-y-6 mb-8">
          {loadingDashboard ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" text="Loading operator dashboard..." />
            </div>
          ) : !dashboardData ? (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No dashboard data available yet.</p>
              <button
                onClick={fetchDashboardData}
                className="btn-secondary mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          ) : (
            <>
              {/* Period Selector */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Operator Activity Overview</h2>
                <div className="flex items-center space-x-3">
                  <label className="text-sm text-gray-600">Time Period:</label>
                  <select
                    value={dashboardPeriod}
                    onChange={(e) => setDashboardPeriod(parseInt(e.target.value))}
                    className="input-field w-auto text-sm"
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months</option>
                  </select>
                  <button
                    onClick={fetchDashboardData}
                    className="btn-secondary text-sm"
                    disabled={loadingDashboard || loadingAiSummary}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingDashboard || loadingAiSummary ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* AI Summary - Shows loading state or content */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">AI Summary</h3>
                    {loadingAiSummary ? (
                      <div className="flex items-center space-x-2 text-gray-500">
                        <LoadingSpinner size="sm" />
                        <span className="text-sm">Generating AI analysis...</span>
                      </div>
                    ) : aiSummary ? (
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown>{aiSummary}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No AI summary available.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Settings className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData.systems?.length || 0}</p>
                      <p className="text-sm text-gray-500">Systems</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{Object.keys(dashboardData.trendData || {}).length}</p>
                      <p className="text-sm text-gray-500">Parameters Tracked</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData.inventoryData?.length || 0}</p>
                      <p className="text-sm text-gray-500">Products</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData.recentComments?.length || 0}</p>
                      <p className="text-sm text-gray-500">Service Notes</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Status */}
              {dashboardData.inventoryData && dashboardData.inventoryData.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Package className="h-5 w-5 mr-2 text-purple-600" />
                      Inventory Status
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dashboardData.inventoryData.map((item, idx) => (
                        <div
                          key={idx}
                          className={`border rounded-lg p-4 ${
                            item.warningLevel === 'low' ? 'border-red-300 bg-red-50' :
                            item.warningLevel === 'gettingLow' ? 'border-amber-300 bg-amber-50' :
                            'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{item.productName}</p>
                              <p className="text-sm text-gray-500">{item.systemName}</p>
                            </div>
                            {item.warningLevel === 'low' && (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            )}
                            {item.warningLevel === 'gettingLow' && (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            )}
                            {item.warningLevel === 'ok' && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Days of Supply:</span>
                              <span className="ml-1 font-medium">
                                {item.daysOfSupply !== null ? Math.round(item.daysOfSupply) : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Usage Rate:</span>
                              <span className="ml-1 font-medium">
                                {item.usageRate !== null ? `${item.usageRate.toFixed(1)} gal/day` : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Parameter Trends */}
              {dashboardData.trendData && Object.keys(dashboardData.trendData).length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                      Parameter Trends
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {Object.entries(dashboardData.trendData).map(([paramKey, paramData]) => {
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

                        const chartOptions = {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: { font: { size: 10 } }
                            },
                            title: {
                              display: true,
                              text: `${paramData.parameterName || paramKey}${paramData.unit ? ` (${paramData.unit})` : ''}`,
                              font: { size: 12, weight: 'bold' }
                            }
                          },
                          scales: {
                            x: { display: true },
                            y: { display: true }
                          }
                        };

                        return (
                          <div key={paramKey} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="text-xs text-gray-500 mb-2">{paramData.systemName}</p>
                            <div className="h-48">
                              <Line data={chartData} options={chartOptions} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Comments/Service Notes */}
              {dashboardData.recentComments && dashboardData.recentComments.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2 text-amber-600" />
                      Recent Service Notes
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {dashboardData.recentComments.slice(0, 10).map((comment, idx) => (
                      <div key={idx} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{comment.systemName}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                              {comment.visitType}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(comment.date).toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          <Wrench className="h-3 w-3 inline mr-1" />
                          {comment.technician}
                        </p>
                        {comment.correctiveActionsTaken && (
                          <div className="mb-2">
                            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Actions Taken</span>
                            <p className="text-sm text-gray-700 mt-1">{comment.correctiveActionsTaken}</p>
                          </div>
                        )}
                        {comment.correctiveActionsNeeded && (
                          <div className="mb-2">
                            <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded">Actions Needed</span>
                            <p className="text-sm text-gray-700 mt-1">{comment.correctiveActionsNeeded}</p>
                          </div>
                        )}
                        {comment.generalComments && (
                          <div>
                            <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Comments</span>
                            <p className="text-sm text-gray-700 mt-1">{comment.generalComments}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Setup View - shown when in setup mode or no account */}
      {(!accountInfo?.hasAccount || viewMode === 'setup') && (
        <>
      {/* Copy from Enterprise - Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Copy from Enterprise Systems */}
        {enterpriseSystems.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Copy from Your Enterprise Systems</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select systems to copy to the operator account (includes workbook templates, ranges, and parameters)
                  </p>
                </div>
                {enterpriseSystems.length > 0 && (
                  <button
                    onClick={() => {
                      if (selectedSystems.length === 0) {
                        toast.error('Please select at least one system to copy');
                        return;
                      }
                      setShowCopyModal(true);
                    }}
                    className="btn-primary"
                    disabled={!accountInfo?.hasAccount || selectedSystems.length === 0}
                    title={!accountInfo?.hasAccount ? 'Create operator account first' : ''}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Selected ({selectedSystems.length})
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enterpriseSystems.map((system) => (
                  <div
                    key={system._id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedSystems.includes(system._id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleSystemSelection(system._id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedSystems.includes(system._id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedSystems.includes(system._id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{system.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">
                          {system.type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Enterprise System
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={selectAllSystems}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedSystems.length === enterpriseSystems.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-gray-500">
                  {selectedSystems.length} of {enterpriseSystems.length} selected
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Copy from Enterprise Inventory */}
        {Object.keys(enterpriseInventory).length > 0 && (
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Copy from Your Enterprise Inventory</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Select products to copy to operator systems
                </p>
              </div>
            </div>
            <div className="card-body space-y-4">
              {Object.entries(enterpriseInventory).map(([systemId, data]) => (
                <div key={systemId} className="border border-gray-200 rounded-lg p-3">
                  <h5 className="font-medium text-gray-900 mb-3 text-sm">
                    {data.system.name} ({data.products.length} products)
                  </h5>
                  <div className="grid grid-cols-1 gap-2">
                    {data.products.map((product) => {
                      const key = `${systemId}-${product._id}`;
                      const isSelected = selectedProducts[key];
                      
                      return (
                        <div
                          key={product._id}
                          className={`border-2 rounded-lg p-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedProducts(prev => ({
                              ...prev,
                              [key]: isSelected ? undefined : { 
                                sourceSystemId: systemId, 
                                sourceProductId: product._id.toString(),
                                productName: product.name
                              }
                            }));
                          }}
                        >
                          <div className="flex items-start space-x-2">
                            <div className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <Check className="h-2.5 w-2.5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-xs truncate">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-600 capitalize">
                                {product.category}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {Object.values(selectedProducts).filter(Boolean).length > 0 && operatorSystems.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowCopyInventoryModal(true)}
                    className="btn-primary w-full text-sm"
                    disabled={!accountInfo?.hasAccount}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy {Object.values(selectedProducts).filter(Boolean).length} Product(s)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Operator Account Resources - Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Operator Account Systems */}
        <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Operator Account Systems</h3>
              <p className="text-sm text-gray-600 mt-1">
                Systems that will be visible to the operator when they log in
              </p>
            </div>
            <button
              onClick={() => setShowAddSystemModal(true)}
              className="btn-primary text-sm"
              disabled={!accountInfo?.hasAccount}
              title={!accountInfo?.hasAccount ? 'Create operator account first' : ''}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add System
            </button>
          </div>
        </div>
        <div className="card-body">
          {operatorSystems.length > 0 ? (
            <div className="space-y-3">
              {operatorSystems.map((system) => (
                <div key={system._id} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Settings className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">
                          {system.name}
                        </h4>
                        <p className="text-xs text-gray-600 capitalize">
                          {system.type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {system.controllerCount || 0} controllers
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={() => navigate(`/systems/${system._id}/workbook`)}
                        className="flex-1 btn-secondary text-xs py-2"
                        title="View workbook"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Workbook
                      </button>
                      <button
                        onClick={() => navigate(`/systems/${system._id}/inventory`)}
                        className="flex-1 btn-secondary text-xs py-2"
                        title="View inventory"
                      >
                        <Database className="h-3.5 w-3.5 mr-1" />
                        Inventory
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/systems/${system._id}`)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View system"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSystem(system._id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete system"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No operator systems yet</h3>
              <p className="text-gray-600 mb-6">
                {enterpriseSystems.length > 0 
                  ? 'Copy existing systems or add new ones for this operator account'
                  : 'Add the first system for this operator account'
                }
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowAddSystemModal(true)}
                  className="btn-primary"
                  disabled={!accountInfo?.hasAccount}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New System
                </button>
                {enterpriseSystems.length > 0 && accountInfo?.hasAccount && (
                  <button
                    onClick={() => {
                      selectAllSystems();
                      setShowCopyModal(true);
                    }}
                    className="btn-secondary"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Enterprise Systems
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Operator Account Inventory */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Operator Account Inventory</h3>
            <p className="text-sm text-gray-600 mt-1">
              Products currently in operator systems
            </p>
          </div>
        </div>
        <div className="card-body">
          {Object.keys(operatorInventory).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(operatorInventory).map(([systemId, data]) => (
                <div key={systemId} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900 text-sm">
                      {data.system.name}
                    </h5>
                    <button
                      onClick={() => navigate(`/systems/${systemId}/inventory`)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Manage →
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.products.map(product => (
                      <span key={product._id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {product.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No inventory products yet
              {Object.keys(enterpriseInventory).length > 0 && (
                <span className="block mt-2 text-blue-600">
                  Copy products from your enterprise inventory above
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>

      {/* Back to customer detail */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => navigate('/customers')}
          className="btn-secondary"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </button>
        <button
          onClick={() => navigate(`/customers/${customer._id}`)}
          className="btn-primary"
        >
          {accountInfo?.hasAccount 
            ? 'View Customer Details & Manage Login'
            : 'Create Operator Login Credentials'
          }
        </button>
      </div>
        </>
      )}

      {/* Add System Modal */}
      {showAddSystemModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New System to Operator Account</h2>
              <p className="text-sm text-gray-600 mt-1">
                This system will be owned by the operator account for {customer.name}
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Cooling Tower #1"
                  value={newSystemData.name}
                  onChange={(e) => setNewSystemData({ ...newSystemData, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Type *
                </label>
                <select
                  className="input-field"
                  value={newSystemData.type}
                  onChange={(e) => setNewSystemData({ ...newSystemData, type: e.target.value })}
                >
                  <option value="cooling_tower">Cooling Tower</option>
                  <option value="steam_boiler">Steam Boiler</option>
                  <option value="closed_loop">Closed Loop</option>
                  <option value="waste_water">Waste Water</option>
                  <option value="pretreatment">Pretreatment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input-field"
                  placeholder="Optional description"
                  rows={2}
                  value={newSystemData.description}
                  onChange={(e) => setNewSystemData({ ...newSystemData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Building A, Roof"
                  value={newSystemData.location}
                  onChange={(e) => setNewSystemData({ ...newSystemData, location: e.target.value })}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAddSystemModal(false);
                  setNewSystemData({ name: '', type: 'cooling_tower', description: '', location: '' });
                }}
                className="btn-secondary"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSystem}
                className="btn-primary"
                disabled={creating}
              >
                {creating ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create System
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Inventory Modal */}
      {showCopyInventoryModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Copy Inventory Products</h2>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-700">
                Select which operator system(s) to copy these products to:
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Products to copy ({Object.values(selectedProducts).filter(Boolean).length}):
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.values(selectedProducts).filter(Boolean).map((prod, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {prod.productName}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Copy to operator system:
                </label>
                {operatorSystems.map(sys => (
                  <label key={sys._id} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                    <input
                      type="radio"
                      name="targetSystem"
                      value={sys._id}
                      onChange={(e) => {
                        // Store target system for copy operation
                        setSelectedProducts(prev => {
                          const updated = {};
                          Object.entries(prev).forEach(([key, value]) => {
                            if (value) {
                              updated[key] = { ...value, targetSystemId: e.target.value };
                            }
                          });
                          return updated;
                        });
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{sys.name}</span>
                  </label>
                ))}
              </div>

              {operatorSystems.length === 0 && (
                <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  Create operator systems first before copying inventory products.
                </p>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCopyInventoryModal(false);
                  setSelectedProducts({});
                }}
                className="btn-secondary"
                disabled={copyingInventory}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const productCopies = Object.values(selectedProducts).filter(p => p && p.targetSystemId);
                  
                  if (productCopies.length === 0) {
                    toast.error('Please select a target system');
                    return;
                  }

                  setCopyingInventory(true);
                  try {
                    const response = await axios.post(`/api/customers/${id}/copy-inventory`, {
                      productCopies
                    });
                    
                    const results = response.data.results;
                    const successCount = results.filter(r => r.status === 'copied').length;
                    const existsCount = results.filter(r => r.status === 'already_exists').length;
                    const errorCount = results.filter(r => r.status === 'error').length;
                    
                    if (successCount > 0) {
                      toast.success(`Successfully copied ${successCount} product(s)`);
                    }
                    if (existsCount > 0) {
                      toast.success(`${existsCount} product(s) already exist`);
                    }
                    if (errorCount > 0) {
                      toast.error(`Failed to copy ${errorCount} product(s)`);
                    }
                    
                    setShowCopyInventoryModal(false);
                    setSelectedProducts({});
                    fetchInventoryData();
                  } catch (error) {
                    console.error('Error copying inventory:', error);
                    toast.error(error.response?.data?.message || 'Failed to copy inventory');
                  } finally {
                    setCopyingInventory(false);
                  }
                }}
                className="btn-primary"
                disabled={copyingInventory || operatorSystems.length === 0}
              >
                {copyingInventory ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Products
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Confirmation Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Copy Systems to Operator Account</h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-700">
                You are about to copy <strong>{selectedSystems.length} system(s)</strong> to the operator account.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">What will be copied:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ System configuration and details</li>
                  <li>✓ KPI workbook structure (parameters, sample locations, ranges)</li>
                  <li>✓ Operating conditions and specifications</li>
                  <li>✓ Alert thresholds</li>
                </ul>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">What will NOT be copied:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✗ KPI readings and historical data</li>
                  <li>✗ Inventory items</li>
                  <li>✗ Service history</li>
                </ul>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowCopyModal(false)}
                className="btn-secondary"
                disabled={copying}
              >
                Cancel
              </button>
              <button
                onClick={handleCopySystems}
                className="btn-primary"
                disabled={copying}
              >
                {copying ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Systems
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorSetup;


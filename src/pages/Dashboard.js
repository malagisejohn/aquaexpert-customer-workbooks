import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TodoList from '../components/todos/TodoList';
import TodoButton from '../components/todos/TodoButton';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  Clock,
  Droplet,
  FileText
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEnterprise = user?.accountType !== 'customer' && user?.subscription?.plan === 'enterprise';
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState(0);
  const [inventoryFeed, setInventoryFeed] = useState([]);
  const [inventoryTotalCount, setInventoryTotalCount] = useState(0);
  const [wallchemFeed, setWallchemFeed] = useState([]);
  const [wallchemTotalCount, setWallchemTotalCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [wallchemDashboard, inventoryFeedRes, wallchemFeedRes] = await Promise.all([
        axios.get('/api/wallchem/dashboard').catch(() => ({ data: { totalSystems: 0, totalAlarms: 0 } })),
        axios.get('/api/inventory/feed', {
          params: { limit: 5, includeOk: false }
        }).catch(() => ({ data: { feed: [], totalCount: 0 } })),
        axios.get('/api/wallchem/feed', {
          params: { limit: 5 }
        }).catch(() => ({ data: { feed: [], totalCount: 0 } }))
      ]);

      setAlerts(wallchemDashboard.data.totalAlarms || 0);
      setInventoryFeed(inventoryFeedRes?.data?.feed || []);
      setInventoryTotalCount(inventoryFeedRes?.data?.totalCount || 0);
      setWallchemFeed(wallchemFeedRes?.data?.feed || []);
      setWallchemTotalCount(wallchemFeedRes?.data?.totalCount || 0);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (_error) {
      return '-';
    }
  };

  const formatDays = (value) => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      if (value < 1) return '<1 day';
      if (Number.isInteger(value)) return `${value} days`;
      return `${value.toFixed(1)} days`;
    }
    return '-';
  };

  const formatGallons = (value) => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return `${value.toFixed(1)} gal`;
    }
    return '-';
  };

  const warningStyles = {
    low: 'bg-red-100 text-red-800',
    gettingLow: 'bg-amber-100 text-amber-800',
    ok: 'bg-green-100 text-green-800',
    unknown: 'bg-gray-100 text-gray-600'
  };

  const warningLabels = {
    low: 'Low Stock',
    gettingLow: 'Getting Low',
    ok: 'Healthy',
    unknown: 'Unknown'
  };

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

  const flowStatusStyles = {
    FLOW: 'bg-emerald-100 text-emerald-700',
    NO_FLOW: 'bg-red-100 text-red-700',
    UNKNOWN: 'bg-gray-100 text-gray-600'
  };

  const openWallchemReportModal = (report) => {
    if (!report?.id) {
      return;
    }
    navigate(`/walchem-reports?report=${report.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.accountType === 'customer' ? '!' : `, ${user?.firstName}!`}
        </h1>
        <p className="text-gray-600 mt-1">
          Here&apos;s what&apos;s happening with your water treatment systems today.
        </p>
      </div>

      {inventoryFeed.length === 0 && wallchemFeed.length === 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-4 lg:mb-0">
                <h2 className="text-xl font-semibold mb-2">Get Started with AquaExpert</h2>
                <p className="text-blue-100">
                  {user?.accountType === 'customer'
                    ? 'Set up your first system to start monitoring KPIs'
                    : 'Set up your first customer and system to start monitoring KPIs'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/chat')}
                  className="btn-secondary bg-blue-500 text-white hover:bg-blue-400 border-blue-400"
                >
                  Try AI Assistant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {isEnterprise && (
          <div className="card h-full">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckSquare className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Todo List</h3>
              </div>
              <TodoButton source="dashboard_page" variant="button" showBadge={false} />
            </div>
            <div className="card-body">
              <TodoList
                showFilters={false}
                showGroupBy={true}
                compact={true}
                maxHeight="320px"
              />
            </div>
          </div>
        )}

        <div className="card h-full">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-medium text-gray-900">Latest Walchem Reports</h3>
            </div>
            <button
              onClick={() => navigate('/walchem-reports')}
              className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center"
            >
              View Reports
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          <div className="card-body">
            {wallchemFeed.length > 0 ? (
              <>
                <ul className="divide-y divide-gray-200">
                  {wallchemFeed.map((report) => {
                    const statusKey = typeof report.aiStatus === 'string'
                      ? report.aiStatus.toUpperCase()
                      : null;
                    const statusMeta = statusKey ? aiStatusStyles[statusKey] : null;
                    const flowKey = typeof report.flowStatus === 'string'
                      ? report.flowStatus.toUpperCase()
                      : 'UNKNOWN';
                    const flowBadge = flowStatusStyles[flowKey] || flowStatusStyles.UNKNOWN;
                    const badgeContent = statusMeta ? (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusMeta.badge}`}>
                        <span className={`mr-2 h-2 w-2 rounded-full ${statusMeta.dot}`} />
                        {statusMeta.label} Status
                      </span>
                    ) : report.hasAlarms ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Alarms detected
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <Activity className="h-3 w-3 mr-1" />
                        Status pending
                      </span>
                    );

                    return (
                      <li key={report.id} className="py-2">
                        <button
                          type="button"
                          onClick={() => openWallchemReportModal(report)}
                          className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">
                                {report.customerName
                                  ? `${report.customerName} - ${report.systemName || 'Unknown system'}`
                                  : (report.systemName || 'Unknown system')}
                              </p>
                              <p className="text-sm text-gray-600 truncate">
                                Controller {report.controllerSerialNumber}
                                {report.sampleLocationName ? ` - ${report.sampleLocationName}` : ''}
                              </p>
                              <div className="mt-2 flex items-center text-xs text-gray-500 space-x-2">
                                <span className="inline-flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Processed {formatDateTime(report.processedAt)}
                                </span>
                                {report.receivedAt && (
                                  <span className="inline-flex items-center">
                                    Email {formatDateTime(report.receivedAt)}
                                  </span>
                                )}
                              </div>
                              {report.aiStatusReason && (
                                <p className="mt-2 max-h-10 overflow-hidden text-xs text-gray-500">
                                  {report.aiStatusReason}
                                </p>
                              )}
                              <div className="mt-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${flowBadge}`}>
                                  {flowKey === 'NO_FLOW' ? 'No Flow' : flowKey === 'FLOW' ? 'Flow' : 'Flow Unknown'}
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {badgeContent}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {wallchemTotalCount > 5 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                    <button
                      onClick={() => navigate('/walchem-reports')}
                      className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-700"
                    >
                      Show more ({wallchemTotalCount - 5} more reports)
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500">
                No Walchem reports processed yet. Connect a controller to see recent activity.
              </div>
            )}
          </div>
        </div>

        <div className="card h-full">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Droplet className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Inventory Outlook</h3>
            </div>
            <div className="text-xs text-gray-500">
              {alerts > 0 ? `${alerts} systems reporting alarms` : 'No alarms detected'}
            </div>
          </div>
          <div className="card-body">
            {inventoryFeed.length > 0 ? (
              <>
                <ul className="divide-y divide-gray-200">
                  {inventoryFeed.map((item) => (
                    <li key={`${item.inventoryId}-${item.productId}`} className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <p className="font-semibold text-gray-900 truncate">{item.productName}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${warningStyles[item.warningLevel] || warningStyles.unknown}`}>
                              {warningLabels[item.warningLevel] || warningLabels.unknown}
                            </span>
                            {item.trackedByEnterprise && item.trackedByCustomer && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                Shared tracking
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {item.customerName ? `${item.customerName} - ${item.systemName}` : (item.systemName || 'Unnamed system')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Last reading: {formatDateTime(item.lastReadingAt)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-gray-900">{formatDays(item.daysOfSupply)}</p>
                          <p className="text-xs text-gray-500">Days of supply</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                        <span>Total on hand: {formatGallons(item.totalAvailableGallons)}</span>
                        <span>Safety stock: {formatGallons(item.safetyStockGallons)}</span>
                        <span>
                          Usage:{' '}
                          {typeof item.usageRate === 'number' && !Number.isNaN(item.usageRate)
                            ? `${item.usageRate.toFixed(2)} gal/day`
                            : 'Trend not available'}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/systems/${item.systemId}/inventory`)}
                        className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        View inventory
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </button>
                    </li>
                  ))}
                </ul>
                {inventoryTotalCount > 5 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                    <button
                      onClick={() => navigate('/inventory')}
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Show more ({inventoryTotalCount - 5} more items)
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500">
                No inventory usage data yet. Add volume readings to populate this feed.
              </div>
            )}
          </div>
        </div>

        {user?.accountType !== 'customer' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Subscription</h3>
            </div>
            <div className="card-body">
              <div className="text-center">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-3">
                  {user?.subscription?.plan || 'Free'} Plan
                </div>
                <div className="text-sm text-gray-600 mb-4 space-y-1">
                  <p>
                    {user?.subscription?.plan === 'free'
                      ? `${inventoryFeed.length} systems tracked`
                      : 'Unlimited systems'}
                  </p>
                  {user?.subscription?.plan === 'free' && (
                    <p>
                      {user?.subscription?.usage?.aiMessagesThisMonth || 0}/{user?.subscription?.limits?.maxAiMessages || 3} AI messages used
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigate('/subscription')}
                  className="btn-primary w-full"
                >
                  {user?.subscription?.plan === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

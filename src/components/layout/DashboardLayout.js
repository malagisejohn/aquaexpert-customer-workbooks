import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Droplets, 
  LayoutDashboard, 
  Users, 
  Settings, 
  FileText, 
  MessageSquare,
  BookOpen,
  User,
  CreditCard,
  Menu,
  X,
  LogOut,
  Bell,
  CheckCircle,
  AlertTriangle,
  ShoppingCart,
  Activity,
  BellRing,
  BellOff
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { isReportsPortalHost } from '../../utils/portalHost';
import TodoButton from '../todos/TodoButton';

const DashboardLayout = ({ children, forceReportsPortal = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [todoContext, setTodoContext] = useState({
    source: 'navbar',
    customerId: null,
    systemId: null,
    customerName: '',
    systemName: ''
  });
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Check push notification support and current status
  useEffect(() => {
    const checkPushSupport = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported');
        return;
      }
      
      setPushSupported(true);
      
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration.scope);
        
        // Check if already subscribed
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setPushEnabled(true);
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };
    
    checkPushSupport();
  }, []);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    if (!pushSupported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }
    
    setPushLoading(true);
    
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Please allow notifications to receive alerts');
        setPushLoading(false);
        return;
      }
      
      // Get VAPID public key from server
      const keyResponse = await axios.get('/api/push/vapid-public-key');
      if (!keyResponse.data.configured) {
        toast.error('Push notifications are not configured on this server');
        setPushLoading(false);
        return;
      }
      
      const vapidPublicKey = keyResponse.data.publicKey;
      
      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };
      
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      
      // Send subscription to server
      await axios.post('/api/push/subscribe', {
        subscription: subscription.toJSON()
      });
      
      setPushEnabled(true);
      toast.success('Push notifications enabled! You\'ll receive alerts on this device.');
      
      // Send a test notification
      try {
        await axios.post('/api/push/test');
      } catch (e) {
        // Test notification is optional
      }
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      toast.error('Failed to enable push notifications');
    } finally {
      setPushLoading(false);
    }
  }, [pushSupported]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async () => {
    setPushLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();
        
        // Remove from server
        await axios.post('/api/push/unsubscribe', {
          endpoint: subscription.endpoint
        });
      }
      
      setPushEnabled(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Failed to unsubscribe from push:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setPushLoading(false);
    }
  }, []);

  // Filter navigation based on account type
  // Operator accounts (accountType === 'customer') only see Systems and AI Chat
  const isOperator = user?.accountType === 'customer';
  const isEnterprise = user?.accountType !== 'customer' && user?.subscription?.plan === 'enterprise';
  const isReportPortal = forceReportsPortal || isReportsPortalHost();
  
  const allNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, hideForOperator: true },
    { name: 'Customers', href: '/customers', icon: Users, hideForOperator: true },
    { name: 'Systems', href: '/systems', icon: Settings, operatorOnly: false },
    { name: 'Service Reports', href: '/service-reports', icon: FileText, hideForOperator: true },
    { name: 'Place Order', href: '/place-order', icon: ShoppingCart, hideForOperator: true },
    { name: 'Walchem Reports', href: '/walchem-reports', icon: Activity, hideForOperator: true },
    { name: 'AI Chat', href: '/chat', icon: MessageSquare },
    { name: 'Todos', href: '/todos', icon: CheckCircle, hideForOperator: true, enterpriseOnly: true },
    { name: 'Help & Guides', href: '/help', icon: BookOpen, hideForOperator: true },
  ];

  const navigation = isReportPortal && isOperator
    ? [{ name: 'Service Reports', href: '/CRB-service-reports', icon: FileText }]
    : allNavigation.filter((item) => {
      if (item.hideForOperator && isOperator) {
        return false;
      }
      if (item.enterpriseOnly && !isEnterprise) {
        return false;
      }
      return true;
    });

  const showPortalMinimalUserMenu = isReportPortal && isOperator;
  const userNavigation = showPortalMinimalUserMenu
    ? []
    : [{ name: 'Profile', href: '/profile', icon: User }];

  if (!showPortalMinimalUserMenu && user?.accountType !== 'customer') {
    userNavigation.push({ name: 'Subscription', href: '/subscription', icon: CreditCard });
  }

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  const isActive = (href) => {
    if (href === '/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const isWorkbookPage = /\/systems\/[^/]+\/workbook$/.test(location.pathname);

  useEffect(() => {
    let cancelled = false;

    const resolveTodoContext = async () => {
      const systemMatch = location.pathname.match(/^\/systems\/([^/]+)(?:\/|$)/);
      const customerMatch = location.pathname.match(/^\/customers\/([^/]+)(?:\/|$)/);
      const workbookRoute = /^\/systems\/[^/]+\/workbook$/.test(location.pathname);

      if (systemMatch) {
        const systemId = systemMatch[1];
        const fallbackSource = workbookRoute ? 'workbook_page' : 'system_page';
        if (!cancelled) {
          setTodoContext({
            source: fallbackSource,
            customerId: null,
            systemId: systemId || null,
            customerName: '',
            systemName: ''
          });
        }

        try {
          const response = await axios.get(`/api/systems/${systemId}`);
          const system = response.data?.system;
          const customerRef = system?.customerId;
          const customerId = typeof customerRef === 'object' ? customerRef?._id : customerRef;
          const customerName = typeof customerRef === 'object' ? (customerRef?.name || '') : '';

          if (!cancelled) {
            setTodoContext({
              source: fallbackSource,
              customerId: customerId || null,
              systemId: systemId || null,
              customerName,
              systemName: system?.name || ''
            });
          }
        } catch (_error) {
          if (!cancelled) {
            setTodoContext({
              source: fallbackSource,
              customerId: null,
              systemId: systemId || null,
              customerName: '',
              systemName: ''
            });
          }
        }
        return;
      }

      if (customerMatch) {
        const customerId = customerMatch[1];
        if (!cancelled) {
          setTodoContext({
            source: 'customer_page',
            customerId: customerId || null,
            systemId: null,
            customerName: '',
            systemName: ''
          });
        }
        try {
          const response = await axios.get(`/api/customers/${customerId}`);
          const resolvedCustomer = response.data?.customer || response.data || {};
          if (!cancelled) {
            setTodoContext({
              source: 'customer_page',
              customerId: customerId || null,
              systemId: null,
              customerName: resolvedCustomer?.name || '',
              systemName: ''
            });
          }
        } catch (_error) {
          if (!cancelled) {
            setTodoContext({
              source: 'customer_page',
              customerId: customerId || null,
              systemId: null,
              customerName: '',
              systemName: ''
            });
          }
        }
        return;
      }

      if (!cancelled) {
        setTodoContext({
          source: location.pathname === '/dashboard' ? 'dashboard_page' : 'navbar',
          customerId: null,
          systemId: null,
          customerName: '',
          systemName: ''
        });
      }
    };

    resolveTodoContext();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);


  const handleNotificationClick = async (notification) => {
    // Mark as read
    try {
      await axios.put(`/api/notifications/${notification._id}/read`);
      fetchNotifications();

      // If it's a parameter matching failed notification, navigate to workbook
      if (notification.type === 'parameter_matching_failed' && notification.metadata?.systemId) {
        setNotificationsOpen(false);
        // Extract the systemId string (handle both populated and unpopulated)
        const systemId = typeof notification.metadata.systemId === 'object' 
          ? notification.metadata.systemId._id 
          : notification.metadata.systemId;
        // Route to the KPI workbook page where they can edit ranges
        navigate(`/systems/${systemId}/workbook`);
      }
      
      // If it's a walchem report notification, navigate to walchem reports page with controller selected
      if (notification.type === 'walchem_report' && notification.metadata?.systemId) {
        setNotificationsOpen(false);
        const systemId = typeof notification.metadata.systemId === 'object' 
          ? notification.metadata.systemId._id 
          : notification.metadata.systemId;
        const controller = notification.metadata.controllerSerialNumber || '';
        navigate(`/walchem-reports?system=${systemId}&controller=${controller}`);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const dismissNotification = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await axios.put(`/api/notifications/${notificationId}/dismiss`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/mark-all-read');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}
      
      {/* Notifications Modal - Centered like workbook ranges popup */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 transition-opacity" 
              onClick={() => setNotificationsOpen(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            {/* Center modal */}
            <div 
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full notification-panel"
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Notifications</h3>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Push notification toggle */}
              {pushSupported && (
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg mb-3">
                  <div className="flex items-center">
                    {pushEnabled ? (
                      <BellRing className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <BellOff className="h-4 w-4 text-gray-400 mr-2" />
                    )}
                    <span className="text-sm text-gray-700">
                      {pushEnabled ? 'Browser alerts on' : 'Browser alerts off'}
                    </span>
                  </div>
                  <button
                    onClick={pushEnabled ? unsubscribeFromPush : subscribeToPush}
                    disabled={pushLoading}
                    className={`text-xs font-medium px-3 py-1 rounded-full transition ${
                      pushEnabled
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${pushLoading ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {pushLoading ? '...' : pushEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              )}
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div 
              className="bg-gray-50 overflow-y-auto" 
              style={{ maxHeight: 'calc(100vh - 14rem)' }}
              onWheel={(e) => e.stopPropagation()}
            >
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-100 cursor-pointer transition-colors bg-white ${
                        !notification.read ? 'border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {notification.type === 'parameter_matching_failed' ? (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                          ) : notification.type === 'walchem_report' ? (
                            notification.metadata?.aiStatus === 'RED' ? (
                              <Activity className="h-5 w-5 text-red-500" />
                            ) : notification.metadata?.aiStatus === 'YELLOW' ? (
                              <Activity className="h-5 w-5 text-amber-500" />
                            ) : (
                              <Activity className="h-5 w-5 text-emerald-500" />
                            )
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => dismissNotification(notification._id, e)}
                          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Droplets className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              {isReportPortal && isOperator ? 'CRB Service Reports' : 'AquaExpert'}
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.name}
                href={item.href}
                className={`
                  nav-link group
                  ${isActive(item.href) ? 'nav-link-active' : 'nav-link-inactive'}
                `}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.href);
                  setSidebarOpen(false);
                }}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </a>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.accountType === 'customer' 
                  ? user?.username?.[0]?.toUpperCase() || 'O'
                  : `${user?.firstName?.[0]}${user?.lastName?.[0]}`
                }
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.accountType === 'customer'
                  ? (isReportPortal ? 'Report Access Account' : 'Operator Account')
                  : user?.fullName}
              </p>
              {user?.accountType !== 'customer' && (
                <p className="text-xs text-gray-500 truncate">
                  {user?.subscription?.plan} plan
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            {userNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`
                    nav-link group text-sm
                    ${isActive(item.href) ? 'nav-link-active' : 'nav-link-inactive'}
                  `}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </a>
              );
            })}
            <button
              onClick={handleLogout}
              className="nav-link-inactive w-full text-left text-sm group"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {navigation.find(item => isActive(item.href))?.name || (isReportPortal && isOperator ? 'CRB Service Reports' : 'AquaExpert')}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isWorkbookPage && (
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('generate-workbook-report'));
                  }}
                  className="btn-primary inline-flex"
                  title={user?.accountType === 'customer' ? "Get AI help with your workbook" : "Generate service report from workbook data"}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {user?.accountType === 'customer' ? 'AI Analysis' : 'Generate Report'}
                </button>
              )}
              
              {/* Todo Button - Top Right */}
              {isEnterprise && (
                <TodoButton
                  source={todoContext.source}
                  customerId={todoContext.customerId}
                  systemId={todoContext.systemId}
                  customerName={todoContext.customerName}
                  systemName={todoContext.systemName}
                  variant="icon"
                />
              )}
              
              {!isReportPortal && (
                <div className="relative">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors notification-button"
                    title="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
              
              {/* User menu - mobile */}
              <div className="lg:hidden">
                {isReportPortal && isOperator ? (
                  <button
                    onClick={handleLogout}
                    className="btn-secondary inline-flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100"
                  >
                    <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 pt-6">
          {children}
        </main>
      </div>

      {/* Enterprise consent modal */}
      {/* showConsent and activeRequest were removed as per the edit hint */}
      {/* The following block was removed as per the edit hint */}
      {/* {showConsent && activeRequest && (
        <div className="fixed inset-0 z-[10001] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Enterprise Access Request</h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-700">
                {activeRequest.requesterUserId?.firstName} {activeRequest.requesterUserId?.lastName} ({activeRequest.requesterUserId?.email}) is requesting full access to your AquaExpert data (customers, systems, and associated data) under their enterprise account. Do you approve?
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowConsent(false)}
                className="btn-secondary"
              >
                Decide Later
              </button>
              <button
                onClick={async () => {
                  try {
                    await axios.post(`/api/users/enterprise-access/${activeRequest._id}/respond`, { decision: 'denied' });
                  } catch (_) {}
                  setShowConsent(false);
                  setActiveRequest(null);
                  setPendingRequests([]);
                }}
                className="btn-secondary"
              >
                Deny
              </button>
              <button
                onClick={async () => {
                  try {
                    await axios.post(`/api/users/enterprise-access/${activeRequest._id}/respond`, { decision: 'accepted' });
                  } catch (_) {}
                  setShowConsent(false);
                  setActiveRequest(null);
                  setPendingRequests([]);
                }}
                className="btn-primary"
              >
                Allow Access
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default DashboardLayout;

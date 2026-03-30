import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrderCart, CONTAINER_SIZES } from '../contexts/OrderCartContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { 
  ShoppingCart, 
  Building, 
  Settings, 
  Package, 
  Plus, 
  Minus, 
  Trash2, 
  Send, 
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  User,
  History,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Mail,
  Eye
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const PlaceOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    cartItems, 
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    getItemCount, 
    isCartEmpty,
    suggestContainerSize 
  } = useOrderCart();

  // State for view mode (order or history)
  const [viewMode, setViewMode] = useState('order'); // 'order' or 'history'

  // State for multi-step flow
  const [step, setStep] = useState('customers'); // 'customers', 'systems', 'products', 'cart'
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [systems, setSystems] = useState([]);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [productSelections, setProductSelections] = useState({});
  const [sendingOrder, setSendingOrder] = useState(false);

  // State for order history
  const [orderHistory, setOrderHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    customerId: '',
    systemId: ''
  });
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [allSystems, setAllSystems] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Check if user can place orders
  const canPlaceOrder = user?.repNumber && user?.orderEmail;

  // Fetch customers
  useEffect(() => {
    if (canPlaceOrder) {
      fetchCustomers();
    } else {
      setLoading(false);
    }
  }, [canPlaceOrder]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/customers', { params: { limit: 100 } });
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all systems for filter dropdown
  const fetchAllSystems = async () => {
    try {
      const response = await axios.get('/api/customers', { params: { limit: 100 } });
      const customersList = response.data.customers || [];
      
      // Fetch systems for each customer
      const systemsPromises = customersList.map(async (customer) => {
        try {
          const systemsResponse = await axios.get(`/api/customers/${customer._id}/systems`);
          return (systemsResponse.data.systems || []).map(sys => ({
            ...sys,
            customerName: customer.name,
            customerId: customer._id
          }));
        } catch {
          return [];
        }
      });
      
      const allSystemsArrays = await Promise.all(systemsPromises);
      const flatSystems = allSystemsArrays.flat();
      setAllSystems(flatSystems);
    } catch (error) {
      console.error('Error fetching all systems:', error);
    }
  };

  // Fetch order history
  const fetchOrderHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const params = {
        page: historyPagination.page,
        limit: historyPagination.limit
      };
      
      if (historyFilters.customerId) {
        params.customerId = historyFilters.customerId;
      }
      if (historyFilters.systemId) {
        params.systemId = historyFilters.systemId;
      }
      
      const response = await axios.get('/api/orders/history', { params });
      
      if (response.data.success) {
        setOrderHistory(response.data.orders);
        setHistoryPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        }));
      }
    } catch (error) {
      console.error('Error fetching order history:', error);
      toast.error('Failed to load order history');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFilters, historyPagination.page, historyPagination.limit]);

  // Fetch history when view mode changes to history or filters change
  useEffect(() => {
    if (viewMode === 'history' && canPlaceOrder) {
      fetchOrderHistory();
      if (allSystems.length === 0) {
        fetchAllSystems();
      }
    }
  }, [viewMode, fetchOrderHistory, canPlaceOrder, allSystems.length]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setHistoryFilters(prev => ({
      ...prev,
      [filterName]: value,
      // Reset system filter when customer changes
      ...(filterName === 'customerId' ? { systemId: '' } : {})
    }));
    setHistoryPagination(prev => ({ ...prev, page: 1 }));
  };

  // Get filtered systems for dropdown (based on selected customer)
  const getFilteredSystems = () => {
    if (!historyFilters.customerId) {
      return allSystems;
    }
    return allSystems.filter(sys => sys.customerId === historyFilters.customerId);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate total items in an order
  const calculateOrderTotalItems = (order) => {
    let count = 0;
    for (const customer of order.customers) {
      for (const system of customer.systems) {
        for (const product of system.products) {
          count += product.quantity;
        }
      }
    }
    return count;
  };

  const fetchSystems = async (customerId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/customers/${customerId}/systems`);
      setSystems(response.data.systems || []);
    } catch (error) {
      console.error('Error fetching systems:', error);
      toast.error('Failed to load systems');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async (systemId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/inventory/system/${systemId}`);
      if (response.data.success) {
        setInventory(response.data.inventory);
        
        // Initialize product selections with smart suggestions
        const selections = {};
        response.data.inventory.products
          .filter(p => p.isActive)
          .forEach(product => {
            const suggestion = suggestContainerSize(product);
            selections[product._id] = {
              containerSize: suggestion.size,
              quantity: suggestion.quantity,
              customSize: ''
            };
          });
        setProductSelections(selections);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    if (!customer.customerNumber) {
      toast.error('This customer needs a Customer Number to place orders. Please update the customer profile first.');
      return;
    }
    setSelectedCustomer(customer);
    setStep('systems');
    fetchSystems(customer._id);
  };

  const handleSelectSystem = (system) => {
    setSelectedSystem(system);
    setStep('products');
    fetchInventory(system._id);
  };

  const handleProductSelectionChange = (productId, field, value) => {
    setProductSelections(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const handleAddToCart = (product) => {
    const selection = productSelections[product._id];
    if (!selection || selection.quantity < 1) {
      toast.error('Please select a quantity');
      return;
    }

    const containerSize = selection.containerSize === 'other' 
      ? selection.customSize 
      : selection.containerSize;

    if (selection.containerSize === 'other' && !selection.customSize) {
      toast.error('Please enter a custom container size');
      return;
    }

    addToCart(
      selectedCustomer._id,
      selectedCustomer.name,
      selectedCustomer.customerNumber,
      selectedSystem._id,
      selectedSystem.name,
      {
        productId: product._id,
        productName: product.name,
        containerSize,
        quantity: selection.quantity
      }
    );

    toast.success(`Added ${product.name} to cart`);
  };

  const handleGenerateOrder = async () => {
    if (isCartEmpty()) {
      toast.error('Cart is empty');
      return;
    }

    try {
      setSendingOrder(true);
      
      const response = await axios.post('/api/orders/send', {
        cartItems,
        repNumber: user.repNumber,
        repEmail: user.email,
        orderEmail: user.orderEmail
      });

      if (response.data.success) {
        toast.success('Order sent successfully!');
        clearCart();
        setStep('customers');
      }
    } catch (error) {
      console.error('Error sending order:', error);
      toast.error(error.response?.data?.message || 'Failed to send order');
    } finally {
      setSendingOrder(false);
    }
  };

  const getWarningBadge = (warningLevel) => {
    switch (warningLevel) {
      case 'low':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Low Stock
          </span>
        );
      case 'gettingLow':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Getting Low
          </span>
        );
      case 'ok':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            OK
          </span>
        );
      default:
        return null;
    }
  };

  // If user hasn't configured ordering settings
  if (!canPlaceOrder) {
    return (
      <div className="px-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <User className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Settings Required</h2>
          <p className="text-gray-600 mb-6">
            Before you can place orders, you need to configure your ordering settings in your profile:
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
            <ul className="space-y-3">
              <li className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Rep Number:</strong> {user?.repNumber ? <span className="text-green-600">✓ Set</span> : <span className="text-red-600">Not set</span>}
                </span>
              </li>
              <li className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Order Email:</strong> {user?.orderEmail ? <span className="text-green-600">✓ Set</span> : <span className="text-red-600">Not set</span>}
                </span>
              </li>
            </ul>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="btn-primary"
          >
            Go to Profile Settings
          </button>
        </div>
      </div>
    );
  }

  if (loading && step === 'customers') {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <ShoppingCart className="h-6 w-6 mr-2 text-blue-600" />
              Place Order
            </h1>
            <p className="text-gray-600 mt-1">
              Select products from your customers' inventory to order
            </p>
          </div>
          
          {/* Cart indicator - only show in order mode */}
          {viewMode === 'order' && (
            <button
              onClick={() => setStep('cart')}
              className={`relative btn-primary ${isCartEmpty() ? 'opacity-50' : ''}`}
              disabled={isCartEmpty()}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              View Cart
              {!isCartEmpty() && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getItemCount()}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 mt-6 border-b border-gray-200">
          <button
            onClick={() => setViewMode('order')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              viewMode === 'order'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ShoppingCart className="h-4 w-4 inline-block mr-2" />
            Place Order
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              viewMode === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="h-4 w-4 inline-block mr-2" />
            Order History
          </button>
        </div>

        {/* Breadcrumb - only show in order mode */}
        {viewMode === 'order' && (
          <div className="flex items-center space-x-2 mt-4 text-sm">
            <button 
              onClick={() => { setStep('customers'); setSelectedCustomer(null); setSelectedSystem(null); }}
              className={`${step === 'customers' ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Customers
            </button>
            {selectedCustomer && (
              <>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <button 
                  onClick={() => { setStep('systems'); setSelectedSystem(null); }}
                  className={`${step === 'systems' ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {selectedCustomer.name}
                </button>
              </>
            )}
            {selectedSystem && (
              <>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <span className={`${step === 'products' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  {selectedSystem.name}
                </span>
              </>
            )}
            {step === 'cart' && (
              <>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <span className="text-blue-600 font-medium">Cart</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Order History View */}
      {viewMode === 'history' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-gray-500" />
                <h3 className="font-medium text-gray-900">Filters</h3>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="w-64">
                  <label className="block text-sm text-gray-600 mb-1">Customer</label>
                  <select
                    value={historyFilters.customerId}
                    onChange={(e) => handleFilterChange('customerId', e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Customers</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name} {customer.customerNumber ? `(#${customer.customerNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-64">
                  <label className="block text-sm text-gray-600 mb-1">System</label>
                  <select
                    value={historyFilters.systemId}
                    onChange={(e) => handleFilterChange('systemId', e.target.value)}
                    className="input-field"
                    disabled={getFilteredSystems().length === 0}
                  >
                    <option value="">All Systems</option>
                    {getFilteredSystems().map(system => (
                      <option key={system._id} value={system._id}>
                        {system.name} ({system.customerName})
                      </option>
                    ))}
                  </select>
                </div>
                {(historyFilters.customerId || historyFilters.systemId) && (
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setHistoryFilters({ customerId: '', systemId: '' });
                        setHistoryPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="btn-secondary text-sm"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order History List */}
          {historyLoading ? (
            <LoadingSpinner size="lg" text="Loading order history..." />
          ) : orderHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">
                {historyFilters.customerId || historyFilters.systemId
                  ? 'No orders match the selected filters'
                  : 'You haven\'t placed any orders yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orderHistory.map(order => (
                <div key={order._id} className="card">
                  <div className="card-body">
                    {/* Order Header */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <ShoppingCart className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">
                              Order for {order.customers.map(c => c.customerName).join(', ')}
                            </h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              order.status === 'sent' ? 'bg-green-100 text-green-700' :
                              order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                            <span className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {formatDate(order.createdAt)}
                            </span>
                            <span className="flex items-center">
                              <Package className="h-3.5 w-3.5 mr-1" />
                              {calculateOrderTotalItems(order)} items
                            </span>
                            <span className="flex items-center">
                              <Mail className="h-3.5 w-3.5 mr-1" />
                              {order.orderEmail}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Eye className={`h-5 w-5 text-gray-400 transition-transform ${expandedOrderId === order._id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Order Details (Expandable) */}
                    {expandedOrderId === order._id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        {order.customers.map(customer => (
                          <div key={customer.customerId} className="mb-4 last:mb-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <Building className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-gray-900">
                                {customer.customerName} (#{customer.customerNumber})
                              </span>
                            </div>
                            {customer.systems.map(system => (
                              <div key={system.systemId} className="ml-6 mb-3">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Settings className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">{system.systemName}</span>
                                </div>
                                <div className="ml-6 space-y-1">
                                  {system.products.map((product, idx) => (
                                    <div 
                                      key={idx}
                                      className="flex items-center text-sm text-gray-600 py-1 px-2 bg-gray-50 rounded"
                                    >
                                      <Package className="h-3.5 w-3.5 text-purple-500 mr-2" />
                                      <span>{product.productName}</span>
                                      <span className="mx-2 text-gray-400">•</span>
                                      <span>{product.containerSize} gal</span>
                                      <span className="mx-2 text-gray-400">•</span>
                                      <span>Qty: {product.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {historyPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-gray-600">
                    Showing {((historyPagination.page - 1) * historyPagination.limit) + 1} to{' '}
                    {Math.min(historyPagination.page * historyPagination.limit, historyPagination.total)} of{' '}
                    {historyPagination.total} orders
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setHistoryPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={historyPagination.page <= 1}
                      className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {historyPagination.page} of {historyPagination.totalPages}
                    </span>
                    <button
                      onClick={() => setHistoryPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={historyPagination.page >= historyPagination.totalPages}
                      className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Order Flow Content - only show in order mode */}
      {viewMode === 'order' && (
        <>
      {/* Step: Select Customer */}
      {step === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-600">
                Add customers to start placing orders
              </p>
            </div>
          ) : (
            customers.map(customer => (
              <div
                key={customer._id}
                onClick={() => handleSelectCustomer(customer)}
                className={`card cursor-pointer hover:shadow-medium transition-shadow ${
                  !customer.customerNumber ? 'opacity-60' : ''
                }`}
              >
                <div className="card-body">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{customer.name}</h3>
                      {customer.customerNumber ? (
                        <p className="text-sm text-gray-500">Customer #: {customer.customerNumber}</p>
                      ) : (
                        <p className="text-sm text-red-500 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          No Customer # - Cannot order
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {customer.systemCount || 0} systems
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Step: Select System */}
      {step === 'systems' && (
        <div>
          <button
            onClick={() => { setStep('customers'); setSelectedCustomer(null); }}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </button>

          {loading ? (
            <LoadingSpinner size="lg" text="Loading systems..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systems.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No systems found</h3>
                  <p className="text-gray-600">
                    This customer has no systems with inventory
                  </p>
                </div>
              ) : (
                systems.map(system => (
                  <div
                    key={system._id}
                    onClick={() => handleSelectSystem(system)}
                    className="card cursor-pointer hover:shadow-medium transition-shadow"
                  >
                    <div className="card-body">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Settings className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{system.name}</h3>
                          <p className="text-sm text-gray-500 capitalize">
                            {system.type?.replace('_', ' ')}
                          </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Step: Select Products */}
      {step === 'products' && (
        <div>
          <button
            onClick={() => { setStep('systems'); setSelectedSystem(null); }}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Systems
          </button>

          {loading ? (
            <LoadingSpinner size="lg" text="Loading inventory..." />
          ) : (
            <div className="space-y-4">
              {!inventory || inventory.products.filter(p => p.isActive).length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-600">
                    This system has no inventory products to order
                  </p>
                </div>
              ) : (
                inventory.products
                  .filter(p => p.isActive)
                  .map(product => {
                    const selection = productSelections[product._id] || { containerSize: 55, quantity: 1, customSize: '' };
                    const warningLevel = product.usageSummary?.warningLevel;
                    
                    return (
                      <div 
                        key={product._id} 
                        className={`card ${
                          warningLevel === 'low' ? 'ring-2 ring-red-300 bg-red-50' :
                          warningLevel === 'gettingLow' ? 'ring-2 ring-amber-300 bg-amber-50' : ''
                        }`}
                      >
                        <div className="card-body">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            {/* Product Info */}
                            <div className="flex items-start space-x-4 flex-1">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <Package className="h-5 w-5 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                                  {getWarningBadge(warningLevel)}
                                </div>
                                <div className="mt-1 text-sm text-gray-600 space-y-1">
                                  {product.usageSummary?.usageRate && (
                                    <p>Usage: {product.usageSummary.usageRate.toFixed(2)} gal/day</p>
                                  )}
                                  {product.usageSummary?.daysOfSupply && (
                                    <p>Days of supply: {Math.floor(product.usageSummary.daysOfSupply)} days</p>
                                  )}
                                  {product.usageSummary?.totalAvailable && (
                                    <p>On hand: {product.usageSummary.totalAvailable.toFixed(1)} gallons</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Selection Controls */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Container Size</label>
                                <select
                                  value={selection.containerSize}
                                  onChange={(e) => handleProductSelectionChange(product._id, 'containerSize', e.target.value === 'other' ? 'other' : Number(e.target.value))}
                                  className="input-field py-1.5 w-32"
                                >
                                  {CONTAINER_SIZES.map(size => (
                                    <option key={size.value} value={size.value}>
                                      {size.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {selection.containerSize === 'other' && (
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Custom Size (gal)</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={selection.customSize}
                                    onChange={(e) => handleProductSelectionChange(product._id, 'customSize', e.target.value)}
                                    className="input-field py-1.5 w-24"
                                    placeholder="Gallons"
                                  />
                                </div>
                              )}

                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleProductSelectionChange(product._id, 'quantity', Math.max(1, selection.quantity - 1))}
                                    className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={selection.quantity}
                                    onChange={(e) => handleProductSelectionChange(product._id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                    className="input-field py-1.5 w-16 text-center"
                                  />
                                  <button
                                    onClick={() => handleProductSelectionChange(product._id, 'quantity', selection.quantity + 1)}
                                    className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <button
                                onClick={() => handleAddToCart(product)}
                                className="btn-primary py-2 whitespace-nowrap"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add to Cart
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}

              {/* Continue adding button */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => { setStep('customers'); setSelectedCustomer(null); setSelectedSystem(null); }}
                  className="btn-secondary"
                >
                  Add from Another Customer
                </button>
                
                {!isCartEmpty() && (
                  <button
                    onClick={() => setStep('cart')}
                    className="btn-primary"
                  >
                    View Cart ({getItemCount()} items)
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step: Cart */}
      {step === 'cart' && (
        <div>
          <button
            onClick={() => setStep('customers')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Continue Shopping
          </button>

          {isCartEmpty() ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-600 mb-4">
                Add products from your customers' inventory
              </p>
              <button
                onClick={() => setStep('customers')}
                className="btn-primary"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Order Preview */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Order Preview</h3>
                </div>
                <div className="card-body">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Subject:</strong> rep id #{user.repNumber}, order for customer id #{Object.values(cartItems).map(c => c.customerNumber).join(', ')}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>To:</strong> {user.orderEmail}
                    </p>
                  </div>

                  {Object.entries(cartItems).map(([customerId, customerData]) => (
                    <div key={customerId} className="mb-6 last:mb-0">
                      <div className="flex items-center space-x-2 mb-3 pb-2 border-b">
                        <Building className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900">
                          Customer ID #{customerData.customerNumber} ({customerData.customerName})
                        </h4>
                      </div>

                      {Object.entries(customerData.systems).map(([systemId, systemData]) => (
                        <div key={systemId} className="ml-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Settings className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">{systemData.systemName}</span>
                          </div>
                          
                          <div className="ml-6 space-y-2">
                            {systemData.products.map((product, index) => (
                              <div 
                                key={`${product.productId}-${product.containerSize}-${index}`}
                                className="flex items-center justify-between py-2 px-3 bg-white rounded border"
                              >
                                <div className="flex items-center space-x-3">
                                  <Package className="h-4 w-4 text-purple-600" />
                                  <span className="text-sm text-gray-900">
                                    {product.productName}, {product.containerSize} gal, qty {product.quantity}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => updateQuantity(customerId, systemId, product.productId, product.containerSize, product.quantity - 1)}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="w-8 text-center">{product.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(customerId, systemId, product.productId, product.containerSize, product.quantity + 1)}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => removeFromCart(customerId, systemId, product.productId, product.containerSize)}
                                    className="p-1 text-red-400 hover:text-red-600 ml-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={clearCart}
                  className="btn-secondary text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart
                </button>

                <button
                  onClick={handleGenerateOrder}
                  disabled={sendingOrder}
                  className="btn-primary"
                >
                  {sendingOrder ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Generate & Send Order
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default PlaceOrder;

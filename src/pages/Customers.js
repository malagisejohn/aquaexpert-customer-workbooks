import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import UpgradePrompt from '../components/common/UpgradePrompt';
import { Plus, Search, Users, Building, Eye, Edit, Trash2, Settings, UserCog, Crown } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Customers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [usage, setUsage] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCustomers();
      fetchUsage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, user]);

  const fetchUsage = async () => {
    try {
      const response = await axios.get('/api/subscriptions/usage');
      setUsage(response.data);
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const fetchCustomers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/customers', {
        params: {
          page,
          limit: 10,
          search
        }
      });
      
      const customersData = response.data.customers;
      
      // For enterprise users, fetch account status for each customer
      if (user?.subscription?.plan === 'enterprise') {
        const customersWithAccounts = await Promise.all(
          customersData.map(async (customer) => {
            try {
              const accountRes = await axios.get(`/api/customers/${customer._id}/account`);
              return { ...customer, accountInfo: accountRes.data };
            } catch (error) {
              return { ...customer, accountInfo: { hasAccount: false } };
            }
          })
        );
        setCustomers(customersWithAccounts);
      } else {
        setCustomers(customersData);
      }
      
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleAddCustomer = () => {
    // Check if at customer limit
    if (usage && usage.atLimit?.customers) {
      setShowUpgradeModal(true);
      return;
    }
    setShowAddModal(true);
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      await axios.delete(`/api/customers/${customerId}`);
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading customers..." />
      </div>
    );
  }

  return (
    <div className="px-6 max-w-7xl mx-auto">
      {/* Upgrade Banner - show when at customer limit */}
      {usage && usage.atLimit?.customers && (
        <div className="mb-4">
          <UpgradePrompt
            type="customers"
            currentUsage={usage.usage?.customers}
            limit={usage.limits?.maxCustomers}
            variant="banner"
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600 mt-1">
              Manage your customer organizations and their water treatment systems
            </p>
            {/* Usage indicator for free users */}
            {usage && !usage.isUnlimited && (
              <p className="text-sm text-gray-500 mt-1">
                <span className={usage.atLimit?.customers ? 'text-red-600 font-medium' : ''}>
                  {usage.usage?.customers || 0} / {usage.limits?.maxCustomers} customers used
                </span>
                {usage.atLimit?.customers && (
                  <span className="ml-2 text-red-600">• Limit reached</span>
                )}
              </p>
            )}
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-2">
            {usage && usage.atLimit?.customers ? (
              <button
                onClick={() => navigate('/subscription')}
                className="btn-primary bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Add More
              </button>
            ) : (
              <button
                onClick={handleAddCustomer}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={handleSearch}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customer list */}
      {customers.length > 0 ? (
        <div className="space-y-4">
          {customers.map((customer) => {
            const hasOperatorAccount = customer.accountInfo?.hasAccount;
            const isEnterprise = user?.subscription?.plan === 'enterprise';
            
            // Card is clickable if: not enterprise OR (enterprise and no operator account)
            const isClickable = !isEnterprise || (isEnterprise && !hasOperatorAccount);
            
            return (
              <div 
                key={customer._id} 
                className={`card hover:shadow-medium transition-shadow ${
                  isClickable ? 'cursor-pointer' : ''
                }`}
                onClick={() => {
                  // If clickable, navigate to systems page
                  if (isClickable) {
                    navigate(`/customers/${customer._id}/systems`);
                  }
                }}
              >
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Building className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {customer.name}
                        </h3>
                        {customer.description && (
                          <p className="text-gray-600 mb-2">
                            {customer.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          {customer.contactInfo?.primaryContact?.name && (
                            <span className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {customer.contactInfo.primaryContact.name}
                            </span>
                          )}
                          {customer.contactInfo?.primaryContact?.email && (
                            <span>{customer.contactInfo.primaryContact.email}</span>
                          )}
                          <span className="flex items-center">
                            <Building className="h-4 w-4 mr-1" />
                            {customer.systemCount || 0} systems
                          </span>
                          {isEnterprise && (
                            hasOperatorAccount ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Operator Account Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                No Operator Account
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/customers/${customer._id}`)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/customers/${customer._id}/edit`)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit customer"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer._id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete customer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {customer.tags && customer.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {customer.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Action buttons - show systems button for all customers, operator account button only for enterprise */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/customers/${customer._id}/systems`)}
                      className="btn-secondary flex-1"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      View Systems
                    </button>
                    {isEnterprise && (
                      <button
                        onClick={() => navigate(`/customers/${customer._id}/operator-setup`)}
                        className="btn-primary flex-1"
                      >
                        <UserCog className="h-4 w-4 mr-2" />
                        Operator Account
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-600 mb-6">
            {search ? 'Try adjusting your search terms' : 'Get started by adding your first customer'}
          </p>
          {!search && (
            <button
              onClick={handleAddCustomer}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {Math.min((pagination.current - 1) * 10 + 1, pagination.total)} to{' '}
            {Math.min(pagination.current * 10, pagination.total)} of {pagination.total} customers
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchCustomers(pagination.current - 1)}
              disabled={pagination.current <= 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => fetchCustomers(pagination.current + 1)}
              disabled={pagination.current >= pagination.pages}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <CustomerModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCustomers();
            fetchUsage();
          }}
          onUpgradeRequired={() => {
            setShowAddModal(false);
            setShowUpgradeModal(true);
          }}
        />
      )}

      {/* Upgrade Modal - shown when user hits customer limit */}
      {showUpgradeModal && (
        <UpgradePrompt
          type="customers"
          currentUsage={usage?.usage?.customers}
          limit={usage?.limits?.maxCustomers}
          variant="modal"
          onDismiss={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
};

// Simple Customer Modal Component
const CustomerModal = ({ isOpen, onClose, onSuccess, onUpgradeRequired }) => {
  const [formData, setFormData] = useState({
    name: '',
    customerNumber: '',
    description: '',
    contactInfo: {
      primaryContact: {
        name: '',
        email: '',
        phone: '',
        title: ''
      },
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      }
    },
    comments: {
      general: '',
      serviceHistory: '',
      specialRequirements: ''
    }
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('/api/customers', formData);
      toast.success('Customer created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating customer:', error);
      // Check if this is a limit reached error
      if (error.response?.status === 403 && error.response?.data?.upgradeRequired) {
        toast.error('Customer limit reached. Please upgrade to add more customers.');
        if (onUpgradeRequired) {
          onUpgradeRequired();
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to create customer');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child, grandchild] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: grandchild ? {
            ...prev[parent][child],
            [grandchild]: value
          } : value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Customer</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter customer name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Number <span className="text-gray-400 text-xs">(Required for ordering)</span>
              </label>
              <input
                type="text"
                name="customerNumber"
                value={formData.customerNumber}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter customer number"
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
                placeholder="Brief description of the customer"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Contact Name
              </label>
              <input
                type="text"
                name="contactInfo.primaryContact.name"
                value={formData.contactInfo.primaryContact.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Contact person name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                name="contactInfo.primaryContact.email"
                value={formData.contactInfo.primaryContact.email}
                onChange={handleChange}
                className="input-field"
                placeholder="contact@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                General Comments (Optional)
              </label>
              <textarea
                name="comments.general"
                value={formData.comments.general}
                onChange={handleChange}
                className="input-field"
                rows={3}
                placeholder="Any important information about this customer..."
              />
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
                {loading ? <LoadingSpinner size="sm" color="white" /> : 'Create Customer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Customers;

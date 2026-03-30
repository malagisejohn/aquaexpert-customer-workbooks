import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Building, ArrowLeft, Plus, Settings, Edit, Save, X, UserPlus, Key, Download } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import TodoButton from '../components/todos/TodoButton';
import TodoList from '../components/todos/TodoList';

const CustomerDetail = ({ editMode = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEnterprise = user?.accountType !== 'customer' && user?.subscription?.plan === 'enterprise';
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [systems, setSystems] = useState([]);
  const [isEditing, setIsEditing] = useState(editMode);
  const [editData, setEditData] = useState({
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
      additionalEmails: []
    },
    comments: {
      general: '',
      serviceHistory: '',
      specialRequirements: ''
    }
  });
  const [saving, setSaving] = useState(false);
  const [customerAccount, setCustomerAccount] = useState(null);
  const [accountData, setAccountData] = useState({
    username: '',
    password: '',
    adminPassword: ''
  });
  const [showAccountSection, setShowAccountSection] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  // Functions for managing additional emails
  const addAdditionalEmail = () => {
    setEditData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        additionalEmails: [
          ...prev.contactInfo.additionalEmails,
          {
            email: '',
            name: '',
            title: '',
            alarmNotifications: {
              enabled: true,
              wallchemAlarms: true
            }
          }
        ]
      }
    }));
  };

  const removeAdditionalEmail = (index) => {
    setEditData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        additionalEmails: prev.contactInfo.additionalEmails.filter((_, i) => i !== index)
      }
    }));
  };

  const updateAdditionalEmail = (index, field, value) => {
    setEditData(prev => {
      const newEmails = [...prev.contactInfo.additionalEmails];
      if (field.startsWith('alarmNotifications.')) {
        const notificationField = field.split('.')[1];
        newEmails[index] = {
          ...newEmails[index],
          alarmNotifications: {
            ...newEmails[index].alarmNotifications,
            [notificationField]: value
          }
        };
      } else {
        newEmails[index] = {
          ...newEmails[index],
          [field]: value
        };
      }
      return {
        ...prev,
        contactInfo: {
          ...prev.contactInfo,
          additionalEmails: newEmails
        }
      };
    });
  };

  useEffect(() => {
    fetchCustomerDetails();
    if (user?.subscription?.plan === 'enterprise') {
      fetchCustomerAccount();
    }
  }, [id, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCustomerAccount = async () => {
    try {
      const response = await axios.get(`/api/customers/${id}/account`);
      setCustomerAccount(response.data);
      if (response.data.hasAccount) {
        setAccountData({
          username: response.data.account.username,
          password: '',
          adminPassword: ''
        });
      }
    } catch (error) {
      console.error('Error fetching customer account:', error);
    }
  };

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const [customerRes, systemsRes] = await Promise.all([
        axios.get(`/api/customers/${id}`),
        axios.get(`/api/customers/${id}/systems`)
      ]);
      
      const customerData = customerRes.data.customer;
      setCustomer(customerData);
      setSystems(systemsRes.data.systems);
      
      // Initialize edit data
      setEditData({
        name: customerData.name || '',
        customerNumber: customerData.customerNumber || '',
        description: customerData.description || '',
        contactInfo: {
          primaryContact: {
            name: customerData.contactInfo?.primaryContact?.name || '',
            email: customerData.contactInfo?.primaryContact?.email || '',
            phone: customerData.contactInfo?.primaryContact?.phone || '',
            title: customerData.contactInfo?.primaryContact?.title || ''
          },
          additionalEmails: customerData.contactInfo?.additionalEmails || []
        },
        comments: {
          general: customerData.comments?.general || '',
          serviceHistory: customerData.comments?.serviceHistory || '',
          specialRequirements: customerData.comments?.specialRequirements || ''
        }
      });
    } catch (error) {
      console.error('Error fetching customer details:', error);
      toast.error('Failed to load customer details');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child, grandchild] = name.split('.');
      setEditData(prev => ({
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
      setEditData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update customer info (now includes additionalEmails in the schema)
      const response = await axios.put(`/api/customers/${id}`, editData);
      
      setCustomer(response.data.customer);
      setIsEditing(false);
      toast.success('Customer updated successfully');
      if (editMode) {
        navigate(`/customers/${id}`);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error(error.response?.data?.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset edit data to current customer data
    setEditData({
      name: customer.name || '',
      customerNumber: customer.customerNumber || '',
      description: customer.description || '',
      contactInfo: {
        primaryContact: {
          name: customer.contactInfo?.primaryContact?.name || '',
          email: customer.contactInfo?.primaryContact?.email || '',
          phone: customer.contactInfo?.primaryContact?.phone || '',
          title: customer.contactInfo?.primaryContact?.title || ''
        }
      },
      comments: {
        general: customer.comments?.general || '',
        serviceHistory: customer.comments?.serviceHistory || '',
        specialRequirements: customer.comments?.specialRequirements || ''
      }
    });
    if (editMode) {
      navigate(`/customers/${id}`);
    }
  };

  const handleSaveAccount = async () => {
    if (!accountData.username || !accountData.password || !accountData.adminPassword) {
      toast.error('Please fill in all account fields');
      return;
    }

    if (accountData.password.length < 6 || accountData.adminPassword.length < 6) {
      toast.error('Passwords must be at least 6 characters');
      return;
    }

    setSavingAccount(true);
    try {
      await axios.put(`/api/customers/${id}/account`, accountData);
      toast.success('Customer account saved successfully');
      setShowAccountSection(false);
      fetchCustomerAccount();
    } catch (error) {
      console.error('Error saving customer account:', error);
      toast.error(error.response?.data?.message || 'Failed to save customer account');
    } finally {
      setSavingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading customer details..." />
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
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    name="name"
                    value={editData.name}
                    onChange={handleEditChange}
                    className="w-full text-2xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-600"
                    placeholder="Customer name"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-500 whitespace-nowrap">Customer #:</span>
                    <input
                      type="text"
                      name="customerNumber"
                      value={editData.customerNumber}
                      onChange={handleEditChange}
                      className="text-sm bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 flex-1 min-w-[120px]"
                      placeholder="Customer number"
                    />
                  </div>
                  <textarea
                    name="description"
                    value={editData.description}
                    onChange={handleEditChange}
                    className="w-full text-gray-600 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Description"
                    rows={1}
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 break-words">{customer.name}</h1>
                  {customer.customerNumber && (
                    <p className="text-sm text-gray-500">Customer #: {customer.customerNumber}</p>
                  )}
                  {customer.description && (
                    <p className="text-gray-600 mt-1 break-words">{customer.description}</p>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2 lg:flex-nowrap">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="btn-secondary"
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                {isEnterprise && (
                  <TodoButton
                    source="customer_page"
                    customerId={customer._id}
                    customerName={customer.name}
                    variant="button"
                  />
                )}
                {user?.subscription?.plan === 'enterprise' && (
                  <button
                    onClick={() => navigate(`/customers/${customer._id}/systems?generateReport=1`)}
                    className="btn-secondary"
                    disabled={systems.length === 0}
                    title={systems.length === 0 ? 'No systems available for this customer' : 'Generate customer report'}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </button>
                )}
                <button
                  onClick={() => navigate(`/systems?customerId=${customer._id}`)}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add System
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Contact
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="contactInfo.primaryContact.name"
                    value={editData.contactInfo.primaryContact.name}
                    onChange={handleEditChange}
                    className="input-field"
                    placeholder="Contact person name"
                  />
                ) : (
                  <p className="text-gray-900">{customer.contactInfo?.primaryContact?.name || 'Not specified'}</p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="contactInfo.primaryContact.title"
                    value={editData.contactInfo.primaryContact.title}
                    onChange={handleEditChange}
                    className="input-field"
                    placeholder="Job title"
                  />
                ) : (
                  <p className="text-gray-900">{customer.contactInfo?.primaryContact?.title || 'Not specified'}</p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="contactInfo.primaryContact.email"
                    value={editData.contactInfo.primaryContact.email}
                    onChange={handleEditChange}
                    className="input-field"
                    placeholder="contact@example.com"
                  />
                ) : (
                  <p className="text-gray-900">{customer.contactInfo?.primaryContact?.email || 'Not specified'}</p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="contactInfo.primaryContact.phone"
                    value={editData.contactInfo.primaryContact.phone}
                    onChange={handleEditChange}
                    className="input-field"
                    placeholder="(555) 123-4567"
                  />
                ) : (
                  <p className="text-gray-900">{customer.contactInfo?.primaryContact?.phone || 'Not specified'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Email Contacts */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Additional Email Contacts</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Additional contacts for alarm notifications and system updates
                  </p>
                </div>
                {isEditing && (
                  <button
                    onClick={addAdditionalEmail}
                    className="btn-primary text-sm"
                    type="button"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Email
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              {isEditing ? (
                <div className="space-y-4">
                  {editData.contactInfo.additionalEmails.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No additional email contacts configured. Click "Add Email" to add one.
                    </p>
                  ) : (
                    editData.contactInfo.additionalEmails.map((emailContact, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            Contact #{index + 1}
                          </h4>
                          <button
                            onClick={() => removeAdditionalEmail(index)}
                            className="text-red-500 hover:text-red-700"
                            type="button"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email Address *
                            </label>
                            <input
                              type="email"
                              value={emailContact.email}
                              onChange={(e) => updateAdditionalEmail(index, 'email', e.target.value)}
                              className="input-field"
                              placeholder="contact@example.com"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={emailContact.name}
                              onChange={(e) => updateAdditionalEmail(index, 'name', e.target.value)}
                              className="input-field"
                              placeholder="Contact name"
                            />
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={emailContact.title}
                            onChange={(e) => updateAdditionalEmail(index, 'title', e.target.value)}
                            className="input-field"
                            placeholder="Job title"
                          />
                        </div>
                        
                        <div className="border-t border-gray-200 pt-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-3">
                            Alarm Notification Preferences
                          </h5>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={emailContact.alarmNotifications?.enabled || false}
                                onChange={(e) => updateAdditionalEmail(index, 'alarmNotifications.enabled', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                Enable alarm notifications for this contact
                              </span>
                            </label>
                            
                            {emailContact.alarmNotifications?.enabled && (
                              <label className="flex items-center ml-6">
                                <input
                                  type="checkbox"
                                  checked={emailContact.alarmNotifications?.wallchemAlarms || false}
                                  onChange={(e) => updateAdditionalEmail(index, 'alarmNotifications.wallchemAlarms', e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                  Receive Walchem controller alarm notifications
                                </span>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {customer.contactInfo?.additionalEmails?.length === 0 || !customer.contactInfo?.additionalEmails ? (
                    <p className="text-gray-500">No additional email contacts configured.</p>
                  ) : (
                    customer.contactInfo.additionalEmails.map((emailContact, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {emailContact.name || `Contact #${index + 1}`}
                          </h4>
                          <div className="flex flex-col items-end space-y-1">
                            {emailContact.alarmNotifications?.enabled && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Alarms Enabled
                              </span>
                            )}
                            {emailContact.alarmNotifications?.enabled && emailContact.alarmNotifications?.wallchemAlarms && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Walchem Alarms
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{emailContact.email}</p>
                        {emailContact.title && (
                          <p className="text-sm text-gray-500">{emailContact.title}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Comments & Context Section */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">General Comments & Context</h3>
              <p className="text-sm text-gray-600 mt-1">
                Information for service reports and AI assistance
              </p>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  General Comments
                </label>
                {isEditing ? (
                  <textarea
                    name="comments.general"
                    value={editData.comments.general}
                    onChange={handleEditChange}
                    className="input-field"
                    rows={4}
                    placeholder="General information about this customer, their facilities, preferences, or any other relevant context..."
                  />
                ) : (
                  <div className="text-gray-900 whitespace-pre-wrap min-h-[2rem] p-2 bg-gray-50 rounded border">
                    {customer.comments?.general || 'No general comments added yet.'}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service History Notes
                </label>
                {isEditing ? (
                  <textarea
                    name="comments.serviceHistory"
                    value={editData.comments.serviceHistory}
                    onChange={handleEditChange}
                    className="input-field"
                    rows={3}
                    placeholder="Past service visits, recurring issues, maintenance patterns, equipment history..."
                  />
                ) : (
                  <div className="text-gray-900 whitespace-pre-wrap min-h-[2rem] p-2 bg-gray-50 rounded border">
                    {customer.comments?.serviceHistory || 'No service history notes added yet.'}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requirements
                </label>
                {isEditing ? (
                  <textarea
                    name="comments.specialRequirements"
                    value={editData.comments.specialRequirements}
                    onChange={handleEditChange}
                    className="input-field"
                    rows={2}
                    placeholder="Special handling requirements, access restrictions, safety considerations..."
                  />
                ) : (
                  <div className="text-gray-900 whitespace-pre-wrap min-h-[2rem] p-2 bg-gray-50 rounded border">
                    {customer.comments?.specialRequirements || 'No special requirements noted.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer Account Setup - Enterprise Only */}
          {user?.subscription?.plan === 'enterprise' && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Customer Portal Access</h3>
                  {!showAccountSection && (
                    <button
                      onClick={() => setShowAccountSection(true)}
                      className="btn-secondary text-sm"
                    >
                      <Key className="h-4 w-4 mr-1" />
                      {customerAccount?.hasAccount ? 'Update' : 'Create Account'}
                    </button>
                  )}
                </div>
              </div>
              <div className="card-body">
                {showAccountSection ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={accountData.username}
                        onChange={(e) => setAccountData({ ...accountData, username: e.target.value })}
                        className="input-field"
                        placeholder="customerusername"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={accountData.password}
                        onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                        className="input-field"
                        placeholder="Min 6 characters"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Admin Password
                      </label>
                      <input
                        type="password"
                        value={accountData.adminPassword}
                        onChange={(e) => setAccountData({ ...accountData, adminPassword: e.target.value })}
                        className="input-field"
                        placeholder="Min 6 characters"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        onClick={() => setShowAccountSection(false)}
                        className="btn-secondary"
                        disabled={savingAccount}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveAccount}
                        className="btn-primary"
                        disabled={savingAccount}
                      >
                        {savingAccount ? (
                          <LoadingSpinner size="sm" color="white" />
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {customerAccount?.hasAccount ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">
                            Username: <span className="font-mono font-medium text-gray-900">{customerAccount.account.username}</span>
                          </p>
                        </div>
                        <UserPlus className="h-5 w-5 text-green-600" />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">
                        No account created yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Quick Stats</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Systems</span>
                  <span className="text-lg font-semibold text-gray-900">{systems.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="text-sm text-gray-900">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Systems */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Systems</h3>
            <button
              onClick={() => navigate(`/systems?customerId=${customer._id}`)}
              className="btn-secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add System
            </button>
          </div>
        </div>
        <div className="card-body">
          {systems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systems.map((system) => (
                <div
                  key={system._id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                  onClick={() => navigate(`/systems/${system._id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Settings className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{system.name}</h4>
                      <p className="text-sm text-gray-600 capitalize">
                        {system.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No systems yet</h4>
              <p className="text-gray-600 mb-4">
                Add your first water treatment system to start monitoring
              </p>
              <button
                onClick={() => navigate(`/systems?customerId=${customer._id}`)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add System
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Todos Section */}
      {isEnterprise && (
        <div className="card mt-8">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Todos</h3>
              <TodoButton
                source="customer_page"
                customerId={customer._id}
                customerName={customer.name}
                variant="button"
              />
            </div>
          </div>
          <div className="card-body">
            <TodoList
              customerId={customer._id}
              showFilters={false}
              showGroupBy={false}
              compact={true}
              maxHeight="300px"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;

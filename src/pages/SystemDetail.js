import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { 
  Settings, 
  ArrowLeft, 
  Edit, 
  Save, 
  X,
  Thermometer, 
  Zap, 
  Recycle, 
  Droplets,
  Droplet,
  Factory,
  MapPin,
  FileText
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import TodoButton from '../components/todos/TodoButton';
import TodoList from '../components/todos/TodoList';

const SYSTEM_TYPES = {
  pretreatment: {
    name: 'Pretreatment',
    icon: Droplet,
    color: 'teal',
    description: 'Pretreatment systems (e.g., softeners, RO, city & well water)'
  },
  sanikill: {
    name: 'Sanikill',
    icon: Factory,
    color: 'teal',
    description: 'Sanikill monochloramine treatment systems'
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

const SystemDetail = ({ editMode = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [system, setSystem] = useState(null);
  
  // Check if user is an operator account - operators cannot edit systems
  const isOperator = user?.accountType === 'customer';
  const isEnterprise = user?.accountType !== 'customer' && user?.subscription?.plan === 'enterprise';
  const [isEditing, setIsEditing] = useState(editMode && !isOperator);
  const [editData, setEditData] = useState({
    name: '',
    type: '',
    description: '',
    location: '',
    customerId: '',
    specifications: {},
    operatingConditions: {},
    tags: []
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSystem();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (system && isEditing) {
      const customerId = system.customerId?._id || system.customerId;
      setEditData({
        name: system.name || '',
        type: system.type || '',
        description: system.description || '',
        location: system.location || '',
        customerId: customerId || '',
        specifications: system.specifications || {},
        operatingConditions: system.operatingConditions || {},
        tags: system.tags || []
      });
    }
  }, [system, isEditing]);

  const fetchSystem = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/systems/${id}`);
      setSystem(response.data.system);
    } catch (error) {
      console.error('Error fetching system:', error);
      toast.error('Failed to load system');
      if (error.response?.status === 404) {
        navigate('/systems');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await axios.put(`/api/systems/${id}`, editData);
      setSystem(response.data.system);
      setIsEditing(false);
      toast.success('System updated successfully');
      navigate(`/systems/${id}`);
    } catch (error) {
      console.error('Error updating system:', error);
      toast.error(error.response?.data?.message || 'Failed to update system');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    navigate(`/systems/${id}`);
  };

  const handleChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const getSystemTypeConfig = (type) => {
    return SYSTEM_TYPES[type] || {
      name: type,
      icon: Settings,
      color: 'gray',
      description: 'Water treatment system'
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading system..." />
      </div>
    );
  }

  if (!system) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center py-12">
          <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">System Not Found</h1>
          <p className="text-gray-600 mb-6">
            The system you're looking for doesn't exist or you don't have access to it.
          </p>
          <button
            onClick={() => navigate('/systems')}
            className="btn-primary"
          >
            Back to Systems
          </button>
        </div>
      </div>
    );
  }

  const typeConfig = getSystemTypeConfig(system.type);
  const IconComponent = typeConfig.icon;

  return (
    <div className="max-w-4xl mx-auto px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button
              onClick={() => {
                // Customer-level accounts should always go back to /systems
                // Enterprise/standard users go back to customer systems page if applicable
                if (user?.accountType === 'customer') {
                  navigate('/systems');
                } else {
                  const customerId = system.customerId?._id || system.customerId;
                  navigate(customerId ? `/customers/${customerId}/systems` : '/systems');
                }
              }}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className={`p-3 bg-${typeConfig.color}-100 rounded-lg mr-3`}>
              <IconComponent className={`h-6 w-6 text-${typeConfig.color}-600`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit System' : system.name}
              </h1>
              <p className="text-sm text-gray-500">{typeConfig.name}</p>
            </div>
          </div>
          
          {/* Hide edit controls for operators - they can only view */}
          {!isOperator && (
            <div className="flex space-x-2">
              {!isEditing ? (
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
                      source="system_page"
                      customerId={system.customerId?._id || system.customerId}
                      systemId={system._id}
                      customerName={system.customerId?.name || ''}
                      systemName={system.name}
                      variant="button"
                    />
                  )}
                </>
              ) : (
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
                        Save Changes
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* System Details */}
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <div className="card-body">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System Name *
                  </label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System Type *
                  </label>
                  <select
                    value={editData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Select a type</option>
                    {Object.entries(SYSTEM_TYPES).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="input-field"
                    placeholder="Building, floor, or area"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="input-field"
                    rows={4}
                    placeholder="Brief description of the system"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start">
                  <Settings className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">System Name</p>
                    <p className="text-gray-900">{system.name}</p>
                  </div>
                </div>
                
                {system.location && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Location</p>
                      <p className="text-gray-900">{system.location}</p>
                    </div>
                  </div>
                )}
                
                {system.description && (
                  <div className="flex items-start">
                    <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Description</p>
                      <p className="text-gray-900">{system.description}</p>
                    </div>
                  </div>
                )}
                
                {system.customerId && (
                  <div className="flex items-start">
                    <Factory className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Customer</p>
                      <p className="text-gray-900">
                        {system.customerId?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {!isEditing && system.tags && system.tags.length > 0 && (
          <div className="card">
            <div className="card-body">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {system.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {!isEditing && isEnterprise && (
          <div className="card">
            <div className="card-body">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate(`/systems/${id}/workbook`)}
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  KPI Workbook
                </button>
                <button
                  onClick={() => navigate(`/systems/${id}/inventory`)}
                  className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Factory className="h-5 w-5 mr-2" />
                  Inventory
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Todos Section */}
        {!isEditing && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Todos</h3>
                <TodoButton
                  source="system_page"
                  customerId={system.customerId?._id || system.customerId}
                  systemId={system._id}
                  customerName={system.customerId?.name || ''}
                  systemName={system.name}
                  variant="button"
                />
              </div>
            </div>
            <div className="card-body">
              <TodoList
                systemId={system._id}
                showFilters={false}
                showGroupBy={false}
                compact={true}
                maxHeight="300px"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemDetail;

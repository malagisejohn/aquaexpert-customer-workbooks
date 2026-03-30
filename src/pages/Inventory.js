import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { 
  ArrowLeft, 
  Plus, 
  Package, 
  Edit2, 
  Trash2, 
  TrendingDown,
  TrendingUp,
  Calendar,
  FileText,
  BarChart3,
  Eye,
  Info,
  Activity,
  Edit,
  UserCog,
  Gauge,
  Download
} from 'lucide-react';
import WorkbookInventoryToggle from '../components/common/WorkbookInventoryToggle';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import axios from 'axios';
import toast from 'react-hot-toast';

const Inventory = () => {
  const { id: systemId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [system, setSystem] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddReadingModal, setShowAddReadingModal] = useState(false);
  const [showEditReadingModal, setShowEditReadingModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showTrendsModal, setShowTrendsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedReading, setSelectedReading] = useState(null);
  const [activeProducts, setActiveProducts] = useState([]);
  const [analyticsRefreshTrigger, setAnalyticsRefreshTrigger] = useState(0);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/inventory/system/${systemId}`);
      
      if (response.data.success) {
        setSystem(response.data.system);
        setCustomer(response.data.system.customer);
        setInventory(response.data.inventory);
        setActiveProducts(response.data.inventory.products.filter(p => p.isActive));
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
      if (error.response?.status === 404) {
        navigate('/systems');
      }
    } finally {
      setLoading(false);
    }
  }, [systemId, navigate]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowAddProductModal(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowAddProductModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/inventory/system/${systemId}/products/${productId}`);
      toast.success('Product deleted successfully');
      fetchInventory();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleAddReading = (product) => {
    setSelectedProduct(product);
    setShowAddReadingModal(true);
  };

  const handleViewUsage = (product) => {
    setSelectedProduct(product);
    setShowUsageModal(true);
  };

  const handleEditReading = (product, reading) => {
    setSelectedProduct(product);
    setSelectedReading(reading);
    setShowEditReadingModal(true);
  };

  const handleDeleteReading = async (product, readingId) => {
    if (!window.confirm('Are you sure you want to delete this reading? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/inventory/system/${systemId}/products/${product._id}/readings/${readingId}`);
      toast.success('Reading deleted successfully');
      fetchInventory();
    } catch (error) {
      console.error('Error deleting reading:', error);
      toast.error('Failed to delete reading');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLatestReading = (product) => {
    if (!product.volumeReadings || product.volumeReadings.length === 0) {
      return null;
    }
    return product.volumeReadings.reduce((latest, reading) => 
      new Date(reading.date) > new Date(latest.date) ? reading : latest
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading inventory..." />
      </div>
    );
  }

  // Check if viewing operator account inventory
  const isOperatorInventory = inventory && user && inventory.userId !== user.id;

  return (
    <div className="px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center mb-2">
              <button
                onClick={() => {
                  // Customer accounts (operators) should go back to /systems, enterprise users to customer detail page
                  if (user?.accountType === 'customer') {
                    navigate('/systems');
                  } else {
                    navigate(`/customers/${customer?._id}/systems`);
                  }
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {system?.name} - Inventory
              </h1>
              {isOperatorInventory && (
                <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  <UserCog className="h-4 w-4 mr-1" />
                  Operator Account
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-gray-600">
                {customer?.name} • {system?.type?.replace('_', ' ')} • Product Inventory Management
              </p>
              <WorkbookInventoryToggle activePage="inventory" />
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0 flex space-x-3">
            {activeProducts.length > 0 && (
              <button
                onClick={() => setShowTrendsModal(true)}
                className="btn-secondary"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                View Trends
              </button>
            )}
            <button
              onClick={handleAddProduct}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Operator Account Banner */}
      {isOperatorInventory && (
        <div className="mb-6 bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <UserCog className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-purple-900 mb-1">
                <span className="inline-flex items-center">
                  <Info className="h-4 w-4 mr-1" />
                  Managing Operator Account Inventory
                </span>
              </h3>
              <p className="text-sm text-purple-700">
                You are managing the inventory for <strong>{customer?.name}'s</strong> operator account. 
                All changes will be saved to their account and visible when they log in. This is not your enterprise inventory.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {activeProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeProducts.map((product) => {
            const latestReading = getLatestReading(product);
            const totalReadings = product.volumeReadings?.length || 0;
            
            const currentSafetyStock = product.currentSafetyStock || 0;
            const usageSummary = product.usageSummary || null;

            const warningLevel = usageSummary?.warningLevel;
            const hasUsageSignal = usageSummary && usageSummary.usageRate !== null && usageSummary.usageRate > 0;
            const daysUntilEmpty = usageSummary?.daysUntilEmpty ?? null;
            const daysOfSupply = usageSummary?.daysOfSupply ?? null;
            const totalAvailable = usageSummary?.totalAvailable ?? null;

            const cardHighlight =
              warningLevel === 'low'
                ? 'ring-2 ring-red-300 bg-red-50'
                : warningLevel === 'gettingLow'
                  ? 'ring-2 ring-amber-300 bg-amber-50'
                  : '';

            const badgeConfig = (() => {
              if (warningLevel === 'low') {
                return {
                  label: 'Low Stock',
                  className: 'bg-red-100 text-red-800'
                };
              }
              if (warningLevel === 'gettingLow') {
                return {
                  label: 'Getting Low',
                  className: 'bg-amber-100 text-amber-800'
                };
              }
              return null;
            })();
            
            return (
              <div key={product._id} className={`card ${cardHighlight}`}>
                <div className="card-body">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Package className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          {badgeConfig && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeConfig.className}`}>
                              {badgeConfig.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {product.tankVolume.totalGallons 
                            ? `${product.tankVolume.totalGallons} gallons capacity`
                            : `${product.tankVolume.totalInches}" capacity (${product.tankVolume.gallonsPerInch} gal/inch)`
                          }
                        </p>
                        <p className="text-xs text-amber-600">
                          Current Safety Stock: {currentSafetyStock.toFixed(1)} gallons
                        </p>
                        {hasUsageSignal && totalAvailable !== null && (
                          <p className="text-xs text-slate-500">
                            Total On Hand: {totalAvailable.toFixed(1)} gallons
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleViewUsage(product)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View usage analytics"
                        disabled={totalReadings < 2}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit product"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Latest Reading */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Latest Reading:</span>
                      <span className="font-medium">
                        {latestReading 
                          ? `${latestReading.volume} ${latestReading.unit}`
                          : 'No readings'
                        }
                      </span>
                    </div>
                    {latestReading && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-500">Date:</span>
                        <span className="text-gray-600">
                          {formatDate(latestReading.date)}
                        </span>
                      </div>
                    )}
                    {hasUsageSignal && (
                      <div className="flex items-center justify-between text-xs mt-3 text-gray-600">
                        <span>Days Remaining:</span>
                        <span className="font-medium">
                          {daysUntilEmpty !== null ? `${daysUntilEmpty} days` : '—'}
                          {daysOfSupply !== null && daysUntilEmpty !== null && daysOfSupply - daysUntilEmpty >= 0.5 && (
                            <span className="text-[11px] text-gray-500 ml-1">
                              ({daysOfSupply.toFixed(1)} days est.)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {!hasUsageSignal && (
                      <div className="mt-3 text-xs text-gray-500">
                        Not enough recent usage data to project days remaining.
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {product.notes && (
                    <div className="mb-4 p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center mb-1">
                        <FileText className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="text-gray-600 font-medium">Notes:</span>
                      </div>
                      <p className="text-gray-700">{product.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAddReading(product)}
                      className="flex-1 btn-secondary text-sm py-2"
                    >
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Add Reading
                    </button>
                    {totalReadings > 0 && (
                      <button
                        onClick={() => handleViewUsage(product)}
                        className="flex-1 btn-primary text-sm py-2"
                        disabled={totalReadings < 2}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View ({totalReadings})
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
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 mb-6">
            Get started by adding your first product to track inventory usage.
          </p>
          <button onClick={handleAddProduct} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Product
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddProductModal && (
        <ProductModal
          isOpen={showAddProductModal}
          product={selectedProduct}
          systemId={systemId}
          onClose={() => {
            setShowAddProductModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            setShowAddProductModal(false);
            setSelectedProduct(null);
            fetchInventory();
          }}
        />
      )}

      {showAddReadingModal && (
        <VolumeReadingModal
          isOpen={showAddReadingModal}
          product={selectedProduct}
          systemId={systemId}
          onClose={() => {
            setShowAddReadingModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            setShowAddReadingModal(false);
            setSelectedProduct(null);
            fetchInventory();
          }}
        />
      )}

      {showEditReadingModal && (
        <EditReadingModal
          isOpen={showEditReadingModal}
          product={selectedProduct}
          reading={selectedReading}
          systemId={systemId}
          onClose={() => {
            setShowEditReadingModal(false);
            setSelectedProduct(null);
            setSelectedReading(null);
          }}
          onSuccess={async () => {
            setShowEditReadingModal(false);
            setSelectedReading(null);
            await fetchInventory();
            // Trigger analytics refresh
            setAnalyticsRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {showUsageModal && (
        <UsageAnalyticsModal
          key={`${selectedProduct?._id}-${selectedProduct?.volumeReadings?.length || 0}-${analyticsRefreshTrigger}`}
          isOpen={showUsageModal}
          product={selectedProduct}
          systemId={systemId}
          onEditReading={handleEditReading}
          onDeleteReading={handleDeleteReading}
          onDataChange={fetchInventory}
          onClose={() => {
            setShowUsageModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {showTrendsModal && (
        <InventoryTrendsModal
          isOpen={showTrendsModal}
          systemId={systemId}
          onClose={() => setShowTrendsModal(false)}
        />
      )}
    </div>
  );
};

// Product Modal Component
const ProductModal = ({ isOpen, product, systemId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    tankVolume: {
      totalGallons: '',
      totalInches: '',
      gallonsPerInch: ''
    },
    initialSafetyStock: '',
    notes: ''
  });
  const [volumeType, setVolumeType] = useState('gallons');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        tankVolume: {
          totalGallons: product.tankVolume?.totalGallons || '',
          totalInches: product.tankVolume?.totalInches || '',
          gallonsPerInch: product.tankVolume?.gallonsPerInch || ''
        },
        initialSafetyStock: product.initialSafetyStock || '',
        notes: product.notes || ''
      });
      setVolumeType(product.tankVolume?.totalGallons ? 'gallons' : 'inches');
    } else {
      setFormData({
        name: '',
        tankVolume: {
          totalGallons: '',
          totalInches: '',
          gallonsPerInch: ''
        },
        initialSafetyStock: '',
        notes: ''
      });
      setVolumeType('gallons');
    }
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        name: formData.name,
        tankVolume: volumeType === 'gallons' 
          ? { totalGallons: parseFloat(formData.tankVolume.totalGallons) }
          : { 
              totalInches: parseFloat(formData.tankVolume.totalInches),
              gallonsPerInch: parseFloat(formData.tankVolume.gallonsPerInch)
            },
        initialSafetyStock: parseFloat(formData.initialSafetyStock) || 0,
        notes: formData.notes
      };

      if (product) {
        await axios.put(`/api/inventory/system/${systemId}/products/${product._id}`, submitData);
        toast.success('Product updated successfully');
      } else {
        await axios.post(`/api/inventory/system/${systemId}/products`, submitData);
        toast.success('Product added successfully');
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('tankVolume.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        tankVolume: {
          ...prev.tankVolume,
          [field]: value
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
          <div className="flex items-center mb-4">
            <Package className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              {product ? 'Edit Product' : 'Add Product'}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tank Volume Configuration *
              </label>
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="gallons"
                      checked={volumeType === 'gallons'}
                      onChange={(e) => setVolumeType(e.target.value)}
                      className="mr-2"
                    />
                    Total Gallons
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="inches"
                      checked={volumeType === 'inches'}
                      onChange={(e) => setVolumeType(e.target.value)}
                      className="mr-2"
                    />
                    Inches + Gallons per Inch
                  </label>
                </div>

                {volumeType === 'gallons' ? (
                  <div>
                    <input
                      type="number"
                      name="tankVolume.totalGallons"
                      required
                      min="0"
                      step="0.01"
                      value={formData.tankVolume.totalGallons}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Total tank capacity in gallons"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="number"
                        name="tankVolume.totalInches"
                        required
                        min="0"
                        step="0.01"
                        value={formData.tankVolume.totalInches}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Total inches"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        name="tankVolume.gallonsPerInch"
                        required
                        min="0"
                        step="0.01"
                        value={formData.tankVolume.gallonsPerInch}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Gallons per inch"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Safety Stock (Gallons)
              </label>
              <input
                type="number"
                name="initialSafetyStock"
                min="0"
                step="0.1"
                value={formData.initialSafetyStock}
                onChange={handleChange}
                className="input-field"
                placeholder="Total safety stock (optional)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Total volume to keep in reserve before reordering
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="input-field"
                rows={3}
                placeholder="Optional notes about this product"
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
                {loading ? <LoadingSpinner size="sm" color="white" /> : (product ? 'Update Product' : 'Add Product')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Volume Reading Modal Component
const VolumeReadingModal = ({ isOpen, product, systemId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    volume: '',
    unit: 'gallons',
    pumpSettingType: '',
    pumpSpeed: '',
    pumpStroke: '',
    safetyStockTransferred: '',
    safetyStockDelivered: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product && isOpen) {
      // Set default unit based on tank configuration
      const defaultUnit = product.tankVolume?.totalGallons ? 'gallons' : 'inches';
      setFormData({
        volume: '',
        unit: defaultUnit,
        pumpSettingType: '',
        pumpSpeed: '',
        pumpStroke: '',
        safetyStockTransferred: '',
        safetyStockDelivered: '',
        notes: ''
      });
    }
  }, [product, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        volume: parseFloat(formData.volume),
        unit: formData.unit,
        safetyStockTransferred: parseFloat(formData.safetyStockTransferred) || 0,
        safetyStockDelivered: parseFloat(formData.safetyStockDelivered) || 0,
        notes: formData.notes
      };

      // Add pump setting if provided
      if (formData.pumpSettingType) {
        submitData.pumpSetting = {
          type: formData.pumpSettingType,
          speed: formData.pumpSpeed ? parseFloat(formData.pumpSpeed) : undefined
        };
        if (formData.pumpSettingType === 'strokeAndSpeed' && formData.pumpStroke) {
          submitData.pumpSetting.stroke = parseFloat(formData.pumpStroke);
        }
      }

      await axios.post(`/api/inventory/system/${systemId}/products/${product._id}/readings`, submitData);
      toast.success('Volume reading added successfully');
      onSuccess();
    } catch (error) {
      console.error('Error adding volume reading:', error);
      toast.error(error.response?.data?.message || 'Failed to add volume reading');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center mb-4">
            <TrendingDown className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Add Volume Reading
            </h3>
          </div>
          
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p className="text-sm font-medium text-gray-900">{product?.name}</p>
            <p className="text-xs text-gray-600">
              {product?.tankVolume?.totalGallons 
                ? `${product.tankVolume.totalGallons} gallons capacity`
                : `${product?.tankVolume?.totalInches}" capacity (${product?.tankVolume?.gallonsPerInch} gal/inch)`
              }
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volume Reading *
                </label>
                <input
                  type="number"
                  name="volume"
                  required
                  min="0"
                  step="0.01"
                  value={formData.volume}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Enter volume"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <select
                  name="unit"
                  required
                  value={formData.unit}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="gallons">Gallons</option>
                  <option value="inches">Inches</option>
                </select>
              </div>
            </div>

            {/* Pump Setting Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center mb-3">
                <Gauge className="h-4 w-4 text-green-600 mr-2" />
                <label className="text-sm font-medium text-gray-700">Pump Setting (Optional)</label>
              </div>
              
              <div className="mb-3">
                <select
                  name="pumpSettingType"
                  value={formData.pumpSettingType}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">No pump setting</option>
                  <option value="speed">Speed Only</option>
                  <option value="strokeAndSpeed">Stroke & Speed</option>
                </select>
              </div>

              {formData.pumpSettingType && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Speed
                    </label>
                    <input
                      type="number"
                      name="pumpSpeed"
                      min="0"
                      step="0.1"
                      value={formData.pumpSpeed}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="e.g., 60"
                    />
                  </div>
                  {formData.pumpSettingType === 'strokeAndSpeed' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stroke (%)
                      </label>
                      <input
                        type="number"
                        name="pumpStroke"
                        min="0"
                        max="100"
                        step="1"
                        value={formData.pumpStroke}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="0-100"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Stock Transferred (Gallons)
                </label>
                <input
                  type="number"
                  name="safetyStockTransferred"
                  min="0"
                  step="0.1"
                  value={formData.safetyStockTransferred}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Volume moved from safety stock to tank
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Stock Delivered (Gallons)
                </label>
                <input
                  type="number"
                  name="safetyStockDelivered"
                  min="0"
                  step="0.1"
                  value={formData.safetyStockDelivered}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  New chemical delivered to site
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="input-field"
                rows={3}
                placeholder="Optional notes about this reading"
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
                {loading ? <LoadingSpinner size="sm" color="white" /> : 'Add Reading'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Edit Reading Modal Component
const EditReadingModal = ({ isOpen, product, reading, systemId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    volume: '',
    unit: 'gallons',
    pumpSettingType: '',
    pumpSpeed: '',
    pumpStroke: '',
    safetyStockTransferred: '',
    safetyStockDelivered: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reading && isOpen) {
      setFormData({
        volume: reading.volume || '',
        unit: reading.unit || 'gallons',
        pumpSettingType: reading.pumpSetting?.type || '',
        pumpSpeed: reading.pumpSetting?.speed || '',
        pumpStroke: reading.pumpSetting?.stroke || '',
        safetyStockTransferred: reading.safetyStockTransferred || '',
        safetyStockDelivered: reading.safetyStockDelivered || '',
        notes: reading.notes || ''
      });
    }
  }, [reading, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        volume: parseFloat(formData.volume),
        unit: formData.unit,
        safetyStockTransferred: parseFloat(formData.safetyStockTransferred) || 0,
        safetyStockDelivered: parseFloat(formData.safetyStockDelivered) || 0,
        notes: formData.notes
      };

      // Add pump setting if provided
      if (formData.pumpSettingType) {
        submitData.pumpSetting = {
          type: formData.pumpSettingType,
          speed: formData.pumpSpeed ? parseFloat(formData.pumpSpeed) : undefined
        };
        if (formData.pumpSettingType === 'strokeAndSpeed' && formData.pumpStroke) {
          submitData.pumpSetting.stroke = parseFloat(formData.pumpStroke);
        }
      }

      console.log('Updating reading:', {
        systemId,
        productId: product._id,
        readingId: reading._id,
        submitData
      });
      
      await axios.put(`/api/inventory/system/${systemId}/products/${product._id}/readings/${reading._id}`, submitData);
      toast.success('Reading updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating reading:', error);
      toast.error(error.response?.data?.message || 'Failed to update reading');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-90" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center mb-4">
            <Edit className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Edit Volume Reading
            </h3>
          </div>
          
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p className="text-sm font-medium text-gray-900">{product?.name}</p>
            <p className="text-xs text-gray-600">
              {product?.tankVolume?.totalGallons 
                ? `${product.tankVolume.totalGallons} gallons capacity`
                : `${product?.tankVolume?.totalInches}" capacity (${product?.tankVolume?.gallonsPerInch} gal/inch)`
              }
            </p>
            <p className="text-xs text-gray-500">
              Reading from: {new Date(reading?.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volume Reading *
                </label>
                <input
                  type="number"
                  name="volume"
                  required
                  min="0"
                  step="0.01"
                  value={formData.volume}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Enter volume"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <select
                  name="unit"
                  required
                  value={formData.unit}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="gallons">Gallons</option>
                  <option value="inches">Inches</option>
                </select>
              </div>
            </div>

            {/* Pump Setting Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center mb-3">
                <Gauge className="h-4 w-4 text-green-600 mr-2" />
                <label className="text-sm font-medium text-gray-700">Pump Setting</label>
              </div>
              
              <div className="mb-3">
                <select
                  name="pumpSettingType"
                  value={formData.pumpSettingType}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">No pump setting</option>
                  <option value="speed">Speed Only</option>
                  <option value="strokeAndSpeed">Stroke & Speed</option>
                </select>
              </div>

              {formData.pumpSettingType && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Speed
                    </label>
                    <input
                      type="number"
                      name="pumpSpeed"
                      min="0"
                      step="0.1"
                      value={formData.pumpSpeed}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="e.g., 60"
                    />
                  </div>
                  {formData.pumpSettingType === 'strokeAndSpeed' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stroke (%)
                      </label>
                      <input
                        type="number"
                        name="pumpStroke"
                        min="0"
                        max="100"
                        step="1"
                        value={formData.pumpStroke}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="0-100"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Stock Transferred (Gallons)
                </label>
                <input
                  type="number"
                  name="safetyStockTransferred"
                  min="0"
                  step="0.1"
                  value={formData.safetyStockTransferred}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Volume moved from safety stock to tank
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Stock Delivered (Gallons)
                </label>
                <input
                  type="number"
                  name="safetyStockDelivered"
                  min="0"
                  step="0.1"
                  value={formData.safetyStockDelivered}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  New chemical delivered to site
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="input-field"
                rows={3}
                placeholder="Optional notes about this reading"
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
                {loading ? <LoadingSpinner size="sm" color="white" /> : 'Update Reading'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Usage Analytics Modal Component with Interactive Charts
const UsageAnalyticsModal = ({ isOpen, product, systemId, onEditReading, onDeleteReading, onDataChange, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState(null);
  const [chartType, setChartType] = useState('usage');

  const fetchUsageData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/inventory/system/${systemId}/products/${product._id}/usage`);
      if (response.data.success) {
        setUsageData(response.data);
      }
    } catch (error) {
      console.error('Error fetching usage data:', error);
      toast.error('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }, [systemId, product]);

  useEffect(() => {
    if (isOpen && product) {
      fetchUsageData();
    }
  }, [isOpen, product, fetchUsageData]);

  // Prepare chart data
  const getChartData = () => {
    if (!usageData?.usageData) return [];

    return usageData.usageData.map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: '2-digit'
      }),
      usageRate: parseFloat(point.usageRate.toFixed(2)),
      volumeReading: parseFloat(point.volumeReading.toFixed(1)),
      volumeUsed: parseFloat(point.volumeUsed.toFixed(1)),
      daysSincePrevious: parseFloat(point.daysSincePrevious.toFixed(1)),
      totalAvailable: point.totalAvailable !== undefined && point.totalAvailable !== null
        ? parseFloat(point.totalAvailable.toFixed(1))
        : null,
      warningLevel: point.warningLevel,
      needsReorder: point.needsReorder
    }));
  };

  // Prepare volume readings chart data
  const getVolumeReadingsData = () => {
    if (!product?.volumeReadings) return [];

    return [...product.volumeReadings]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((reading) => {
        // Convert inches to gallons if needed
        let volumeInGallons = reading.volume;
        if (reading.unit === 'inches' && product.tankVolume?.gallonsPerInch) {
          volumeInGallons = reading.volume * product.tankVolume.gallonsPerInch;
        }
        
        return {
          date: new Date(reading.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: '2-digit'
          }),
          volume: parseFloat(volumeInGallons.toFixed(1)),
          originalVolume: reading.volume,
          unit: reading.unit
        };
      });
  };

  const chartData = getChartData();
  const volumeData = getVolumeReadingsData();
  const usageSummary = usageData?.usageSummary;

  // Custom tooltip for usage rate chart
  const UsageTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{`Date: ${label}`}</p>
          <p className="text-blue-600">
            {`Usage Rate: ${payload[0].value} gal/day`}
          </p>
          {dataPoint.daysSincePrevious && (
            <p className="text-gray-600 text-sm">
              {`Over ${dataPoint.daysSincePrevious} days`}
            </p>
          )}
          {dataPoint.totalAvailable !== null && (
            <p className="text-gray-600 text-sm">
              {`Total on hand: ${dataPoint.totalAvailable} gal`}
            </p>
          )}
          {dataPoint.warningLevel && dataPoint.warningLevel !== 'unknown' && (
            <p className={`text-xs mt-1 ${dataPoint.warningLevel === 'low' ? 'text-red-600' : dataPoint.warningLevel === 'gettingLow' ? 'text-amber-600' : 'text-green-600'}`}>
              {dataPoint.warningLevel === 'low'
                ? 'Status: Low Stock'
                : dataPoint.warningLevel === 'gettingLow'
                  ? 'Status: Getting Low'
                  : 'Status: OK'}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for volume readings chart
  const VolumeTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{`Date: ${label}`}</p>
          <p className="text-green-600">
            {`Volume: ${payload[0].value} gallons`}
          </p>
          <p className="text-gray-600 text-sm">
            {`Original: ${data.originalVolume} ${data.unit}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-6xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-4">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Usage Analytics - {product?.name}
              </h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
              ✕
            </button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" text="Loading usage data..." />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Usage Summary */}
              {usageSummary && !usageSummary.singleReading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card">
                    <div className="card-body text-center">
                      <TrendingDown className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">
                        {usageSummary.usageRate !== null ? usageSummary.usageRate.toFixed(2) : '—'}
                      </div>
                      <div className="text-sm text-gray-600">Gallons per day</div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body text-center">
                      <Package className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">
                        {usageSummary.totalAvailable !== null ? usageSummary.totalAvailable.toFixed(1) : '0.0'}
                      </div>
                      <div className="text-sm text-gray-600">Total gallons on hand</div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body text-center">
                      <Calendar className={`h-8 w-8 mx-auto mb-2 ${usageSummary.warningLevel === 'low' ? 'text-red-500' : usageSummary.warningLevel === 'gettingLow' ? 'text-amber-500' : 'text-green-500'}`} />
                      <div className={`text-2xl font-bold ${usageSummary.warningLevel === 'low' ? 'text-red-900' : usageSummary.warningLevel === 'gettingLow' ? 'text-amber-900' : 'text-gray-900'}`}>
                        {usageSummary.daysUntilEmpty !== null ? usageSummary.daysUntilEmpty : '—'}
                      </div>
                      <div className="text-sm text-gray-600">Days of supply</div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body text-center">
                      <div className={`h-8 w-8 mx-auto mb-2 rounded-full flex items-center justify-center ${usageSummary.needsReorder ? 'bg-red-100' : usageSummary.warningLevel === 'gettingLow' ? 'bg-amber-100' : 'bg-green-100'}`}>
                        <div className={`h-4 w-4 rounded-full ${usageSummary.needsReorder ? 'bg-red-500' : usageSummary.warningLevel === 'gettingLow' ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                      </div>
                      <div className={`text-lg font-bold ${usageSummary.needsReorder ? 'text-red-900' : usageSummary.warningLevel === 'gettingLow' ? 'text-amber-900' : 'text-green-900'}`}>
                        {usageSummary.needsReorder ? 'REORDER' : usageSummary.warningLevel === 'gettingLow' ? 'GETTING LOW' : 'OK'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Safety: {usageSummary.safetyStock !== null ? usageSummary.safetyStock.toFixed(1) : '0'} gal
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Single Reading Summary */}
              {usageSummary?.singleReading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card">
                    <div className="card-body text-center">
                      <Package className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">
                        {usageSummary.totalAvailable !== null ? usageSummary.totalAvailable.toFixed(1) : '0.0'}
                      </div>
                      <div className="text-sm text-gray-600">Total gallons on hand</div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body text-center">
                      <div className={`h-8 w-8 mx-auto mb-2 rounded-full flex items-center justify-center ${usageSummary.needsReorder ? 'bg-red-100' : 'bg-green-100'}`}>
                        <div className={`h-4 w-4 rounded-full ${usageSummary.needsReorder ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      </div>
                      <div className={`text-lg font-bold ${usageSummary.needsReorder ? 'text-red-900' : 'text-green-900'}`}>
                        {usageSummary.needsReorder ? 'REORDER' : 'OK'}
                      </div>
                      <div className="text-sm text-gray-600">Current Status</div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body text-center">
                      <Calendar className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">
                        {usageSummary.safetyStock !== null ? usageSummary.safetyStock.toFixed(1) : '0'}
                      </div>
                      <div className="text-sm text-gray-600">Safety stock</div>
                    </div>
                  </div>
                </div>
              )}

              {!usageSummary && (
                <div className="p-4 bg-gray-50 rounded text-sm text-gray-600">
                  Not enough usage data yet to calculate consumption trends.
                </div>
              )}

              {/* Chart Type Selector */}
              <div className="flex space-x-2 border-b border-gray-200">
                <button
                  onClick={() => setChartType('usage')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                    chartType === 'usage'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Activity className="h-4 w-4 mr-1 inline" />
                  Usage Rate
                </button>
                <button
                  onClick={() => setChartType('volume')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                    chartType === 'volume'
                      ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Package className="h-4 w-4 mr-1 inline" />
                  Volume Levels
                </button>
              </div>

              {/* Charts */}
              <div className="bg-white">
                {chartType === 'usage' && chartData.length > 0 ? (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Usage Rate Over Time</h4>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#666"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="#666"
                            fontSize={12}
                            label={{ value: 'Gallons/Day', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip content={<UsageTooltip />} />
                          <Line 
                            type="monotone" 
                            dataKey="usageRate" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {chartData.length < 1 && (
                      <p className="text-sm text-gray-600 text-center mt-4">
                        Add volume readings to see usage trends over time.
                      </p>
                    )}
                    {chartData.length === 1 && (
                      <p className="text-sm text-gray-600 text-center mt-4">
                        Add more readings to see usage rate trends over time.
                      </p>
                    )}
                  </div>
                ) : chartType === 'volume' && volumeData.length > 0 ? (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Volume Levels Over Time</h4>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={volumeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#666"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="#666"
                            fontSize={12}
                            label={{ value: 'Gallons', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip content={<VolumeTooltip />} />
                          <Bar 
                            dataKey="volume" 
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {volumeData.length === 0 
                        ? 'No volume readings available for charting'
                        : 'No usage data available. Add more volume readings to see trends.'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Readings Table */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Volume Readings</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Volume
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pump Setting
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Safety Transferred
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Safety Delivered
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {product?.volumeReadings?.length > 0 ? (
                        [...product.volumeReadings]
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((reading, index) => (
                            <tr key={reading._id || index}>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(reading.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {reading.volume} {reading.unit}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {reading.pumpSetting?.type ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                                    <Gauge className="h-3 w-3 mr-1" />
                                    {reading.pumpSetting.type === 'strokeAndSpeed' 
                                      ? `${reading.pumpSetting.stroke || 0}% / ${reading.pumpSetting.speed || 0}`
                                      : `Speed: ${reading.pumpSetting.speed || 0}`
                                    }
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {reading.safetyStockTransferred || 0} gal
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {reading.safetyStockDelivered || 0} gal
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900 max-w-[150px] truncate" title={reading.notes || ''}>
                                {reading.notes || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => {
                                    console.log('Edit reading clicked:', { reading, hasId: !!reading._id });
                                    onEditReading(product, reading);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 mr-2"
                                  title="Edit reading"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    await onDeleteReading(product, reading._id);
                                    // Refresh the usage data after deletion
                                    setTimeout(() => {
                                      fetchUsageData();
                                    }, 500); // Small delay to ensure backend is updated
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete reading"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-4 py-4 text-center text-sm text-gray-500">
                            No volume readings available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Inventory Trends Modal Component
const InventoryTrendsModal = ({ isOpen, systemId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState(null);
  const [trendPeriod, setTrendPeriod] = useState(3);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const chartRefs = useRef({});

  const fetchTrends = useCallback(async (months) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/inventory/system/${systemId}/trends?months=${months}`);
      if (response.data.success) {
        setTrendData(response.data);
        // Auto-select first product if available
        const productNames = Object.keys(response.data.trendData || {});
        if (productNames.length > 0 && !selectedProduct) {
          setSelectedProduct(productNames[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching trends:', error);
      toast.error('Failed to load trend data');
    } finally {
      setLoading(false);
    }
  }, [systemId, selectedProduct]);

  useEffect(() => {
    if (isOpen) {
      fetchTrends(trendPeriod);
    }
  }, [isOpen, trendPeriod, fetchTrends]);

  const generateTrendReport = async () => {
    try {
      setGeneratingReport(true);
      
      // Capture chart images
      const chartImages = {};
      for (const [productName, ref] of Object.entries(chartRefs.current)) {
        if (ref) {
          try {
            const canvas = ref.canvas;
            if (canvas) {
              chartImages[productName] = canvas.toDataURL('image/png');
            }
          } catch (err) {
            console.warn(`Could not capture chart for ${productName}:`, err);
          }
        }
      }

      const response = await axios.post(
        `/api/inventory/system/${systemId}/generate-trend-report`,
        { months: trendPeriod, chartImages },
        { responseType: 'blob' }
      );

      // Download the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = response.headers['content-disposition']
        ?.split('filename="')[1]?.split('"')[0] || `InventoryTrends_${trendPeriod}mo.docx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Trend report generated successfully');
    } catch (error) {
      console.error('Error generating trend report:', error);
      toast.error('Failed to generate trend report');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Prepare chart data for selected product
  const getVolumeChartData = () => {
    if (!selectedProduct || !trendData?.trendData?.[selectedProduct]) return [];
    const productData = trendData.trendData[selectedProduct];
    
    return (productData.volumeData || []).map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
      volume: parseFloat(d.volume.toFixed(1)),
      capacity: productData.tankCapacity
    }));
  };

  const getUsageChartData = () => {
    if (!selectedProduct || !trendData?.trendData?.[selectedProduct]) return [];
    const productData = trendData.trendData[selectedProduct];
    
    return (productData.usageData || []).map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
      usageRate: parseFloat(d.usageRate.toFixed(2))
    }));
  };

  const getPumpSettingChartData = () => {
    if (!selectedProduct || !trendData?.trendData?.[selectedProduct]) return [];
    const productData = trendData.trendData[selectedProduct];
    
    return (productData.pumpSettingData || []).map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
      speed: d.speed || 0,
      stroke: d.stroke || null
    }));
  };

  const volumeData = getVolumeChartData();
  const usageData = getUsageChartData();
  const pumpData = getPumpSettingChartData();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-6xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-4 border-b border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Inventory Trends
              </h3>
            </div>
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-600">Time Period:</label>
              <select
                value={trendPeriod}
                onChange={(e) => {
                  const newPeriod = parseInt(e.target.value);
                  setTrendPeriod(newPeriod);
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
                disabled={generatingReport || loading || !trendData}
                className="btn-primary flex items-center"
                title="Generate a report with trend charts"
              >
                {generatingReport ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
                ✕
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" text="Loading trend data..." />
            </div>
          ) : !trendData || Object.keys(trendData.trendData || {}).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No inventory data available for the selected period.</p>
              <p className="text-sm mt-2">Add volume readings to see trends.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Product Selector */}
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Product:</label>
                <select
                  value={selectedProduct || ''}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="input-field w-auto min-w-[200px]"
                >
                  {Object.keys(trendData.trendData || {}).map(productName => (
                    <option key={productName} value={productName}>{productName}</option>
                  ))}
                </select>
                {selectedProduct && trendData.trendData[selectedProduct] && (
                  <span className="text-sm text-gray-500">
                    {trendData.trendData[selectedProduct].dataPoints} readings
                  </span>
                )}
              </div>

              {/* Volume Chart */}
              {volumeData.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <Package className="h-4 w-4 mr-2 text-blue-600" />
                    Volume Levels Over Time
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={volumeData} 
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        ref={(ref) => { if (ref) chartRefs.current[`${selectedProduct}_volume`] = ref; }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} label={{ value: 'Gallons', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value) => [`${value} gal`, 'Volume']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="volume" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Usage Rate Chart */}
              {usageData.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-red-600" />
                    Usage Rate Over Time
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={usageData} 
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        ref={(ref) => { if (ref) chartRefs.current[`${selectedProduct}_usage`] = ref; }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} label={{ value: 'Gal/Day', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value) => [`${value} gal/day`, 'Usage Rate']}
                        />
                        <Bar dataKey="usageRate" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Pump Settings Chart */}
              {pumpData.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <Gauge className="h-4 w-4 mr-2 text-green-600" />
                    Pump Settings Over Time
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={pumpData} 
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        ref={(ref) => { if (ref) chartRefs.current[`${selectedProduct}_pump`] = ref; }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                        <YAxis yAxisId="left" stroke="#10b981" fontSize={12} label={{ value: 'Speed', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={12} domain={[0, 100]} label={{ value: 'Stroke %', angle: 90, position: 'insideRight' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value, name) => [
                            name === 'speed' ? `${value}` : `${value}%`,
                            name === 'speed' ? 'Speed' : 'Stroke'
                          ]}
                        />
                        <Line 
                          yAxisId="left"
                          type="stepAfter" 
                          dataKey="speed" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          yAxisId="right"
                          type="stepAfter" 
                          dataKey="stroke" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center mt-2 space-x-6 text-sm">
                    <span className="flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      Speed
                    </span>
                    <span className="flex items-center">
                      <span className="w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
                      Stroke %
                    </span>
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              {selectedProduct && trendData.trendData[selectedProduct] && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <Package className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-blue-900">
                      {trendData.trendData[selectedProduct].tankCapacity?.toFixed(0) || 0}
                    </div>
                    <div className="text-xs text-blue-700">Tank Capacity (gal)</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <Calendar className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-green-900">
                      {trendData.trendData[selectedProduct].dataPoints || 0}
                    </div>
                    <div className="text-xs text-green-700">Total Readings</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <Gauge className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-amber-900">
                      {trendData.trendData[selectedProduct].pumpSettingData?.length || 0}
                    </div>
                    <div className="text-xs text-amber-700">Pump Settings</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <Activity className="h-6 w-6 text-red-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-red-900">
                      {usageData.length > 0 
                        ? (usageData.reduce((sum, d) => sum + d.usageRate, 0) / usageData.length).toFixed(2)
                        : '—'
                      }
                    </div>
                    <div className="text-xs text-red-700">Avg Usage (gal/day)</div>
                  </div>
                </div>
              )}

              <div className="mt-4 text-sm text-gray-500 text-center">
                Data points: {trendData.dataPoints || 0} readings in the last {trendPeriod} months
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;

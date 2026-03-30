import React, { useEffect, useState } from 'react';
import { Mail, Shield, Calendar, Save, Hash } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', companyLogo: '', repNumber: '', orderEmail: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        const u = res.data.user;
        setUser(u);
        setForm({ 
          firstName: u.firstName || '', 
          lastName: u.lastName || '', 
          companyLogo: u.companyLogo || '',
          repNumber: u.repNumber || '',
          orderEmail: u.orderEmail || ''
        });
      } catch (_) {
        // noop
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveProfile = async () => {
    try {
      setSaving(true);
      const result = await updateProfile({ 
        firstName: form.firstName, 
        lastName: form.lastName, 
        companyLogo: form.companyLogo,
        repNumber: form.repNumber,
        orderEmail: form.orderEmail
      });
      if (result.success) {
        // Reload user to get updated data for local display
        const res = await axios.get('/api/auth/me');
        setUser(res.data.user);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to save profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-gray-500">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-gray-500">Unable to load profile.</div>
      </div>
    );
  }

  return (
    <div className="px-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Basic Info */}
        <div className="lg:col-span-2 card">
          <div className="card-body">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.accountType !== 'customer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      className="input-field"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      className="input-field"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                </>
              )}
              {user.accountType === 'customer' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <div className="input-field bg-gray-50 text-gray-700">{user.username}</div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="input-field bg-gray-50 text-gray-700">{user.email}</div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <div className="input-field bg-gray-50 text-gray-700 capitalize">
                  {user.accountType === 'customer' ? 'Operator Account' : 'Standard Account'}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo (shown on PDF reports)</label>
                {form.companyLogo && (
                  <div className="mb-2">
                    <img src={form.companyLogo} alt="Company Logo" className="h-12 object-contain" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const maxBytes = 1024 * 1024 * 2; // 2MB
                    if (file.size > maxBytes) {
                      toast.error('Logo is too large. Please upload an image under 2MB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setForm({ ...form, companyLogo: reader.result });
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            </div>
            
            {/* Ordering System Settings */}
            {user.accountType !== 'customer' && (
              <>
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                    <Hash className="h-4 w-4 mr-2 text-blue-600" />
                    Ordering System Settings
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure your ordering system. Rep Number and Order Email are required to place orders.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rep Number <span className="text-gray-400 text-xs">(Required for ordering)</span>
                      </label>
                      <input
                        className="input-field"
                        value={form.repNumber}
                        onChange={(e) => setForm({ ...form, repNumber: e.target.value })}
                        placeholder="Enter your rep number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order Receiving Email <span className="text-gray-400 text-xs">(Where orders are sent)</span>
                      </label>
                      <input
                        type="email"
                        className="input-field"
                        value={form.orderEmail}
                        onChange={(e) => setForm({ ...form, orderEmail: e.target.value })}
                        placeholder="orders@company.com"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            
            <div className="mt-6 flex items-center justify-end">
              <button onClick={saveProfile} disabled={saving} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="h-4 w-4 mr-2" /> Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Right: Account & Subscription */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-body">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
              <div className="space-y-3 text-sm text-gray-700">
                {user.accountType !== 'customer' && (
                  <>
                    <div className="flex items-center"><Mail className="h-4 w-4 mr-2 text-gray-500" /> Email Verified: {user.emailVerified ? 'Yes' : 'No'}</div>
                    <div className="flex items-center"><Shield className="h-4 w-4 mr-2 text-gray-500" /> Status: {user.subscription?.status || 'inactive'}</div>
                  </>
                )}
                <div className="flex items-center"><Calendar className="h-4 w-4 mr-2 text-gray-500" /> Member since: {new Date(user.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {user.accountType !== 'customer' && (
            <div className="card">
              <div className="card-body">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Subscription</h2>
                <div className="text-sm text-gray-700">Plan: <span className="capitalize">{user.subscription?.plan}</span></div>
                {user.subscription?.currentPeriodEnd && (
                  <div className="text-sm text-gray-700">Renews: {new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}</div>
                )}
                <div className="mt-3">
                  <a href="/subscription" className="btn-secondary">Manage Subscription</a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

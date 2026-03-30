import React, { useEffect, useState } from 'react';
import { CreditCard, Check, ExternalLink } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Subscription = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [creating, setCreating] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [plansRes, currentRes] = await Promise.all([
          axios.get('/api/subscriptions/plans'),
          axios.get('/api/subscriptions/current')
        ]);
        setPlans(plansRes.data.plans || []);
        setCurrent(currentRes.data.subscription || null);
      } catch (e) {
        // noop
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const startCheckout = async (planId) => {
    try {
      setCreating(true);
      const res = await axios.post('/api/subscriptions/create-checkout-session', { planId });
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('Stripe did not return a checkout URL.');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to start checkout.';
      toast.error(msg);
      setCreating(false);
    }
  };

  const openPortal = async () => {
    try {
      setPortalLoading(true);
      const res = await axios.post('/api/subscriptions/create-portal-session');
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('Stripe did not return a portal URL.');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to open billing portal.';
      toast.error(msg);
      setPortalLoading(false);
    }
  };

  return (
    <div className="px-6 max-w-7xl mx-auto">
      <div className="py-8">
        <div className="text-center mb-8">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600">Manage your plan and billing</p>
        </div>

        {loading ? (
          <div className="text-center text-gray-500">Loading plans...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Plan Card */}
            {current && (
              <div className="card h-full flex flex-col">
                <div className="card-body flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full capitalize">
                      {current.status}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-gray-900 capitalize mb-4">{current.plan}</div>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-center text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-600 mr-2" /> Active subscription
                      </li>
                      <li className="flex items-center text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-600 mr-2" /> Manage billing in portal
                      </li>
                    </ul>
                  </div>
                  <button onClick={openPortal} disabled={portalLoading} className="btn-secondary w-full mt-auto">
                    <ExternalLink className="h-4 w-4 mr-2" /> Billing Portal
                  </button>
                </div>
              </div>
            )}

            {/* Pro plan commented out - enterprise only */}
            {plans.filter(p => p.id !== 'free' && p.id !== 'pro').map(plan => (
              <div key={plan.id} className="card h-full flex flex-col">
                <div className="card-body flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    <div className="text-xl font-bold text-gray-900">${plan.price}<span className="text-sm font-medium text-gray-500">/mo</span></div>
                  </div>
                  <ul className="space-y-2 mb-4 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-600 mr-2" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => startCheckout(plan.id)}
                    disabled={creating}
                    className="btn-primary w-full mt-auto"
                  >
                    Choose {plan.name}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;

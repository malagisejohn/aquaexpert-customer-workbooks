import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const configuredApiBaseUrl = (process.env.REACT_APP_API_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');
if (configuredApiBaseUrl) {
  axios.defaults.baseURL = configuredApiBaseUrl;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Axios interceptor for token management
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const CUSTOMER_ONLY_MESSAGE = 'Customer accounts only have permission to sign in here.';

  const isCustomerAccount = (account) => account?.accountType === 'customer';

  const denyNonCustomerAccess = (message = CUSTOMER_ONLY_MESSAGE, showToast = true) => {
    localStorage.removeItem('token');
    setUser(null);
    if (showToast) {
      toast.error(message);
    }
    return { success: false, message };
  };

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/auth/me');
          if (isCustomerAccount(response.data.user)) {
            setUser(response.data.user);
          } else {
            denyNonCustomerAccess(CUSTOMER_ONLY_MESSAGE, false);
          }
        } catch (error) {
          console.error('Failed to load user:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (emailOrUsername, password) => {
    try {
      // Note: Don't set global loading state here - it causes PublicRoute to unmount/remount
      // the Login component, losing local state. Login component has its own isLoading state.
      
      // Determine if input is email or username using strict email validation.
      // Some customer usernames can contain "@" and should still be treated as usernames.
      const identifier = (emailOrUsername || '').trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      const payload = {
        password,
      };
      
      if (isEmail) {
        payload.email = identifier;
      } else {
        payload.username = identifier;
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AUTH] Login request', {
          mode: isEmail ? 'email' : 'username',
          identifier,
          baseURL: axios.defaults.baseURL || '(relative)'
        });
      }

      const response = await axios.post('/api/auth/login', payload);

      // Check if verification is required
      if (response.data.requiresVerification) {
        toast.success('Please check your email for a verification code');
        return { 
          success: true, 
          requiresVerification: true, 
          email: response.data.email 
        };
      }

      // Check if terms acceptance is required
      if (response.data.requiresTermsAcceptance) {
        if (!isCustomerAccount(response.data.user)) {
          return denyNonCustomerAccess();
        }
        return { 
          success: true, 
          requiresTermsAcceptance: true, 
          tempToken: response.data.tempToken,
          user: response.data.user
        };
      }

      const { token, user: userData } = response.data;

      if (!isCustomerAccount(userData)) {
        return denyNonCustomerAccess();
      }
      
      localStorage.setItem('token', token);
      setUser(userData);
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const validationDetail = Array.isArray(error.response?.data?.errors)
        ? error.response.data.errors[0]
        : null;
      const message = validationDetail || error.response?.data?.message || 'Login failed';

      console.error('[AUTH] Login failed', {
        status: error.response?.status,
        data: error.response?.data,
        baseURL: axios.defaults.baseURL || '(relative)'
      });

      toast.error(message);
      return { success: false, message };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      // Note: Don't set global loading state here - component has its own isLoading state
      const response = await axios.post('/api/auth/verify-otp', { email, otp });

      // Check if terms acceptance is required (for new users after email verification)
      if (response.data.requiresTermsAcceptance) {
        toast.success('Email verified! Please accept the Terms of Service.');
        return { 
          success: true, 
          requiresTermsAcceptance: true, 
          tempToken: response.data.tempToken,
          user: response.data.user
        };
      }

      const { token, user: userData } = response.data;

      if (!isCustomerAccount(userData)) {
        return denyNonCustomerAccess();
      }
      
      localStorage.setItem('token', token);
      setUser(userData);
      
      toast.success('Email verified successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const resendOtp = async (email) => {
    try {
      await axios.post('/api/auth/resend-otp', { email });
      toast.success('Verification code sent!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend code';
      toast.error(message);
      return { success: false, message };
    }
  };

  const acceptTerms = async (tempToken) => {
    try {
      // Note: Don't set global loading state here - component has its own isLoading state
      const response = await axios.post('/api/auth/accept-terms', {}, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });

      const { token, user: userData } = response.data;

      if (!isCustomerAccount(userData)) {
        return denyNonCustomerAccess();
      }
      
      localStorage.setItem('token', token);
      setUser(userData);
      
      toast.success('Welcome to AquaExpert!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to accept terms';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      // Note: Don't set global loading state here - component has its own isLoading state
      const response = await axios.post('/api/auth/register', userData);

      // Check if verification is required
      if (response.data.requiresVerification) {
        toast.success('Please check your email for a verification code');
        return { 
          success: true, 
          requiresVerification: true, 
          email: response.data.email 
        };
      }

      const { token, user: newUser } = response.data;

      if (!isCustomerAccount(newUser)) {
        return denyNonCustomerAccess();
      }
      
      localStorage.setItem('token', token);
      setUser(newUser);
      
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      const errors = error.response?.data?.errors || [];
      
      if (errors.length > 0) {
        errors.forEach(err => toast.error(err));
      } else {
        toast.error(message);
      }
      
      return { success: false, message, errors };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData);
      setUser(response.data.user);
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const refreshToken = async () => {
    try {
      const response = await axios.post('/api/auth/refresh');
      const { token } = response.data;
      localStorage.setItem('token', token);
      return { success: true };
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return { success: false };
    }
  };

  // Reload the user from /api/auth/me (to refresh subscription usage counters)
  const reloadUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (e) {
      // ignore
    }
  };

  // Check if user can perform certain actions based on subscription
  const canCreateCustomer = () => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.subscription.plan === 'pro' || user.subscription.plan === 'enterprise') return true;
    return (user.customerCount || 0) < user.subscription.limits.maxCustomers;
  };

  const canCreateSystem = () => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.subscription.plan === 'pro' || user.subscription.plan === 'enterprise') return true;
    return (user.systemCount || 0) < user.subscription.limits.maxSystems;
  };

  const canCreateReport = () => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.subscription.plan === 'pro' || user.subscription.plan === 'enterprise') return true;
    return (user.reportCount || 0) < user.subscription.limits.maxReports;
  };

  const getSubscriptionLimits = () => {
    if (!user) return null;
    
    const planLimits = {
      free: {
        maxCustomers: 1,
        maxSystems: 1,
        maxReports: 10,
        maxAiMessages: 3,
        features: ['1 customer', '1 system', 'Basic KPI tracking', 'Manual reports', '3 AI chat messages per month', 'Email support']
      },
      pro: {
        maxCustomers: -1,
        maxSystems: Infinity,
        maxReports: Infinity,
        maxAiMessages: -1,
        features: [
          'Unlimited customers',
          'Unlimited systems',
          'Unlimited reports',
          'Unlimited AI chatbot',
          'AI Walchem Reports'
        ]
      },
      enterprise: {
        maxCustomers: -1,
        maxSystems: Infinity,
        maxReports: Infinity,
        maxAiMessages: -1,
        features: [
          'Unlimited customers',
          'Unlimited systems',
          'Unlimited reports',
          'Unlimited AI chatbot',
          'AI Walchem Reports',
          'Technician Account Access',
          'Create Accounts FOR Customers',
          'Custom integrations'
        ]
      }
    };

    return planLimits[user.subscription.plan] || planLimits.free;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshToken,
    reloadUser,
    verifyOtp,
    resendOtp,
    acceptTerms,
    canCreateCustomer,
    canCreateSystem,
    canCreateReport,
    getSubscriptionLimits,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

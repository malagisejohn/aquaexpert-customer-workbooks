import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Droplets } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
      toast.success(response.data?.message || 'If an account exists, we sent a reset link.');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to request password reset';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Droplets className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Reset your password</h2>
          <p className="mt-2 text-gray-600">
            Enter your email and we’ll send you a reset link.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {submitted ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                If an account exists for that email, a reset link has been sent.
              </div>
              <button
                type="button"
                className="w-full btn-primary py-3"
                onClick={() => navigate('/login')}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-field"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex justify-center py-3"
              >
                {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'Send reset link'}
              </button>

              <div className="text-center text-sm text-gray-600">
                Remembered your password?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;



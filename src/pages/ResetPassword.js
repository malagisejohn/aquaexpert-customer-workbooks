import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Droplets } from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const tokenIsPresent = useMemo(() => Boolean(token && String(token).trim()), [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tokenIsPresent) {
      toast.error('Invalid reset link');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/reset-password', {
        token,
        password,
      });
      toast.success(response.data?.message || 'Password reset successfully');
      navigate('/login');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password';
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
          <h2 className="text-3xl font-bold text-gray-900">Choose a new password</h2>
          <p className="mt-2 text-gray-600">Enter a new password to complete your reset.</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {!tokenIsPresent ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                This reset link is invalid. Please request a new one.
              </div>
              <Link to="/forgot-password" className="w-full btn-primary py-3 inline-flex justify-center">
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="input-field"
                  placeholder="Enter a new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="input-field"
                  placeholder="Re-enter the new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex justify-center py-3"
              >
                {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'Reset password'}
              </button>

              <div className="text-center text-sm text-gray-600">
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;



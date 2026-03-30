import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import TermsAgreement from './TermsAgreement';
import { Eye, EyeOff, Droplets, CheckCircle, ArrowLeft, Mail } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [showTermsAgreement, setShowTermsAgreement] = useState(false);
  const [termsData, setTermsData] = useState({ tempToken: null, user: null });
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef([]);
  
  const { register, verifyOtp, resendOtp, acceptTerms } = useAuth();
  const navigate = useNavigate();

  // Check for pending verification on mount (handles page refresh/redirects)
  useEffect(() => {
    const pendingVerification = sessionStorage.getItem('pendingEmailVerification');
    if (pendingVerification) {
      const { email, timestamp } = JSON.parse(pendingVerification);
      // Check if verification is still valid (within 10 minutes)
      if (Date.now() - timestamp < 10 * 60 * 1000) {
        setVerificationEmail(email);
        setShowOtpVerification(true);
      } else {
        sessionStorage.removeItem('pendingEmailVerification');
      }
    }
  }, []);

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    const result = await register({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      password: formData.password,
    });
    
    if (result.success) {
      if (result.requiresVerification) {
        // Store in sessionStorage to persist across redirects
        sessionStorage.setItem('pendingEmailVerification', JSON.stringify({
          email: result.email,
          timestamp: Date.now()
        }));
        setVerificationEmail(result.email);
        setShowOtpVerification(true);
        setResendCooldown(60);
      } else {
        navigate('/dashboard');
      }
    }
    
    setIsLoading(false);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedCode.forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedCode.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }
    
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return;
    
    setIsLoading(true);
    const result = await verifyOtp(verificationEmail, otpCode);
    
    if (result.success) {
      sessionStorage.removeItem('pendingEmailVerification');
      if (result.requiresTermsAcceptance) {
        setShowOtpVerification(false);
        setTermsData({ tempToken: result.tempToken, user: result.user });
        setShowTermsAgreement(true);
      } else {
        navigate('/dashboard');
      }
    } else {
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    }
    setIsLoading(false);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    const result = await resendOtp(verificationEmail);
    if (result.success) {
      // Update timestamp in sessionStorage
      sessionStorage.setItem('pendingEmailVerification', JSON.stringify({
        email: verificationEmail,
        timestamp: Date.now()
      }));
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
    }
  };

  const handleBackToRegister = () => {
    sessionStorage.removeItem('pendingEmailVerification');
    setShowOtpVerification(false);
    setShowTermsAgreement(false);
    setOtp(['', '', '', '', '', '']);
    setVerificationEmail('');
    setTermsData({ tempToken: null, user: null });
  };

  const handleAcceptTerms = async (tempToken) => {
    setIsLoading(true);
    const result = await acceptTerms(tempToken);
    if (result.success) {
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const features = [
    'AI-Powered Water Treatment Analysis',
    'Real-time KPI Monitoring',
    'Automated Report Generation',
    'Multi-System Management',
    'Email Data Ingestion',
    'Professional Dashboard'
  ];

  // Terms Agreement UI
  if (showTermsAgreement) {
    return (
      <TermsAgreement
        user={termsData.user}
        tempToken={termsData.tempToken}
        onAccept={handleAcceptTerms}
        onBack={handleBackToRegister}
        isLoading={isLoading}
      />
    );
  }

  // OTP Verification UI
  if (showOtpVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="card-body">
              <button
                onClick={handleBackToRegister}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to registration
              </button>

              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Verify Your Email
                </h2>
                <p className="text-gray-600">
                  We've sent a 6-digit code to
                </p>
                <p className="font-medium text-gray-900">{verificationEmail}</p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                    Enter verification code
                  </label>
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className="w-full btn-primary flex justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    'Verify & Complete Registration'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Didn't receive the code?
                </p>
                <button
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="text-blue-600 hover:text-blue-500 font-medium text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Droplets className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold">AquaExpert</h1>
          </div>
          
          <div className="max-w-md text-center space-y-6">
            <h2 className="text-2xl font-semibold">
              Join the Future of Water Treatment
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              Start your journey with precision monitoring, AI-powered insights, and automated compliance management.
            </p>
            
            <div className="grid grid-cols-1 gap-3 mt-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-green-400/20 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Right side - Registration form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="card-body">
              {/* Mobile branding */}
              <div className="lg:hidden flex items-center justify-center space-x-2 mb-8">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Droplets className="h-6 w-6 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">AquaExpert</h1>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Create Your Account
                </h2>
                <p className="text-gray-600">
                  Start managing your water treatment systems today
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      className={`input-field ${errors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      className={`input-field ${errors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`input-field ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      className={`input-field pr-10 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="Create a secure password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      className={`input-field pr-10 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary flex justify-center py-3"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Already have an account?</span>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <Link
                    to="/login"
                    className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Sign in to your account
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              By creating an account, you agree to our{' '}
              <Link to="/help" className="text-blue-600 hover:text-blue-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/help" className="text-blue-600 hover:text-blue-500">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

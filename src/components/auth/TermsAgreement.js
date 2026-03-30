import React, { useState, useRef } from 'react';
import { Droplets, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

const TermsAgreement = ({ user, tempToken, onAccept, onBack, isLoading }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const termsRef = useRef(null);

  const handleScroll = () => {
    const element = termsRef.current;
    if (element) {
      const { scrollTop, scrollHeight, clientHeight } = element;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const handleAccept = () => {
    if (agreed) {
      onAccept(tempToken);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="card">
          <div className="card-body">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
            )}

            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Terms of Service
              </h2>
              <p className="text-gray-600">
                {user?.firstName ? `Hi ${user.firstName}, please` : 'Please'} review and accept our Terms of Service to continue.
              </p>
            </div>

            {/* Terms Content */}
            <div
              ref={termsRef}
              onScroll={handleScroll}
              className="h-80 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 text-sm text-gray-700"
            >
              <h3 className="font-bold text-lg mb-3">TERMS OF SERVICE AND USER AGREEMENT</h3>
              <p className="text-xs text-gray-500 mb-4">Last Updated: December 5, 2025</p>

              <h4 className="font-semibold mt-4 mb-2">1. ACCEPTANCE OF TERMS</h4>
              <p className="mb-3">
                This Terms of Service Agreement (the "Agreement") is entered into by and between Iron Valley Holdings LLC ("Company," "we," "us," or "our") and you ("User," "you," or "your"). By accessing, registering for, or using our website, platform, and associated services (collectively, the "Services"), you acknowledge that you have read, understood, and agree to be bound by this Agreement.
              </p>
              <p className="mb-3 font-semibold">IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE SERVICES.</p>

              <h4 className="font-semibold mt-4 mb-2">2. DESCRIPTION OF SERVICES</h4>
              <p className="mb-3">
                Iron Valley Holdings LLC provides a water treatment management and reporting platform (the "Platform"). The Services allow users to manage customer accounts, track system performance, generate reports, and utilize AI-driven insights. We reserve the right to modify, suspend, or discontinue any part of the Services at any time without prior notice.
              </p>

              <h4 className="font-semibold mt-4 mb-2">3. USER ACCOUNTS AND SECURITY</h4>
              <p className="mb-3">
                <strong>3.1. Registration:</strong> To access certain features, you may be required to register for an account. You agree to provide accurate, current, and complete information during the registration process.
              </p>
              <p className="mb-3">
                <strong>3.2. Account Security:</strong> You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>

              <h4 className="font-semibold mt-4 mb-2">4. ACCEPTABLE USE</h4>
              <p className="mb-3">
                You agree not to use the Services for any unlawful purpose or in any way that interrupts, damages, or impairs the Services. Prohibited activities include, but are not limited to:
              </p>
              <ul className="list-disc list-inside mb-3 ml-4">
                <li>Attempting to gain unauthorized access to the Platform or its related systems.</li>
                <li>Using the Services to transmit any harmful code, viruses, or malware.</li>
                <li>Engaging in any activity that interferes with the performance or security of the Services.</li>
                <li>Reverse engineering or attempting to extract source code from the Platform.</li>
              </ul>

              <h4 className="font-semibold mt-4 mb-2">5. INTELLECTUAL PROPERTY RIGHTS</h4>
              <p className="mb-3">
                The Services, including but not limited to text, graphics, logos, software, and code, are the property of Iron Valley Holdings LLC and are protected by copyright, trademark, and other intellectual property laws.
              </p>

              <h4 className="font-semibold mt-4 mb-2">6. DATA RIGHTS</h4>
              <p className="mb-3">
                We respect your business confidentiality. Iron Valley Holdings LLC will never sell your individual customer lists or contact information to third-party marketers.
              </p>
              <p className="mb-3">
                To ensure the continuous improvement and integrity of our Platform, any operational data, metrics, logs, or system information entered into the Services is assigned to and becomes the property of Iron Valley Holdings LLC upon entry. We retain the right to use this data internally for analytics, benchmarking, feature development, and system optimization. This allows us to maintain a robust and efficient platform for all users.
              </p>

              <h4 className="font-semibold mt-4 mb-2">7. PRIVACY</h4>
              <p className="mb-3">
                Your use of the Services is also governed by our Privacy Policy, which is incorporated herein by reference. Please review the Privacy Policy to understand our practices regarding the collection and use of personal information.
              </p>

              <h4 className="font-semibold mt-4 mb-2">8. DISCLAIMERS AND LIMITATION OF LIABILITY</h4>
              <p className="mb-3">
                <strong>8.1. Disclaimer of Warranties:</strong> THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. IRON VALLEY HOLDINGS LLC DISCLAIMS ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p className="mb-3">
                <strong>8.2. Limitation of Liability:</strong> TO THE FULLEST EXTENT PERMITTED BY LAW, IRON VALLEY HOLDINGS LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICES; (B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICES; OR (C) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.
              </p>

              <h4 className="font-semibold mt-4 mb-2">9. INDEMNIFICATION</h4>
              <p className="mb-3">
                You agree to defend, indemnify, and hold harmless Iron Valley Holdings LLC, its officers, directors, employees, and agents, from and against any claims, liabilities, damages, losses, and expenses, including legal fees, arising out of or in any way connected with your access to or use of the Services or your violation of this Agreement.
              </p>

              <h4 className="font-semibold mt-4 mb-2">10. TERMINATION</h4>
              <p className="mb-3">
                We may terminate or suspend your access to the Services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach this Agreement. Upon termination, your right to use the Services will immediately cease.
              </p>

              <h4 className="font-semibold mt-4 mb-2">11. GOVERNING LAW</h4>
              <p className="mb-3">
                This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which Iron Valley Holdings LLC is established, without regard to its conflict of law provisions.
              </p>

              <h4 className="font-semibold mt-4 mb-2">12. CONTACT INFORMATION</h4>
              <p className="mb-3">
                If you have any questions about this Agreement, please contact us at:
              </p>
              <p className="mb-3">
                Iron Valley Holdings LLC<br />
                malagisejohn@gmail.com
              </p>

              <div className="mt-6 pt-4 border-t border-gray-300">
                <p className="text-center text-gray-500 text-xs">
                  — End of Terms of Service —
                </p>
              </div>
            </div>

            {!hasScrolledToBottom && (
              <p className="text-sm text-amber-600 text-center mb-4">
                Please scroll to read the entire agreement
              </p>
            )}

            {/* Checkbox */}
            <div className="flex items-start space-x-3 mb-6">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={!hasScrolledToBottom}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5 disabled:opacity-50"
              />
              <label htmlFor="agree" className={`text-sm ${hasScrolledToBottom ? 'text-gray-700' : 'text-gray-400'}`}>
                I have read and agree to the Terms of Service and User Agreement. I understand that my use of this platform constitutes acceptance of these terms.
              </label>
            </div>

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              disabled={!agreed || isLoading}
              className="w-full btn-primary flex justify-center items-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Accept and Continue
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <Droplets className="h-5 w-5" />
            <span className="font-medium">AquaExpert</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Iron Valley Holdings LLC
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAgreement;


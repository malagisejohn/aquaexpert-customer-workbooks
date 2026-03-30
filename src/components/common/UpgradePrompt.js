import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, ArrowRight, X } from 'lucide-react';

/**
 * UpgradePrompt - Shows when free users hit their plan limits
 * 
 * Props:
 * - type: 'customers' | 'systems' | 'aiMessages'
 * - currentUsage: number - current count
 * - limit: number - max allowed
 * - onDismiss: function (optional) - called when dismissed
 * - variant: 'modal' | 'banner' | 'inline' (default: 'inline')
 */
const UpgradePrompt = ({ 
  type, 
  currentUsage, 
  limit, 
  onDismiss, 
  variant = 'inline' 
}) => {
  const messages = {
    customers: {
      title: 'Customer Limit Reached',
      description: `You've reached the maximum of ${limit} customer on the free plan.`,
      benefit: 'Upgrade to Enterprise for unlimited customers and advanced features.'
    },
    systems: {
      title: 'System Limit Reached',
      description: `You've reached the maximum of ${limit} systems on the free plan.`,
      benefit: 'Upgrade to Enterprise for unlimited systems and advanced features.'
    },
    aiMessages: {
      title: 'AI Message Limit Reached',
      description: `You've used all ${limit} AI messages for this month.`,
      benefit: 'Upgrade to Enterprise for unlimited AI chat access.'
    }
  };

  const content = messages[type] || messages.systems;

  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg shadow-lg mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Crown className="h-5 w-5 text-yellow-300" />
            <div>
              <span className="font-semibold">{content.title}</span>
              <span className="ml-2 text-blue-100">{content.benefit}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              to="/subscription"
              className="inline-flex items-center px-4 py-1.5 bg-white text-blue-600 rounded-md font-medium text-sm hover:bg-blue-50 transition-colors"
            >
              Upgrade Now
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
          
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Crown className="h-8 w-8 text-white" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {content.title}
            </h3>
            
            <p className="text-gray-600 mb-4">
              {content.description}
            </p>
            
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                {content.benefit}
              </p>
            </div>
            
            <div className="space-y-3">
              <Link
                to="/subscription"
                className="btn-primary w-full flex items-center justify-center"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Enterprise
              </Link>
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="btn-secondary w-full"
                >
                  Maybe Later
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: inline variant
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Crown className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            {content.title}
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            {content.description} {content.benefit}
          </p>
          <Link
            to="/subscription"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Upgrade Now
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
};

export default UpgradePrompt;

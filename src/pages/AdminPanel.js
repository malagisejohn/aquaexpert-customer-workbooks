import React from 'react';
import { Shield } from 'lucide-react';

const AdminPanel = () => {
  return (
    <div className="px-6 max-w-7xl mx-auto">
      <div className="text-center py-12">
        <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600 mb-6">
          System administration and user management
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-blue-800 text-sm">
            This page is under development. Full admin dashboard and user management will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Package } from 'lucide-react';

const WorkbookInventoryToggle = ({ activePage }) => {
  const navigate = useNavigate();
  const { id: systemId } = useParams();

  const handleToggle = (page) => {
    if (page === activePage) return;
    navigate(`/systems/${systemId}/${page}`);
  };

  return (
    <div className="inline-flex rounded-lg border-2 border-gray-300 bg-white p-0.5 shadow-sm">
      <button
        onClick={() => handleToggle('workbook')}
        className={`flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
          activePage === 'workbook'
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <FileText className="h-4 w-4 mr-1.5" />
        Workbook
      </button>
      <button
        onClick={() => handleToggle('inventory')}
        className={`flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
          activePage === 'inventory'
            ? 'bg-green-600 text-white shadow-md'
            : 'bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <Package className="h-4 w-4 mr-1.5" />
        Inventory
      </button>
    </div>
  );
};

export default WorkbookInventoryToggle;


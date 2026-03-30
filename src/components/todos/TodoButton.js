import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import TodoModal from './TodoModal';
import { useAuth } from '../../contexts/AuthContext';

const TodoButton = ({ 
  source = 'navbar', 
  customerId = null, 
  systemId = null,
  customerName = '',
  systemName = '',
  variant = 'icon', // 'icon' or 'button'
  className = '',
  showBadge = true
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [modalContext, setModalContext] = useState({
    source,
    customerId,
    systemId,
    customerName,
    systemName
  });

  useEffect(() => {
    setModalContext({
      source,
      customerId,
      systemId,
      customerName,
      systemName
    });
  }, [source, customerId, systemId, customerName, systemName]);

  const isEnterprise = user?.accountType !== 'customer' && user?.subscription?.plan === 'enterprise';

  // Fetch pending count for badge
  useEffect(() => {
    if (!showBadge || !isEnterprise) return;
    
    const fetchCount = async () => {
      try {
        const axios = (await import('axios')).default;
        const params = new URLSearchParams();
        if (customerId) params.append('customerId', customerId);
        if (systemId) params.append('systemId', systemId);
        
        const response = await axios.get(`/api/todos/stats?${params.toString()}`);
        const count = (response.data.pending || 0) + (response.data.in_progress || 0);
        setPendingCount(count);
      } catch (error) {
        console.error('Error fetching todo count:', error);
      }
    };

    fetchCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [customerId, systemId, showBadge, isEnterprise]);

  if (!isEnterprise) {
    return null;
  }

  const handleClick = async () => {
    let resolvedContext = {
      source,
      customerId,
      systemId,
      customerName,
      systemName
    };

    try {
      const axios = (await import('axios')).default;

      if (systemId && (!systemName || !customerName || !customerId)) {
        const response = await axios.get(`/api/systems/${systemId}`);
        const system = response.data?.system;
        const customerRef = system?.customerId;
        const resolvedCustomerId = typeof customerRef === 'object' ? customerRef?._id : customerRef || customerId;
        const resolvedCustomerName = typeof customerRef === 'object' ? customerRef?.name || customerName : customerName;

        resolvedContext = {
          ...resolvedContext,
          customerId: resolvedCustomerId || null,
          customerName: resolvedCustomerName || '',
          systemName: system?.name || systemName
        };
      } else if (customerId && !customerName) {
        const response = await axios.get(`/api/customers/${customerId}`);
        const resolvedCustomer = response.data?.customer || response.data || {};
        resolvedContext = {
          ...resolvedContext,
          customerName: resolvedCustomer?.name || customerName
        };
      }
    } catch (_error) {
      // Keep existing context if lookup fails.
    }

    setModalContext(resolvedContext);
    setIsOpen(true);
  };

  if (variant === 'button') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${className}`}
        >
          <Plus className="w-4 h-4" />
          <span>Add Todo</span>
          {showBadge && pendingCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-white text-blue-600 text-xs font-bold rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        
        <TodoModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          source={modalContext.source}
          customerId={modalContext.customerId}
          systemId={modalContext.systemId}
          customerName={modalContext.customerName}
          systemName={modalContext.systemName}
        />
      </>
    );
  }

  // Icon variant (for navbar)
  return (
    <>
      <button
        onClick={handleClick}
        className={`relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${className}`}
        title="Todos"
      >
        <CheckSquare className="w-5 h-5" />
        {showBadge && pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>
      
      <TodoModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        source={modalContext.source}
        customerId={modalContext.customerId}
        systemId={modalContext.systemId}
        customerName={modalContext.customerName}
        systemName={modalContext.systemName}
      />
    </>
  );
};

export default TodoButton;

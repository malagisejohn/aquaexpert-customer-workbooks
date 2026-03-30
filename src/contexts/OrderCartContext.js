import React, { createContext, useContext, useState, useCallback } from 'react';

const OrderCartContext = createContext(null);

// Container sizes available for ordering
export const CONTAINER_SIZES = [
  { value: 5, label: '5 gal' },
  { value: 15, label: '15 gal' },
  { value: 30, label: '30 gal' },
  { value: 55, label: '55 gal' },
  { value: 275, label: '275 gal' },
  { value: 330, label: '330 gal' },
  { value: 'other', label: 'Other' }
];

export const OrderCartProvider = ({ children }) => {
  // Cart items structure: { customerId: { customerName, customerNumber, systems: { systemId: { systemName, products: [...] } } } }
  const [cartItems, setCartItems] = useState({});

  // Add item to cart
  const addToCart = useCallback((customerId, customerName, customerNumber, systemId, systemName, product) => {
    setCartItems(prev => {
      const newCart = { ...prev };
      
      // Initialize customer if not exists
      if (!newCart[customerId]) {
        newCart[customerId] = {
          customerName,
          customerNumber,
          systems: {}
        };
      }
      
      // Initialize system if not exists
      if (!newCart[customerId].systems[systemId]) {
        newCart[customerId].systems[systemId] = {
          systemName,
          products: []
        };
      }
      
      // Check if product already exists in cart
      const existingIndex = newCart[customerId].systems[systemId].products.findIndex(
        p => p.productId === product.productId && p.containerSize === product.containerSize
      );
      
      if (existingIndex >= 0) {
        // Update quantity
        newCart[customerId].systems[systemId].products[existingIndex].quantity = product.quantity;
      } else {
        // Add new product
        newCart[customerId].systems[systemId].products.push(product);
      }
      
      return newCart;
    });
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((customerId, systemId, productId, containerSize) => {
    setCartItems(prev => {
      const newCart = { ...prev };
      
      if (newCart[customerId]?.systems[systemId]) {
        newCart[customerId].systems[systemId].products = 
          newCart[customerId].systems[systemId].products.filter(
            p => !(p.productId === productId && p.containerSize === containerSize)
          );
        
        // Clean up empty systems
        if (newCart[customerId].systems[systemId].products.length === 0) {
          delete newCart[customerId].systems[systemId];
        }
        
        // Clean up empty customers
        if (Object.keys(newCart[customerId].systems).length === 0) {
          delete newCart[customerId];
        }
      }
      
      return newCart;
    });
  }, []);

  // Update quantity of an item
  const updateQuantity = useCallback((customerId, systemId, productId, containerSize, quantity) => {
    setCartItems(prev => {
      const newCart = { ...prev };
      
      if (newCart[customerId]?.systems[systemId]) {
        const productIndex = newCart[customerId].systems[systemId].products.findIndex(
          p => p.productId === productId && p.containerSize === containerSize
        );
        
        if (productIndex >= 0) {
          if (quantity <= 0) {
            // Remove if quantity is 0 or less
            newCart[customerId].systems[systemId].products.splice(productIndex, 1);
            
            // Clean up empty systems
            if (newCart[customerId].systems[systemId].products.length === 0) {
              delete newCart[customerId].systems[systemId];
            }
            
            // Clean up empty customers
            if (Object.keys(newCart[customerId].systems).length === 0) {
              delete newCart[customerId];
            }
          } else {
            newCart[customerId].systems[systemId].products[productIndex].quantity = quantity;
          }
        }
      }
      
      return newCart;
    });
  }, []);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCartItems({});
  }, []);

  // Get total item count
  const getItemCount = useCallback(() => {
    let count = 0;
    Object.values(cartItems).forEach(customer => {
      Object.values(customer.systems).forEach(system => {
        count += system.products.length;
      });
    });
    return count;
  }, [cartItems]);

  // Check if cart is empty
  const isCartEmpty = useCallback(() => {
    return Object.keys(cartItems).length === 0;
  }, [cartItems]);

  // Smart suggestion for container size based on historical deliveries and usage rate
  const suggestContainerSize = useCallback((product) => {
    // Get historical safety stock delivered amounts from volume readings
    const readings = product.volumeReadings || [];
    const deliveries = readings
      .filter(r => r.safetyStockDelivered > 0)
      .map(r => r.safetyStockDelivered);

    if (deliveries.length === 0) {
      // No history, default to 55 gallon
      return { size: 55, quantity: 1 };
    }

    // Calculate average delivery
    const avgDelivery = deliveries.reduce((a, b) => a + b, 0) / deliveries.length;
    
    // Find the best container size match
    const standardSizes = [5, 15, 30, 55, 275, 330];
    
    // Find which container size(s) would typically make up the delivery
    let bestMatch = { size: 55, quantity: 1, waste: Infinity };
    
    for (const size of standardSizes) {
      const quantity = Math.round(avgDelivery / size);
      if (quantity >= 1) {
        const totalVolume = quantity * size;
        const waste = Math.abs(totalVolume - avgDelivery);
        if (waste < bestMatch.waste) {
          bestMatch = { size, quantity, waste };
        }
      }
    }
    
    // If usage rate is available, consider it for quantity adjustment
    const usageRate = product.usageSummary?.usageRate;
    if (usageRate && usageRate > 0) {
      // Estimate how many days of supply we want (typically 30-60 days)
      const daysOfSupply = 45;
      const neededVolume = usageRate * daysOfSupply;
      
      // Adjust quantity based on needed volume
      const adjustedQuantity = Math.ceil(neededVolume / bestMatch.size);
      if (adjustedQuantity >= 1) {
        bestMatch.quantity = adjustedQuantity;
      }
    }
    
    return bestMatch;
  }, []);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getItemCount,
    isCartEmpty,
    suggestContainerSize,
    CONTAINER_SIZES
  };

  return (
    <OrderCartContext.Provider value={value}>
      {children}
    </OrderCartContext.Provider>
  );
};

export const useOrderCart = () => {
  const context = useContext(OrderCartContext);
  if (!context) {
    throw new Error('useOrderCart must be used within an OrderCartProvider');
  }
  return context;
};

export default OrderCartContext;

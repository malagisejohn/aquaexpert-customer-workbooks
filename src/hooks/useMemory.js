import { useState, useCallback, useEffect, useRef } from 'react';
import * as memoryService from '../services/memoryService';

/**
 * useMemory Hook
 * 
 * React hook for managing memory in aquaexpert2.
 * Provides easy access to conversation history and key facts.
 */

export const useMemory = (options = {}) => {
  const {
    customerId = null,
    systemId = null,
    autoLoad = true
  } = options;

  const [conversations, setConversations] = useState([]);
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const sessionIdRef = useRef(generateSessionId());

  // Generate unique session ID
  function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Load recent conversations
  const loadConversations = useCallback(async (limit = 50) => {
    setLoading(true);
    setError(null);
    try {
      const response = await memoryService.getRecentConversations(limit, customerId, systemId);
      setConversations(response.memories || []);
      return response.memories;
    } catch (err) {
      setError(err.message || 'Failed to load conversations');
      console.error('Error loading conversations:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [customerId, systemId]);

  // Load key facts
  const loadFacts = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await memoryService.getAllFacts({
        customerId,
        systemId,
        ...options
      });
      setFacts(response.facts || []);
      return response.facts;
    } catch (err) {
      setError(err.message || 'Failed to load facts');
      console.error('Error loading facts:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [customerId, systemId]);

  // Log a chat message to memory
  const logMessage = useCallback(async (role, content, metadata = {}) => {
    try {
      const response = await memoryService.logChatMessage({
        sessionId: sessionIdRef.current,
        role,
        content,
        customerId,
        systemId,
        ...metadata
      });
      
      // Update local state if it's a user message
      if (role === 'user') {
        setConversations(prev => [response.memory, ...prev]);
      }
      
      return response.memory;
    } catch (err) {
      console.error('Error logging message:', err);
      return null;
    }
  }, [customerId, systemId]);

  // Get memory context for AI
  const getContext = useCallback(async (query = null) => {
    try {
      const response = await memoryService.getMemoryContext({
        customerId,
        systemId,
        query,
        conversationLimit: 20,
        factLimit: 10
      });
      return response.context;
    } catch (err) {
      console.error('Error getting memory context:', err);
      return { recentConversations: [], relevantFacts: [] };
    }
  }, [customerId, systemId]);

  // Create a new fact
  const createFact = useCallback(async (factData) => {
    setLoading(true);
    try {
      const response = await memoryService.createFact({
        ...factData,
        customerId,
        systemId
      });
      setFacts(prev => [response.fact, ...prev]);
      return response.fact;
    } catch (err) {
      setError(err.message || 'Failed to create fact');
      console.error('Error creating fact:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [customerId, systemId]);

  // Update a fact
  const updateFact = useCallback(async (id, updates) => {
    setLoading(true);
    try {
      const response = await memoryService.updateFact(id, updates);
      setFacts(prev => prev.map(f => f._id === id ? response.fact : f));
      return response.fact;
    } catch (err) {
      setError(err.message || 'Failed to update fact');
      console.error('Error updating fact:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a fact
  const deleteFact = useCallback(async (id) => {
    setLoading(true);
    try {
      await memoryService.deleteFact(id);
      setFacts(prev => prev.filter(f => f._id !== id));
      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete fact');
      console.error('Error deleting fact:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Search memory
  const search = useCallback(async (query, type = 'all') => {
    setLoading(true);
    try {
      const results = await memoryService.searchMemory(query, { type });
      return results;
    } catch (err) {
      setError(err.message || 'Failed to search memory');
      console.error('Error searching memory:', err);
      return { conversations: [], facts: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  // Extract facts from AI response
  const extractFacts = useCallback(async (userMessage, aiResponse) => {
    try {
      const extractedFacts = await memoryService.extractFactsFromChat({
        userMessage,
        aiResponse,
        customerId,
        systemId
      });
      
      if (extractedFacts.length > 0) {
        setFacts(prev => [...extractedFacts, ...prev]);
      }
      
      return extractedFacts;
    } catch (err) {
      console.error('Error extracting facts:', err);
      return [];
    }
  }, [customerId, systemId]);

  // Get facts by category
  const getFactsByCategory = useCallback(async (category) => {
    try {
      const response = await memoryService.getFactsByCategory(category, {
        customerId,
        systemId
      });
      return response.facts;
    } catch (err) {
      console.error('Error getting facts by category:', err);
      return [];
    }
  }, [customerId, systemId]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadConversations(20);
      loadFacts({ limit: 20 });
    }
  }, [autoLoad, loadConversations, loadFacts]);

  return {
    // State
    conversations,
    facts,
    loading,
    error,
    sessionId: sessionIdRef.current,
    
    // Actions
    loadConversations,
    loadFacts,
    logMessage,
    getContext,
    createFact,
    updateFact,
    deleteFact,
    search,
    extractFacts,
    getFactsByCategory
  };
};

/**
 * useChatMemory Hook
 * 
 * Specialized hook for chat components with automatic memory logging
 */
export const useChatMemory = (options = {}) => {
  const {
    customerId = null,
    systemId = null,
    autoExtractFacts = true
  } = options;

  const memory = useMemory({ customerId, systemId, autoLoad: false });
  const [isLogging, setIsLogging] = useState(false);

  // Log user message
  const logUserMessage = useCallback(async (content, metadata = {}) => {
    setIsLogging(true);
    try {
      return await memory.logMessage('user', content, metadata);
    } finally {
      setIsLogging(false);
    }
  }, [memory]);

  // Log assistant message
  const logAssistantMessage = useCallback(async (content, metadata = {}) => {
    setIsLogging(true);
    try {
      return await memory.logMessage('assistant', content, metadata);
    } finally {
      setIsLogging(false);
    }
  }, [memory]);

  // Log conversation exchange and optionally extract facts
  const logExchange = useCallback(async (userMessage, aiResponse, metadata = {}) => {
    setIsLogging(true);
    try {
      // Log user message
      await memory.logMessage('user', userMessage, metadata);
      
      // Log assistant message
      const aiMetadata = { ...metadata, model: metadata.model };
      await memory.logMessage('assistant', aiResponse, aiMetadata);
      
      // Extract facts if enabled
      if (autoExtractFacts) {
        await memory.extractFacts(userMessage, aiResponse);
      }
    } catch (err) {
      console.error('Error logging exchange:', err);
    } finally {
      setIsLogging(false);
    }
  }, [memory, autoExtractFacts]);

  // Get context for AI prompt
  const getAIContext = useCallback(async (currentMessage = '') => {
    return await memory.getContext(currentMessage);
  }, [memory]);

  return {
    ...memory,
    isLogging,
    logUserMessage,
    logAssistantMessage,
    logExchange,
    getAIContext
  };
};

export default useMemory;

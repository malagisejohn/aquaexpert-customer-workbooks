import axios from 'axios';

/**
 * Memory Service - Frontend API Client
 * 
 * Provides methods to interact with the memory system backend.
 * Follows the OpenClaw memory pattern with conversations and key facts.
 */

const API_URL = '/api/memory';

// Conversation Memory APIs
export const getRecentConversations = async (limit = 50, customerId = null, systemId = null) => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit);
  if (customerId) params.append('customerId', customerId);
  if (systemId) params.append('systemId', systemId);
  
  const response = await axios.get(`${API_URL}/conversations/recent?${params.toString()}`);
  return response.data;
};

export const getConversationsByDay = async (dayKey, customerId = null, systemId = null) => {
  const params = new URLSearchParams();
  if (customerId) params.append('customerId', customerId);
  if (systemId) params.append('systemId', systemId);
  
  const response = await axios.get(`${API_URL}/conversations/${dayKey}?${params.toString()}`);
  return response.data;
};

export const searchConversations = async (query, limit = 20) => {
  const response = await axios.get(`${API_URL}/conversations/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

export const saveConversation = async ({
  sessionId,
  entry,
  customerId = null,
  systemId = null,
  metadata = {}
}) => {
  const response = await axios.post(`${API_URL}/conversations`, {
    sessionId,
    entry,
    customerId,
    systemId,
    metadata
  });
  return response.data;
};

// Key Facts APIs
export const getAllFacts = async (options = {}) => {
  const { customerId, systemId, category, limit = 50 } = options;
  const params = new URLSearchParams();
  if (customerId) params.append('customerId', customerId);
  if (systemId) params.append('systemId', systemId);
  if (category) params.append('category', category);
  if (limit) params.append('limit', limit);
  
  const response = await axios.get(`${API_URL}/facts?${params.toString()}`);
  return response.data;
};

export const getFactsByCategory = async (category, options = {}) => {
  const { customerId, systemId } = options;
  const params = new URLSearchParams();
  if (customerId) params.append('customerId', customerId);
  if (systemId) params.append('systemId', systemId);
  
  const response = await axios.get(`${API_URL}/facts/category/${category}?${params.toString()}`);
  return response.data;
};

export const searchFacts = async (query, options = {}) => {
  const { keywords, limit = 20 } = options;
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (keywords) params.append('keywords', keywords);
  if (limit) params.append('limit', limit);
  
  const response = await axios.get(`${API_URL}/facts/search?${params.toString()}`);
  return response.data;
};

export const createFact = async ({
  content,
  category = 'general',
  tags = [],
  customerId = null,
  systemId = null,
  importance = 'medium',
  expiresAt = null,
  source = 'manual'
}) => {
  const response = await axios.post(`${API_URL}/facts`, {
    content,
    category,
    tags,
    customerId,
    systemId,
    importance,
    expiresAt,
    source
  });
  return response.data;
};

export const updateFact = async (id, updates) => {
  const response = await axios.put(`${API_URL}/facts/${id}`, updates);
  return response.data;
};

export const deleteFact = async (id) => {
  const response = await axios.delete(`${API_URL}/facts/${id}`);
  return response.data;
};

// Memory Context API (for AI chat)
export const getMemoryContext = async (options = {}) => {
  const {
    customerId = null,
    systemId = null,
    query = null,
    conversationLimit = 20,
    factLimit = 10
  } = options;
  
  const params = new URLSearchParams();
  if (customerId) params.append('customerId', customerId);
  if (systemId) params.append('systemId', systemId);
  if (query) params.append('query', query);
  if (conversationLimit) params.append('conversationLimit', conversationLimit);
  if (factLimit) params.append('factLimit', factLimit);
  
  const response = await axios.get(`${API_URL}/context?${params.toString()}`);
  return response.data;
};

// Convenience function for chat components
export const logChatMessage = async ({
  sessionId,
  role,
  content,
  customerId = null,
  systemId = null,
  model = null,
  tokens = 0
}) => {
  return saveConversation({
    sessionId,
    entry: {
      role,
      content,
      timestamp: new Date().toISOString()
    },
    customerId,
    systemId,
    metadata: {
      model,
      tokens,
      hasAttachments: false
    }
  });
};

// Extract and save facts from AI response
export const extractFactsFromChat = async ({
  userMessage,
  aiResponse,
  customerId = null,
  systemId = null
}) => {
  const facts = [];
  
  // Simple extraction logic (same as backend)
  // Look for decision markers
  if (aiResponse.match(/(?:decided|agreed to|will|plan to|should|recommend)/i)) {
    const decisionMatch = aiResponse.match(/(?:decided|agreed to|will|plan to|should|recommend)[^.]+/i);
    if (decisionMatch && decisionMatch[0].length > 20) {
      facts.push({
        category: 'decision',
        content: decisionMatch[0].trim(),
        importance: 'high'
      });
    }
  }
  
  // Look for action items
  const actionMatches = aiResponse.match(/(?:action item|task|to-do|follow.?up)[^.]*/gi) || [];
  actionMatches.forEach(match => {
    if (match.length > 15) {
      facts.push({
        category: 'action_item',
        content: match.trim(),
        importance: 'medium'
      });
    }
  });
  
  // Save all extracted facts
  const savedFacts = [];
  for (const fact of facts) {
    try {
      const result = await createFact({
        ...fact,
        customerId,
        systemId,
        source: 'ai_extraction'
      });
      savedFacts.push(result.fact);
    } catch (error) {
      console.error('Failed to save fact:', error);
    }
  }
  
  return savedFacts;
};

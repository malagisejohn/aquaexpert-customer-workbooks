import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatMemory } from '../../hooks/useMemory';
import { Send, Lightbulb, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * ChatWithMemory Component
 * 
 * Enhanced chat component with memory integration.
 * Shows conversation history, relevant facts, and allows memory management.
 */

const ChatWithMemory = ({
  customerId = null,
  systemId = null,
  systemName = '',
  customerName = '',
  onSendMessage,
  initialMessages = [],
  className = ''
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' or 'facts'
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const {
    conversations,
    facts,
    loading,
    logExchange,
    getAIContext,
    createFact,
    deleteFact
  } = useChatMemory({
    customerId,
    systemId,
    autoExtractFacts: true
  });

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setIsTyping(true);

    // Add user message to UI
    const newUserMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMsg]);

    try {
      // Get memory context for AI
      const memoryContext = await getAIContext(userMessage);
      
      // Call the provided onSendMessage function
      const response = await onSendMessage(userMessage, memoryContext);
      
      if (response && response.content) {
        // Add AI response to UI
        const newAiMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString(),
          model: response.model,
          toolRuns: response.toolRuns || []
        };
        setMessages(prev => [...prev, newAiMsg]);

        // Log to memory
        await logExchange(userMessage, response.content, {
          model: response.model,
          tokens: response.tokens
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response');
      
      // Add error message
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        error: true
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for grouping
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
  };

  // Group conversations by date
  const groupedConversations = conversations.reduce((groups, conv) => {
    const date = formatDate(conv.date);
    if (!groups[date]) groups[date] = [];
    groups[date].push(conv);
    return groups;
  }, {});

  // Handle creating a new fact
  const handleCreateFact = async () => {
    const content = prompt('Enter the fact or note:');
    if (!content) return;

    const category = prompt('Category (general, customer_preference, decision, action_item):', 'general');
    
    try {
      await createFact({
        content,
        category: category || 'general',
        importance: 'medium'
      });
      toast.success('Fact saved to memory');
    } catch (error) {
      toast.error('Failed to save fact');
    }
  };

  // Handle deleting a fact
  const handleDeleteFact = async (factId) => {
    if (!window.confirm('Are you sure you want to delete this fact?')) return;
    
    try {
      await deleteFact(factId);
      toast.success('Fact deleted');
    } catch (error) {
      toast.error('Failed to delete fact');
    }
  };

  return (
    <div className={`flex h-full ${className}`}>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900">
              {customerName ? `${customerName} - ` : ''}
              {systemName || 'AI Assistant'}
            </h2>
            <p className="text-sm text-gray-500">
              {customerId || systemId ? 'Memory enabled for context' : 'General chat'}
            </p>
          </div>
          <button
            onClick={() => setShowMemoryPanel(!showMemoryPanel)}
            className={`p-2 rounded-lg transition-colors ${
              showMemoryPanel 
                ? 'bg-blue-100 text-blue-600' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Toggle memory panel"
          >
            <Lightbulb className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Start a conversation. I'll remember context from previous chats.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : msg.error
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <span className="text-xs opacity-60 mt-1 block">
                  {formatTime(msg.timestamp)}
                  {msg.model && ` • ${msg.model}`}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message... (Press Enter to send)"
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Memory Panel */}
      {showMemoryPanel && (
        <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'conversations'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('facts')}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'facts'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Facts ({facts.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'conversations' ? (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : Object.keys(groupedConversations).length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No conversation history yet
                  </div>
                ) : (
                  Object.entries(groupedConversations).map(([date, convs]) => (
                    <div key={date}>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        {date}
                      </h4>
                      <div className="space-y-2">
                        {convs.map((conv) => (
                          <div
                            key={conv._id}
                            className="bg-white rounded-lg p-3 text-sm shadow-sm"
                          >
                            <div className="flex items-center space-x-1 mb-1">
                              <span className={`w-2 h-2 rounded-full ${
                                conv.entry.role === 'user' 
                                  ? 'bg-blue-500' 
                                  : 'bg-green-500'
                              }`} />
                              <span className="text-xs text-gray-500 capitalize">
                                {conv.entry.role}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatTime(conv.date)}
                              </span>
                            </div>
                            <p className="text-gray-700 line-clamp-2">
                              {conv.entry.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleCreateFact}
                  className="w-full flex items-center justify-center space-x-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add Fact</span>
                </button>

                {facts.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No facts saved yet. I'll automatically extract important information from our conversations.
                  </div>
                ) : (
                  facts.map((fact) => (
                    <div
                      key={fact._id}
                      className="bg-white rounded-lg p-3 text-sm shadow-sm group"
                    >
                      <div className="flex items-start justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          fact.category === 'decision' ? 'bg-purple-100 text-purple-700' :
                          fact.category === 'action_item' ? 'bg-orange-100 text-orange-700' :
                          fact.category === 'customer_preference' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {fact.category.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => handleDeleteFact(fact._id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-gray-700">{fact.content}</p>
                      {fact.tags?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {fact.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 text-xs text-gray-500">
            <p>Memory helps me remember context from previous conversations.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWithMemory;

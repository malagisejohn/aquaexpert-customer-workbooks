import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import UpgradePrompt from '../components/common/UpgradePrompt';
import { 
  Send, 
  Bot, 
  User, 
  Copy,
  RefreshCw,
  FileDown,
  Crown,
  X
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CHATBOT_SYSTEM_PROMPT } from '../constants/chatPrompts';
import { DEFAULT_CHAT_MODEL } from '../constants/aiModels';
import {
  FILE_UPLOAD_ACCEPT,
  FILE_UPLOAD_ERROR_MESSAGES,
  MAX_FILES
} from '../constants/fileUpload';
import useFileAttachments from '../hooks/useFileAttachments';
import useStreamingChat from '../hooks/useStreamingChat';
import AttachedFilesPreview from '../components/chat/AttachedFilesPreview';
import ChatMessageContent from '../components/chat/ChatMessageContent';
import FileAttachmentButton from '../components/chat/FileAttachmentButton';
import { buildAiServiceReportHtml } from '../utils/reportMarkdownFormatter';

const ChatBot = () => {
  const navigate = useNavigate();
  const { user, reloadUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const currentModel = DEFAULT_CHAT_MODEL;
  const isEnterprise = user?.accountType !== 'customer' && user?.subscription?.plan === 'enterprise';
  
  // Check if user is an operator account for role-specific greeting copy
  const isOperator = user?.accountType === 'customer';
  
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCustomers, setReportCustomers] = useState([]);
  const [loadingReportCustomers, setLoadingReportCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [pendingReportContent, setPendingReportContent] = useState('');
  const [usage, setUsage] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const messagesEndRef = useRef(null);
  const dragDepthRef = useRef(0);
  const {
    attachedFiles,
    fileInputRef,
    handleFileSelect,
    handleFileDrop,
    removeAttachedFile,
    clearAttachedFiles
  } = useFileAttachments();
  const { streamChatCompletion } = useStreamingChat();

  // Fetch usage data
  const fetchUsage = async () => {
    try {
      const response = await axios.get('/api/subscriptions/usage');
      setUsage(response.data);
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const initializeChat = useCallback(() => {
    // Operator accounts get a simplified, technical-focused greeting
    const operatorGreeting = `Hello! I'm AquaExpert, your water treatment assistant. I can help you with:

- Understanding your water readings and what they mean
- Analyzing KPI data and identifying issues
- Troubleshooting water treatment problems
- Explaining corrective actions and next steps
- Understanding alert thresholds and ranges

What questions do you have about your system?`;

    const enterpriseGreeting = `Hello ${user?.firstName}! I'm AquaExpert, your agentic water treatment assistant. I can run tools for you in chat, including:

- System context lookup across customer and child-account data
- Latest Walchem and historical service report retrieval
- Inventory and KPI workbook trend analysis
- To-do recommendations and direct to-do creation
- Order recommendations and order placement previews (with explicit confirmation before send)
- Rendered markdown tables and chart blocks for trend summaries

Tell me the outcome you want, and I'll run the right tools automatically.`;

    const standardGreeting = `Hello ${user?.firstName}! I'm AquaExpert, your water treatment assistant. I can help with:

- Technical water treatment (diagnostics, ranges, actions)
- Prospecting research and discovery questions
- Proposal and sales email drafts with ROI talking points
- KPI analysis and trend insights
- Service visit summaries and recommendations
- Alert thresholds and monitoring strategies

What do you want to do?`;

    const welcomeMessage = {
      id: Date.now(),
      role: 'assistant',
      content: isOperator ? operatorGreeting : (isEnterprise ? enterpriseGreeting : standardGreeting),
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
  }, [user?.firstName, isOperator, isEnterprise]);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim()) return;

    // Check AI message limits for free users (use fresh usage data)
    if (usage && usage.atLimit?.aiMessages) {
      setShowUpgradeModal(true);
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
      attachments: attachedFiles.length > 0 ? attachedFiles.map(f => f.name) : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    const currentAttachments = [...attachedFiles];
    clearAttachedFiles();
    setIsLoading(true);

    // Create placeholder for streaming response
    const aiMessageId = Date.now() + 1;
    const aiMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      const systemPrompt = CHATBOT_SYSTEM_PROMPT;
      
      const payload = {
        message: messageText.trim(),
        systemPrompt,
        conversationHistory: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      };

      // Include file attachments if any
      if (currentAttachments.length > 0) {
        payload.attachments = currentAttachments.map(f => ({
          name: f.name,
          type: f.type,
          content: f.content
        }));
      }

      const token = localStorage.getItem('token');
      await streamChatCompletion({
        payload,
        token,
        onContent: (streamedContent, parsed) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    content: streamedContent,
                    ...(Array.isArray(parsed?.toolRuns) ? { toolRuns: parsed.toolRuns } : {})
                  }
                : msg
            )
          );
        }
      });

      // Finalize the message
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, isStreaming: false, model: currentModel }
          : msg
      ));
      
      // Refresh user and usage data to update AI usage counters
      reloadUser?.();
      fetchUsage();

    } catch (error) {
      console.error('Error sending message:', error);
      const serverMsg = error.message || 'Failed to get AI response';
      
      // Update the streaming message to show error
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: serverMsg, isError: true, isStreaming: false }
          : msg
      ));
      toast.error(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const handleNewConversation = () => {
    setMessages([]);
    initializeChat();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isFileDragEvent = useCallback((event) => {
    const dragTypes = event.dataTransfer?.types;
    if (!dragTypes) return false;
    return Array.from(dragTypes).includes('Files');
  }, []);

  const handleDragEnter = useCallback((event) => {
    if (isLoading || !isFileDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  }, [isFileDragEvent, isLoading]);

  const handleDragOver = useCallback((event) => {
    if (isLoading || !isFileDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }, [isFileDragEvent, isLoading]);

  const handleDragLeave = useCallback((event) => {
    if (!isFileDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDraggingFiles(false);
    }
  }, [isFileDragEvent]);

  const handleDrop = useCallback(async (event) => {
    if (isLoading || !isFileDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDraggingFiles(false);

    const files = event.dataTransfer?.files;
    if (!files?.length) return;

    await handleFileDrop(files);
  }, [handleFileDrop, isFileDragEvent, isLoading]);

  const fetchCustomersForReport = async () => {
    setLoadingReportCustomers(true);
    try {
      const response = await axios.get('/api/customers', {
        params: {
          page: 1,
          limit: 200
        }
      });

      const customers = response.data.customers || [];
      setReportCustomers(customers);
      setSelectedCustomerId((current) => {
        if (current && customers.some((customer) => customer._id === current)) {
          return current;
        }
        return customers[0]?._id || '';
      });
    } catch (error) {
      console.error('Failed to load customers for report generation:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoadingReportCustomers(false);
    }
  };

  const closeReportModal = (forceClose = false) => {
    if (!forceClose && generatingReport) return;
    setShowReportModal(false);
    setPendingReportContent('');
  };

  const handleGenerateReport = async () => {
    const lastAiMessage = [...messages].reverse().find(
      msg => msg.role === 'assistant' && !msg.isError && msg.content
    );

    if (!lastAiMessage || !lastAiMessage.content.trim()) {
      toast.error('No AI response available to generate report');
      return;
    }

    if (user?.accountType === 'customer') {
      toast.error('Please contact your account manager to generate customer service reports');
      return;
    }

    setPendingReportContent(lastAiMessage.content.trim());
    setShowReportModal(true);
    await fetchCustomersForReport();
  };

  const handleCreateServiceReport = async () => {
    if (!pendingReportContent) {
      toast.error('No AI response available to generate report');
      return;
    }

    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    const selectedCustomer = reportCustomers.find((customer) => customer._id === selectedCustomerId);
    if (!selectedCustomer) {
      toast.error('Selected customer was not found');
      return;
    }

    setGeneratingReport(true);
    try {
      const htmlContent = await buildAiServiceReportHtml({
        customerName: selectedCustomer.name,
        content: pendingReportContent
      });

      navigate('/service-reports', {
        state: {
          openReportEditor: true,
          initialContent: htmlContent,
          reportData: {
            reportType: 'customer',
            title: `${selectedCustomer.name} - Service Report`,
            customerId: selectedCustomer._id,
            systemIds: [],
            serviceDate: new Date().toISOString(),
            customerName: selectedCustomer.name,
            systemNames: [],
            companyLogo: user?.companyLogo || null,
            metadata: {
              source: 'ai_chat',
              customerName: selectedCustomer.name
            }
          }
        }
      });
      toast.success('Opening Service Report editor...');
      closeReportModal(true);
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Check if there's a valid AI message to generate report from
  const hasAiResponse = messages.some(
    msg => msg.role === 'assistant' && !msg.isError && msg.content && msg.content.trim()
  );

  const renderActionButtons = () => (
    <>
      {usage && usage.atLimit?.aiMessages && (
        <button
          onClick={() => navigate('/subscription')}
          className="btn-primary bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade for Unlimited
        </button>
      )}
      <button
        onClick={handleGenerateReport}
        disabled={generatingReport || !hasAiResponse}
        className="btn-primary flex items-center"
        title="Generate a report from the last AI response"
      >
        {generatingReport ? (
          <LoadingSpinner size="sm" color="white" />
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Generate Report
          </>
        )}
      </button>
      <button
        onClick={handleNewConversation}
        className="btn-secondary"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        New Chat
      </button>
    </>
  );

  return (
    <div className="px-6 max-w-7xl mx-auto h-full flex flex-col">
      {/* Upgrade Banner - show when at AI message limit */}
      {usage && usage.atLimit?.aiMessages && (
        <div className="mb-4">
          <UpgradePrompt
            type="aiMessages"
            currentUsage={usage.usage?.aiMessages}
            limit={usage.limits?.maxAiMessages}
            variant="banner"
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
            <p className="text-gray-600 mt-1">
              Your expert tutor for water treatment management with AI
            </p>
            {/* Usage indicator for free users */}
            {usage && !usage.isUnlimited && (
              <p className="text-sm text-gray-500 mt-1">
                <span className={usage.atLimit?.aiMessages ? 'text-red-600 font-medium' : ''}>
                  {usage.usage?.aiMessages || 0} / {usage.limits?.maxAiMessages} AI messages used this month
                </span>
                {usage.atLimit?.aiMessages && (
                  <span className="ml-2 text-red-600">• Limit reached</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sticky actions */}
      <div className="sticky top-0 z-30 mb-4 bg-white/95 backdrop-blur border border-gray-200 rounded-lg shadow-sm px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {renderActionButtons()}
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex">

        {/* Chat Messages */}
        <div
          className={`flex-1 card flex flex-col relative transition-colors ${
            isDraggingFiles ? 'ring-2 ring-blue-400 bg-blue-50/30' : ''
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDraggingFiles && (
            <div className="pointer-events-none absolute inset-0 z-20 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/80 flex items-center justify-center">
              <div className="text-center px-4">
                <p className="text-sm font-semibold text-blue-700">Drop files to attach</p>
                <p className="text-xs text-blue-600 mt-1">Up to {MAX_FILES} files, 10MB each</p>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                )}
                
                <div
                  className={`max-w-3xl rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.isError
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ChatMessageContent message={message} />
                    </div>
                  ) : (
                    <ChatMessageContent message={message} className="whitespace-pre-wrap" />
                  )}
                  
                  <div className="flex items-center justify-end mt-2">
                    <button
                      onClick={() => handleCopyMessage(message.content)}
                      className="text-xs opacity-50 hover:opacity-100 transition-opacity"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <LoadingSpinner size="sm" text="Thinking..." />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            {/* Attached Files Display */}
            <AttachedFilesPreview
              files={attachedFiles}
              onRemove={removeAttachedFile}
              size="default"
            />
            
            <div className="flex items-end space-x-3">
              {/* File Attachment Button */}
              <FileAttachmentButton
                inputRef={fileInputRef}
                onFileSelect={handleFileSelect}
                accept={FILE_UPLOAD_ACCEPT}
                attachedCount={attachedFiles.length}
                disabled={isLoading}
                maxFiles={MAX_FILES}
                maxFilesReachedTitle={FILE_UPLOAD_ERROR_MESSAGES.maxFilesReachedTitle}
                attachTitle="Attach files (JPG, PNG, GIF, PDF, DOCX, XLSX, CSV, TXT) - up to 10MB each"
                variant="default"
              />
              
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={usage?.atLimit?.aiMessages 
                    ? "AI message limit reached. Upgrade to continue chatting..." 
                    : "Ask me anything about water treatment management..."}
                  className="input-field resize-none"
                  rows={3}
                  disabled={isLoading || usage?.atLimit?.aiMessages}
                />
              </div>
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || (!inputMessage.trim() && attachedFiles.length === 0) || usage?.atLimit?.aiMessages}
                className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span className="text-gray-400">
                {attachedFiles.length > 0 
                  ? `${attachedFiles.length}/${MAX_FILES} files attached`
                  : "Attach or drag files (JPG, PNG, GIF, PDF, DOCX, XLSX, CSV, TXT) up to 10MB each"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal - shown when user hits AI message limit */}
      {showUpgradeModal && (
        <UpgradePrompt
          type="aiMessages"
          currentUsage={usage?.usage?.aiMessages}
          limit={usage?.limits?.maxAiMessages}
          variant="modal"
          onDismiss={() => setShowUpgradeModal(false)}
        />
      )}

      {/* Generate Service Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Generate Service Report</h3>
              <button
                type="button"
                onClick={closeReportModal}
                disabled={generatingReport}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Select the customer this AI report belongs to. We will open the same service report editor used in Service Reports with your AI content pre-filled.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="input-field"
                  disabled={loadingReportCustomers || generatingReport}
                >
                  {loadingReportCustomers && <option value="">Loading customers...</option>}
                  {!loadingReportCustomers && reportCustomers.length === 0 && (
                    <option value="">No customers found</option>
                  )}
                  {!loadingReportCustomers && reportCustomers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeReportModal}
                  disabled={generatingReport}
                  className="btn-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateServiceReport}
                  disabled={generatingReport || loadingReportCustomers || !selectedCustomerId}
                  className="btn-primary disabled:opacity-50 inline-flex items-center"
                >
                  {generatingReport && <LoadingSpinner size="sm" color="white" />}
                  <span className={generatingReport ? 'ml-2' : ''}>Open Editor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;

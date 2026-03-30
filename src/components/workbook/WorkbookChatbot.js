import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, FileText, Download } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  buildWorkbookOperatorSystemPrompt,
  buildWorkbookStandardSystemPrompt,
  WORKBOOK_OPERATOR_GENERATE_REPORT_PROMPT,
  WORKBOOK_STANDARD_GENERATE_REPORT_PROMPT
} from '../../constants/workbookPrompts';
import { DEFAULT_CHAT_MODEL } from '../../constants/aiModels';
import {
  FILE_UPLOAD_ACCEPT,
  FILE_UPLOAD_ERROR_MESSAGES,
  MAX_FILES
} from '../../constants/fileUpload';
import useFileAttachments from '../../hooks/useFileAttachments';
import useStreamingChat from '../../hooks/useStreamingChat';
import AttachedFilesPreview from '../chat/AttachedFilesPreview';
import ChatMessageContent from '../chat/ChatMessageContent';
import FileAttachmentButton from '../chat/FileAttachmentButton';

const WorkbookChatbot = ({ isOpen, onClose, workbookData, systemData, customerData }) => {
  const { user, reloadUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const selectedModel = DEFAULT_CHAT_MODEL;
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const {
    attachedFiles,
    fileInputRef,
    handleFileSelect,
    removeAttachedFile,
    clearAttachedFiles
  } = useFileAttachments();
  const { streamChatCompletion } = useStreamingChat();
  
  // Check if user is an operator account
  const isOperator = user?.accountType === 'customer';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initialize with welcome message and workbook summary
      // Different message for operators vs enterprise users
      const operatorWelcome = `Hello! I'm your AI water treatment assistant. I've loaded your KPI workbook for **${systemData?.name}**.

**Workbook Summary:**
- **Parameters monitored**: ${workbookData?.parameters?.length || 0}
- **Sample locations**: ${workbookData?.sampleLocations?.length || 0}

I can help you:
- 🔍 **Explain your readings** and what they mean
- ⚠️ **Identify any issues** with your current values
- 💡 **Suggest what to do** if something is out of range
- ❓ **Answer questions** about water treatment

What would you like to know?`;

      const standardWelcome = `Hello! I'm your AI water treatment analyst. I've analyzed your KPI workbook for **${systemData?.name}** (${systemData?.type?.replace('_', ' ')}) at **${customerData?.name}**.

**Workbook Summary:**
- **Parameters monitored**: ${workbookData?.parameters?.length || 0}
- **Sample locations**: ${workbookData?.sampleLocations?.length || 0}
- **Last updated**: ${workbookData?.updatedAt ? new Date(workbookData.updatedAt).toLocaleDateString() : 'N/A'}

I can help you:
- 📊 **Analyze parameter trends** and identify issues
- 📋 **Generate detailed reports** based on your data
- 🔍 **Explain water chemistry** readings and their implications
- 💡 **Suggest corrective actions** for out-of-range parameters
- 📈 **Compare against industry standards**

What would you like to know about your water treatment system?`;

      const welcomeMessage = {
        id: Date.now(),
        type: 'assistant',
        content: isOperator ? operatorWelcome : standardWelcome,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, workbookData, systemData, customerData, messages.length, isOperator]);


  const formatWorkbookContext = () => {
    if (!workbookData) return '';

    // NOTE: Only text data is sent to AI - images are intentionally excluded
    // Images are stored separately and only included in the DOCX report

    // Build effective ranges, preferring per-location over global when present
    const sampleLocations = Array.isArray(workbookData.sampleLocations) ? workbookData.sampleLocations : [];
    const parameters = (workbookData.parameters || []).map(p => {
      const locationRanges = p.locationRanges || {};
      const targetRange = p.targetRange || {};
      // Build effective ranges object keyed by sample key and default
      const effectiveRanges = {};
      sampleLocations.forEach((_, idx) => {
        const key = `sample_${idx + 1}`;
        const lr = locationRanges[key] || {};
        const min = typeof lr.min === 'number' ? lr.min : (typeof targetRange.min === 'number' ? targetRange.min : undefined);
        const max = typeof lr.max === 'number' ? lr.max : (typeof targetRange.max === 'number' ? targetRange.max : undefined);
        if (min !== undefined || max !== undefined) {
          effectiveRanges[key] = { min, max };
        }
      });
      // Also provide a default if no per-location override
      if (typeof targetRange.min === 'number' || typeof targetRange.max === 'number') {
        effectiveRanges.default = {
          min: typeof targetRange.min === 'number' ? targetRange.min : undefined,
          max: typeof targetRange.max === 'number' ? targetRange.max : undefined
        };
      }
      return {
        name: p.name,
        unit: p.unit,
        category: p.category,
        isCalculated: p.isCalculated,
        targetRange, // global fallback
        locationRanges, // per-sample overrides
        effectiveRanges
      };
    });

    const context = {
      system: {
        name: systemData?.name,
        type: systemData?.type,
        customer: customerData?.name
      },
      parameters,
      sampleLocations,
      valueNotation: {
        '+++': 'Well above target range (too high / out-of-range high)'
      },
      tableData: (workbookData.tableData || []).map(row => ({
        parameter: row.parameter,
        unit: row.unit,
        values: row.values,
        status: row.status,
        notes: row.notes
      })),
      serviceVisit: workbookData.serviceVisit || {},
      correctiveActions: {
        taken: workbookData.correctiveActionsTaken || '',
        needed: workbookData.correctiveActionsNeeded || ''
      },
      comments: workbookData.generalComments || ''
    };

    return JSON.stringify(context, null, 2);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check AI message limits for free users
    if (user?.subscription?.plan === 'free' &&
      user?.subscription?.usage?.aiMessagesThisMonth >= user?.subscription?.limits?.maxAiMessages) {
      toast.error('AI message limit reached. Upgrade to Pro or Enterprise for unlimited AI chat access.');
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
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
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      const workbookContext = formatWorkbookContext();

      const systemPrompt = isOperator
        ? buildWorkbookOperatorSystemPrompt(workbookContext)
        : buildWorkbookStandardSystemPrompt(workbookContext);

      const payload = {
        message: inputMessage,
        systemPrompt,
        conversationHistory: messages.slice(-10).map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content })),
        context: {
          customerId: customerData?._id || undefined,
          systemId: systemData?._id || undefined
        }
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
          ? { ...msg, isStreaming: false, model: selectedModel }
          : msg
      ));
      
      reloadUser?.();

    } catch (error) {
      console.error('Chat error:', error);
      const apiMsg = error.message || 'Failed to get AI response. Please try again.';
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: `Error: ${apiMsg}`, isError: true, isStreaming: false }
          : msg
      ));
      toast.error(apiMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const generateReport = () => {
    const operatorPrompt = WORKBOOK_OPERATOR_GENERATE_REPORT_PROMPT;
    const standardPrompt = WORKBOOK_STANDARD_GENERATE_REPORT_PROMPT;
    setInputMessage(isOperator ? operatorPrompt : standardPrompt);
    setTimeout(() => sendMessage(), 100);
  };

  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const latestAssistantReport = () => {
    // Find the most recent assistant message content
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].type === 'assistant' && typeof messages[i].content === 'string') {
        return messages[i].content;
      }
    }
    return '';
  };

  const downloadDocx = async () => {
    try {
      setIsGeneratingDocx(true);
      const aiReport = latestAssistantReport();
      const systemId = systemData?._id || systemData?.id || workbookData?.systemId?._id || workbookData?.systemId;
      if (!systemId) {
        toast.error('Missing system identifier. Please reopen the workbook.');
        return;
      }
      const response = await axios.post(`/api/kpi-workbook/system/${systemId}/generate-docx`, { aiReport }, { responseType: 'blob' });

      // Check if response is actually JSON (error) despite blob request
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const error = JSON.parse(text);
        throw new Error(error.message || 'Failed to generate DOCX');
      }

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = `${customerData?.name || 'Customer'}_${systemData?.name || 'System'}_${new Date().toISOString().slice(0, 10)}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Workbook_Report_${safeName}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('DOCX report generated');
    } catch (err) {
      console.error('DOCX generation failed:', err);
      const msg = err.response?.data?.message || 'Failed to generate DOCX';
      toast.error(msg);
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  // Different quick questions for operators vs enterprise users
  const operatorQuickQuestions = [
    "Are any of my readings out of range?",
    "What do these readings mean?",
    "What should I do if pH is too high or too low?",
    "Explain what conductivity means",
    "Is everything looking okay with my system?"
  ];
  
  const standardQuickQuestions = [
    "Analyze the current parameter readings and identify any issues",
    "What corrective actions do you recommend based on the data?",
    "Compare our readings against industry standards",
    "Explain the relationship between conductivity and cycles of concentration",
    "Generate a comprehensive analysis report"
  ];
  
  const quickQuestions = isOperator ? operatorQuickQuestions : standardQuickQuestions;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {isOperator ? 'AI Analysis' : 'Generate Report'}
              </h2>
              <p className="text-sm text-gray-600 truncate">
                {systemData?.name}{!isOperator && customerData?.name ? ` • ${customerData?.name}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
            {!isOperator && (
              <button
                onClick={downloadDocx}
                disabled={isGeneratingDocx}
                className="btn-secondary flex items-center space-x-2"
                title="Download .docx report"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{isGeneratingDocx ? 'Generating...' : 'Download DOCX'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.isError
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}
              >
                <div className="flex items-start space-x-2">
                  {message.type === 'assistant' && (
                    <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  {message.type === 'user' && (
                    <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={message.type === 'assistant' ? 'prose prose-sm max-w-none' : 'whitespace-pre-wrap break-words'}>
                      <ChatMessageContent
                        message={message}
                        roleField="type"
                        assistantRoleValue="assistant"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.type !== 'assistant' && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 p-3 rounded-lg max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4" />
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing workbook data...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <div className="mb-3">
              <button
                onClick={generateReport}
                className="w-full btn-primary flex items-center justify-center"
              >
                <FileText className="h-4 w-4 mr-2" />
                {isOperator ? 'Check My Readings' : 'Generate Analysis Report'}
              </button>
            </div>
            <div className="text-sm text-gray-600 mb-2">Quick questions:</div>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.slice(0, 4).map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(question)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          {/* Attached Files Display */}
          <AttachedFilesPreview
            files={attachedFiles}
            onRemove={removeAttachedFile}
            size="compact"
          />
          
          <div className="flex space-x-3">
            {/* File Attachment Button */}
            <FileAttachmentButton
              inputRef={fileInputRef}
              onFileSelect={handleFileSelect}
              accept={FILE_UPLOAD_ACCEPT}
              attachedCount={attachedFiles.length}
              disabled={isLoading}
              maxFiles={MAX_FILES}
              maxFilesReachedTitle={FILE_UPLOAD_ERROR_MESSAGES.maxFilesReachedTitle}
              attachTitle="Attach files (JPG, PNG, GIF, PDF, DOCX, XLSX, CSV, TXT) - Select multiple"
              variant="compact"
            />
            
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your water treatment data, request analysis, or generate reports..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={(!inputMessage.trim() && attachedFiles.length === 0) || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkbookChatbot;

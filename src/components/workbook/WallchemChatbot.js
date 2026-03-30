import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Bot, User, Loader2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  WALLCHEM_SYSTEM_PROMPT,
  WALLCHEM_GENERATE_REPORT_PROMPT
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

const WallchemChatbot = ({ isOpen, onClose, context }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const model = DEFAULT_CHAT_MODEL;
  const messagesEndRef = useRef(null);
  const {
    attachedFiles,
    fileInputRef,
    handleFileSelect,
    removeAttachedFile,
    clearAttachedFiles
  } = useFileAttachments();
  const { streamChatCompletion } = useStreamingChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setMessages([{
        id: Date.now(),
        type: 'assistant',
        content: `Hello! I can analyze your Walchem controller data for ${context?.customerName} • ${context?.systemName}.

I can help you:
- Identify trends and anomalies (ORP, CWT, Conductivity, Temperature, relays)
- Explain alarms and likely root causes
- Generate concise service notes or a short report

What would you like to analyze?`,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, context]);

  const formatContextSummary = () => {
    try {
      if (!context) return 'No data available';
      
      const { customerName, systemName, controllerSerial, parameters = [], readings = [] } = context;
      
      // Create a concise summary
      let summary = `Controller: ${controllerSerial}\nCustomer: ${customerName}\nSystem: ${systemName}\n`;
      summary += `Total readings: ${readings.length}\n`;
      
      if (readings.length > 0) {
        const dateRange = {
          start: new Date(Math.min(...readings.map(r => new Date(r.timestamp)))).toLocaleDateString(),
          end: new Date(Math.max(...readings.map(r => new Date(r.timestamp)))).toLocaleDateString()
        };
        summary += `Date range: ${dateRange.start} to ${dateRange.end}\n`;
        
        // Calculate statistics for numeric parameters
        summary += `\nParameter Statistics:\n`;
        
        // Get all unique parameter keys from readings
        const allKeys = new Set();
        readings.forEach(reading => {
          Object.keys(reading).forEach(key => {
            if (key !== 'timestamp' && key !== 'alarm') {
              allKeys.add(key);
            }
          });
        });
        
        Array.from(allKeys).forEach(key => {
          const rawValues = readings
            .map(r => r[key])
            .filter(v => v !== null && v !== undefined && v !== '');
          
          if (rawValues.length === 0) return;
          
          const param = parameters.find(p => p.key === key);
          const label = param?.label || key;
          
          // Check if this is a numeric parameter
          const numericValues = rawValues
            .map(v => typeof v === 'number' ? v : parseFloat(v))
            .filter(v => !isNaN(v));
          
          if (numericValues.length > 0 && numericValues.length === rawValues.length) {
            // All values are numeric - show min/max/avg
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            const avg = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
            summary += `${label}: Min=${min.toFixed(1)}, Max=${max.toFixed(1)}, Avg=${avg.toFixed(1)}\n`;
          } else {
            // Status/text values - show frequency counts
            const statusCounts = {};
            rawValues.forEach(v => {
              const status = v.toString();
              statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            
            const statusSummary = Object.entries(statusCounts)
              .map(([status, count]) => `${status}:${count}`)
              .join(', ');
            summary += `${label}: ${statusSummary} (${rawValues.length} total)\n`;
          }
        });
        
        // Count alarms
        const alarmCount = readings.filter(r => r.alarm === 'On').length;
        if (alarmCount > 0) {
          summary += `\nAlarms: ${alarmCount} alarm readings detected\n`;
        } else {
          summary += `\nAlarms: No alarms detected\n`;
        }
      }
      
      return summary;
    } catch (_) {
      return 'Error formatting data';
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    const userMsg = { 
      id: Date.now(), 
      type: 'user', 
      content: inputMessage, 
      timestamp: new Date(),
      attachments: attachedFiles.length > 0 ? attachedFiles.map(f => f.name) : undefined
    };
    setMessages(prev => [...prev, userMsg]);
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
      const systemPrompt = WALLCHEM_SYSTEM_PROMPT;
      const contextSummary = formatContextSummary();
      const fullMessage = `${inputMessage}\n\nWalchem Data Summary:\n${contextSummary}`;
      
      const finalMessage = fullMessage.length > 9500 ? 
        `${inputMessage}\n\nWalchem Data Summary:\n${contextSummary.substring(0, 9000)}...[truncated]` : 
        fullMessage;
      
      const payload = {
        message: finalMessage,
        systemPrompt,
        conversationHistory: messages.slice(-10).map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content })),
        context: {
          customerId: context?.customerId || undefined,
          systemId: context?.systemId || undefined
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
          ? { ...msg, isStreaming: false, model }
          : msg
      ));

    } catch (err) {
      const msg = err.message || 'Failed to analyze data';
      setMessages(prev => prev.map(m => 
        m.id === aiMessageId 
          ? { ...m, content: msg, isError: true, isStreaming: false }
          : m
      ));
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Walchem AI Analysis</h2>
              <p className="text-sm text-gray-600">{context?.controllerSerial} • {context?.systemName} • {context?.customerName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => { setInputMessage(WALLCHEM_GENERATE_REPORT_PROMPT); setTimeout(sendMessage, 50); }}
              className="btn-secondary flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              Generate Report
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${m.type === 'user' ? 'bg-blue-600 text-white' : m.isError ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-gray-100 text-gray-900'}`}>
                <div className="flex items-start space-x-2">
                  {m.type === 'assistant' ? <Bot className="h-4 w-4 mt-0.5" /> : <User className="h-4 w-4 mt-0.5" />}
                  <div className="flex-1">
                    <div className={m.type === 'assistant' ? 'prose prose-sm max-w-none' : 'whitespace-pre-wrap break-words'}>
                      <ChatMessageContent
                        message={m}
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
                  <span>Analyzing Walchem data...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

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
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about ORP, CWT, conductivity, alarms, trends, or request a report..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isLoading}
            />
            <button onClick={sendMessage} disabled={(!inputMessage.trim() && attachedFiles.length === 0) || isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WallchemChatbot;



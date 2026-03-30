import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, AlertCircle, Calendar, Building, Settings, Repeat } from 'lucide-react';
import { useTodos } from '../../contexts/TodoContext';
import FileAttachmentButton from '../chat/FileAttachmentButton';
import AttachedFilesPreview from '../chat/AttachedFilesPreview';
import useFileAttachments from '../../hooks/useFileAttachments';
import {
  FILE_UPLOAD_ACCEPT,
  FILE_UPLOAD_ERROR_MESSAGES,
  MAX_FILES
} from '../../constants/fileUpload';

const TodoModal = ({ 
  isOpen, 
  onClose, 
  source = 'navbar',
  customerId = null,
  systemId = null,
  customerName = '',
  systemName = ''
}) => {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'manual'
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Manual form state
  const [manualContent, setManualContent] = useState('');
  const [manualPriority, setManualPriority] = useState('medium');
  const [manualDueDate, setManualDueDate] = useState('');
  const [manualIsRecurring, setManualIsRecurring] = useState(false);
  const [manualRecurrencePattern, setManualRecurrencePattern] = useState('monthly');
  
  const { createTodosWithAI, createTodo, fetchTodos } = useTodos();
  const {
    attachedFiles,
    fileInputRef,
    handleFileSelect,
    removeAttachedFile,
    clearAttachedFiles
  } = useFileAttachments();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setMessage('');
      setError(null);
      setManualContent('');
      setManualPriority('medium');
      setManualDueDate('');
      setManualIsRecurring(false);
      setManualRecurrencePattern('monthly');
      clearAttachedFiles();
    }
  }, [isOpen, clearAttachedFiles]);

  const handleSendToAI = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && attachedFiles.length === 0) return;

    setError(null);

    // Close immediately after send so the user can continue working while AI reasons.
    onClose();

    createTodosWithAI(trimmedMessage || 'Extract obligations from the attached files and create todos.', {
        customerId,
        systemId,
        customerName,
        systemName,
        source,
        attachments: attachedFiles.map((file) => ({
          name: file.name,
          type: file.type,
          content: file.content
        }))
      })
      .then(() => fetchTodos())
      .catch(() => {
        // Toast errors are handled in TodoContext.
      });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualContent.trim()) return;
    
    setIsLoading(true);
    
    try {
      await createTodo({
        content: manualContent,
        priority: manualPriority,
        dueDate: manualDueDate || null,
        isRecurring: manualIsRecurring,
        recurrencePattern: manualIsRecurring ? manualRecurrencePattern : null,
        customerId,
        systemId,
        customerName,
        systemName,
        source
      });
      
      await fetchTodos();
      setIsLoading(false);
      onClose();
    } catch (err) {
      setError('Failed to create todo');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Todo</h2>
            {(customerName || systemName) && (
              <p className="text-sm text-gray-500 mt-1">
                {customerName && (
                  <span className="inline-flex items-center gap-1 mr-3">
                    <Building className="w-3 h-3" />
                    {customerName}
                  </span>
                )}
                {systemName && (
                  <span className="inline-flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    {systemName}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'ai'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Ask AI
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'manual'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Manual Entry
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'ai' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Describe the work or attach documents/contracts. Grok will extract obligations, handle customer matching/creation, and create one or many todos with recurrence when possible.
              </p>

              <AttachedFilesPreview
                files={attachedFiles}
                onRemove={removeAttachedFile}
                size="compact"
              />

              <div className="flex items-center justify-between">
                <FileAttachmentButton
                  inputRef={fileInputRef}
                  onFileSelect={handleFileSelect}
                  accept={FILE_UPLOAD_ACCEPT}
                  attachedCount={attachedFiles.length}
                  disabled={isLoading}
                  maxFiles={MAX_FILES}
                  maxFilesReachedTitle={FILE_UPLOAD_ERROR_MESSAGES.maxFilesReachedTitle}
                  attachTitle="Attach files (JPG, PNG, GIF, PDF, DOCX, XLSX, CSV, TXT)"
                  variant="compact"
                />
                <span className="text-xs text-gray-500">
                  {attachedFiles.length > 0 ? `${attachedFiles.length}/${MAX_FILES} files attached` : 'You can attach up to 5 files'}
                </span>
              </div>
              
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g., Call John about the cooling tower maintenance next Tuesday..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendToAI}
                  disabled={!message.trim() && attachedFiles.length === 0}
                  className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Description
                </label>
                <textarea
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={manualPriority}
                    onChange={(e) => setManualPriority(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={manualDueDate}
                      onChange={(e) => setManualDueDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={manualIsRecurring}
                    onChange={(e) => setManualIsRecurring(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  Recurring task
                </label>

                {manualIsRecurring && (
                  <div className="relative">
                    <Repeat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={manualRecurrencePattern}
                      onChange={(e) => setManualRecurrencePattern(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!manualContent.trim() || isLoading}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Todo'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoModal;

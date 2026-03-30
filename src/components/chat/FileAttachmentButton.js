import React from 'react';
import { Paperclip } from 'lucide-react';
import { MAX_FILES } from '../../constants/fileUpload';

const variantStyles = {
  compact: {
    button:
      'p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 relative',
    icon: 'h-4 w-4',
    badge:
      'absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium'
  },
  default: {
    button:
      'p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative',
    icon: 'h-5 w-5',
    badge:
      'absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium'
  }
};

const FileAttachmentButton = ({
  inputRef,
  onFileSelect,
  accept,
  attachedCount = 0,
  disabled = false,
  maxFiles = MAX_FILES,
  maxFilesReachedTitle = 'Maximum files reached',
  attachTitle = 'Attach files',
  variant = 'default'
}) => {
  const styles = variantStyles[variant] || variantStyles.default;
  const isMaxReached = attachedCount >= maxFiles;

  return (
    <div>
      <input
        type="file"
        ref={inputRef}
        onChange={onFileSelect}
        multiple
        accept={accept}
        className="hidden"
      />
      <button
        onClick={() => inputRef?.current?.click()}
        disabled={disabled || isMaxReached}
        className={styles.button}
        title={isMaxReached ? maxFilesReachedTitle : attachTitle}
      >
        <Paperclip className={styles.icon} />
        {attachedCount > 0 && <span className={styles.badge}>{attachedCount}</span>}
      </button>
    </div>
  );
};

export default FileAttachmentButton;

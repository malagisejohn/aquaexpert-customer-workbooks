import React from 'react';
import { FileText, Image as ImageIcon, X } from 'lucide-react';
import { isImageFileName } from '../../constants/fileUpload';

const sizeStyles = {
  compact: {
    container: 'inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-sm',
    icon: 'h-3 w-3 text-blue-600 mr-1',
    text: 'text-blue-800 max-w-[120px] truncate text-xs',
    button: 'ml-1 text-blue-400 hover:text-blue-600',
    closeIcon: 'h-3 w-3'
  },
  default: {
    container: 'inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm',
    icon: 'h-4 w-4 text-blue-600 mr-2',
    text: 'text-blue-800 max-w-[150px] truncate',
    button: 'ml-2 text-blue-400 hover:text-blue-600',
    closeIcon: 'h-4 w-4'
  }
};

const AttachedFilesPreview = ({ files = [], onRemove, size = 'default' }) => {
  if (!files.length) return null;

  const styles = sizeStyles[size] || sizeStyles.default;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {files.map((file, index) => {
        const isImage = file.type?.startsWith('image/') || isImageFileName(file.name);
        return (
          <div key={`${file.name}-${index}`} className={styles.container}>
            {isImage ? (
              <ImageIcon className={styles.icon} />
            ) : (
              <FileText className={styles.icon} />
            )}
            <span className={styles.text}>{file.name}</span>
            <button onClick={() => onRemove?.(index)} className={styles.button}>
              <X className={styles.closeIcon} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default AttachedFilesPreview;

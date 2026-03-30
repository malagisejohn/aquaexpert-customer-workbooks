import React from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { isImageFileName } from '../../constants/fileUpload';

const AttachmentChips = ({ fileNames = [] }) => {
  if (!fileNames.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {fileNames.map((fileName, idx) => {
        const isImage = isImageFileName(fileName);
        return (
          <span key={`${fileName}-${idx}`} className="inline-flex items-center text-xs bg-blue-500 bg-opacity-20 px-2 py-0.5 rounded">
            {isImage ? (
              <ImageIcon className="h-3 w-3 mr-1" />
            ) : (
              <FileText className="h-3 w-3 mr-1" />
            )}
            {fileName}
          </span>
        );
      })}
    </div>
  );
};

export default AttachmentChips;

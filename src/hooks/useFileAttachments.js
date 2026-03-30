import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FILE_UPLOAD_ERROR_MESSAGES,
  IMAGE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES
} from '../constants/fileUpload';

const isImageFile = (file) => {
  const fileName = (file?.name || '').toLowerCase();
  return file?.type?.startsWith('image/') || IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
};

const isBinaryFile = (file) => {
  const fileName = (file?.name || '').toLowerCase();
  const isPdf = file?.type === 'application/pdf' || fileName.endsWith('.pdf');
  const isDocx =
    file?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx');
  const isXlsx =
    file?.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileName.endsWith('.xlsx');

  return isPdf || isDocx || isXlsx || isImageFile(file);
};

const readFileContent = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isBinary = isBinaryFile(file);

    reader.onload = (event) => {
      if (isBinary) {
        const base64 = event.target?.result?.split(',')[1];
        resolve(base64);
        return;
      }
      resolve(event.target?.result);
    };
    reader.onerror = reject;

    if (isBinary) {
      reader.readAsDataURL(file);
      return;
    }

    const fileName = (file?.name || '').toLowerCase();
    const textTypes = ['text/', 'application/csv', 'application/xml'];
    const isText =
      textTypes.some((type) => file?.type?.startsWith(type)) ||
      fileName.endsWith('.csv') ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.xml') ||
      fileName.endsWith('.md');

    if (isText || !file?.type) {
      reader.readAsText(file);
      return;
    }

    reject(new Error(FILE_UPLOAD_ERROR_MESSAGES.unsupportedFile));
  });

export default function useFileAttachments() {
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const processFiles = useCallback(
    async (fileList = [], { resetInput = false } = {}) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return;

      if (attachedFiles.length + files.length > MAX_FILES) {
        toast.error(FILE_UPLOAD_ERROR_MESSAGES.maxFiles);
        if (resetInput && fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const processedFiles = [];
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(FILE_UPLOAD_ERROR_MESSAGES.oversizedFile(file.name));
          continue;
        }

        try {
          const content = await readFileContent(file);
          processedFiles.push({
            name: file.name,
            type: file.type || 'text/plain',
            content,
            size: file.size
          });
        } catch (_error) {
          toast.error(FILE_UPLOAD_ERROR_MESSAGES.failedRead(file.name));
        }
      }

      if (processedFiles.length > 0) {
        setAttachedFiles((prev) => [...prev, ...processedFiles]);
      }

      if (resetInput && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [attachedFiles.length]
  );

  const handleFileSelect = useCallback(
    async (event) => {
      await processFiles(event.target?.files, { resetInput: true });
    },
    [processFiles]
  );

  const handleFileDrop = useCallback(
    async (files) => {
      await processFiles(files);
    },
    [processFiles]
  );

  const removeAttachedFile = useCallback((index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAttachedFiles = useCallback(() => {
    setAttachedFiles([]);
  }, []);

  return {
    attachedFiles,
    fileInputRef,
    handleFileSelect,
    handleFileDrop,
    removeAttachedFile,
    clearAttachedFiles,
    setAttachedFiles
  };
}

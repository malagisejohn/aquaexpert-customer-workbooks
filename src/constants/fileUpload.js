export const MAX_FILES = 5;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export const FILE_UPLOAD_ACCEPT =
  '.pdf,.docx,.xlsx,.txt,.csv,.xml,.md,.jpg,.jpeg,.png,.gif,.webp,text/*,image/*,application/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const FILE_UPLOAD_ERROR_MESSAGES = {
  maxFiles: `Maximum ${MAX_FILES} files allowed`,
  maxFilesReachedTitle: `Maximum ${MAX_FILES} files reached`,
  unsupportedFile:
    'Unsupported file type. Please use images (JPG, PNG, GIF, WebP), PDF, DOCX, XLSX, CSV, or TXT files.',
  failedRead: (fileName) => `Failed to read "${fileName}". Use PDF, text, CSV, or JSON files.`,
  oversizedFile: (fileName) => `File "${fileName}" is too large. Max 10MB.`
};

export const isImageFileName = (fileName = '') =>
  IMAGE_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));

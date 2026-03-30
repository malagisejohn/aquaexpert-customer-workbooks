import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AttachmentChips from './AttachmentChips';
import MarkdownChart from './MarkdownChart';
import AgentActionsPanel from './AgentActionsPanel';
import { parseChartBlock } from '../../utils/chartMarkdown';

const ChatMessageContent = ({
  message,
  roleField = 'role',
  assistantRoleValue = 'assistant',
  className = 'whitespace-pre-wrap break-words'
}) => {
  const role = message?.[roleField];
  const isAssistant = role === assistantRoleValue;
  const content =
    typeof message?.content === 'string' ? message.content : JSON.stringify(message?.content);
  const normalizedContent = content
    .split('\n')
    .map((line) => {
      const pipeCount = (line.match(/\|/g) || []).length;
      if (pipeCount >= 8 && line.includes('| |')) {
        return line.replace(/\|\s+\|/g, '|\n|');
      }
      return line;
    })
    .join('\n');

  if (isAssistant) {
    const markdownComponents = {
      table: ({ node, ...props }) => (
        <div className="my-3 overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 text-sm" {...props} />
        </div>
      ),
      thead: ({ node, ...props }) => <thead className="bg-gray-100" {...props} />,
      th: ({ node, ...props }) => (
        <th className="border border-gray-300 px-2 py-1 text-left font-semibold" {...props} />
      ),
      td: ({ node, ...props }) => <td className="border border-gray-300 px-2 py-1" {...props} />,
      code: ({ inline, className, children, ...props }) => {
        const match = /language-([a-zA-Z0-9-]+)/.exec(className || '');
        const language = (match?.[1] || '').toLowerCase();
        const codeText = String(children).replace(/\n$/, '');

        const isChartBlock =
          !inline &&
          (language === 'chart' ||
            language === 'csv-chart' ||
            language === 'csvchart' ||
            language === 'csv');

        if (isChartBlock) {
          const spec = parseChartBlock(codeText, language);
          if (spec.error) {
            return (
              <pre className="rounded bg-gray-900 px-3 py-2 text-xs text-red-200">
                {spec.error}
                {'\n'}
                {codeText}
              </pre>
            );
          }
          return <MarkdownChart spec={spec} />;
        }

        if (inline) {
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }

        return (
          <pre className="overflow-x-auto rounded bg-gray-900 px-3 py-2 text-xs text-gray-100">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        );
      }
    };

    return (
      <>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {normalizedContent}
        </ReactMarkdown>
        {message?.isStreaming && (
          <span className="inline-block w-2 h-4 bg-blue-600 ml-1 animate-pulse" />
        )}
        <AgentActionsPanel toolRuns={message?.toolRuns} />
      </>
    );
  }

  return (
    <>
      <div className={className}>{content}</div>
      <AttachmentChips fileNames={message?.attachments || []} />
    </>
  );
};

export default ChatMessageContent;

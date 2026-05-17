import React from 'react';

/**
 * ChatMessage — Renders a single chat message bubble with basic markdown support.
 */

// Simple markdown parser (bold, italic, code, inline code, lists, headers)
function parseMarkdown(text) {
  if (!text) return '';

  const lines = text.split('\n');
  const result = [];
  let inCodeBlock = false;
  let codeContent = '';
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        result.push(
          <div key={`code-${i}`} className="relative group my-2">
            <div className="flex items-center justify-between bg-[#1e1e2e] text-[#cdd6f4] rounded-t-lg px-4 py-1.5 text-xs font-mono">
              <span className="opacity-60">{codeLang || 'code'}</span>
              <button
                onClick={() => navigator.clipboard.writeText(codeContent.trim())}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
              >
                Copy
              </button>
            </div>
            <pre className="bg-[#1e1e2e] text-[#cdd6f4] rounded-b-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed">
              <code>{codeContent.trim()}</code>
            </pre>
          </div>
        );
        codeContent = '';
        codeLang = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      result.push(<h4 key={i} className="font-bold text-sm mt-3 mb-1">{formatInline(line.slice(4))}</h4>);
      continue;
    }
    if (line.startsWith('## ')) {
      result.push(<h3 key={i} className="font-bold text-base mt-3 mb-1">{formatInline(line.slice(3))}</h3>);
      continue;
    }
    if (line.startsWith('# ')) {
      result.push(<h2 key={i} className="font-bold text-lg mt-3 mb-1">{formatInline(line.slice(2))}</h2>);
      continue;
    }

    // Unordered list
    if (line.match(/^[\-\*]\s/)) {
      result.push(
        <div key={i} className="flex gap-2 ml-2">
          <span className="text-secondary shrink-0 mt-0.5">•</span>
          <span>{formatInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\d+)\.\s/);
    if (olMatch) {
      result.push(
        <div key={i} className="flex gap-2 ml-2">
          <span className="text-secondary shrink-0 font-medium min-w-[1.2em]">{olMatch[1]}.</span>
          <span>{formatInline(line.slice(olMatch[0].length))}</span>
        </div>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      result.push(<div key={i} className="h-2" />);
      continue;
    }

    // Normal paragraph
    result.push(<p key={i} className="leading-relaxed">{formatInline(line)}</p>);
  }

  return result;
}

// Inline formatting: bold, italic, inline code
function formatInline(text) {
  if (!text) return '';

  const parts = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Bold
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    // Italic
    const italicMatch = remaining.match(/\*([^*]+)\*/);

    // Find earliest match
    let earliest = null;
    let type = null;

    if (codeMatch && (!earliest || codeMatch.index < earliest.index)) { earliest = codeMatch; type = 'code'; }
    if (boldMatch && (!earliest || boldMatch.index < earliest.index)) { earliest = boldMatch; type = 'bold'; }
    if (italicMatch && (!earliest || italicMatch.index < earliest.index)) { earliest = italicMatch; type = 'italic'; }

    if (!earliest) {
      parts.push(remaining);
      break;
    }

    // Add text before match
    if (earliest.index > 0) {
      parts.push(remaining.slice(0, earliest.index));
    }

    // Add formatted text
    if (type === 'code') {
      parts.push(
        <code key={`inline-${keyIdx++}`} className="bg-surface-muted dark:bg-surface-container px-1.5 py-0.5 rounded text-sm font-mono text-secondary">
          {earliest[1]}
        </code>
      );
    } else if (type === 'bold') {
      parts.push(<strong key={`inline-${keyIdx++}`}>{earliest[1]}</strong>);
    } else if (type === 'italic') {
      parts.push(<em key={`inline-${keyIdx++}`}>{earliest[1]}</em>);
    }

    remaining = remaining.slice(earliest.index + earliest[0].length);
  }

  return parts;
}


const ChatMessage = ({ message, isStreaming = false }) => {
  const isUser = message.role === 'user';

  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}>
      {/* Avatar */}
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm
        ${isUser
          ? 'bg-primary text-on-primary'
          : 'bg-gradient-to-br from-secondary to-tertiary text-white'
        }`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
          {isUser ? 'person' : 'smart_toy'}
        </span>
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] md:max-w-[70%] flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-primary text-on-primary rounded-tr-md'
            : 'bg-surface-muted dark:bg-surface-container border border-border-subtle rounded-tl-md text-on-surface'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="space-y-1 chat-markdown">
              {parseMarkdown(message.content)}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-secondary rounded-sm animate-pulse ml-0.5" />
              )}
            </div>
          )}
        </div>
        {time && (
          <span className={`text-[10px] text-on-surface-variant px-1 ${isUser ? 'text-right' : ''}`}>
            {time}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;

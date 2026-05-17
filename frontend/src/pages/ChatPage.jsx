import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessage from '../components/ChatMessage';
import ChatContextSelector from '../components/ChatContextSelector';

const CONVERSATIONS_KEY = 'chemvision_conversations';

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadConversations() {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveConversations(convs) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── ChatPage Component ──────────────────────────────────────────────────────

const ChatPage = () => {
  // Conversations
  const [conversations, setConversations] = useState(() => loadConversations());
  const [activeConvId, setActiveConvId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Chat state
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeModel, setActiveModel] = useState(null); // Model name from backend
  const [chemicalContext, setChemicalContext] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Get active conversation
  const activeConv = conversations.find(c => c.id === activeConvId);
  const messages = activeConv?.messages || [];

  // ─── Scroll to bottom on new messages ────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // ─── Persist conversations ───────────────────────────────────────────

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // ─── Create new conversation ─────────────────────────────────────────

  const createNewConversation = useCallback(() => {
    const newConv = {
      id: generateId(),
      title: 'Chat Baru',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setChemicalContext(null);
    setActiveModel(null);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
    return newConv.id;
  }, []);

  // ─── Delete conversation ─────────────────────────────────────────────

  const deleteConversation = (convId) => {
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConvId === convId) {
      setActiveConvId(null);
      setActiveModel(null);
    }
  };

  // ─── Send message ───────────────────────────────────────────────────

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // Create conversation if none active
    let convId = activeConvId;
    if (!convId) {
      convId = createNewConversation();
      const newConv = {
        id: convId,
        title: text.slice(0, 50),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setConversations(prev => {
        const filtered = prev.filter(c => c.id !== convId);
        return [newConv, ...filtered];
      });
      setActiveConvId(convId);
    }

    const userMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const assistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    // Add user message + empty assistant placeholder
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      const updatedMessages = [...c.messages, userMessage, assistantMessage];
      return {
        ...c,
        messages: updatedMessages,
        title: c.messages.length === 0 ? text.slice(0, 50) : c.title,
        updatedAt: Date.now(),
      };
    }));

    setInput('');
    setIsStreaming(true);
    setActiveModel(null);

    // Build messages for API (without timestamps)
    const currentConv = conversations.find(c => c.id === convId);
    const apiMessages = [...(currentConv?.messages || []), userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          chemical_context: chemicalContext,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);

          try {
            const data = JSON.parse(jsonStr);

            // Model name event — backend tells us which model is responding
            if (data.model) {
              setActiveModel(data.model);
              continue;
            }

            if (data.error) {
              accumulatedContent += `\n\n⚠️ ${data.error}`;
              setConversations(prev => prev.map(c => {
                if (c.id !== convId) return c;
                const msgs = [...c.messages];
                const lastMsg = msgs[msgs.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  msgs[msgs.length - 1] = { ...lastMsg, content: accumulatedContent };
                }
                return { ...c, messages: msgs };
              }));
              break;
            }

            if (data.done) break;

            if (data.content) {
              accumulatedContent += data.content;

              setConversations(prev => prev.map(c => {
                if (c.id !== convId) return c;
                const msgs = [...c.messages];
                const lastMsg = msgs[msgs.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  msgs[msgs.length - 1] = { ...lastMsg, content: accumulatedContent };
                }
                return { ...c, messages: msgs };
              }));
            }
          } catch { /* skip invalid JSON */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Chat error:', err);
        setConversations(prev => prev.map(c => {
          if (c.id !== convId) return c;
          const msgs = [...c.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            msgs[msgs.length - 1] = {
              ...lastMsg,
              content: '⚠️ Terjadi kesalahan saat menghubungi AI. Silakan coba lagi.',
            };
          }
          return { ...c, messages: msgs };
        }));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // ─── Handle key press ────────────────────────────────────────────────

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Stop streaming ──────────────────────────────────────────────────

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-8rem)] -mt-16 md:-mt-4 -mb-12 md:mb-0 -mx-margin-mobile md:mx-0 animate-fade-in bg-surface-base dark:bg-surface-container-lowest rounded-none md:rounded-xl overflow-hidden shadow-none md:shadow-sm">
      {/* ═══ Sidebar ═══ */}
      <aside className={`
        ${sidebarOpen ? 'fixed inset-0 z-40 md:relative md:inset-auto' : 'hidden md:flex'}
        md:w-72 flex-col shrink-0
      `}>
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-on-surface/30 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className={`
          ${sidebarOpen ? 'fixed left-0 top-16 bottom-0 w-72 z-50' : ''}
          md:relative md:top-auto md:bottom-auto md:left-auto
          bg-surface-muted dark:bg-surface-container-low md:border-r border-border-subtle
          flex flex-col h-full overflow-hidden
          shadow-xl md:shadow-none
        `}>
          {/* New Chat Button */}
          <div className="p-3 border-b border-border-subtle">
            <button
              onClick={createNewConversation}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-medium text-sm hover:brightness-110 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Chat Baru
            </button>
          </div>



          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Percakapan</p>
              {conversations.length === 0 ? (
                <p className="px-2 py-4 text-xs text-on-surface-variant text-center">Belum ada percakapan</p>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all mb-0.5
                      ${activeConvId === conv.id
                        ? 'bg-secondary/8 text-secondary'
                        : 'text-on-surface hover:bg-surface-muted dark:hover:bg-surface-container'
                      }`}
                    onClick={() => { setActiveConvId(conv.id); setSidebarOpen(false); }}
                  >
                    <span className="material-symbols-outlined shrink-0" style={{ fontSize: '16px' }}>chat_bubble</span>
                    <span className="text-xs truncate flex-1">{conv.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error-container transition-all shrink-0"
                      title="Hapus"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant hover:text-error" style={{ fontSize: '14px' }}>delete</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ Main Chat Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-surface-base/80 dark:bg-surface-container-lowest/80 backdrop-blur-sm">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-surface-muted transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>menu</span>
          </button>

          {/* App title + active model */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-secondary to-tertiary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>smart_toy</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-on-surface truncate">ChemVision AI</p>
              <p className="text-[10px] text-on-surface-variant">
                {activeModel ? `✓ ${activeModel}` : 'Auto — model terbaik dipilih otomatis'}
              </p>
            </div>
          </div>



          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex gap-0.5">
                <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <button
                onClick={stopStreaming}
                className="p-1 rounded-lg hover:bg-surface-muted transition-colors"
                title="Stop"
              >
                <span className="material-symbols-outlined text-error" style={{ fontSize: '16px' }}>stop_circle</span>
              </button>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!activeConv || messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center min-h-full py-8 text-center px-4 max-w-3xl mx-auto">
              <div className="my-auto flex flex-col items-center w-full">
                <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-secondary/20 to-tertiary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary" style={{ fontSize: '36px' }}>smart_toy</span>
                </div>
              <h1 className="text-3xl sm:text-4xl font-semibold text-on-surface mb-2 tracking-tight">
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Halo,</span> ada yang bisa saya bantu?
              </h1>
              <p className="text-sm text-on-surface-variant max-w-md mb-8">
                Tanyakan apa saja tentang kimia — reaksi, struktur molekul, atau pilih molekul dari riwayat untuk dianalisis.
              </p>
              {/* Quick starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {[
                  { icon: 'science', text: 'Jelaskan struktur benzena', sub: 'Konsep Dasar' },
                  { icon: 'water_drop', text: 'Apa perbedaan asam dan basa?', sub: 'Tanya Jawab' },
                  { icon: 'local_fire_department', text: 'Bagaimana reaksi pembakaran?', sub: 'Reaksi Kimia' },
                  { icon: 'biotech', text: 'Apa itu ikatan hidrogen?', sub: 'Ikatan' },
                ].map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(starter.text);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-surface-base dark:bg-surface-container-lowest border border-border-subtle hover:bg-surface-muted dark:hover:bg-surface-container transition-all text-left group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors" style={{ fontSize: '20px' }}>
                        {starter.icon}
                      </span>
                      <span className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">{starter.sub}</span>
                    </div>
                    <span className="text-sm text-on-surface group-hover:text-secondary transition-colors font-medium">{starter.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          ) : (
            /* Messages */
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  message={msg}
                  isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-transparent">
          <div className="max-w-3xl mx-auto relative">
            {/* The Floating Input Box */}
            <div className="flex flex-col bg-surface-muted dark:bg-surface-container border border-border-subtle rounded-3xl p-1 shadow-sm focus-within:shadow-md focus-within:border-secondary/40 focus-within:ring-1 focus-within:ring-secondary/40 transition-all">
              
              {/* Context Selector above the input field, inside the box */}
              <div className="px-3 pt-2 pb-1">
                <ChatContextSelector
                  selectedContext={chemicalContext}
                  onSelect={setChemicalContext}
                  onClear={() => setChemicalContext(null)}
                />
              </div>

              {/* Input field and send button */}
              <div className="flex gap-2 items-end px-4 pb-2 pt-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tanya ChemVision AI..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent border-none px-0 py-2 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-0 max-h-32"
                  style={{ minHeight: '36px' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                  }}
                  disabled={isStreaming}
                />
                <button
                  onClick={isStreaming ? stopStreaming : sendMessage}
                  disabled={!isStreaming && !input.trim()}
                  className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all mb-0.5
                    ${isStreaming
                      ? 'bg-surface-base text-error hover:bg-error/10'
                      : input.trim()
                        ? 'bg-surface-base text-primary hover:bg-primary/10 shadow-sm'
                        : 'bg-transparent text-on-surface-variant cursor-not-allowed'
                    }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {isStreaming ? 'stop' : 'send'}
                  </span>
                </button>
              </div>
            </div>

            <p className="text-[10px] text-on-surface-variant text-center mt-3">
              ChemVision AI dapat membuat kesalahan. Periksa informasi penting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

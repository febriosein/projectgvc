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
    <div className="flex h-[calc(100vh-8rem)] -mt-4 gap-4 animate-fade-in">
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
          bg-surface-base dark:bg-surface-container-lowest border border-border-subtle rounded-xl
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

          {/* Chemical Context */}
          <div className="p-3 border-b border-border-subtle">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Konteks Molekul</p>
            <ChatContextSelector
              selectedContext={chemicalContext}
              onSelect={setChemicalContext}
              onClear={() => setChemicalContext(null)}
            />
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
      <div className="flex-1 flex flex-col min-w-0 bg-surface-base dark:bg-surface-container-lowest border border-border-subtle rounded-xl overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-surface-base/50 dark:bg-surface-container-lowest/50 backdrop-blur-sm">
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

          {/* Context badge */}
          {chemicalContext && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/10 border border-secondary/20 shrink-0">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: '14px' }}>science</span>
              <span className="text-[11px] text-secondary font-medium truncate max-w-[120px]">{chemicalContext.name}</span>
            </div>
          )}

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
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-tertiary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: '32px' }}>smart_toy</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-on-surface mb-1">ChemVision AI Chat</h2>
                <p className="text-sm text-on-surface-variant max-w-md">
                  Tanyakan apa saja tentang kimia — reaksi, struktur molekul, sifat senyawa, atau konsep kimia lainnya.
                </p>
              </div>
              {/* Quick starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mt-2">
                {[
                  { icon: 'science', text: 'Jelaskan struktur benzena' },
                  { icon: 'water_drop', text: 'Apa perbedaan asam dan basa?' },
                  { icon: 'local_fire_department', text: 'Bagaimana reaksi pembakaran?' },
                  { icon: 'biotech', text: 'Apa itu ikatan hidrogen?' },
                ].map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(starter.text);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="flex items-center gap-2 p-3 rounded-xl border border-border-subtle hover:border-secondary/40 hover:bg-surface-muted transition-all text-left group"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors" style={{ fontSize: '18px' }}>
                      {starter.icon}
                    </span>
                    <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">{starter.text}</span>
                  </button>
                ))}
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
        <div className="border-t border-border-subtle p-3 bg-surface-base/80 dark:bg-surface-container-lowest/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            {/* Context reminder on mobile */}
            {chemicalContext && (
              <div className="flex items-center gap-1.5 mb-2 sm:hidden">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: '14px' }}>science</span>
                <span className="text-[10px] text-secondary truncate">{chemicalContext.name}</span>
                <button onClick={() => setChemicalContext(null)} className="ml-auto">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '14px' }}>close</span>
                </button>
              </div>
            )}

            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={chemicalContext
                  ? `Tanya tentang ${chemicalContext.name}...`
                  : 'Tulis pesan tentang kimia...'
                }
                rows={1}
                className="flex-1 resize-none bg-surface-muted dark:bg-surface-container border border-border-subtle rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all max-h-32"
                style={{ minHeight: '44px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
                disabled={isStreaming}
              />
              <button
                onClick={isStreaming ? stopStreaming : sendMessage}
                disabled={!isStreaming && !input.trim()}
                className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all
                  ${isStreaming
                    ? 'bg-error text-white hover:brightness-110'
                    : input.trim()
                      ? 'bg-gradient-to-r from-primary to-secondary text-white hover:brightness-110 shadow-sm'
                      : 'bg-surface-muted text-on-surface-variant cursor-not-allowed'
                  }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {isStreaming ? 'stop' : 'send'}
                </span>
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant text-center mt-2">
              ChemVision AI dapat membuat kesalahan. Periksa informasi penting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

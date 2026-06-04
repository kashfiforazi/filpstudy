import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, X, Send, Sparkles, BookOpen, 
  HelpCircle, Lightbulb, Flame, Calendar, BookOpenCheck 
} from 'lucide-react';
import { Book, StickyNote } from '../types';
import { TextbookPage } from '../services/preloadedBooks';
import { dbInstance } from '../db';
import { SoraChatbotLogo } from './BrandLogos';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatbotProps {
  currentBook: Book | null;
  currentPage: number;
  pageObj: TextbookPage | null;
  isReading: boolean;
  totalBooks: number;
  completedGoals: number;
  totalGoals: number;
  goalsList: { id: string; text: string; completed: boolean }[];
  categories: { id: string; name: string }[];
}

export default function AIChatbot({
  currentBook,
  currentPage,
  pageObj,
  isReading,
  totalBooks,
  completedGoals,
  totalGoals,
  goalsList,
  categories
}: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-001',
      role: 'assistant',
      content: "🌸 Konnichiwa! I am **Sora**, your academic study partner. I am integrated directly into FlipStudy! I can explain formulas, create quick quizzes based on your active textbook page, or help you organize your daily goals.\n\nWhat are we mastering today?",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Handle active suggestions changes
  const getSuggestedQuestions = () => {
    if (isReading && currentBook) {
      return [
        { label: "🌸 Explain page formulas", question: `Can you explain the mathematical derivation or meaning of the formulas listed on Page ${currentPage} of ${currentBook.title}?` },
        { label: "📝 Summarize this page", question: `Give me a concise and elegant syllabus summary of Page ${currentPage} ("${pageObj?.title || 'this chapter'}").` },
        { label: "🧪 Active Quiz", question: `Generate 2 quick multiple choice question tasks based on the textbook content on Page ${currentPage} for me to solve.` }
      ];
    } else {
      return [
        { label: "🔥 Review study progress", question: `I have completed ${completedGoals} out of ${totalGoals} daily goals today. Can you look at my list and suggest a revision agenda?` },
        { label: "🪐 Explain Wave Dynamics", question: "Explain the fundamentals of Mechanical Wave propagation, transverse vs longitudinal, and constructive interference." },
        { label: "📅 HSC Study Tips", question: "What is the best way to leverage handwriting, drawing diagrams, and active highlighters to study HSC Biology or Physics?" }
      ];
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // Dynamic annotation query directly from IndexedDB
    let notesOnPage: StickyNote[] = [];
    if (isReading && currentBook) {
      try {
        const bookNotes = await dbInstance.getNotesForBook(currentBook.id);
        notesOnPage = bookNotes.filter(n => n.page === currentPage);
      } catch (err) {
        console.warn("Could not retrieve notes for chatbot context:", err);
      }
    }

    // Build immediate context payload to pass to proxy API
    const contextPayload = {
      isReading,
      currentBook,
      currentPage,
      pageObj,
      notesOnPage,
      totalBooks,
      completedGoals,
      totalGoals,
      goalsList,
      subjects: categories.map(c => c.name).join(', ')
    };

    try {
      // Direct POST to fullstack server proxy endpoint
      // Support Vercel and other external hostings by querying the live container endpoint dynamically
      let apiEndpoint = '/api/chat';
      if (typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('github.io') || window.location.port !== '3000')) {
        apiEndpoint = 'https://ais-pre-wsqj5xymy3lbkirtsvxwom-484510607149.asia-southeast1.run.app/api/chat';
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          context: contextPayload
        })
      });

      if (!response.ok) {
        throw new Error('Server returned an error status.');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.reply) {
        throw new Error("I could not generate a reply. Please try again!");
      }
      
      setMessages(prev => [...prev, {
        id: 'reply_' + Date.now(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      console.warn("AI Chatbot fetch error: ", err);
      const errorMsg = err?.message || "I was unable to reach the study server.";
      setMessages(prev => [...prev, {
        id: 'reply_err_' + Date.now(),
        role: 'assistant',
        content: `🌸 **Oh-no! I lost synchronization.**\n\n${errorMsg}\n\nPlease click **Settings > Secrets** in your AI Studio workspace to verify your \`GEMINI_API_KEY\` is configured properly.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Dynamic Floating Action Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          id="sora-chatbot-toggle-button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-5 py-3.5 rounded-full shadow-2xl transition-all scale-100 hover:scale-105 active:scale-95 duration-300 font-sans text-xs font-bold border cursor-pointer ${
            isOpen 
              ? 'bg-rose-500 border-rose-600 text-white' 
              : 'bg-black dark:bg-[#FFD1DC] text-white dark:text-black border-zinc-700/30'
          }`}
          title="Open Sora Study AI Partner"
        >
          {isOpen ? (
            <>
              <X size={15} className="animate-spin-once" />
              <span>CLOSE ASSISTANT</span>
            </>
          ) : (
            <>
              <div className="relative">
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 animate-ping rounded-full inline-block"></span>
                <MessageSquare size={15} />
              </div>
              <span>ASK SORA AI</span>
              {isReading && (
                <span className="hidden md:inline-block bg-white/20 dark:bg-black/10 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold shadow-inner">
                  Page Context Active
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Expandable Chat Window Drawer Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="sora-chatbot-drawer-container"
            initial={{ opacity: 0, y: 35, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            className="fixed bottom-24 right-5 sm:right-6 w-[94vw] sm:w-[410px] h-[550px] max-h-[80vh] bg-white dark:bg-[#1C1A18] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden z-50 font-sans"
          >
            {/* Header Area */}
            <div className="p-4 bg-zinc-50 dark:bg-[#25221F] border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between select-none">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <SoraChatbotLogo className="w-10 h-10" />
                  <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#25221F]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-black tracking-wider uppercase text-black dark:text-white">SORA AI</h5>
                    <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase">HSC Tutor</span>
                  </div>
                  <p className="text-[10px] text-zinc-550 dark:text-zinc-400 font-medium">Your Smart Study Partner</p>
                </div>
              </div>

              {/* Status Header pill */}
              <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-150 dark:border-zinc-800 shadow-sm">
                <Sparkles size={11} className="text-rose-400 animate-pulse" />
                <span className="text-[9px] font-mono font-bold text-zinc-500">
                  {isReading ? `PAGE ${currentPage}` : 'CENTRAL'}
                </span>
              </div>
            </div>

            {/* Active Reading Header Pill (reminds the user sora is tracking what they read) */}
            {isReading && currentBook && (
              <div className="bg-rose-50/50 dark:bg-rose-950/10 border-b border-rose-100/40 px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1 truncate max-w-[80%]">
                  <BookOpen size={11} className="flex-shrink-0" />
                  Contextual reading: <em className="not-italic font-semibold truncate">"{currentBook.title}"</em>
                </span>
                <span className="text-[9px] font-mono text-zinc-400">Page {currentPage}</span>
              </div>
            )}

            {/* Chats Messages List Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-50/30 dark:bg-[#121110]/20">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                      m.role === 'user'
                        ? 'bg-black dark:bg-[#FFD1DC] text-white dark:text-black rounded-tr-none font-medium'
                        : 'bg-zinc-900 dark:bg-[#25221F] text-white rounded-tl-none border border-zinc-800 dark:border-zinc-800'
                    }`}
                  >
                    {/* Render message formatting simple Markdown blocks */}
                    <div className="space-y-1.5 whitespace-pre-wrap select-text">
                      {(m.content || "").split('\n\n').map((paragraph, index) => {
                        // Very simple parser for bullet points/lists
                        if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                          return (
                            <ul key={index} className="list-disc pl-4 space-y-1 my-1 text-white">
                              {paragraph.split('\n').map((li, lIdx) => (
                                <li key={lIdx}>{li.replace(/^[\-\*]\s+/, '')}</li>
                              ))}
                            </ul>
                          );
                        }
                        
                        // Parse simple bold markdown inline: **text**
                        const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                        const parsedChildren = parts.map((part, pIdx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={pIdx} className="font-extrabold text-[#F48FB1] dark:text-[#F48FB1]">{part.slice(2, -2)}</strong>;
                          }
                          // Parse simple inline backticks: `code`
                          const codeParts = part.split(/(`.*?`)/g);
                          return codeParts.map((subPart, sIdx) => {
                            if (subPart.startsWith('`') && subPart.endsWith('`')) {
                              return <code key={sIdx} className="px-1.5 py-0.5 font-mono text-[10px] bg-zinc-800 dark:bg-zinc-800 text-rose-300 dark:text-rose-300 rounded font-bold">{subPart.slice(1, -1)}</code>;
                            }
                            return subPart;
                          });
                        });

                        // Simple parser for standard lines
                        return <p key={index}>{parsedChildren}</p>;
                      })}
                    </div>
                    <span className={`text-[8px] mt-1 block text-right font-mono ${m.role === 'user' ? 'text-zinc-400 dark:text-zinc-650' : 'text-zinc-400'}`}>
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing indicator state */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 dark:bg-[#25221F] rounded-2xl rounded-tl-none p-3 border border-zinc-850 dark:border-zinc-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Study Prompts Container */}
            <div className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-[9px] font-sans font-bold tracking-wider text-zinc-400 uppercase mb-1.5 flex items-center gap-1 select-none">
                <Lightbulb size={10} className="text-amber-500" />
                Suggested study actions
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto pr-1 pb-1 scroller-narrow">
                {getSuggestedQuestions().map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion.question)}
                    className="flex-shrink-0 text-[10px] font-sans font-semibold bg-white dark:bg-[#25221F] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 px-3 py-1.5 rounded-full hover:border-[#FFD1DC] dark:hover:border-rose-400 hover:bg-rose-50/20 active:scale-95 transition-all text-left cursor-pointer"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form Footer area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="p-3 bg-white dark:bg-[#1C1A18] border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isReading ? "Ask Sora about coordinates, wave equations..." : "Ask Sora about your HSC study goals..."}
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 rounded-xl text-xs font-sans border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-rose-450 dark:focus:border-rose-400 bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-2 sm:p-2.5 rounded-xl bg-black dark:bg-[#FFD1DC] text-white dark:text-black hover:bg-zinc-900 dark:hover:bg-rose-100 disabled:opacity-40 transition-all cursor-pointer flex-shrink-0"
              >
                <Send size={13} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

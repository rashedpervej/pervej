import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Sparkles, Loader2, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
}

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      content: "Hello! I am Rashed's AI Creative Advisor. I can answer questions about his 6+ years of design experience, motion graphics skills, brand identity work, or how to hire him for a project. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "What brands has he worked with?",
    "Tell me about his packaging work",
    "Where is he based?",
    "How can I contact or hire Rashed?"
  ];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: text,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const historyToSend = messages.slice(1).map((msg) => ({
        role: msg.role,
        content: msg.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: historyToSend })
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const data = await res.json();
      
      const botMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        content: data.text || "I'm sorry, I encountered an issue processing that request. Please try again.",
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        content: "Oops! My communication link had a temporary hiccup. Please reach out to Rashed directly at **rashedpervej2011@gmail.com** or try typing your question again.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome",
        role: "model",
        content: "Hello! I am Rashed's AI Creative Advisor. I can answer questions about his 6+ years of design experience, motion graphics skills, brand identity work, or how to hire him for a project. What would you like to know?",
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-80 sm:w-96 h-[500px] rounded-2xl glass-panel-heavy shadow-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-950/40 via-black/50 to-zinc-950/40 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0a0f] animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-medium text-sm text-zinc-100">AI Creative Advisor</h3>
                  <p className="text-[10px] text-zinc-400">Rashed's Virtual Representative</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
                  title="Reset conversation"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-br-none font-sans"
                        : "bg-white/5 border border-white/5 text-zinc-200 rounded-bl-none font-sans"
                    }`}
                  >
                    {/* Render helper to format simple markdown links/bolds */}
                    <div className="whitespace-pre-wrap">
                      {msg.content.split("\n").map((paragraph, idx) => {
                        // Very simple parser for bold **text** and lists
                        let parsed = paragraph;
                        // Bold
                        const boldRegex = /\*\*(.*?)\*\*/g;
                        const elements = [];
                        let lastIndex = 0;
                        let match;

                        while ((match = boldRegex.exec(parsed)) !== null) {
                          if (match.index > lastIndex) {
                            elements.push(parsed.substring(lastIndex, match.index));
                          }
                          elements.push(
                            <strong key={match.index} className="text-purple-300 font-semibold">
                              {match[1]}
                            </strong>
                          );
                          lastIndex = boldRegex.lastIndex;
                        }
                        
                        if (lastIndex < parsed.length) {
                          elements.push(parsed.substring(lastIndex));
                        }

                        return (
                          <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>
                            {elements.length > 0 ? elements : paragraph}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 rounded-xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-xs text-zinc-400">Consulting Rashed's files...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 1 && !isLoading && (
              <div className="px-4 pb-2 pt-1 flex flex-wrap gap-1.5 border-t border-white/5 bg-black/10">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(suggestion)}
                    className="text-[11px] bg-white/5 hover:bg-purple-600/20 hover:border-purple-500/30 text-zinc-300 hover:text-white border border-white/5 rounded-lg px-2.5 py-1 text-left transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="p-3 border-t border-white/10 bg-zinc-950/80 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about projects, rates, background..."
                className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500/40 focus:bg-white/10 transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`p-2 rounded-lg transition-all ${
                  input.trim() && !isLoading
                    ? "bg-purple-600 text-white hover:bg-purple-500 active:scale-95"
                    : "bg-white/5 text-zinc-500 cursor-not-allowed"
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all duration-300 relative border border-white/10 group"
        whileTap={{ scale: 0.9 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <MessageSquare className="w-6 h-6" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#030303]" />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="absolute right-16 bg-[#0c0c10] text-zinc-200 border border-white/10 text-xs px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 whitespace-nowrap shadow-lg">
          Chat with Rashed's AI
        </span>
      </motion.button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      // Handle error appropriately
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-4 right-4 bg-[#00A9FF] text-white p-4 rounded-full shadow-lg hover:bg-[#0090DD] transition-colors"
          style={{boxShadow: '0 0 15px #00A9FF'}}
          onClick={() => setIsOpen(true)}
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
        </motion.button>
      )}

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-4 right-4 w-96 h-[600px] bg-[#101624] rounded-lg shadow-2xl overflow-hidden border-2 border-[#00A9FF]"
          style={{boxShadow: '0 0 30px #00A9FF'}}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 bg-[#00A9FF] text-white flex justify-between items-center shadow-lg" style={{boxShadow: '0 0 20px #00A9FF'}}>
              <div className="flex items-center gap-2">
                {/* DNA-logo SVG */}
                <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <ellipse cx="32" cy="40" rx="20" ry="10" fill="#00A9FF" fillOpacity="0.15"/>
                  <path d="M16 40c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="#00A9FF" strokeWidth="2" fill="#0a0e1a"/>
                  <path d="M24 40v-4a8 8 0 1 1 16 0v4" stroke="#00A9FF" strokeWidth="2"/>
                  <rect x="22" y="40" width="20" height="8" rx="4" fill="#00A9FF" fillOpacity="0.25"/>
                  <path d="M32 24l4-8h-8l4 8z" fill="#00A9FF"/>
                  <path d="M36 16c0-2.21-1.79-4-4-4s-4 1.79-4 4" stroke="#00A9FF" strokeWidth="2"/>
                  <path d="M44 32c2-2 6-2 8 0" stroke="#00A9FF" strokeWidth="1.5"/>
                  <path d="M20 32c-2-2-6-2-8 0" stroke="#00A9FF" strokeWidth="1.5"/>
                </svg>
                <h3 className="font-semibold text-lg" style={{textShadow: '0 0 10px #00A9FF'}}>ByggPilot</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => alert('Koppla konto-funktion kommer snart!')}
                  className="bg-white/10 border border-white/20 px-3 py-1 rounded-lg text-xs hover:bg-white/20 transition-colors"
                >Koppla Konto</button>
                <button
                  onClick={() => alert('Info om ByggPilot kommer snart!')}
                  className="bg-white/10 border border-white/20 px-3 py-1 rounded-lg text-xs hover:bg-white/20 transition-colors"
                >Info</button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:text-gray-200 text-2xl ml-2"
                  aria-label="Stäng"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg shadow-md ${
                      message.role === 'user'
                        ? 'bg-[#00A9FF] text-white'
                        : 'bg-[#172033] text-white border border-[#00A9FF]/30'
                    }`}
                    style={message.role === 'user' ? {boxShadow: '0 0 10px #00A9FF'} : {boxShadow: '0 0 8px #00A9FF44'}}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="text-center text-gray-500">
                  <div className="inline-block animate-pulse">...</div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t">
              <div className="flex">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Skriv ditt meddelande..."
                  className="flex-1 border-none rounded-l-lg px-4 py-2 bg-[#172033] text-white focus:outline-none focus:ring-2 focus:ring-[#00A9FF] placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#00A9FF] text-white px-4 py-2 rounded-r-lg hover:bg-[#0090DD] disabled:opacity-50 shadow-md"
                  style={{boxShadow: '0 0 10px #00A9FF'}}
                >
                  Skicka
                </button>
              </div>
            </form>
            <p className="text-xs text-center text-gray-400 mt-2 mb-1">ByggPilot kan göra misstag. Dubbelkolla viktig information.</p>
          </div>
        </motion.div>
      )}
    </>
  );
} 
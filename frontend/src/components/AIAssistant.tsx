import { useState } from 'react';
import { askPropertyAI } from '../lib/gemini';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';

interface AIAssistantProps {
  propertyContext: string;
}

export function AIAssistant({ propertyContext }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hi! I am the VaultStay AI assistant. Ask me anything about this property.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQuery = query.trim();
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setQuery('');
    setIsLoading(true);

    try {
      const aiResponse = await askPropertyAI(propertyContext, userQuery);
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error answering that.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-accent hover:bg-accent2 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center"
        >
          <Sparkles size={24} />
        </button>
      )}

      {isOpen && (
        <div className="bg-surface border border-border rounded-2xl shadow-2xl w-80 sm:w-96 flex flex-col h-[500px] overflow-hidden glass-panel">
          {/* Header */}
          <div className="bg-accent/10 p-4 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-accent" />
              <h3 className="font-bold text-lg font-display">AI Property Guide</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-muted hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-accent text-white rounded-br-none'
                      : 'bg-surface border border-border text-gray-200 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-surface border border-border p-3 rounded-2xl rounded-bl-none">
                  <Loader2 size={16} className="animate-spin text-accent" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-surface/50">
            <div className="relative flex items-center">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ask about this property..."
                className="w-full bg-background border border-border rounded-full py-2 pl-4 pr-12 text-sm focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="absolute right-2 p-1.5 bg-accent text-white rounded-full hover:bg-accent2 disabled:opacity-50 disabled:hover:bg-accent transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

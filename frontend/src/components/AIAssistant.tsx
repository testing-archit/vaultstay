import { useState, useRef } from 'react';
import { askGlobalAI } from '../lib/gemini';
import { Sparkles, X, Send, Loader2, Image as ImageIcon } from 'lucide-react';

interface AIAssistantProps {
  propertyContext?: string;
}

export function AIAssistant({ propertyContext }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string; image?: string }[]>([
    { role: 'ai', text: propertyContext ? 'Hi! I am the VaultStay AI assistant. Ask me anything about this property.' : 'Hi! I am your global VaultStay AI assistant. You can ask me anything or upload a picture for me to analyze!' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!query.trim() && !imagePreview) || isLoading) return;

    const userQuery = query.trim() || (imagePreview ? "Please analyze this image." : "");
    const currentImagePreview = imagePreview;
    
    setMessages(prev => [...prev, { role: 'user', text: userQuery, image: currentImagePreview || undefined }]);
    setQuery('');
    setImageFile(null);
    setImagePreview(null);
    setIsLoading(true);

    try {
      const aiResponse = await askGlobalAI(propertyContext, userQuery, currentImagePreview);
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
                  {msg.image && (
                    <img src={msg.image} alt="uploaded" className="max-w-full rounded-xl mb-2 border border-border/50" />
                  )}
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
          <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-surface/50 flex flex-col gap-2">
            {imagePreview && (
              <div className="relative inline-block w-20 h-20">
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover rounded-xl border border-border" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-2 p-1.5 text-muted hover:text-accent transition-colors"
              >
                <ImageIcon size={18} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ask or upload an image..."
                className="w-full bg-background border border-border rounded-full py-2 pl-10 pr-12 text-sm focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="submit"
                disabled={(!query.trim() && !imagePreview) || isLoading}
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

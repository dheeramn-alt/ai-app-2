
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Story, Template, Epic, User } from '../types.ts';
import { Icons } from '../constants.tsx';
import { GoogleGenAI, Type } from "@google/genai";
import { generateStoryFromFigmaData } from '../services/gemini.ts';

interface EditorProps {
  story: Story;
  onUpdate: (updatedStory: Story) => void;
  onDelete: (storyId: string) => void;
  onMoveStory: (storyId: string, targetEpicId: string) => void;
  epics: Epic[];
  templates: Template[];
  selectedTemplateId?: string;
  currentUser: User;
  users: User[];
  figmaConfig?: { apiKey: string; connected: boolean };
}

const STATUS_CONFIG = {
  'Draft': { color: 'bg-slate-100 dark:bg-slate-800', hover: 'hover:bg-slate-200 dark:hover:bg-slate-700' },
  'In Progress': { color: 'bg-primary-600', hover: 'hover:bg-primary-500' },
  'Ready': { color: 'bg-primary-700', hover: 'hover:bg-primary-600' },
  'Completed': { color: 'bg-emerald-600', hover: 'hover:bg-emerald-500' }
};

export const Editor: React.FC<EditorProps> = ({ 
  story, 
  onUpdate, 
  onDelete,
  figmaConfig
}) => {
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const figmaAnalysis = useMemo(() => {
    if (!chatInput) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = chatInput.match(urlRegex);
    if (!urls) return null;
    const figmaRegex = /https?:\/\/(?:www\.)?figma\.com\/(file|design|proto|board)\/([a-zA-Z0-9]+)(?:\/[^?#]*)?(?:\?(?:.*&)?node-id=([^&?#]+))?/;
    for (const url of urls) {
      const match = url.match(figmaRegex);
      if (match) return { url, isValid: true, isFrame: !!match[3] };
    }
    return { url: urls[0], isValid: false };
  }, [chatInput]);

  const displayedStory = useMemo(() => {
    if (previewVersionId && story.versions) {
      const version = story.versions.find(v => v.id === previewVersionId);
      if (version) return { ...story, ...version };
    }
    return story;
  }, [story, previewVersionId]);

  const handleFieldChange = (field: keyof Story, value: any) => {
    if (previewVersionId) return;
    onUpdate({ ...story, [field]: value });
  };

  const handleACChange = (index: number, value: string) => {
    if (previewVersionId) return;
    const newAC = [...story.acceptanceCriteria];
    newAC[index] = value;
    handleFieldChange('acceptanceCriteria', newAC);
  };

  const handleSmartAction = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    setIsChatLoading(true);
    const command = chatInput.trim();
    setChatInput('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze and update story: "${command}" (Title: ${story.title})`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
              happyPath: { type: Type.STRING },
              sadPath: { type: Type.STRING }
            },
            required: ['description', 'acceptanceCriteria', 'happyPath', 'sadPath']
          }
        }
      });
      onUpdate({ ...story, ...JSON.parse(response.text || '{}') });
    } catch (err) { console.error(err); } finally { setIsChatLoading(false); }
  };

  const handleGenerateFromFigma = async () => {
    if (!figmaAnalysis || !figmaAnalysis.isValid || isChatLoading) return;
    setIsChatLoading(true);
    try {
      const mockData = { name: "Generated from Figma", children: [{ name: "UI Element", type: "TEXT" }] };
      const generated = await generateStoryFromFigmaData(mockData, `Figma Frame: ${figmaAnalysis.url}`);
      onUpdate({ ...story, ...generated, figmaUrl: figmaAnalysis.url });
      setChatInput('');
    } catch (err) { console.error(err); } finally { setIsChatLoading(false); }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [chatInput]);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#020617] overflow-hidden text-slate-800 dark:text-slate-100 transition-colors duration-300 relative">
      {/* Action Header */}
      <div className="h-14 flex items-center justify-between px-8 border-b border-slate-100 dark:border-slate-900 bg-white/50 dark:bg-[#020617]/50 backdrop-blur-3xl z-30 transition-colors duration-300">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-tighter shrink-0 border border-slate-200 dark:border-slate-800">
            {story.id}
          </div>
          <input 
            type="text"
            readOnly={!!previewVersionId}
            value={displayedStory.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className="text-[13px] font-black bg-transparent border-none outline-none focus:ring-0 p-0 text-slate-900 dark:text-slate-100 w-full max-w-xl truncate uppercase tracking-tight transition-colors"
            placeholder="Story title..."
          />
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
          <button onClick={() => setShowHistory(!showHistory)} className="p-2 rounded-xl text-slate-300 dark:text-slate-700 hover:text-primary dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
            <Icons.History className="w-5 h-5" />
          </button>
          <div className="h-5 w-px bg-slate-100 dark:bg-slate-900"></div>
          <button onClick={() => onDelete(story.id)} className="p-2 text-slate-300 dark:text-slate-700 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
            <Icons.Trash className="w-5 h-5" />
          </button>
          
          <div className="relative" ref={statusRef}>
            <button
              disabled={!!previewVersionId}
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all shadow-sm"
            >
              <span>{story.status}</span>
              <Icons.ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-700 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
            </button>
            {isStatusOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-3xl border border-slate-100 dark:border-slate-800 py-2 z-50 overflow-hidden">
                {Object.keys(STATUS_CONFIG).map((status) => (
                  <button
                    key={status}
                    onClick={() => { handleFieldChange('status', status); setIsStatusOpen(false); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-white transition-colors"
                  >
                    {status}
                    {story.status === status && <Icons.Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 md:px-20 py-12 md:py-16 no-scrollbar scroll-smooth">
        <div className="max-w-5xl mx-auto space-y-16 pb-48">
          
          {/* Design Reference Box */}
          <div className="p-8 rounded-[32px] border border-blue-500/15 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/[0.03] grid grid-cols-1 md:grid-cols-2 gap-12 shadow-[0_0_80px_rgba(59,130,246,0.02)] dark:shadow-[0_0_80px_rgba(59,130,246,0.05)] transition-colors">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300 dark:text-slate-700 transition-colors">Design Reference</label>
              <div className="flex items-center gap-4 bg-white dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-900 hover:border-blue-500/50 transition-all group/figma ring-1 ring-blue-500/5">
                <Icons.Figma className="w-6 h-6" />
                <input 
                  type="text" 
                  readOnly={!!previewVersionId}
                  value={displayedStory.figmaUrl || ''}
                  onChange={(e) => handleFieldChange('figmaUrl', e.target.value)}
                  placeholder="Paste Figma Prototype Link..."
                  className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-[11px] font-bold text-slate-500 dark:text-slate-400 placeholder:text-slate-200 dark:placeholder:text-slate-900"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300 dark:text-slate-700 transition-colors">Traceability Links</label>
              <div className="flex flex-wrap gap-3">
                <button className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600 hover:text-primary dark:hover:text-white hover:bg-white dark:hover:bg-slate-900 hover:border-primary/30 transition-all shadow-sm">
                  <Icons.Plus className="w-4 h-4" /> ADD LINK
                </button>
              </div>
            </div>
          </div>

          {/* User Narrative */}
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-slate-700 transition-colors">User Narrative</label>
            <textarea 
              readOnly={!!previewVersionId}
              value={displayedStory.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className="w-full bg-transparent border-none outline-none focus:ring-0 text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-200 min-h-[160px] resize-none leading-[1.15] placeholder:text-slate-100 dark:placeholder:text-slate-900 transition-colors"
              placeholder="As a user, I want to..."
            />
          </section>

          {/* Acceptance Criteria */}
          <section className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-900 pb-5 transition-colors">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-slate-700 transition-colors">Acceptance Criteria</label>
              {!previewVersionId && (
                <button 
                  onClick={() => handleFieldChange('acceptanceCriteria', [...displayedStory.acceptanceCriteria, ''])} 
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 hover:text-primary hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm"
                >
                  ADD NODE
                </button>
              )}
            </div>
            <div className="space-y-1">
              {displayedStory.acceptanceCriteria.map((ac, idx) => (
                <div key={idx} className="flex gap-6 group items-start p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800/10">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-[10px] font-black text-slate-300 dark:text-slate-700 group-hover:bg-primary/20 group-hover:text-primary transition-all shrink-0 border border-slate-200 dark:border-slate-800 group-hover:border-primary/20">{idx + 1}</div>
                  <input 
                    type="text" 
                    readOnly={!!previewVersionId}
                    value={ac}
                    onChange={(e) => handleACChange(idx, e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] font-bold text-slate-500 p-0 mt-1 placeholder:text-slate-200 dark:placeholder:text-slate-900 transition-colors"
                    placeholder="New specification node..."
                  />
                  {!previewVersionId && (
                    <button onClick={() => handleFieldChange('acceptanceCriteria', displayedStory.acceptanceCriteria.filter((_, i) => i !== idx))} className="opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-800 hover:text-rose-500 transition-all p-2">
                      <Icons.Trash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Floating Smart Input Bar */}
      {!previewVersionId && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl px-12 pointer-events-none z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2 min-h-[36px]">
              {figmaAnalysis && (
                <div className={`px-4 py-2 rounded-full flex items-center gap-3 backdrop-blur-3xl border transition-all duration-500 transform animate-in fade-in slide-in-from-bottom-3 ${figmaAnalysis.isValid ? 'bg-blue-500/15 border-blue-500/50 text-blue-600 dark:text-blue-400 shadow-xl shadow-blue-500/10' : 'bg-rose-500/15 border-rose-500/50 text-rose-600 dark:text-rose-400 shadow-xl shadow-rose-500/10'}`}>
                  <Icons.Figma className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {figmaAnalysis.isValid ? (figmaAnalysis.isFrame ? 'Frame Detected' : 'Design Context') : 'Invalid Link'}
                  </span>
                  {figmaAnalysis.isValid && (
                    <button onClick={handleGenerateFromFigma} disabled={isChatLoading} className="ml-3 px-3 py-1 bg-blue-500/20 dark:bg-blue-500/30 hover:bg-blue-500/50 rounded-lg text-[9px] font-black transition-all flex items-center gap-2 group/chip active:scale-95 border border-blue-400/20">
                      {isChatLoading ? <div className="w-3 h-3 border border-blue-600 dark:border-white/40 border-t-blue-600 dark:border-t-white rounded-full animate-spin"></div> : <Icons.Sparkles className="w-3.5 h-3.5 group-hover/chip:rotate-12 transition-transform" />}
                      GENERATE
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className={`pointer-events-auto w-full bg-white/90 dark:bg-[#020617]/98 backdrop-blur-3xl rounded-[28px] border transition-all duration-500 ease-out flex items-center px-5 py-3 gap-4 group ${isFocused ? 'border-primary shadow-[0_40px_80px_rgba(75,145,49,0.15)] dark:shadow-[0_40px_80px_rgba(75,145,49,0.25)] scale-[1.04] -translate-y-2' : 'border-slate-200 dark:border-slate-800 shadow-[0_30px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.8)]'}`}>
              <button className="p-3 rounded-full text-slate-300 dark:text-slate-700 hover:text-primary dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-90 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 shadow-sm">
                <Icons.Plus className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef}
                rows={1}
                value={chatInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSmartAction(); } }}
                placeholder="Ask Gemini AI or paste Figma link to auto-doc..."
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-[14px] py-2.5 text-slate-900 dark:text-slate-200 resize-none max-h-48 placeholder:text-slate-200 dark:placeholder:text-slate-900 font-bold transition-all duration-300"
              />
              <button disabled={!chatInput.trim() || isChatLoading} onClick={handleSmartAction} className={`p-3.5 rounded-2xl transition-all duration-300 transform active:scale-75 ${chatInput.trim() ? 'bg-primary/20 text-primary shadow-xl shadow-primary/20 border border-primary/30' : 'bg-slate-100 dark:bg-slate-900 text-slate-300 dark:text-slate-800 transition-colors'}`}>
                {isChatLoading ? <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div> : <Icons.Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

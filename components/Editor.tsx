
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Story, Template, Epic, User, StoryVersion } from '../types.ts';
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
  globalFontSize: number;
  onUpdateGlobalFontSize: (size: number) => void;
}

export const Editor: React.FC<EditorProps> = ({ 
  story, 
  onUpdate, 
  onDelete,
  currentUser,
  globalFontSize,
  onUpdateGlobalFontSize
}) => {
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const narrativeRef = useRef<HTMLTextAreaElement>(null);
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

  /**
   * Precise Figma URL detection logic.
   */
  const figmaAnalysis = useMemo(() => {
    if (!chatInput) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = chatInput.match(urlRegex);
    if (!urls) return null;
    
    const figmaRegex = /https?:\/\/(?:www\.)?figma\.com\/(file|design|proto|board)\/([a-zA-Z0-9]+)(?:\/[^?#]*)?(?:\?(?:.*&)?node-id=([^&?#]+))?/;
    
    for (const url of urls) {
      const match = url.match(figmaRegex);
      if (match) {
        return { 
          url, 
          isValid: true, 
          isFrame: !!match[3],
          nodeId: match[3] || null,
          fileKey: match[2]
        };
      }
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
        contents: `Analyze and update story based on intent: "${command}" (Current Title: ${story.title})`,
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
      const result = JSON.parse(response.text || '{}');
      onUpdate({ ...story, ...result });
    } catch (err) { 
      console.error('Synthesis failed', err); 
    } finally { 
      setIsChatLoading(false); 
    }
  };

  const handleRestore = (version: StoryVersion) => {
    onUpdate({
      ...story,
      title: version.title,
      description: version.description,
      acceptanceCriteria: version.acceptanceCriteria,
      happyPath: version.happyPath,
      sadPath: version.sadPath
    });
    setPreviewVersionId(null);
    setShowHistory(false);
  };

  /**
   * Triggers the parsing of the Figma frame and generates the story.
   */
  const handleGenerateFromFigma = async () => {
    if (!figmaAnalysis || !figmaAnalysis.isValid || isChatLoading) return;
    setIsChatLoading(true);
    try {
      const mockFigmaMetaData = {
        name: figmaAnalysis.isFrame ? `Frame ${figmaAnalysis.nodeId}` : "Entire Document",
        type: figmaAnalysis.isFrame ? "FRAME" : "DOCUMENT",
        elements: ["Submit Button", "Email Input", "Password Input", "Secondary Login Link"]
      };
      
      const generated = await generateStoryFromFigmaData(
        mockFigmaMetaData, 
        `Context: Building a high-fidelity story from Figma Frame ${figmaAnalysis.url}`
      );
      
      onUpdate({ ...story, ...generated, figmaUrl: figmaAnalysis.url });
      setChatInput('');
    } catch (err) { 
      console.error('Figma generation failed', err); 
    } finally { 
      setIsChatLoading(false); 
    }
  };

  // Adjust narrative height automatically
  useEffect(() => {
    if (narrativeRef.current) {
      narrativeRef.current.style.height = 'auto';
      narrativeRef.current.style.height = `${narrativeRef.current.scrollHeight}px`;
    }
  }, [displayedStory.description, globalFontSize]);

  // Adjust chat input height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [chatInput]);

  const fontSizeOptions = [16, 24, 32, 48, 64];

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#020617] overflow-hidden text-slate-800 dark:text-slate-100 relative transition-colors duration-300">
      {/* Top Header */}
      <div className="h-14 flex items-center justify-between px-8 border-b border-slate-100 dark:border-slate-900 bg-white/95 dark:bg-[#020617]/95 backdrop-blur-xl z-30">
        <div className="flex items-center gap-5 flex-1">
          <div className="bg-slate-50 dark:bg-[#0b101f] text-[11px] font-black text-slate-400 dark:text-slate-600 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 uppercase tracking-widest shrink-0 shadow-sm">
            {story.id || 'STORY-9628'}
          </div>
          <input 
            type="text"
            readOnly={!!previewVersionId}
            value={displayedStory.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className="text-[15px] font-black bg-transparent border-none outline-none focus:ring-0 p-0 text-slate-900 dark:text-slate-100 truncate uppercase tracking-tight"
            placeholder="Untitled Story"
          />
        </div>
        
        <div className="flex items-center gap-6 shrink-0">
          <button 
            onClick={() => setShowHistory(true)} 
            className={`p-2 transition-all rounded-xl ${showHistory || previewVersionId ? 'text-primary' : 'text-slate-300 dark:text-slate-700 hover:text-primary dark:hover:text-white'}`}
          >
            <Icons.History className="w-5.5 h-5.5" />
          </button>
          <button onClick={() => onDelete(story.id)} className="p-2 text-slate-300 dark:text-slate-700 hover:text-rose-500 transition-all">
            <Icons.Trash className="w-5.5 h-5.5" />
          </button>
          
          <div className="relative" ref={statusRef}>
            <button
              disabled={!!previewVersionId}
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#0b101f] border border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
            >
              <span>{story.status}</span>
              <Icons.ChevronDown className={`w-4 h-4 text-slate-300 dark:text-slate-700 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-24 py-10 md:py-20 no-scrollbar scroll-smooth">
        <div className="max-w-5xl mx-auto space-y-16 pb-64">
          
          {/* Metadata Block */}
          <div className="p-8 md:p-12 rounded-[40px] border border-blue-500/10 bg-blue-50/40 dark:bg-blue-500/[0.02] grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 shadow-sm">
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-700">Design Reference</label>
              <div className="flex items-center gap-4 bg-white dark:bg-[#020617] p-4 rounded-3xl border border-slate-100 dark:border-slate-800/80 hover:border-blue-500/30 transition-all group ring-1 ring-blue-500/5 shadow-sm">
                <Icons.Figma className="w-6 h-6 shrink-0" />
                <input 
                  type="text" 
                  readOnly={!!previewVersionId}
                  value={displayedStory.figmaUrl || ''}
                  onChange={(e) => handleFieldChange('figmaUrl', e.target.value)}
                  placeholder="Paste Figma Prototype Link"
                  className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-[12px] font-bold text-slate-500 dark:text-slate-400 placeholder:text-slate-200 dark:placeholder:text-slate-900 tracking-tight"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-700">Traceability Links</label>
              <div className="flex flex-wrap gap-4">
                <button className="flex items-center gap-3 px-8 py-4 rounded-3xl bg-white dark:bg-[#0b101f]/80 border border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-primary transition-all active:scale-95 shadow-sm">
                  <Icons.Plus className="w-5 h-5" /> ADD LINK
                </button>
              </div>
            </div>
          </div>

          {/* User Narrative */}
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-300 dark:text-slate-800">User Narrative</label>
              
              {/* Text Size Adjustment Tool */}
              <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                {fontSizeOptions.map((size) => (
                  <button
                    key={size}
                    onClick={() => onUpdateGlobalFontSize(size)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${globalFontSize === size ? 'bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-300 dark:text-slate-700 hover:text-slate-500'}`}
                  >
                    <span style={{ fontSize: '10px' }} className="font-black">A</span>
                    <span style={{ fontSize: '14px' }} className="font-black">A</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="relative group">
              <textarea 
                ref={narrativeRef}
                readOnly={!!previewVersionId}
                value={displayedStory.description}
                style={{ fontSize: `${globalFontSize}px` }}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="w-full bg-transparent border-none outline-none focus:ring-0 font-black tracking-tighter text-slate-900 dark:text-slate-100 min-h-[220px] resize-none leading-[1.1] placeholder:text-slate-50 dark:placeholder:text-slate-900 transition-all duration-300"
                placeholder="### 🎯 Objective"
              />
            </div>
          </section>

          {/* Acceptance Criteria */}
          <section className="space-y-10">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-5">
              <label className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-300 dark:text-slate-800">Acceptance Criteria</label>
              {!previewVersionId && (
                <button 
                  onClick={() => handleFieldChange('acceptanceCriteria', [...displayedStory.acceptanceCriteria, ''])} 
                  className="px-5 py-2.5 bg-slate-50 dark:bg-[#0b101f] border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm"
                >
                  ADD NODE
                </button>
              )}
            </div>
            <div className="space-y-2">
              {displayedStory.acceptanceCriteria.map((ac, idx) => (
                <div key={idx} className="flex gap-6 group items-start p-5 rounded-[24px] hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800/20">
                  <div className="w-9 h-9 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-[12px] font-black text-slate-300 dark:text-slate-700 group-hover:bg-primary/20 group-hover:text-primary transition-all shrink-0 border border-slate-100 dark:border-slate-800 shadow-sm">{idx + 1}</div>
                  <input 
                    type="text" 
                    readOnly={!!previewVersionId}
                    value={ac}
                    onChange={(e) => handleACChange(idx, e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-bold text-slate-500 dark:text-slate-400 p-0 mt-2 placeholder:text-slate-100 dark:placeholder:text-slate-900"
                    placeholder="Describe requirement..."
                  />
                  {!previewVersionId && (
                    <button onClick={() => handleFieldChange('acceptanceCriteria', displayedStory.acceptanceCriteria.filter((_, i) => i !== idx))} className="opacity-0 group-hover:opacity-100 text-slate-200 hover:text-rose-500 transition-all p-2">
                      <Icons.Trash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Synthesis Bar */}
      {!previewVersionId && (
        <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 md:px-12 pointer-events-none z-50">
          <div className="flex flex-col items-center gap-4 md:gap-5">
             {figmaAnalysis && (
                <div className={`px-6 py-3 rounded-full flex items-center gap-4 backdrop-blur-3xl border transition-all transform animate-in fade-in slide-in-from-bottom-2 duration-300 ${figmaAnalysis.isValid ? 'bg-white/90 border-primary/20 text-primary' : 'bg-rose-600/5 border-rose-500/20 text-rose-500'}`}>
                  <Icons.Figma className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                    {figmaAnalysis.isValid ? (figmaAnalysis.isFrame ? 'Frame Detected' : 'Source Connected') : 'Invalid Link'}
                  </span>
                  {figmaAnalysis.isValid && (
                    <button 
                      onClick={handleGenerateFromFigma} 
                      disabled={isChatLoading} 
                      className="ml-2 px-4 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-xl text-[9px] font-black transition-all border border-primary/20 shadow-sm active:scale-95"
                    >
                      {isChatLoading ? 'PARSING...' : 'GENERATE STORY'}
                    </button>
                  )}
                </div>
              )}
            
            <div className={`pointer-events-auto w-full bg-white/95 dark:bg-[#0b101f]/95 backdrop-blur-3xl rounded-[32px] border transition-all duration-500 flex items-center px-6 py-3 gap-5 group shadow-[0_30px_100px_rgba(0,0,0,0.08)] dark:shadow-[0_30px_100px_rgba(0,0,0,0.8)] ${isFocused ? 'border-primary/50 scale-[1.01]' : 'border-slate-100 dark:border-slate-800'}`}>
              <button className="p-3.5 rounded-2xl text-slate-200 dark:text-slate-800 hover:text-primary transition-all">
                <Icons.Plus className="w-6 h-6" />
              </button>
              <textarea
                ref={textareaRef}
                rows={1}
                value={chatInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSmartAction(); } }}
                placeholder="Ask Gemini to synthesize..."
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-[15px] py-3 text-slate-900 dark:text-slate-200 resize-none max-h-32 md:max-h-48 placeholder:text-slate-200 dark:placeholder:text-slate-900 font-bold tracking-tight"
              />
              <button 
                disabled={!chatInput.trim() || isChatLoading} 
                onClick={handleSmartAction} 
                className={`p-3.5 rounded-2xl transition-all ${chatInput.trim() ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 dark:bg-slate-900 text-slate-200 dark:text-slate-800'}`}
              >
                {isChatLoading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Icons.Send className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Slide-over */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white dark:bg-[#0b101f] border-l border-slate-100 dark:border-slate-900 shadow-[0_0_100px_rgba(0,0,0,0.1)] z-[60] transition-transform duration-500 transform ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-8 border-b border-slate-100 dark:border-slate-900/60 flex items-center justify-between bg-slate-50/50 dark:bg-transparent">
            <div className="flex items-center gap-3">
               <Icons.History className="w-5 h-5 text-primary" />
               <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-800 dark:text-slate-100">Audit Trail</h3>
            </div>
            <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all"><Icons.Plus className="w-6 h-6 rotate-45 text-slate-300" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {(!story.versions || story.versions.length === 0) ? (
              <div className="py-20 text-center space-y-4 opacity-30">
                <Icons.Clock className="w-12 h-12 mx-auto text-slate-200" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chronicle Empty</p>
              </div>
            ) : (
              story.versions.map((v) => (
                <div 
                  key={v.id}
                  onClick={() => setPreviewVersionId(v.id)}
                  className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all group relative overflow-hidden ${previewVersionId === v.id ? 'bg-primary/5 border-primary shadow-lg scale-[1.02]' : 'bg-white dark:bg-slate-900/40 border-slate-50 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">{new Date(v.timestamp).toLocaleString()}</span>
                    {previewVersionId === v.id && <Icons.Check className="w-4 h-4 text-primary" />}
                  </div>
                  <h4 className="text-[13px] font-black text-slate-900 dark:text-slate-100 mb-2 truncate uppercase tracking-tight">{v.title}</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[8px] font-black text-slate-500 uppercase">{v.authorName.charAt(0)}</div>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-600 uppercase tracking-widest">{v.authorName}</span>
                  </div>
                  
                  {previewVersionId === v.id && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRestore(v); }}
                      className="mt-5 w-full py-3 bg-primary text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary/20 animate-in fade-in slide-in-from-bottom-2"
                    >
                      RESTORE POINT
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {showHistory && (
        <div 
          onClick={() => setShowHistory(false)} 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-50 animate-in fade-in duration-300"
        />
      )}
    </div>
  );
};

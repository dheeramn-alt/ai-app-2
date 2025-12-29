
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Story, Template, StoryVersion, Epic, StoryRelationship, RelationshipType } from '../types';
import { Icons } from '../constants';
import { analyzeFigmaDesign, generateStoryFromFigmaData } from '../services/gemini';
import { GoogleGenAI, Type } from "@google/genai";

interface EditorProps {
  story: Story;
  onUpdate: (updatedStory: Story) => void;
  onDelete: (storyId: string) => void;
  onMoveStory: (storyId: string, targetEpicId: string) => void;
  epics: Epic[];
  templates: Template[];
  selectedTemplateId?: string;
}

export const Editor: React.FC<EditorProps> = ({ 
  story, 
  onUpdate, 
  onDelete, 
  onMoveStory,
  epics,
  templates,
  selectedTemplateId 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const allStories = epics.flatMap(e => e.stories);

  // RegEx for robust Figma URL Detection (files and design frames)
  const detectedFigmaUrl = useMemo(() => {
    const figmaRegex = /https?:\/\/(www\.)?figma\.com\/(file|design)\/([a-zA-Z0-9]+)\/([^\/?#]+)?/;
    const match = chatInput.match(figmaRegex);
    return match ? match[0] : null;
  }, [chatInput]);

  // Dynamic Token Estimation for design-heavy contexts
  const tokenEstimate = useMemo(() => {
    if (!chatInput) return 0;
    const base = chatInput.length * 0.12; 
    // If a design link is present, simulate the "weight" of the parsed layers
    return detectedFigmaUrl ? base + 48.7 : base;
  }, [chatInput, detectedFigmaUrl]);

  // Dynamic placeholder based on context
  const placeholder = useMemo(() => {
    if (detectedFigmaUrl) return "Add custom context (e.g. 'Focus on edge cases')...";
    if (!story.description) return "Start with a goal: 'As a user I want to...'";
    return "Refine requirements or ask: 'Are there any logic gaps?'";
  }, [detectedFigmaUrl, story.description]);

  const handleFieldChange = (field: keyof Story, value: any) => {
    onUpdate({ ...story, [field]: value });
  };

  const createSnapshot = (author: string = 'Gemini AI', customStory?: Partial<Story>) => {
    const targetStory = { ...story, ...customStory };
    const newVersion: StoryVersion = {
      id: `v-${Date.now()}`,
      timestamp: Date.now(),
      title: targetStory.title,
      description: targetStory.description,
      acceptanceCriteria: [...targetStory.acceptanceCriteria],
      happyPath: targetStory.happyPath,
      sadPath: targetStory.sadPath,
      authorName: author
    };
    return [newVersion, ...(story.versions || [])].slice(0, 20);
  };

  const handleACChange = (index: number, value: string) => {
    const newAC = [...story.acceptanceCriteria];
    newAC[index] = value;
    handleFieldChange('acceptanceCriteria', newAC);
  };

  const handleRemoveRelationship = (relId: string) => {
    const updatedRelationships = (story.relationships || []).filter(r => r.id !== relId);
    handleFieldChange('relationships', updatedRelationships);
  };

  const handleSmartAction = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    setIsChatLoading(true);
    const command = chatInput.trim();
    setChatInput('');

    try {
      if (detectedFigmaUrl) {
        // AI-Powered Figma Parsing Simulation
        // In a production environment, this would call get_figma_node_details
        const mockFigmaNodeData = {
          file_key: "JIJ1L9...",
          node_id: "123:456",
          layers: [
            { type: "TEXT", content: "Email", role: "label" },
            { type: "INPUT", name: "email_input", placeholder: "Enter email" },
            { type: "BUTTON", name: "submit_btn", label: "Sign Up" },
            { type: "COMPONENT", name: "error_banner", state: "hidden" }
          ]
        };
        
        const userInstruction = command.replace(detectedFigmaUrl, '').trim();
        const generated = await generateStoryFromFigmaData(mockFigmaNodeData, userInstruction || "Standard extraction");
        
        onUpdate({
          ...story,
          ...generated,
          figmaUrl: detectedFigmaUrl,
          versions: createSnapshot('Figma AI Bridge', generated)
        });
      } else {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analyze and update this user story. 
          Prompt: "${command}"
          Title: ${story.title}
          Current Description: ${story.description}
          Return JSON matching the schema.`,
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
        const updatedData = JSON.parse(response.text || '{}');
        onUpdate({ ...story, ...updatedData, versions: createSnapshot('AI Architect', updatedData) });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [chatInput]);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      {/* Dynamic Workspace Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4 flex-1">
          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-400 tracking-tighter shrink-0 uppercase">{story.id}</span>
          <input 
            type="text"
            value={story.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className="text-base font-bold bg-transparent border-none outline-none focus:ring-0 p-0 dark:text-white w-full max-w-md"
            placeholder="Name your story..."
          />
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={story.status}
            onChange={(e) => handleFieldChange('status', e.target.value as any)}
            className="bg-primary-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-none outline-none cursor-pointer shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
          >
            <option value="Draft">Draft</option>
            <option value="In Progress">Progress</option>
            <option value="Ready">Ready</option>
            <option value="Completed">Shipped</option>
          </select>
        </div>
      </div>

      {/* Specification Content Canvas */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-12 py-12 no-scrollbar scroll-smooth"
      >
        <div className="max-w-3xl mx-auto space-y-16 pb-80">
          
          {/* Metadata & Figma Context */}
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Design Reference</label>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
                  <Icons.Figma />
                  <input 
                    type="text"
                    value={story.figmaUrl || ''}
                    onChange={(e) => handleFieldChange('figmaUrl', e.target.value)}
                    placeholder="Pasted from Smart Bar..."
                    className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-xs dark:text-slate-200"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Related Docs</label>
                <div className="flex flex-wrap gap-2">
                  {(story.relationships || []).map(rel => (
                    <div key={rel.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm text-[10px] font-bold">
                      <span className="text-primary-500 uppercase tracking-tighter">{rel.type}</span>
                      <button onClick={() => handleRemoveRelationship(rel.id)} className="hover:text-rose-500 ml-1"><Icons.Plus className="w-3 h-3 rotate-45" /></button>
                    </div>
                  ))}
                  <button className="px-3 py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400 hover:text-primary-500 transition-colors">+ Link Story</button>
                </div>
              </div>
            </div>
          </section>

          {/* Core Narrative */}
          <section className="space-y-6">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">User Narrative</label>
            <textarea 
              value={story.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className="w-full bg-transparent border-none outline-none focus:ring-0 text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-100 placeholder-slate-100 dark:placeholder-slate-900 min-h-[160px] resize-none leading-[1.3] animate-in slide-in-from-left-2 duration-700"
              placeholder="As a user, I want to..."
            />
          </section>

          {/* Detailed Criteria */}
          <section className="space-y-10">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Acceptance Criteria</label>
              <button onClick={() => handleFieldChange('acceptanceCriteria', [...story.acceptanceCriteria, ''])} className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-400 transition-colors">+ Add Criterion</button>
            </div>
            <div className="space-y-2">
              {story.acceptanceCriteria.map((ac, idx) => (
                <div key={idx} className="flex gap-6 group items-start py-4 border-b border-slate-50 dark:border-slate-800/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 px-4 rounded-2xl transition-all">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 mt-0.5 shrink-0 group-hover:bg-primary-500 group-hover:text-white transition-all">{idx + 1}</div>
                  <input 
                    type="text" 
                    value={ac}
                    onChange={(e) => handleACChange(idx, e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-base font-medium dark:text-slate-300 p-0"
                    placeholder="Functional requirement..."
                  />
                  <button onClick={() => handleFieldChange('acceptanceCriteria', story.acceptanceCriteria.filter((_, i) => i !== idx))} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"><Icons.Trash className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </section>

          {/* Logic & Error Flows */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6">
            <div className="space-y-5">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-primary-500 shadow-sm shadow-primary-500/50"></div> Happy Flow
               </label>
               <textarea 
                 value={story.happyPath}
                 onChange={(e) => handleFieldChange('happyPath', e.target.value)}
                 className="w-full bg-slate-50/50 dark:bg-slate-900/30 border-none rounded-[28px] p-8 text-sm font-medium dark:text-slate-400 leading-relaxed min-h-[160px] focus:ring-2 focus:ring-primary-500/10 transition-all shadow-sm"
                 placeholder="Step-by-step success flow..."
               />
            </div>
            <div className="space-y-5">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></div> Error Scenarios
               </label>
               <textarea 
                 value={story.sadPath}
                 onChange={(e) => handleFieldChange('sadPath', e.target.value)}
                 className="w-full bg-slate-50/50 dark:bg-slate-900/30 border-none rounded-[28px] p-8 text-sm font-medium dark:text-slate-400 leading-relaxed min-h-[160px] focus:ring-2 focus:ring-rose-500/10 transition-all shadow-sm"
                 placeholder="Exceptions and edge cases..."
               />
            </div>
          </section>
        </div>
      </div>

      {/* SMART INPUT BAR: Optimized for Figma-to-Story Automation */}
      <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center pointer-events-none z-50">
        
        {/* Token Window Visualization */}
        {chatInput.length > 3 && (
          <div className="mb-4 px-4 py-1.5 bg-slate-950/80 backdrop-blur-2xl border border-slate-800 rounded-full flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
            <div className={`w-2 h-2 rounded-full ${detectedFigmaUrl ? 'bg-primary-400 shadow-[0_0_8px_#4B9131]' : 'bg-amber-400'} animate-pulse`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Estimated tokens: <span className={detectedFigmaUrl ? 'text-primary-400' : 'text-amber-400'}>{tokenEstimate.toFixed(1)}k</span>
            </span>
            {detectedFigmaUrl && (
              <div className="h-3 w-px bg-slate-800 mx-1"></div>
            )}
            {detectedFigmaUrl && (
              <span className="text-[9px] font-bold text-primary-500/80 uppercase tracking-tighter">Design Link Ingested</span>
            )}
          </div>
        )}

        <div className={`
          w-full max-w-2xl flex flex-col pointer-events-auto 
          transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) transform
          ${isFocused ? '-translate-y-2' : 'translate-y-0'}
          bg-white/90 dark:bg-slate-900/95 backdrop-blur-3xl 
          rounded-[32px] border border-slate-200/50 dark:border-slate-800/50
          shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]
          ${isChatLoading ? 'ring-2 ring-primary-500/40' : (isFocused ? 'ring-2 ring-primary-500/30' : 'ring-1 ring-slate-950/5')}
        `}>
          
          {/* Dynamic Action Bar (Appears on FIGMA URL detection) */}
          {detectedFigmaUrl && !isChatLoading && (
            <div className="px-5 py-3 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
               <div className="flex items-center gap-3">
                 <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-500 shadow-sm border border-primary-500/20">
                   <Icons.Figma />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase tracking-widest text-primary-500 leading-none">Design Detected</span>
                   <span className="text-[9px] text-slate-400 font-medium mt-0.5 max-w-[200px] truncate">{detectedFigmaUrl}</span>
                 </div>
               </div>
               <button 
                 onClick={handleSmartAction}
                 className="group flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-500/20 active:scale-95"
               >
                 <Icons.Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                 Generate Story
               </button>
            </div>
          )}

          <div className="flex items-end p-2.5 gap-2">
            <div className="flex items-center gap-1 mb-1">
              <button className="p-3 text-slate-400 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all group" title="Attach Design">
                <Icons.Plus className="w-5 h-5 group-active:rotate-90 transition-transform" />
              </button>
              <button className="p-3 text-slate-400 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all group" title="Logic Toolkit">
                <Icons.Tool className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            
            <div className="flex-1 mb-1.5">
              <textarea
                ref={textareaRef}
                rows={1}
                value={chatInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSmartAction();
                  }
                }}
                placeholder={placeholder}
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm py-2 px-3 dark:text-slate-200 resize-none no-scrollbar placeholder-slate-400/60 font-medium leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-2 mb-1 pr-1">
              <button className="p-3 text-slate-400 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all" title="Voice Notes">
                <Icons.Mic className="w-5 h-5" />
              </button>
              <button 
                disabled={!chatInput.trim() || isChatLoading}
                onClick={handleSmartAction}
                className={`p-4 rounded-2xl transition-all duration-300 transform ${
                  chatInput.trim() 
                    ? 'bg-primary-600 text-white shadow-2xl shadow-primary-500/40 scale-100 hover:scale-110 active:scale-95' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-300 scale-90 opacity-40 grayscale'
                } flex items-center justify-center`}
              >
                {isChatLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Icons.Send className={`w-5 h-5 transition-transform duration-500 ${chatInput.trim() ? 'translate-x-0.5 -rotate-12' : ''}`} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global AI Status Footer */}
      <div className="h-10 border-t border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white dark:bg-slate-950 z-20">
        <div className="flex items-center gap-8">
          <span className="flex items-center gap-2.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isChatLoading ? 'bg-amber-500 animate-pulse' : 'bg-primary-500 shadow-[0_0_8px_#4B9131]'}`}></div> 
            {isChatLoading ? 'Gemini Agent Parsing Design Layers...' : 'Design-to-Spec Session Active'}
          </span>
          <span className="opacity-40">{templates.find(t => t.id === selectedTemplateId)?.name} Narrative Schema</span>
        </div>
        <div className="flex items-center gap-6">
          <button className="hover:text-primary-500 transition-all">Audit Logs</button>
          <button className="hover:text-primary-500 transition-all">Export .MarkDown</button>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
    </div>
  );
};

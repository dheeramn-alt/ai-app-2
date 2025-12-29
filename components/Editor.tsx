
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Story, Template, StoryVersion, Epic, StoryRelationship, RelationshipType, User } from '../types.ts';
import { Icons } from '../constants.tsx';
import { analyzeFigmaDesign, generateStoryFromFigmaData } from '../services/gemini.ts';
import { GoogleGenAI, Type } from "@google/genai";

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
}

const STATUS_CONFIG = {
  'Draft': { color: 'bg-slate-500', hover: 'hover:bg-slate-600', ring: 'ring-slate-500/20' },
  'In Progress': { color: 'bg-primary-400', hover: 'hover:bg-primary-500', ring: 'ring-primary-400/20' },
  'Ready': { color: 'bg-primary-600', hover: 'hover:bg-primary-700', ring: 'ring-primary-600/20' },
  'Completed': { color: 'bg-amber-500', hover: 'hover:bg-amber-600', ring: 'ring-amber-500/20' }
};

export const Editor: React.FC<EditorProps> = ({ 
  story, 
  onUpdate, 
  onDelete, 
  onMoveStory,
  epics,
  templates,
  selectedTemplateId,
  currentUser,
  users
}) => {
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  const activeUsers = useMemo(() => {
    return users.filter(u => story.activeUserIds?.includes(u.id));
  }, [users, story.activeUserIds]);

  const isFollowing = useMemo(() => {
    return story.activeUserIds?.includes(currentUser.id) || false;
  }, [story.activeUserIds, currentUser.id]);

  const toggleFollow = () => {
    const currentActiveIds = story.activeUserIds || [];
    const newActiveIds = isFollowing 
      ? currentActiveIds.filter(id => id !== currentUser.id)
      : [...currentActiveIds, currentUser.id];
    handleFieldChange('activeUserIds', newActiveIds);
  };

  const figmaDetection = useMemo(() => {
    const figmaRegex = /https?:\/\/(?:www\.)?figma\.com\/(file|design|proto)\/([a-zA-Z0-9]+)(?:\/[^?#]*)?(?:\?(?:.*&)?node-id=([^&?#]+))?/;
    const match = chatInput.match(figmaRegex);
    if (match) {
      return {
        url: match[0],
        type: match[1], 
        fileKey: match[2],
        nodeId: match[3] ? decodeURIComponent(match[3]) : null
      };
    }
    return null;
  }, [chatInput]);

  const detectedFigmaUrl = figmaDetection?.url || null;

  const tokenEstimate = useMemo(() => {
    if (!chatInput) return 0;
    const base = chatInput.length * 0.12; 
    const designWeight = figmaDetection?.nodeId ? 32.4 : 48.7;
    return detectedFigmaUrl ? base + designWeight : base;
  }, [chatInput, detectedFigmaUrl, figmaDetection]);

  const displayedStory = useMemo(() => {
    if (previewVersionId && story.versions) {
      const version = story.versions.find(v => v.id === previewVersionId);
      if (version) {
        return {
          ...story,
          title: version.title,
          description: version.description,
          acceptanceCriteria: version.acceptanceCriteria,
          happyPath: version.happyPath,
          sadPath: version.sadPath
        };
      }
    }
    return story;
  }, [story, previewVersionId]);

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

  const handleRevert = (version: StoryVersion) => {
    onUpdate({
      ...story,
      title: version.title,
      description: version.description,
      acceptanceCriteria: version.acceptanceCriteria,
      happyPath: version.happyPath,
      sadPath: version.sadPath,
      versions: createSnapshot('Rollback to ' + new Date(version.timestamp).toLocaleTimeString())
    });
    setPreviewVersionId(null);
    setShowHistory(false);
  };

  const placeholder = useMemo(() => {
    if (detectedFigmaUrl) {
      return figmaDetection?.nodeId 
        ? "Frame detected. Instructions?" 
        : "File link detected. Which frame?";
    }
    if (!story.description) return "Start with a goal...";
    return "Refine requirements...";
  }, [detectedFigmaUrl, figmaDetection, story.description]);

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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      if (detectedFigmaUrl) {
        const mockFigmaNodeData = { file_key: figmaDetection?.fileKey, node_id: figmaDetection?.nodeId };
        const userInstruction = command.replace(detectedFigmaUrl, '').trim();
        const generated = await generateStoryFromFigmaData(mockFigmaNodeData, userInstruction || "Standard extraction");
        onUpdate({
          ...story,
          ...generated,
          figmaUrl: detectedFigmaUrl,
          versions: createSnapshot('Figma AI Bridge', generated)
        });
      } else {
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [chatInput]);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      {/* Workspace Header - Adjusted for Mobile */}
      <div className="h-12 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-400 tracking-tighter shrink-0 uppercase">{story.id}</span>
          <input 
            type="text"
            readOnly={!!previewVersionId}
            value={displayedStory.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className={`text-sm md:text-base font-bold bg-transparent border-none outline-none focus:ring-0 p-0 dark:text-white w-full max-w-[150px] sm:max-w-md truncate ${previewVersionId ? 'text-primary-500' : ''}`}
            placeholder="Story title..."
          />
        </div>
        
        <div className="flex items-center gap-2 md:gap-5 shrink-0">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-xl transition-all ${showHistory ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 shadow-inner' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Icons.History className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          <div className="h-4 md:h-6 w-px bg-slate-100 dark:bg-slate-800 hidden sm:block"></div>

          <div className="hidden lg:flex items-center gap-3">
             <div className="flex -space-x-2">
               {activeUsers.map(user => (
                 <div key={user.id} className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase shadow-sm">
                   {user.name.charAt(0)}
                 </div>
               ))}
             </div>
             <button 
               onClick={toggleFollow}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isFollowing ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
             >
               {isFollowing ? 'Following' : 'Follow'}
             </button>
          </div>

          <div className="relative" ref={statusRef}>
            <button
              disabled={!!previewVersionId}
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className={`flex items-center gap-1.5 md:gap-2.5 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-wider transition-all shadow-lg text-white ${STATUS_CONFIG[story.status as keyof typeof STATUS_CONFIG].color}`}
            >
              <span>{story.status}</span>
              <Icons.ChevronDown className={`w-3 md:w-3.5 h-3 md:h-3.5 transition-transform duration-300 ${isStatusOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStatusOpen && (
              <div className="absolute top-full right-0 mt-2 w-40 md:w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50 overflow-hidden">
                {Object.keys(STATUS_CONFIG).map((status) => (
                  <button
                    key={status}
                    onClick={() => { handleFieldChange('status', status); setIsStatusOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold uppercase tracking-widest ${story.status === status ? 'bg-primary-50/50 dark:bg-primary-900/20 text-primary-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    {status}
                    {story.status === status && <Icons.Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 md:px-12 py-8 md:py-12 no-scrollbar scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-10 md:space-y-16 pb-60">
            {/* Metadata Section - Responsive Stack */}
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-6 md:gap-4">
                <div className="flex-1 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Design Reference</label>
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <Icons.Figma />
                    <input 
                      type="text" 
                      readOnly={!!previewVersionId}
                      value={displayedStory.figmaUrl || ''}
                      onChange={(e) => handleFieldChange('figmaUrl', e.target.value)}
                      placeholder="Figma Link..."
                      className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-xs dark:text-slate-200"
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Links</label>
                  <div className="flex flex-wrap gap-2">
                    {(displayedStory.relationships || []).map(rel => (
                      <div key={rel.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 shadow-sm text-[10px] font-bold">
                        <span className="text-primary-500">{rel.type}</span>
                        {!previewVersionId && <button onClick={() => handleRemoveRelationship(rel.id)}><Icons.Plus className="w-3 h-3 rotate-45" /></button>}
                      </div>
                    ))}
                    {!previewVersionId && <button className="px-3 py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400">+ Add</button>}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 md:space-y-6">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">User Narrative</label>
              <textarea 
                readOnly={!!previewVersionId}
                value={displayedStory.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-xl md:text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-100 min-h-[140px] resize-none leading-[1.3] placeholder-slate-200"
                placeholder="As a user..."
              />
            </section>

            <section className="space-y-8 md:space-y-10">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 md:pb-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Acceptance Criteria</label>
                {!previewVersionId && <button onClick={() => handleFieldChange('acceptanceCriteria', [...displayedStory.acceptanceCriteria, ''])} className="text-[10px] font-black uppercase tracking-widest text-primary-600">+ Add</button>}
              </div>
              <div className="space-y-1 md:space-y-2">
                {displayedStory.acceptanceCriteria.map((ac, idx) => (
                  <div key={idx} className="flex gap-4 md:gap-6 group items-start py-3 md:py-4 border-b border-slate-50 dark:border-slate-800/30 px-2 md:px-4 rounded-2xl transition-all">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] md:text-[10px] font-black text-slate-400 mt-0.5 shrink-0 group-hover:bg-primary-500 group-hover:text-white transition-all">{idx + 1}</div>
                    <input 
                      type="text" 
                      readOnly={!!previewVersionId}
                      value={ac}
                      onChange={(e) => handleACChange(idx, e.target.value)}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm md:text-base font-medium dark:text-slate-300 p-0"
                      placeholder="Requirement..."
                    />
                    {!previewVersionId && <button onClick={() => handleFieldChange('acceptanceCriteria', displayedStory.acceptanceCriteria.filter((_, i) => i !== idx))} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500"><Icons.Trash className="w-4 h-4" /></button>}
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 pt-4">
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-primary-500"></div> Happy Path
                 </label>
                 <textarea 
                   readOnly={!!previewVersionId}
                   value={displayedStory.happyPath}
                   onChange={(e) => handleFieldChange('happyPath', e.target.value)}
                   className="w-full bg-slate-50/50 dark:bg-slate-900/30 border-none rounded-2xl md:rounded-[28px] p-6 md:p-8 text-xs md:text-sm font-medium leading-relaxed min-h-[140px] focus:ring-1 focus:ring-primary-500/10 shadow-sm"
                   placeholder="Success flow..."
                 />
              </div>
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-rose-500"></div> Error Flows
                 </label>
                 <textarea 
                   readOnly={!!previewVersionId}
                   value={displayedStory.sadPath}
                   onChange={(e) => handleFieldChange('sadPath', e.target.value)}
                   className="w-full bg-slate-50/50 dark:bg-slate-900/30 border-none rounded-2xl md:rounded-[28px] p-6 md:p-8 text-xs md:text-sm font-medium leading-relaxed min-h-[140px] focus:ring-1 focus:ring-rose-500/10 shadow-sm"
                   placeholder="Edge cases..."
                 />
              </div>
            </section>
          </div>
        </div>

        {/* History Sidebar - Responsive Overlay */}
        <div className={`
          fixed md:absolute top-0 right-0 h-full w-full sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l border-slate-100 dark:border-slate-800 z-50 md:z-40 transition-transform duration-500
          ${showHistory ? 'translate-x-0' : 'translate-x-full'}
          shadow-[-20px_0_50px_rgba(0,0,0,0.1)] flex flex-col
        `}>
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest">Audit Trail</h3>
            <button onClick={() => { setShowHistory(false); setPreviewVersionId(null); }} className="p-1.5 text-slate-400"><Icons.Plus className="w-5 h-5 rotate-45" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            <div onClick={() => setPreviewVersionId(null)} className={`p-4 rounded-2xl border cursor-pointer ${!previewVersionId ? 'bg-primary-50 border-primary-200' : 'border-transparent hover:bg-slate-50'}`}>
               <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white">Live Workspace</span>
            </div>
            {(story.versions || []).map((version) => (
                <div key={version.id} onClick={() => setPreviewVersionId(version.id)} className={`p-4 rounded-2xl border cursor-pointer ${previewVersionId === version.id ? 'bg-primary-50 border-primary-200' : 'border-transparent hover:bg-slate-50'}`}>
                  <div className="flex justify-between items-start mb-1"><span className="text-[10px] text-slate-400 uppercase tracking-tighter">{new Date(version.timestamp).toLocaleDateString()}</span></div>
                  <h4 className="text-[11px] font-bold truncate mb-2">{version.title}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-500">{version.authorName}</span>
                    {previewVersionId === version.id && <button onClick={(e) => { e.stopPropagation(); handleRevert(version); }} className="p-1.5 bg-primary-600 text-white rounded-lg shadow-lg"><Icons.RotateCcw className="w-3 h-3" /></button>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Responsive Input Bar */}
      <div className={`fixed bottom-0 left-0 right-0 md:static p-4 md:p-8 flex flex-col items-center pointer-events-none z-50 transition-all ${previewVersionId ? 'opacity-30 blur-sm grayscale' : ''}`}>
        <div className={`mb-2 md:mb-4 px-3 md:px-4 py-1 bg-slate-950/80 backdrop-blur-2xl border border-slate-800 rounded-full flex items-center gap-2 md:gap-3 transition-all duration-500 ${chatInput.length > 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary-400 animate-pulse"></div>
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Tokens: {tokenEstimate.toFixed(1)}k</span>
        </div>

        <div className={`
          w-full max-w-2xl flex flex-col pointer-events-auto transition-all duration-500 transform
          ${isFocused ? 'md:-translate-y-2' : ''}
          bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-2xl md:rounded-[32px] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl overflow-hidden
        `}>
          {detectedFigmaUrl && !isChatLoading && (
            <div className="border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 py-2 md:px-5 md:py-3 h-auto md:h-14">
               <div className="flex items-center gap-3 truncate">
                 <div className="p-1 rounded-lg bg-primary-500/10 text-primary-500"><Icons.Figma /></div>
                 <span className="text-[9px] font-black uppercase text-primary-500 truncate">Design Detected</span>
               </div>
               <button onClick={handleSmartAction} className="px-3 md:px-5 py-1.5 md:py-2.5 bg-primary-600 text-white rounded-xl text-[8px] md:text-[10px] font-black uppercase shadow-xl shrink-0">Generate</button>
            </div>
          )}

          <div className="flex items-end p-2 md:p-3 gap-1 md:gap-2">
            <button className="p-2 md:p-3 text-slate-400 hover:text-primary-500 transition-all rounded-xl"><Icons.Plus className="w-4 h-4 md:w-5 md:h-5" /></button>
            <div className="flex-1 mb-1 overflow-hidden">
              <textarea
                ref={textareaRef}
                rows={1}
                value={chatInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSmartAction(); } }}
                placeholder={placeholder}
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs md:text-sm py-2 px-1 md:px-3 dark:text-slate-200 resize-none font-medium leading-relaxed"
              />
            </div>
            <button 
              disabled={!chatInput.trim() || isChatLoading}
              onClick={handleSmartAction}
              className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl transition-all ${chatInput.trim() ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'} flex items-center justify-center`}
            >
              {isChatLoading ? <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icons.Send className="w-4 h-4 md:w-5 md:h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

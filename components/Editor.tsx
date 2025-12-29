
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Story, Template, StoryVersion, Epic, StoryRelationship, RelationshipType, User } from '../types';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const allStories = epics.flatMap(e => e.stories);

  // Collaborative Presence Logic
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

  // Enhanced RegEx for robust Figma URL Detection
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

  // Dynamic Token Estimation for design-heavy contexts
  const tokenEstimate = useMemo(() => {
    if (!chatInput) return 0;
    const base = chatInput.length * 0.12; 
    const designWeight = figmaDetection?.nodeId ? 32.4 : 48.7;
    return detectedFigmaUrl ? base + designWeight : base;
  }, [chatInput, detectedFigmaUrl, figmaDetection]);

  // Versioning Logic
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

  // Dynamic placeholder based on context
  const placeholder = useMemo(() => {
    if (detectedFigmaUrl) {
      return figmaDetection?.nodeId 
        ? "Frame detected. Add instructions (e.g. 'Focus on accessibility')..." 
        : "File link detected. Which frame should I analyze?";
    }
    if (!story.description) return "Start with a goal: 'As a user I want to...'";
    return "Refine requirements or ask: 'Are there any logic gaps?'";
  }, [detectedFigmaUrl, figmaDetection, story.description]);

  const handleFieldChange = (field: keyof Story, value: any) => {
    if (previewVersionId) return; // Disable edits while previewing history
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
      if (detectedFigmaUrl) {
        const mockFigmaNodeData = {
          file_key: figmaDetection?.fileKey || "UNKNOWN",
          node_id: figmaDetection?.nodeId || "0:1",
          type: figmaDetection?.type,
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
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4 flex-1">
          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-400 tracking-tighter shrink-0 uppercase">{story.id}</span>
          <input 
            type="text"
            readOnly={!!previewVersionId}
            value={displayedStory.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className={`text-base font-bold bg-transparent border-none outline-none focus:ring-0 p-0 dark:text-white w-full max-w-md truncate ${previewVersionId ? 'text-primary-500' : ''}`}
            placeholder="Name your story..."
          />
        </div>
        
        <div className="flex items-center gap-5">
          {previewVersionId && (
            <div className="flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-800 rounded-full animate-pulse">
               <span className="text-[10px] font-black text-primary-700 dark:text-primary-300 uppercase tracking-widest">Preview Mode</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2.5 rounded-xl transition-all ${showHistory ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 shadow-inner' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              title="Version History"
            >
              <Icons.History className="w-5 h-5" />
            </button>
          </div>

          <div className="h-6 w-px bg-slate-100 dark:bg-slate-800"></div>

          {/* Collaborative Presence */}
          <div className="flex items-center gap-3">
             <div className="flex -space-x-2">
               {activeUsers.map(user => (
                 <div 
                   key={user.id} 
                   className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase shadow-sm relative group"
                   title={`${user.name} is working on this`}
                 >
                   {user.name.charAt(0)}
                   <div className="absolute inset-0 rounded-full border border-primary-500 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 </div>
               ))}
             </div>
             <button 
               onClick={toggleFollow}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                 isFollowing 
                   ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border border-primary-200 dark:border-primary-800 shadow-inner' 
                   : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary-500 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
               }`}
             >
               {isFollowing ? <Icons.User className="w-3.5 h-3.5" /> : <Icons.UserPlus className="w-3.5 h-3.5" />}
               {isFollowing ? 'Following' : 'Follow Story'}
             </button>
          </div>

          <div className="h-6 w-px bg-slate-100 dark:bg-slate-800"></div>

          {/* MODERN CUSTOM STATUS DROPDOWN */}
          <div className="relative" ref={statusRef}>
            <button
              disabled={!!previewVersionId}
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className={`
                flex items-center gap-2.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg
                ${STATUS_CONFIG[story.status as keyof typeof STATUS_CONFIG].color} 
                ${STATUS_CONFIG[story.status as keyof typeof STATUS_CONFIG].hover}
                ${STATUS_CONFIG[story.status as keyof typeof STATUS_CONFIG].ring}
                text-white active:scale-95 border-none outline-none
                ${previewVersionId ? 'opacity-50 grayscale pointer-events-none' : ''}
              `}
            >
              <span>{story.status === 'In Progress' ? 'Progress' : story.status === 'Completed' ? 'Shipped' : story.status}</span>
              <Icons.ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isStatusOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStatusOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                {Object.keys(STATUS_CONFIG).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      handleFieldChange('status', status);
                      setIsStatusOpen(false);
                    }}
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors
                      ${story.status === status ? 'bg-primary-50/50 dark:bg-primary-900/20 text-primary-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].color}`}></div>
                      {status}
                    </div>
                    {story.status === status && <Icons.Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Specification Content Canvas */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-6 md:px-12 py-12 no-scrollbar scroll-smooth"
        >
          <div className="max-w-3xl mx-auto space-y-16 pb-80">
            
            {/* Metadata & Figma Context */}
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Design Reference</label>
                  <div className={`flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all ${previewVersionId ? 'opacity-70' : ''}`}>
                    <Icons.Figma />
                    <input 
                      type="text"
                      readOnly={!!previewVersionId}
                      value={displayedStory.figmaUrl || ''}
                      onChange={(e) => handleFieldChange('figmaUrl', e.target.value)}
                      placeholder="Pasted from Smart Bar..."
                      className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-xs dark:text-slate-200"
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Related Docs</label>
                  <div className="flex flex-wrap gap-2">
                    {(displayedStory.relationships || []).map(rel => (
                      <div key={rel.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm text-[10px] font-bold">
                        <span className="text-primary-500 uppercase tracking-tighter">{rel.type}</span>
                        {!previewVersionId && <button onClick={() => handleRemoveRelationship(rel.id)} className="hover:text-rose-500 ml-1"><Icons.Plus className="w-3 h-3 rotate-45" /></button>}
                      </div>
                    ))}
                    {!previewVersionId && <button className="px-3 py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400 hover:text-primary-500 transition-colors">+ Link Story</button>}
                  </div>
                </div>
              </div>
            </section>

            {/* Core Narrative */}
            <section className="space-y-6">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">User Narrative</label>
              <textarea 
                readOnly={!!previewVersionId}
                value={displayedStory.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className={`w-full bg-transparent border-none outline-none focus:ring-0 text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-100 placeholder-slate-100 dark:placeholder-slate-900 min-h-[160px] resize-none leading-[1.3] animate-in slide-in-from-left-2 duration-700 ${previewVersionId ? 'text-primary-900/70 dark:text-primary-100/70' : ''}`}
                placeholder="As a user, I want to..."
              />
            </section>

            {/* Detailed Criteria */}
            <section className="space-y-10">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Acceptance Criteria</label>
                {!previewVersionId && <button onClick={() => handleFieldChange('acceptanceCriteria', [...displayedStory.acceptanceCriteria, ''])} className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-400 transition-colors">+ Add Criterion</button>}
              </div>
              <div className="space-y-2">
                {displayedStory.acceptanceCriteria.map((ac, idx) => (
                  <div key={idx} className="flex gap-6 group items-start py-4 border-b border-slate-50 dark:border-slate-800/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 px-4 rounded-2xl transition-all">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 mt-0.5 shrink-0 group-hover:bg-primary-500 group-hover:text-white transition-all">{idx + 1}</div>
                    <input 
                      type="text" 
                      readOnly={!!previewVersionId}
                      value={ac}
                      onChange={(e) => handleACChange(idx, e.target.value)}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-base font-medium dark:text-slate-300 p-0"
                      placeholder="Functional requirement..."
                    />
                    {!previewVersionId && <button onClick={() => handleFieldChange('acceptanceCriteria', displayedStory.acceptanceCriteria.filter((_, i) => i !== idx))} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"><Icons.Trash className="w-4 h-4" /></button>}
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
                   readOnly={!!previewVersionId}
                   value={displayedStory.happyPath}
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
                   readOnly={!!previewVersionId}
                   value={displayedStory.sadPath}
                   onChange={(e) => handleFieldChange('sadPath', e.target.value)}
                   className="w-full bg-slate-50/50 dark:bg-slate-900/30 border-none rounded-[28px] p-8 text-sm font-medium dark:text-slate-400 leading-relaxed min-h-[160px] focus:ring-2 focus:ring-rose-500/10 transition-all shadow-sm"
                   placeholder="Exceptions and edge cases..."
                 />
              </div>
            </section>
          </div>
        </div>

        {/* VERSION HISTORY SIDEBAR */}
        <div className={`
          absolute top-0 right-0 h-full w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l border-slate-100 dark:border-slate-800 z-40 transition-transform duration-500 ease-in-out transform
          ${showHistory ? 'translate-x-0' : 'translate-x-full'}
          shadow-[-20px_0_50px_rgba(0,0,0,0.1)]
          flex flex-col
        `}>
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Audit Trail</h3>
            <button onClick={() => { setShowHistory(false); setPreviewVersionId(null); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
              <Icons.Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {/* Current State Indicator */}
            <div 
              onClick={() => setPreviewVersionId(null)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${!previewVersionId ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
               <div className="flex items-center gap-2 mb-1">
                 <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Live Workspace</span>
               </div>
               <p className="text-[10px] text-slate-400">Most recent local changes.</p>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2 my-4"></div>

            {(story.versions || []).length === 0 ? (
              <div className="py-12 text-center">
                <Icons.Clock className="w-8 h-8 text-slate-200 mx-auto mb-4" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No versions recorded</p>
              </div>
            ) : (
              story.versions.map((version) => (
                <div 
                  key={version.id}
                  onClick={() => setPreviewVersionId(version.id)}
                  className={`group p-4 rounded-2xl border transition-all cursor-pointer relative ${previewVersionId === version.id ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      {new Date(version.timestamp).toLocaleDateString()}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {new Date(version.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-[11px] font-bold dark:text-slate-100 truncate mb-2">{version.title}</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-black text-slate-500">
                        {version.authorName.charAt(0)}
                      </div>
                      <span className="text-[9px] font-bold text-slate-500">{version.authorName}</span>
                    </div>
                    
                    {previewVersionId === version.id && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRevert(version); }}
                        className="p-2 bg-primary-600 text-white rounded-lg shadow-lg shadow-primary-500/20 hover:scale-110 active:scale-95 transition-all"
                        title="Revert to this version"
                      >
                        <Icons.RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <p className="text-[9px] text-slate-400 leading-relaxed font-medium">
              Snapshots are automatically captured during AI analysis or major structure updates. Reverting creates a new snapshot of your current state.
            </p>
          </div>
        </div>
      </div>

      {/* SMART INPUT BAR: Refined Animations & High-End Visual Feedback */}
      <div className={`absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center pointer-events-none z-50 transition-all duration-500 ${previewVersionId ? 'opacity-30 scale-95 blur-sm grayscale pointer-events-none' : ''}`}>
        
        {/* Token Window Visualization - Smooth fade and slide */}
        <div className={`
          mb-4 px-4 py-1.5 bg-slate-950/80 backdrop-blur-2xl border border-slate-800 rounded-full flex items-center gap-3 
          transition-all duration-500 ease-out transform
          ${chatInput.length > 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
          shadow-[0_20px_50px_rgba(0,0,0,0.5)]
        `}>
          <div className={`w-2 h-2 rounded-full ${detectedFigmaUrl ? 'bg-primary-400 shadow-[0_0_10px_#4B9131]' : 'bg-amber-400'} animate-pulse`}></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Estimated tokens: <span className={detectedFigmaUrl ? 'text-primary-400' : 'text-amber-400'}>{tokenEstimate.toFixed(1)}k</span>
          </span>
          {detectedFigmaUrl && (
            <>
              <div className="h-3 w-px bg-slate-800 mx-1"></div>
              <span className="text-[9px] font-bold text-primary-500/80 uppercase tracking-tighter">
                {figmaDetection?.nodeId ? 'Target Frame Active' : 'Design Context Ingested'}
              </span>
            </>
          )}
        </div>

        <div className={`
          w-full max-w-2xl flex flex-col pointer-events-auto 
          transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) transform
          ${isFocused ? '-translate-y-4' : 'translate-y-0'}
          bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl 
          rounded-[32px] border border-slate-200/50 dark:border-slate-800/50
          ${isFocused ? 'shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)] ring-2 ring-primary-500/30' : 'shadow-[0_32px_80px_-16px_rgba(0,0,0,0.4)] ring-1 ring-slate-950/5'}
          ${isChatLoading ? 'ring-2 ring-primary-500/60' : ''}
          overflow-hidden
        `}>
          
          {/* Dynamic Action Bar (FIGMA URL DETECTION CHIP) */}
          <div className={`
            border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-5
            transition-all duration-500 ease-in-out
            ${detectedFigmaUrl && !isChatLoading ? 'h-14 opacity-100' : 'h-0 opacity-0'}
          `}>
             <div className="flex items-center gap-3">
               <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-500 shadow-sm border border-primary-500/20">
                 <Icons.Figma />
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-widest text-primary-500 leading-none">
                   {figmaDetection?.type === 'proto' ? 'Prototype' : 'Design'} Link Found
                 </span>
                 <span className="text-[9px] text-slate-400 font-medium mt-0.5 max-w-[240px] truncate">
                   {figmaDetection?.nodeId ? `Direct Node Access: ${figmaDetection.nodeId}` : figmaDetection?.fileKey}
                 </span>
               </div>
             </div>
             <button 
               onClick={handleSmartAction}
               className="group flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-500/20 active:scale-90"
             >
               <Icons.Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
               Generate Story
             </button>
          </div>

          <div className="flex items-end p-2.5 gap-2">
            <div className="flex items-center gap-1 mb-1">
              <button className="p-3 text-slate-400 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all group active:scale-75" title="Attach Design">
                <Icons.Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              </button>
              <button className="p-3 text-slate-400 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all group active:scale-75" title="Logic Toolkit">
                <Icons.Tool className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            
            <div className="flex-1 mb-1.5 overflow-hidden">
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
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm py-2 px-3 dark:text-slate-200 resize-none no-scrollbar placeholder-slate-400/60 font-medium leading-relaxed transition-all"
              />
            </div>

            <div className="flex items-center gap-1 mb-1 pr-1">
              <button className="p-3 text-slate-400 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-75" title="Voice Notes">
                <Icons.Mic className="w-5 h-5" />
              </button>
              <button 
                disabled={!chatInput.trim() || isChatLoading}
                onClick={handleSmartAction}
                className={`p-4 rounded-2xl transition-all duration-300 transform ${
                  chatInput.trim() 
                    ? 'bg-primary-600 text-white shadow-[0_10px_30px_rgba(75,145,49,0.4)] scale-100 hover:scale-105 active:scale-90' 
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
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isChatLoading ? 'bg-amber-500 animate-pulse' : 'bg-primary-500 shadow-[0_0_8px_#4B9131]'}`}></div> 
            {isChatLoading ? 'Gemini Neural Engine Parsing Layers...' : 'Semantic Mapping Live'}
          </span>
          <span className="opacity-40 hidden sm:inline">{templates.find(t => t.id === selectedTemplateId)?.name} Context Active</span>
        </div>
        <div className="flex items-center gap-6">
          <button className="hover:text-primary-500 transition-all">Audit Logs</button>
          <button className="hover:text-primary-500 transition-all">Export Specs</button>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
    </div>
  );
};

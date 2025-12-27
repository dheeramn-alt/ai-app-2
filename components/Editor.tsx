import React, { useState, useRef } from 'react';
import { Story, Template, StoryVersion } from '../types';
import { Icons } from '../constants';
import { analyzeFigmaDesign, rewriteSection } from '../services/gemini';

interface EditorProps {
  story: Story;
  onUpdate: (updatedStory: Story) => void;
  onDelete: (storyId: string) => void;
  templates: Template[];
  selectedTemplateId?: string;
}

export const Editor: React.FC<EditorProps> = ({ 
  story, 
  onUpdate, 
  onDelete, 
  templates,
  selectedTemplateId 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedText, setSelectedText] = useState<{ text: string, field: keyof Story } | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (field: keyof Story, value: any) => {
    onUpdate({ ...story, [field]: value });
  };

  const createSnapshot = (author: string = 'You', customStory?: Partial<Story>) => {
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

  const generateContent = async () => {
    if (!story.figmaScreenshot) {
      alert("Please upload or paste a Figma screenshot first.");
      return;
    }
    setIsGenerating(true);
    try {
      const generated = await analyzeFigmaDesign(story.figmaScreenshot, story.title);
      const newVersions = createSnapshot('Gemini AI', {
        description: generated.description,
        acceptanceCriteria: generated.acceptanceCriteria,
        happyPath: generated.happyPath,
        sadPath: generated.sadPath,
      });
      onUpdate({
        ...story,
        description: generated.description,
        acceptanceCriteria: generated.acceptanceCriteria,
        happyPath: generated.happyPath,
        sadPath: generated.sadPath,
        status: 'Ready',
        versions: newVersions
      });
    } catch (err) {
      alert("Failed to generate content.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRewrite = async (style: 'technical' | 'concise' | 'descriptive') => {
    setIsRewriting(true);
    try {
      const textToRewrite = story.description;
      const rewritten = await rewriteSection(textToRewrite, style);
      handleFieldChange('description', rewritten);
    } catch (err) {
      alert("Rewrite failed.");
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#020617] overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Editor Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">{story.id}</div>
          <input 
            type="text"
            value={story.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className="text-lg font-bold bg-transparent border-none outline-none focus:ring-0 p-0 dark:text-white"
            placeholder="Story Title"
          />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => createSnapshot()}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <Icons.Save className="w-4 h-4" />
            Snapshot
          </button>
          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider text-slate-500">
            {story.status}
          </div>
          <button onClick={() => onDelete(story.id)} className="p-2 text-slate-400 hover:text-red-500">
            <Icons.Trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-[#020617] px-8 py-8 no-scrollbar">
        <div className="max-w-4xl mx-auto space-y-10">
          
          {/* Visual Ingestion Section */}
          <div className={`relative border-2 border-dashed rounded-[32px] p-12 transition-all flex flex-col items-center justify-center min-h-[300px] ${story.figmaScreenshot ? 'border-transparent bg-slate-50 dark:bg-slate-900/40' : 'border-slate-200 dark:border-slate-800 bg-transparent'}`}>
            {!story.figmaScreenshot ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6">
                  <Icons.Figma />
                </div>
                <h3 className="text-xl font-bold dark:text-white">Visual Ingestion</h3>
                <p className="text-sm text-slate-400 max-w-[240px] mx-auto">Drop a Figma screenshot to enable AI documentation generation.</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-3 bg-[#1e293b] dark:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm hover:scale-105 transition-all mt-4"
                >
                  Select File
                </button>
              </div>
            ) : (
              <div className="relative group w-full">
                <img src={story.figmaScreenshot} alt="Figma Context" className="w-full h-auto rounded-2xl border border-slate-100 dark:border-slate-800" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-2xl pointer-events-none"></div>
                <div className="absolute bottom-6 right-6 flex gap-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-xl text-xs font-bold shadow-lg"
                  >
                    Change
                  </button>
                  <button 
                    onClick={generateContent}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 text-sm font-bold"
                  >
                    {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icons.Sparkles className="w-4 h-4" />}
                    Generate Story
                  </button>
                </div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => handleFieldChange('figmaScreenshot', reader.result as string);
                  reader.readAsDataURL(file);
                }
              }} 
            />
          </div>

          {/* Core Narrative Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Narrative</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleRewrite('technical')}
                  disabled={isRewriting}
                  className="text-[10px] font-bold text-blue-500 hover:text-blue-600 disabled:opacity-50 flex items-center gap-1"
                >
                  <Icons.Sparkles className="w-3 h-3" /> Technical
                </button>
                <button 
                  onClick={() => handleRewrite('concise')}
                  disabled={isRewriting}
                  className="text-[10px] font-bold text-blue-500 hover:text-blue-600 disabled:opacity-50 flex items-center gap-1"
                >
                  <Icons.Sparkles className="w-3 h-3" /> Concise
                </button>
              </div>
            </div>
            <div className="relative group">
              <textarea 
                value={story.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="w-full p-8 bg-slate-50/30 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-[24px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all dark:text-slate-200 text-lg font-medium italic min-h-[120px] resize-none"
                placeholder="As a [role], I want to [action], so that [value]."
              />
              {isRewriting && (
                <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-[2px] rounded-[24px] flex items-center justify-center">
                  <div className="flex items-center gap-2 text-blue-500 font-bold">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-75"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-150"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Acceptance Criteria (Subtasks) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Requirements / AC</label>
              <button onClick={() => handleFieldChange('acceptanceCriteria', [...story.acceptanceCriteria, ''])} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                <Icons.Plus className="w-3 h-3" /> Add Requirement
              </button>
            </div>
            <div className="space-y-3">
              {story.acceptanceCriteria.map((ac, idx) => (
                <div key={idx} className="flex gap-4 group">
                  <div className="w-6 h-6 flex-shrink-0 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-[10px] font-black text-slate-400 mt-1">
                    {idx + 1}
                  </div>
                  <input 
                    type="text" 
                    value={ac}
                    onChange={(e) => handleACChange(idx, e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm dark:text-slate-300 p-1"
                    placeholder="Describe a verifiable criterion..."
                  />
                  <button 
                    onClick={() => handleFieldChange('acceptanceCriteria', story.acceptanceCriteria.filter((_, i) => i !== idx))}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-opacity"
                  >
                    <Icons.Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Context Bar */}
      <div className="h-10 border-t border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Sync Status: Optimized</span>
          <span>Tokens: {Math.floor(Math.random() * 200) + 50} available</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="hover:text-blue-500 transition-colors">Feedback</button>
          <button className="hover:text-blue-500 transition-colors">Documentation</button>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useRef, useEffect } from 'react';
import { Epic, Story } from '../types.ts';
import { Icons } from '../constants.tsx';
import { Link } from 'react-router-dom';

interface SidebarProps {
  epics: Epic[];
  activeStoryId: string | null;
  onSelectStory: (story: Story) => void;
  onAddEpic: () => void;
  onAddStory: (epicId: string) => void;
  onDeleteEpic: (epicId: string) => void;
  onDeleteStory: (storyId: string) => void;
  onToggleEpic: (epicId: string) => void;
  onRenameEpic: (epicId: string, newTitle: string) => void;
  onMoveStory: (storyId: string, targetEpicId: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  epics,
  activeStoryId,
  onSelectStory,
  onAddEpic,
  onAddStory,
  onToggleEpic,
  onDeleteEpic,
  onRenameEpic,
  isDarkMode,
  onToggleDarkMode
}) => {
  const [search, setSearch] = useState('');
  const [editingEpicId, setEditingEpicId] = useState<string | null>(null);
  const [tempEpicTitle, setTempEpicTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const filteredEpics = epics.filter(epic => 
    epic.title.toLowerCase().includes(search.toLowerCase()) ||
    epic.stories.some(s => s.title.toLowerCase().includes(search.toLowerCase()))
  );

  const handleStartRename = (e: React.MouseEvent, epic: Epic) => {
    e.stopPropagation();
    setEditingEpicId(epic.id);
    setTempEpicTitle(epic.title);
  };

  const handleFinishRename = (epicId: string) => {
    if (tempEpicTitle.trim()) {
      onRenameEpic(epicId, tempEpicTitle.trim());
    }
    setEditingEpicId(null);
  };

  const handleDeleteEpic = (e: React.MouseEvent, epicId: string) => {
    e.stopPropagation();
    if (confirm("Permanently delete this Epic and all its stories?")) {
      onDeleteEpic(epicId);
    }
  };

  return (
    <div className="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-[#020617] border-r border-slate-200 dark:border-slate-900 h-full overflow-hidden transition-all duration-300 shadow-[10px_0_30px_rgba(0,0,0,0.02)] dark:shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
      {/* Archive Header - Compact & Premium */}
      <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-900/50">
        <Link to="/" className="flex items-center gap-3 group">
          <Icons.ChevronLeft className="w-3.5 h-3.5 text-slate-300 dark:text-slate-800 group-hover:text-primary dark:group-hover:text-white transition-colors" />
          <div className="flex items-center gap-2">
            <Icons.Figma className="w-5 h-5" />
            <h2 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-800 dark:text-slate-200 transition-colors">Archive Index</h2>
          </div>
        </Link>
        <button 
          onClick={onAddEpic}
          className="p-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 dark:text-slate-700 hover:text-primary dark:hover:text-white transition-all active:scale-90 hover:border-primary/30 dark:hover:border-slate-600 shadow-sm"
        >
          <Icons.Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Compact Search */}
      <div className="p-4 px-5">
        <div className="relative group">
          <Icons.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 dark:text-slate-800 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search documentation..." 
            className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-bold focus:ring-4 focus:ring-primary/10 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-800 transition-all uppercase tracking-tight"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Index Tree */}
      <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-1 no-scrollbar">
        {filteredEpics.map(epic => (
          <div key={epic.id} className="space-y-1">
            <div 
              className={`flex items-center group px-3 py-2.5 rounded-xl cursor-pointer transition-all ${epic.isOpen ? 'bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900/20'}`}
              onClick={() => onToggleEpic(epic.id)}
            >
              <Icons.ChevronRight className={`w-3 h-3 transition-transform duration-300 ${epic.isOpen ? 'rotate-90 text-primary' : 'text-slate-200 dark:text-slate-800'}`} />
              
              {editingEpicId === epic.id ? (
                <input
                  ref={editInputRef}
                  autoFocus
                  className="flex-1 ml-3 bg-white dark:bg-slate-950 border border-primary/50 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-[0.05em] text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-primary/10 transition-colors"
                  value={tempEpicTitle}
                  onChange={(e) => setTempEpicTitle(e.target.value)}
                  onBlur={() => handleFinishRename(epic.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRename(epic.id);
                    if (e.key === 'Escape') setEditingEpicId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 ml-3 text-[10px] font-black uppercase tracking-[0.05em] truncate">{epic.title}</span>
              )}

              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all ml-2">
                <button 
                  onClick={(e) => handleStartRename(e, epic)}
                  title="Rename Epic"
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-700 hover:text-primary dark:hover:text-slate-200 transition-all shadow-sm"
                >
                  <Icons.Edit className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => handleDeleteEpic(e, epic.id)}
                  title="Delete Epic"
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-700 hover:text-rose-500 transition-all shadow-sm"
                >
                  <Icons.Trash className="w-3 h-3" />
                </button>
              </div>
            </div>

            {epic.isOpen && (
              <div className="ml-5 border-l-2 border-slate-100 dark:border-slate-900 pl-3 space-y-1.5 mt-1.5 transition-colors">
                {epic.stories.map(story => (
                  <div 
                    key={story.id}
                    className={`flex items-center group px-4 py-2.5 rounded-xl cursor-pointer transition-all relative
                      ${activeStoryId === story.id 
                        ? 'bg-primary/5 dark:bg-primary/10 border-2 border-primary/40 text-primary font-black shadow-[0_0_30px_rgba(75,145,49,0.08)] dark:shadow-[0_0_30px_rgba(75,145,49,0.15)] ring-1 ring-primary/20 scale-[1.02]' 
                        : 'text-slate-400 dark:text-slate-600 hover:text-primary dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40 border-2 border-transparent'
                      }`}
                    onClick={() => onSelectStory(story)}
                  >
                    <Icons.FileText className={`mr-3 w-3.5 h-3.5 ${activeStoryId === story.id ? 'text-primary' : 'text-slate-200 dark:text-slate-800 group-hover:text-primary/50 dark:group-hover:text-slate-600'}`} />
                    <span className="text-[11px] truncate tracking-tight flex-1">{story.title}</span>
                    
                    {activeStoryId === story.id && (
                      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full shadow-[0_0_10px_#4B9131]"></div>
                    )}
                  </div>
                ))}
                
                <button 
                  onClick={() => onAddStory(epic.id)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-[9px] font-bold text-slate-300 dark:text-slate-800 hover:text-primary transition-all border border-dashed border-transparent hover:border-primary/20 rounded-xl"
                >
                  <Icons.Plus className="w-3 h-3" />
                  <span className="uppercase tracking-widest">Add Story</span>
                </button>
                
                {epic.stories.length === 0 && (
                   <div className="text-[9px] text-slate-200 dark:text-slate-800 font-bold uppercase tracking-[0.2em] py-3 px-4 italic opacity-50">Empty Archive</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Footer with Theme Toggle */}
      <div className="p-4 bg-white dark:bg-[#020617]/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-900/60 flex items-center justify-between gap-3 shrink-0 transition-colors duration-300">
         <div className="flex items-center gap-2.5">
           <Icons.Undo className="w-3.5 h-3.5 text-slate-300 dark:text-slate-800" />
           <span className="text-[8px] font-black text-slate-400 dark:text-slate-800 uppercase tracking-[0.5em] hover:text-primary dark:hover:text-slate-600 cursor-pointer transition-colors">Context</span>
         </div>
         
         {/* Theme Toggle Button */}
         <button 
            onClick={onToggleDarkMode}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-700 hover:text-primary dark:hover:text-primary transition-all active:scale-90"
         >
           {isDarkMode ? (
             <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
           ) : (
             <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
           )}
         </button>
      </div>
    </div>
  );
};


import React, { useState, useRef } from 'react';
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
  onMoveStory,
  isDarkMode,
  onToggleDarkMode
}) => {
  const [search, setSearch] = useState('');
  const [editingEpicId, setEditingEpicId] = useState<string | null>(null);
  const [tempEpicTitle, setTempEpicTitle] = useState('');
  const [draggedStoryId, setDraggedStoryId] = useState<string | null>(null);
  const [dragOverEpicId, setDragOverEpicId] = useState<string | null>(null);
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

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, storyId: string) => {
    setDraggedStoryId(storyId);
    e.dataTransfer.setData('storyId', storyId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, epicId: string) => {
    e.preventDefault();
    setDragOverEpicId(epicId);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetEpicId: string) => {
    e.preventDefault();
    const storyId = e.dataTransfer.getData('storyId');
    if (storyId) {
      onMoveStory(storyId, targetEpicId);
    }
    setDraggedStoryId(null);
    setDragOverEpicId(null);
  };

  return (
    <div className="w-full md:w-80 flex-shrink-0 flex flex-col bg-white dark:bg-[#020617] md:border-r border-slate-200 dark:border-slate-900 h-full overflow-hidden transition-all duration-300">
      {/* Archive Header */}
      <div className="p-5 md:p-6 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <Icons.ChevronLeft className="w-4 h-4 text-slate-300 dark:text-slate-800 hidden md:block" />
          <div className="flex items-center gap-2">
            <Icons.Figma className="w-5 h-5 md:w-6 md:h-6" />
            <h2 className="font-black text-[12px] md:text-[14px] uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">Archive Index</h2>
          </div>
        </div>
        <button 
          onClick={onAddEpic}
          className="p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-400 hover:text-primary transition-all active:scale-95"
        >
          <Icons.Plus className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-5 md:px-6 mb-4">
        <input 
          type="text" 
          placeholder="Search Index" 
          className="w-full bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl py-2.5 md:py-3 px-4 md:px-5 text-[10px] md:text-[11px] font-bold outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-800 transition-all uppercase tracking-tight"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Index Tree */}
      <div className="flex-1 overflow-y-auto px-3 md:px-4 pb-10 space-y-1.5 no-scrollbar">
        {filteredEpics.map(epic => (
          <div 
            key={epic.id} 
            className={`space-y-1 transition-all rounded-2xl p-0.5 ${dragOverEpicId === epic.id ? 'bg-primary/5 ring-2 ring-primary/20' : ''}`}
            onDragOver={(e) => handleDragOver(e, epic.id)}
            onDrop={(e) => handleDrop(e, epic.id)}
            onDragLeave={() => setDragOverEpicId(null)}
          >
            <div 
              className={`flex items-center group px-3 py-2 rounded-xl cursor-pointer transition-all ${epic.isOpen ? 'bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-600'}`}
              onClick={() => onToggleEpic(epic.id)}
            >
              <Icons.ChevronLeft className={`w-3 h-3 transition-transform duration-300 ${epic.isOpen ? '-rotate-90' : ''} mr-2`} />
              
              {editingEpicId === epic.id ? (
                <input
                  ref={editInputRef}
                  autoFocus
                  className="flex-1 bg-white dark:bg-slate-950 border border-primary/50 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white outline-none"
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
                <span className="flex-1 text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] truncate">{epic.title}</span>
              )}
            </div>

            {epic.isOpen && (
              <div className="ml-5 space-y-1 mt-1 border-l border-slate-100 dark:border-slate-800/50 pl-2">
                {epic.stories.map(story => (
                  <div 
                    key={story.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, story.id)}
                    className={`flex items-center group px-3.5 py-2 rounded-xl md:rounded-2xl cursor-pointer transition-all relative border-2
                      ${activeStoryId === story.id 
                        ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 text-primary font-black shadow-lg shadow-primary/5' 
                        : 'text-slate-400 dark:text-slate-700 hover:text-slate-600 dark:hover:text-slate-300 border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/40'
                      } ${draggedStoryId === story.id ? 'opacity-30' : ''}`}
                    onClick={() => onSelectStory(story)}
                  >
                    {activeStoryId === story.id && (
                      <div className="absolute -left-[9.5px] top-1/2 -translate-y-1/2 w-[3px] h-4 md:h-5 bg-primary rounded-full"></div>
                    )}
                    <Icons.FileText className={`mr-2.5 w-3.5 h-3.5 md:w-4 md:h-4 ${activeStoryId === story.id ? 'text-primary' : 'text-slate-200 dark:text-slate-800'}`} />
                    <span className="text-[11px] md:text-[12px] truncate font-medium flex-1">{story.title}</span>
                  </div>
                ))}
                
                <button 
                  onClick={() => onAddStory(epic.id)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[9px] font-black text-slate-300 dark:text-slate-800 hover:text-primary transition-all uppercase tracking-widest border border-dashed border-transparent hover:border-primary/20 rounded-xl"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  <span>Draft Story</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Footer (Desktop Only) */}
      <div className="hidden md:flex p-6 border-t border-slate-100 dark:border-slate-900/60 items-center justify-between shrink-0">
         <div className="flex items-center gap-3">
           <Icons.Undo className="w-4 h-4 text-slate-300 dark:text-slate-800" />
           <span className="text-[9px] font-black text-slate-400 dark:text-slate-800 uppercase tracking-[0.5em] hover:text-slate-600 cursor-pointer transition-colors">Context</span>
         </div>
         <button 
            onClick={onToggleDarkMode}
            className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-700 hover:text-primary transition-all active:scale-90"
         >
           {isDarkMode ? (
             <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
           ) : (
             <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
           )}
         </button>
      </div>
    </div>
  );
};

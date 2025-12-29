
import React, { useState } from 'react';
import { Epic, Story } from '../types';
import { Icons } from '../constants';
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  epics,
  activeStoryId,
  onSelectStory,
  onAddEpic,
  onAddStory,
  onDeleteEpic,
  onDeleteStory,
  onToggleEpic,
  onRenameEpic,
  onMoveStory
}) => {
  const [search, setSearch] = useState('');
  const [editingEpicId, setEditingEpicId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [draggedStoryId, setDraggedStoryId] = useState<string | null>(null);
  const [dropTargetEpicId, setDropTargetEpicId] = useState<string | null>(null);

  const filteredEpics = epics.filter(epic => 
    epic.title.toLowerCase().includes(search.toLowerCase()) ||
    epic.stories.some(s => s.title.toLowerCase().includes(search.toLowerCase()))
  );

  const startRenaming = (e: React.MouseEvent, epic: Epic) => {
    e.stopPropagation();
    setEditingEpicId(epic.id);
    setEditingTitle(epic.title);
  };

  const handleRenameSubmit = (epicId: string) => {
    if (editingTitle.trim()) {
      onRenameEpic(epicId, editingTitle.trim());
    }
    setEditingEpicId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, epicId: string) => {
    if (e.key === 'Enter') handleRenameSubmit(epicId);
    if (e.key === 'Escape') setEditingEpicId(null);
  };

  const handleDragStart = (e: React.DragEvent, storyId: string) => {
    setDraggedStoryId(storyId);
    e.dataTransfer.setData('storyId', storyId);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedStoryId(null);
    setDropTargetEpicId(null);
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent, epicId: string) => {
    e.preventDefault();
    if (draggedStoryId) {
      setDropTargetEpicId(epicId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDropTargetEpicId(null);
  };

  const handleDrop = (e: React.DragEvent, targetEpicId: string) => {
    e.preventDefault();
    const storyId = e.dataTransfer.getData('storyId');
    if (storyId && targetEpicId) {
      onMoveStory(storyId, targetEpicId);
    }
    setDraggedStoryId(null);
    setDropTargetEpicId(null);
  };

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-r border-slate-100 bg-white dark:bg-slate-950 dark:border-slate-900 h-full overflow-hidden transition-colors duration-300">
      <div className="p-4 border-b border-slate-50 dark:border-slate-900 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <Icons.ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-primary-500" />
          </div>
          <h2 className="font-black text-sm tracking-tight flex items-center gap-2 dark:text-white">
            <Icons.Figma />
            <span>Archive Index</span>
          </h2>
        </Link>
        <button 
          onClick={onAddEpic}
          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-400 hover:text-primary-500 transition-all"
          title="New Epic Container"
        >
          <Icons.Plus />
        </button>
      </div>

      <div className="px-4 py-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <Icons.Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="Search epics..." 
            className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl py-2.5 pl-10 pr-4 text-xs focus:ring-2 focus:ring-primary-500/20 outline-none dark:text-slate-300 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 no-scrollbar">
        {filteredEpics.map(epic => (
          <div 
            key={epic.id} 
            className={`space-y-0.5 rounded-xl transition-all duration-300 ${
              dropTargetEpicId === epic.id 
                ? 'bg-primary-50/50 dark:bg-primary-900/10 ring-2 ring-primary-500/30' 
                : ''
            }`}
            onDragOver={(e) => handleDragOver(e, epic.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, epic.id)}
          >
            <div 
              className="flex items-center group px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors"
              onClick={() => onToggleEpic(epic.id)}
            >
              <Icons.ChevronRight className={`w-3 h-3 transition-transform duration-200 text-slate-300 ${epic.isOpen ? 'rotate-90' : ''}`} />
              <Icons.Folder className={`mx-2.5 w-4 h-4 ${epic.stories.length > 0 ? 'text-primary-500' : 'text-slate-300'}`} />
              
              {editingEpicId === epic.id ? (
                <input
                  autoFocus
                  className="flex-1 text-xs font-bold bg-white dark:bg-slate-800 border border-primary-500 rounded px-1.5 py-0.5 outline-none dark:text-white"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleRenameSubmit(epic.id)}
                  onKeyDown={(e) => handleRenameKeyDown(e, epic.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 text-xs font-bold truncate dark:text-slate-300">{epic.title}</span>
              )}

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => startRenaming(e, epic)}
                  className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-md text-slate-400 shadow-sm transition-all"
                >
                  <Icons.Edit className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddStory(epic.id);
                  }}
                  className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-md text-slate-400 shadow-sm transition-all"
                >
                  <Icons.Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {epic.isOpen && (
              <div className="ml-6 border-l border-slate-100 dark:border-slate-900 pl-2 space-y-0.5 mt-1 animate-in slide-in-from-left-2 duration-300">
                {epic.stories.map(story => (
                  <div 
                    key={story.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, story.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center group px-4 py-2 rounded-xl cursor-grab active:cursor-grabbing text-[11px] transition-all ${
                      activeStoryId === story.id 
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-black shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100'
                    } ${draggedStoryId === story.id ? 'opacity-40 grayscale' : ''}`}
                    onClick={() => onSelectStory(story)}
                  >
                    <div className="flex items-center gap-2.5 flex-1 truncate">
                      <Icons.FileText className={`mr-1 w-3.5 h-3.5 flex-shrink-0 ${activeStoryId === story.id ? 'text-primary-500' : 'text-slate-300'}`} />
                      <span className="truncate">{story.title}</span>
                    </div>
                  </div>
                ))}
                {epic.stories.length === 0 && (
                  <div className="text-[10px] text-slate-300 italic py-2.5 px-4">No stories added</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-900 flex items-center justify-center gap-2.5">
         <div className="w-4 h-4 rounded-full border border-dashed border-slate-400 flex items-center justify-center">
            <Icons.Plus className="w-2.5 h-2.5 text-slate-400" />
         </div>
         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Organize by Dragging</span>
      </div>
    </div>
  );
};


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
  onToggleEpic: (epicId: string) => void;
  onRenameEpic: (epicId: string, newTitle: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  epics,
  activeStoryId,
  onSelectStory,
  onAddEpic,
  onAddStory,
  onToggleEpic,
  onRenameEpic
}) => {
  const [search, setSearch] = useState('');
  const [editingEpicId, setEditingEpicId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

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

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-r border-slate-100 bg-white dark:bg-slate-900 dark:border-slate-800 h-full overflow-hidden transition-colors duration-300">
      <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Icons.ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
          </div>
          <h2 className="font-black text-sm tracking-tight flex items-center gap-2 dark:text-white">
            <Icons.Figma />
            <span>Project Index</span>
          </h2>
        </Link>
        <button 
          onClick={onAddEpic}
          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-all"
          title="New Epic"
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
            placeholder="Filter epics..." 
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-slate-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {filteredEpics.map(epic => (
          <div key={epic.id} className="space-y-0.5">
            <div 
              className="flex items-center group px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              onClick={() => onToggleEpic(epic.id)}
            >
              <Icons.ChevronRight className={`w-3 h-3 transition-transform duration-200 text-slate-300 ${epic.isOpen ? 'rotate-90' : ''}`} />
              <Icons.Folder className={`mx-2 w-4 h-4 ${epic.stories.length > 0 ? 'text-blue-500' : 'text-slate-300'}`} />
              
              {editingEpicId === epic.id ? (
                <input
                  autoFocus
                  className="flex-1 text-xs font-bold bg-white dark:bg-slate-700 border border-blue-500 rounded px-1 outline-none dark:text-white"
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
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-400 shadow-sm transition-all"
                  title="Rename Epic"
                >
                  <Icons.Edit className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddStory(epic.id);
                  }}
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-400 shadow-sm transition-all"
                  title="Add Story"
                >
                  <Icons.Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {epic.isOpen && (
              <div className="ml-6 border-l border-slate-100 dark:border-slate-800 pl-2 space-y-0.5 mt-1">
                {epic.stories.map(story => (
                  <div 
                    key={story.id}
                    className={`flex items-center px-4 py-2 rounded-xl cursor-pointer text-[11px] transition-all ${
                      activeStoryId === story.id 
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-black shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                    onClick={() => onSelectStory(story)}
                  >
                    <Icons.FileText className={`mr-2 w-3.5 h-3.5 ${activeStoryId === story.id ? 'text-blue-500' : 'text-slate-300'}`} />
                    <span className="truncate">{story.title}</span>
                  </div>
                ))}
                {epic.stories.length === 0 && (
                  <div className="text-[10px] text-slate-300 italic py-2 px-4">Empty epic</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

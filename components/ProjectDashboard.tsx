
import React, { useState } from 'react';
import { Project, Template } from '../types.ts';
import { Icons } from '../constants.tsx';
import { useNavigate } from 'react-router-dom';
import { summarizeProject } from '../services/gemini.ts';

interface ProjectDashboardProps {
  projects: Project[];
  templates: Template[];
  defaultTemplateId: string;
  onAddProject: (data: { title: string; description: string; templateId: string }) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ 
  projects, 
  templates,
  defaultTemplateId,
  onAddProject, 
  onDeleteProject 
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    title: '',
    description: '',
    templateId: defaultTemplateId
  });

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSummarize = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (summaries[project.id]) return;
    setLoadingSummaries(prev => ({ ...prev, [project.id]: true }));
    try {
      const summary = await summarizeProject(project);
      setSummaries(prev => ({ ...prev, [project.id]: summary }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [project.id]: false }));
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectData.title.trim()) return;
    onAddProject(newProjectData);
    setIsModalOpen(false);
    setNewProjectData({ title: '', description: '', templateId: defaultTemplateId });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Workspace</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 md:mt-3 text-lg md:text-xl font-medium">Design to Documentation bridge.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-2xl md:rounded-[24px] font-bold shadow-2xl hover:scale-105 transition-all"
          >
            <Icons.Plus className="w-5 h-5 md:w-6 md:h-6" />
            New Project
          </button>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500">
            <Icons.Search className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <input 
            type="text" 
            placeholder="Search projects..." 
            className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl md:rounded-[28px] py-4 md:py-5 pl-12 md:pl-14 pr-8 text-lg md:text-xl focus:ring-8 focus:ring-primary-500/5 outline-none transition-all dark:text-white shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 pb-16">
          {filteredProjects.map(project => (
            <div 
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col"
            >
              <div className="flex justify-between items-start mb-6 md:mb-10">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[24px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary-50 transition-all">
                  <Icons.Folder className="w-6 h-6 md:w-8 md:h-8 text-slate-400 group-hover:text-primary-500 transition-colors" />
                </div>
                <div className="flex gap-1 md:gap-2">
                  <button 
                    onClick={(e) => handleSummarize(e, project)}
                    className="p-2 md:p-3 text-slate-300 hover:text-primary-500 transition-all rounded-xl"
                  >
                    <Icons.Sparkles className={`w-5 h-5 md:w-6 md:h-6 ${loadingSummaries[project.id] ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }} className="p-2 md:p-3 text-slate-300 hover:text-rose-500 transition-all">
                    <Icons.Trash className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate">{project.title}</h3>
              <p className="mt-2 md:mt-4 text-slate-500 dark:text-slate-400 text-sm md:text-base line-clamp-2 h-10 md:h-12">{project.description}</p>
              {summaries[project.id] && (
                <div className="mt-4 md:mt-6 p-4 md:p-6 rounded-2xl md:rounded-[28px] bg-primary-50/50 dark:bg-primary-900/10 border border-primary-100/50 dark:border-primary-800/50 animate-in fade-in slide-in-from-top-4 duration-500">
                  <p className="text-[11px] md:text-sm font-medium text-primary-700 dark:text-primary-300 italic">"{summaries[project.id]}"</p>
                </div>
              )}
              <div className="mt-auto pt-6 md:pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <div className="flex -space-x-2 md:-space-x-3">
                   {[1,2].map(i => <div key={i} className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200"></div>)}
                </div>
                <span className="text-[10px] md:text-xs font-black uppercase text-slate-400">{project.epics.length} Epics</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[44px] shadow-3xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
            <form onSubmit={handleCreateSubmit} className="p-6 md:p-10 space-y-6 md:space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl md:text-3xl font-black dark:text-white">New Project</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400"><Icons.Plus className="w-6 h-6 md:w-8 md:h-8 rotate-45" /></button>
              </div>
              <div className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</label>
                  <input required type="text" value={newProjectData.title} onChange={(e) => setNewProjectData({...newProjectData, title: e.target.value})} className="w-full px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white transition-all text-base md:text-lg font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Context</label>
                  <textarea value={newProjectData.description} onChange={(e) => setNewProjectData({...newProjectData, description: e.target.value})} rows={3} className="w-full px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white transition-all text-sm md:text-base resize-none" />
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-xs font-black uppercase text-slate-400 hover:text-slate-600">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-primary-600 text-white rounded-xl md:rounded-[24px] text-xs font-black uppercase shadow-2xl transition-all">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

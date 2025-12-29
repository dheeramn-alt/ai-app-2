
import React, { useState } from 'react';
import { Project, Template } from '../types.ts';
import { Icons } from '../constants.tsx';
import { useNavigate } from 'react-router-dom';
import { summarizeProject } from '../services/gemini.ts';

interface ProjectDashboardProps {
  projects: Project[];
  templates: Template[];
  defaultTemplateId: string;
  onAddProject: (data: { title: string; description: string; defaultTemplateId: string }) => void;
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
    defaultTemplateId: defaultTemplateId
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
    setNewProjectData({ title: '', description: '', defaultTemplateId: defaultTemplateId });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-5 md:p-12 transition-colors duration-300 no-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Workspace</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-base md:text-xl font-medium">Design to Documentation bridge.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-[20px] md:rounded-[24px] font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all"
          >
            <Icons.Plus className="w-5 h-5 md:w-6 md:h-6" />
            New Project
          </button>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-primary transition-colors">
            <Icons.Search className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            placeholder="Search projects..." 
            className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl md:rounded-[28px] py-4 pl-14 pr-8 text-base md:text-xl focus:ring-8 focus:ring-primary/5 outline-none transition-all dark:text-white shadow-sm"
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
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[24px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/5 transition-all">
                  <Icons.Folder className="w-6 h-6 md:w-8 md:h-8 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
                <div className="flex gap-1 md:gap-2">
                  <button 
                    onClick={(e) => handleSummarize(e, project)}
                    className="p-2 text-slate-200 hover:text-primary transition-all rounded-xl"
                  >
                    <Icons.Sparkles className={`w-5 h-5 ${loadingSummaries[project.id] ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }} className="p-2 text-slate-200 hover:text-rose-500 transition-all">
                    <Icons.Trash className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{project.title}</h3>
              <p className="mt-2 md:mt-4 text-slate-500 dark:text-slate-400 text-sm md:text-base line-clamp-2 h-10 md:h-12 leading-relaxed">{project.description}</p>
              
              {summaries[project.id] && (
                <div className="mt-4 md:mt-6 p-4 md:p-6 rounded-2xl md:rounded-[28px] bg-primary/5 dark:bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-[10px] md:text-xs font-bold text-primary italic leading-relaxed">"{summaries[project.id]}"</p>
                </div>
              )}
              
              <div className="mt-auto pt-6 md:pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <div className="flex -space-x-2">
                   {[1,2,3].map(i => <div key={i} className="w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800"></div>)}
                </div>
                <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-300 tracking-widest">{project.epics.length} Epics</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-[32px] md:rounded-[44px] shadow-3xl border-t md:border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-10 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-2xl md:text-3xl font-black dark:text-white tracking-tighter uppercase">Initialize</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-500 transition-all"><Icons.Plus className="w-7 h-7 rotate-45" /></button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 md:space-y-8 no-scrollbar pb-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project Label</label>
                  <input required type="text" value={newProjectData.title} onChange={(e) => setNewProjectData({...newProjectData, title: e.target.value})} className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-primary/5 dark:text-white transition-all text-base md:text-lg font-bold" placeholder="Design System Revamp..." />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Context</label>
                  <textarea value={newProjectData.description} onChange={(e) => setNewProjectData({...newProjectData, description: e.target.value})} rows={2} className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-primary/5 dark:text-white transition-all text-sm md:text-base resize-none" placeholder="What are we architecting?" />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Default Blueprint</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewProjectData({...newProjectData, defaultTemplateId: t.id})}
                        className={`text-left p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                          newProjectData.defaultTemplateId === t.id 
                            ? 'bg-primary/5 border-primary shadow-lg ring-4 ring-primary/5' 
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${newProjectData.defaultTemplateId === t.id ? 'bg-primary text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-300'}`}>
                          <Icons.FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${newProjectData.defaultTemplateId === t.id ? 'text-primary' : 'text-slate-900 dark:text-slate-100'}`}>
                            {t.name}
                          </h4>
                          <p className="text-[9px] text-slate-400 mt-1 line-clamp-1 leading-tight">{t.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-4">
                <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase shadow-xl shadow-primary/20 hover:bg-primary-600 transition-all">Launch Project</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-4 text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-colors md:hidden">Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

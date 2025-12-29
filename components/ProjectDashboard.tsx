
import React, { useState } from 'react';
import { Project, Template } from '../types';
import { Icons } from '../constants';
import { useNavigate } from 'react-router-dom';
import { summarizeProject } from '../services/gemini';

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
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Workspace</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-xl font-medium">Documentation bridge for modern design teams.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-[24px] font-bold shadow-2xl shadow-primary-500/30 hover:scale-105 hover:bg-primary-500 active:scale-95 transition-all"
          >
            <Icons.Plus className="w-6 h-6" />
            New Project
          </button>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
            <Icons.Search className="w-6 h-6" />
          </div>
          <input 
            type="text" 
            placeholder="Search through projects..." 
            className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[28px] py-5 pl-14 pr-8 text-xl focus:ring-8 focus:ring-primary-500/5 outline-none transition-all dark:text-white shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-16">
          {filteredProjects.map(project => (
            <div 
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] p-8 shadow-sm hover:shadow-3xl hover:border-primary-500/30 hover:-translate-y-2 transition-all cursor-pointer relative flex flex-col"
            >
              <div className="flex justify-between items-start mb-10">
                <div className="w-16 h-16 rounded-[24px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary-50 dark:group-hover:bg-primary-900/40 transition-all duration-500">
                  <Icons.Folder className="w-8 h-8 text-slate-400 group-hover:text-primary-500 transition-colors" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => handleSummarize(e, project)}
                    className="p-3 text-slate-300 hover:text-primary-500 transition-all rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20"
                    title="Executive Summary"
                  >
                    <Icons.Sparkles className={`w-6 h-6 ${loadingSummaries[project.id] ? 'animate-spin' : ''}`} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                    className="p-3 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Icons.Trash className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{project.title}</h3>
              <p className="mt-4 text-slate-500 dark:text-slate-400 text-base line-clamp-2 leading-relaxed h-12">{project.description}</p>
              
              {summaries[project.id] && (
                <div className="mt-6 p-6 rounded-[28px] bg-primary-50/50 dark:bg-primary-900/10 border border-primary-100/50 dark:border-primary-800/50 animate-in fade-in slide-in-from-top-4 duration-500">
                  <p className="text-sm font-medium text-primary-700 dark:text-primary-300 leading-relaxed italic">
                    <Icons.Sparkles className="w-4 h-4 inline mr-2.5 mb-1" />
                    "{summaries[project.id]}"
                  </p>
                </div>
              )}

              <div className="mt-auto pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between mt-10">
                <div className="flex -space-x-3">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800"></div>
                   ))}
                </div>
                <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-primary-500 transition-colors">
                   {project.epics.length} Epics Defined
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[44px] shadow-3xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-500">
            <form onSubmit={handleCreateSubmit} className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black dark:text-white tracking-tighter">Init Project</h3>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"
                >
                  <Icons.Plus className="w-8 h-8 rotate-45" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Title</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={newProjectData.title}
                    onChange={(e) => setNewProjectData({...newProjectData, title: e.target.value})}
                    placeholder="e.g. Mobile App Redesign"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white transition-all text-lg font-medium"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Context</label>
                  <textarea 
                    value={newProjectData.description}
                    onChange={(e) => setNewProjectData({...newProjectData, description: e.target.value})}
                    placeholder="Primary goals and scope..."
                    rows={3}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white transition-all resize-none text-base"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Structure Preset</label>
                  <select 
                    value={newProjectData.templateId}
                    onChange={(e) => setNewProjectData({...newProjectData, templateId: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white transition-all appearance-none font-bold text-primary-600"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-5 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-5 bg-primary-600 text-white rounded-[24px] text-sm font-black shadow-2xl shadow-primary-600/30 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
                >
                  Confirm Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

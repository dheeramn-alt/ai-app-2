
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
  
  // Modal state
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
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Your Projects</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Manage and build documentation for your design files.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Icons.Plus className="w-5 h-5" />
            New Project
          </button>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
            <Icons.Search />
          </div>
          <input 
            type="text" 
            placeholder="Search projects..." 
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-lg focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
          {filteredProjects.map(project => (
            <div 
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-2xl hover:border-blue-500/30 hover:-translate-y-1 transition-all cursor-pointer relative flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/40 transition-colors">
                  <Icons.Folder className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => handleSummarize(e, project)}
                    className="p-2 text-slate-300 hover:text-blue-500 transition-all rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="AI Summary"
                  >
                    <Icons.Sparkles className={`w-5 h-5 ${loadingSummaries[project.id] ? 'animate-spin' : ''}`} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                    className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icons.Trash className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{project.title}</h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed h-10">{project.description}</p>
              
              {summaries[project.id] && (
                <div className="mt-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/50 animate-in fade-in slide-in-from-top-2">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 leading-relaxed italic">
                    <Icons.Sparkles className="w-3 h-3 inline mr-2 mb-0.5" />
                    "{summaries[project.id]}"
                  </p>
                </div>
              )}

              <div className="mt-auto pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between mt-8">
                <div className="flex -space-x-2">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800"></div>
                   ))}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">
                   {project.epics.length} Epics
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <form onSubmit={handleCreateSubmit} className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black dark:text-white tracking-tight">New Project</h3>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
                >
                  <Icons.Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project Title</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={newProjectData.title}
                    onChange={(e) => setNewProjectData({...newProjectData, title: e.target.value})}
                    placeholder="e.g. Design System v3"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 dark:text-white transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                  <textarea 
                    value={newProjectData.description}
                    onChange={(e) => setNewProjectData({...newProjectData, description: e.target.value})}
                    placeholder="What are we documenting?"
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 dark:text-white transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Default Template</label>
                  <select 
                    value={newProjectData.templateId}
                    onChange={(e) => setNewProjectData({...newProjectData, templateId: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 dark:text-white transition-all appearance-none"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

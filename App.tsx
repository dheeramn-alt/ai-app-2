
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Epic, Story, UserRole, User, Project } from './types';
import { INITIAL_PROJECTS, INITIAL_TEMPLATES, Icons } from './constants';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Settings } from './components/Settings';
import { ProjectDashboard } from './components/ProjectDashboard';
import { HashRouter, Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';

const DEFAULT_USER: User = {
  id: 'u1',
  name: 'Senior Developer',
  email: 'dev@company.com',
  role: UserRole.ADMIN
};

const ProjectWorkspace = ({ 
  state, 
  onUpdateProject 
}: { 
  state: AppState, 
  onUpdateProject: (p: Project) => void 
}) => {
  const { projectId } = useParams();
  const project = state.projects.find(p => p.id === projectId);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);

  // Simulated live presence: Current user + 1 random peer
  const activeCollaborators = useMemo(() => {
    const others = state.users.filter(u => u.id !== state.currentUser.id);
    return [state.currentUser, others[0]].filter(Boolean);
  }, [state.currentUser, state.users]);

  if (!project) return <div>Project not found</div>;

  const activeStory = project.epics.flatMap(e => e.stories).find(s => s.id === activeStoryId);

  const handleUpdateStory = (updatedStory: Story) => {
    const updatedEpics = project.epics.map(epic => {
      if (epic.id === updatedStory.epicId) {
        return {
          ...epic,
          stories: epic.stories.map(s => s.id === updatedStory.id ? updatedStory : s)
        };
      }
      return epic;
    });
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
  };

  const handleRenameEpic = (epicId: string, newTitle: string) => {
    const updatedEpics = project.epics.map(e => 
      e.id === epicId ? { ...e, title: newTitle } : e
    );
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
  };

  const handleAddStory = (epicId: string) => {
    const newStory: Story = {
      id: `STORY-${Math.floor(Math.random() * 10000)}`,
      epicId,
      title: 'Untitled Story',
      description: '',
      acceptanceCriteria: [''],
      happyPath: '',
      sadPath: '',
      status: 'Draft',
      versions: []
    };
    const updatedEpics = project.epics.map(e => 
      e.id === epicId ? { ...e, stories: [...e.stories, newStory], isOpen: true } : e
    );
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
    setActiveStoryId(newStory.id);
  };

  const handleToggleEpic = (epicId: string) => {
    const updatedEpics = project.epics.map(e => e.id === epicId ? { ...e, isOpen: !e.isOpen } : e);
    onUpdateProject({ ...project, epics: updatedEpics });
  };

  const handleAddEpic = () => {
    const newEpic: Epic = {
      id: `e-${Date.now()}`,
      title: 'New Epic',
      description: '',
      stories: [],
      isOpen: true
    };
    onUpdateProject({ ...project, epics: [...project.epics, newEpic], lastModified: Date.now() });
  };

  const handleDeleteStory = (storyId: string) => {
    if (!confirm("Are you sure?")) return;
    const updatedEpics = project.epics.map(epic => ({
      ...epic,
      stories: epic.stories.filter(s => s.id !== storyId)
    }));
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
    setActiveStoryId(null);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden transition-colors duration-300">
      {/* Project Header Bar */}
      <div className="h-16 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <input 
              type="text" 
              value={project.title}
              onChange={(e) => onUpdateProject({ ...project, title: e.target.value, lastModified: Date.now() })}
              className="text-lg font-black tracking-tight bg-transparent border-none outline-none focus:ring-0 dark:text-white p-0 h-6"
            />
            <div className="flex items-center gap-2 mt-0.5">
               <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live Session</span>
               </div>
               <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Last synced: Just now</span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 hidden md:block"></div>

          {/* Active Collaborators Indication */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex -space-x-2">
               {activeCollaborators.map((user, idx) => (
                 <div 
                  key={user.id} 
                  className="relative group cursor-help"
                  title={`${user.name} (${user.role})`}
                 >
                   <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] text-white font-black shadow-sm group-hover:scale-110 transition-transform">
                      {user.name.charAt(0)}
                   </div>
                   <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500"></div>
                 </div>
               ))}
               <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                 +4
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Template</span>
             <select 
               value={project.defaultTemplateId}
               onChange={(e) => onUpdateProject({ ...project, defaultTemplateId: e.target.value, lastModified: Date.now() })}
               className="text-xs font-bold bg-transparent border-none outline-none focus:ring-0 text-blue-600 cursor-pointer"
             >
               {state.templates.map(t => (
                 <option key={t.id} value={t.id}>{t.name}</option>
               ))}
             </select>
          </div>
          <button className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors">
            <Icons.Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <Sidebar 
          epics={project.epics}
          activeStoryId={activeStoryId}
          onSelectStory={(s) => setActiveStoryId(s.id)}
          onAddEpic={handleAddEpic}
          onAddStory={handleAddStory}
          onToggleEpic={handleToggleEpic}
          onRenameEpic={handleRenameEpic}
        />
        {activeStory ? (
          <Editor 
            story={activeStory}
            onUpdate={handleUpdateStory}
            onDelete={handleDeleteStory}
            templates={state.templates}
            selectedTemplateId={project.defaultTemplateId}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:bg-slate-950 transition-colors">
            <div className="p-10 text-center space-y-6 max-w-sm">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/50 border border-transparent dark:border-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Icons.FileText className="w-10 h-10 opacity-20" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ready to Document?</h3>
              <p className="text-sm dark:text-slate-400">Select an existing user story from the sidebar or create a new one to begin building your specifications.</p>
              <button 
                onClick={() => project.epics[0] && handleAddStory(project.epics[0].id)}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
              >
                Start New Story
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('figdoc_state');
    if (saved) return JSON.parse(saved);
    return {
      projects: INITIAL_PROJECTS,
      templates: INITIAL_TEMPLATES,
      defaultTemplateId: 't1',
      figmaConfig: { apiKey: '', connected: false },
      currentUser: DEFAULT_USER,
      users: [DEFAULT_USER, { id: 'u2', name: 'Product Manager', email: 'pm@company.com', role: UserRole.EDITOR }],
      isDarkMode: true 
    };
  });

  useEffect(() => {
    localStorage.setItem('figdoc_state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (state.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.isDarkMode]);

  const handleUpdateProject = (updatedProject: Project) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === updatedProject.id ? updatedProject : p)
    }));
  };

  // Fixed handleAddProject signature to match ProjectDashboard requirements
  const handleAddProject = (data: { title: string; description: string; templateId: string }) => {
    const newProject: Project = {
      id: `p-${Date.now()}`,
      title: data.title,
      description: data.description,
      createdAt: Date.now(),
      lastModified: Date.now(),
      defaultTemplateId: data.templateId,
      epics: [{ id: `e-${Date.now()}`, title: 'First Epic', description: 'Initial project epic', stories: [], isOpen: true }]
    };
    setState(prev => ({ ...prev, projects: [newProject, ...prev.projects] }));
    navigate(`/project/${newProject.id}`);
  };

  const handleDeleteProject = (projectId: string) => {
    if (!confirm("Delete this project and all its documentation?")) return;
    setState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== projectId)
    }));
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Global Sidebar Navigation */}
      <div className="w-16 flex-shrink-0 flex flex-col items-center py-6 border-r border-slate-100 dark:border-slate-800 gap-6 bg-white dark:bg-slate-900 z-50">
        <Link 
          to="/" 
          className={`p-3 rounded-2xl transition-all ${location.pathname === '/' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          title="Dashboard"
        >
          <Icons.Layout className="w-6 h-6" />
        </Link>
        <Link 
          to="/settings" 
          className={`p-3 rounded-2xl transition-all ${location.pathname === '/settings' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          title="Settings"
        >
          <Icons.Settings className="w-6 h-6" />
        </Link>
        <div className="mt-auto flex flex-col items-center gap-4">
          <button 
            onClick={() => setState(prev => ({ ...prev, isDarkMode: !prev.isDarkMode }))}
            className="p-3 rounded-2xl text-slate-400 hover:text-blue-500 transition-colors"
          >
            {state.isDarkMode ? <Icons.Sparkles className="w-5 h-5 text-amber-400" /> : <Icons.Clock className="w-5 h-5" />}
          </button>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-500/20">
            {state.currentUser.name.charAt(0)}
          </div>
        </div>
      </div>

      <main className="flex-1 flex overflow-hidden">
        <Routes>
          <Route path="/" element={
            <ProjectDashboard 
              projects={state.projects} 
              templates={state.templates}
              defaultTemplateId={state.defaultTemplateId}
              onAddProject={handleAddProject} 
              onDeleteProject={handleDeleteProject}
            />
          } />
          <Route path="/project/:projectId" element={
            <ProjectWorkspace state={state} onUpdateProject={handleUpdateProject} />
          } />
          <Route path="/settings" element={
            <Settings state={state} onUpdateState={(u) => setState(prev => ({ ...prev, ...u }))} />
          } />
        </Routes>
      </main>
    </div>
  );
};

const App = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;

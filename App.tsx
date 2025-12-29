
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Epic, Story, UserRole, User, Project } from './types.ts';
import { INITIAL_PROJECTS, INITIAL_TEMPLATES, Icons } from './constants.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Editor } from './components/Editor.tsx';
import { Settings } from './components/Settings.tsx';
import { ProjectDashboard } from './components/ProjectDashboard.tsx';
import { HashRouter, Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';

const DEFAULT_USER: User = {
  id: 'u1',
  name: 'Senior Developer',
  email: 'dev@company.com',
  role: UserRole.ADMIN
};

const ProjectWorkspace = ({ 
  state, 
  onUpdateProject,
  onUpdateState
}: { 
  state: AppState, 
  onUpdateProject: (p: Project) => void,
  onUpdateState: (updates: Partial<AppState>) => void
}) => {
  const { projectId } = useParams();
  const project = state.projects.find(p => p.id === projectId);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [isConnectingMCP, setIsConnectingMCP] = useState(false);
  const templateDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
        setIsTemplateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!project) return <div className="p-8 text-slate-500 font-medium text-xs">Project not found</div>;

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

  const handleAddStory = (epicId: string) => {
    const template = state.templates.find(t => t.id === project.defaultTemplateId) || state.templates[0];
    const newStory: Story = {
      id: `STORY-${Math.floor(Math.random() * 10000)}`,
      epicId,
      title: 'Untitled Story',
      description: template.structure.defaultNarrative || '',
      acceptanceCriteria: template.structure.defaultAC || [''],
      happyPath: template.structure.defaultHappyPath || '',
      sadPath: template.structure.defaultSadPath || '',
      status: 'Draft',
      versions: [],
      relationships: [],
      activeUserIds: []
    };
    const updatedEpics = project.epics.map(e => 
      e.id === epicId ? { ...e, stories: [...e.stories, newStory], isOpen: true } : e
    );
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
    setActiveStoryId(newStory.id);
  };

  const handleDeleteStory = (storyId: string) => {
    const updatedEpics = project.epics.map(epic => ({
      ...epic,
      stories: epic.stories.filter(s => s.id !== storyId)
    }));
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
    if (activeStoryId === storyId) setActiveStoryId(null);
  };

  const handleConnectMCP = () => {
    if (state.figmaConfig.connected) {
       onUpdateState({ figmaConfig: { ...state.figmaConfig, connected: false } });
       return;
    }
    setIsConnectingMCP(true);
    setTimeout(() => {
      onUpdateState({ figmaConfig: { ...state.figmaConfig, connected: true } });
      setIsConnectingMCP(false);
    }, 1200);
  };

  const handleRenameEpic = (epicId: string, newTitle: string) => {
    const updatedEpics = project.epics.map(e => 
      e.id === epicId ? { ...e, title: newTitle } : e
    );
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
  };

  const handleDeleteEpic = (epicId: string) => {
    const updatedEpics = project.epics.filter(e => e.id !== epicId);
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
  };

  const selectedTemplate = state.templates.find(t => t.id === project.defaultTemplateId) || state.templates[0];

  return (
    <div className="flex flex-col flex-1 overflow-hidden h-full">
      <header className="h-12 border-b border-slate-900 bg-slate-50 dark:bg-slate-950 px-6 flex items-center justify-between z-40 shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-5">
          <div className="flex flex-col">
            <h1 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight leading-none">{project.title}</h1>
            <div className="flex items-center gap-1.5 mt-1">
               <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className={`w-1 h-1 rounded-full ${state.figmaConfig.connected ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                  <span className={`text-[7px] font-black uppercase tracking-widest ${state.figmaConfig.connected ? 'text-primary' : 'text-slate-400 dark:text-slate-600'}`}>
                    {state.figmaConfig.connected ? 'Online' : 'Offline'}
                  </span>
               </div>
               <span className="text-[7px] text-slate-400 dark:text-slate-700 font-bold uppercase tracking-widest transition-colors">Synced: Just now</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={templateDropdownRef}>
            <button 
              onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all group"
            >
              <Icons.FileText className="w-3 h-3 text-slate-400 dark:text-slate-600 group-hover:text-primary" />
              <span className="text-[8px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{selectedTemplate.name}</span>
              <Icons.ChevronDown className={`w-2.5 h-2.5 text-slate-400 dark:text-slate-700 transition-transform ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isTemplateDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#020617] rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 py-1 z-50 overflow-hidden">
                {state.templates.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => {
                      onUpdateProject({ ...project, defaultTemplateId: t.id, lastModified: Date.now() });
                      setIsTemplateDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${project.defaultTemplateId === t.id ? 'text-primary' : 'text-slate-500 dark:text-slate-500'}`}
                  >
                    <Icons.FileText className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-tight">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={handleConnectMCP}
            disabled={isConnectingMCP}
            className={`p-1.5 rounded-lg transition-all relative ${state.figmaConfig.connected ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-700 hover:text-primary dark:hover:text-slate-300 border border-slate-200 dark:border-slate-800'}`}
          >
            {isConnectingMCP ? <div className="w-3 h-3 border border-primary/30 border-t-primary rounded-full animate-spin"></div> : <Icons.Tool className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          epics={project.epics}
          activeStoryId={activeStoryId}
          onSelectStory={(s) => setActiveStoryId(s.id)}
          onAddEpic={() => {
            const newEpic = { id: `e-${Date.now()}`, title: 'New Epic', description: '', stories: [], isOpen: true };
            onUpdateProject({ ...project, epics: [...project.epics, newEpic] });
          }}
          onAddStory={handleAddStory}
          onDeleteEpic={handleDeleteEpic}
          onDeleteStory={handleDeleteStory}
          onToggleEpic={(id) => onUpdateProject({ ...project, epics: project.epics.map(e => e.id === id ? { ...e, isOpen: !e.isOpen } : e) })}
          onRenameEpic={handleRenameEpic}
          onMoveStory={() => {}}
          isDarkMode={state.isDarkMode}
          onToggleDarkMode={() => onUpdateState({ isDarkMode: !state.isDarkMode })}
        />

        {activeStory ? (
          <Editor 
            story={activeStory}
            onUpdate={handleUpdateStory}
            onDelete={handleDeleteStory}
            onMoveStory={() => {}}
            epics={project.epics}
            templates={state.templates}
            currentUser={state.currentUser}
            users={state.users}
            figmaConfig={state.figmaConfig}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 text-center p-12 transition-colors duration-300">
            <Icons.FileText className="w-12 h-12 opacity-5 mb-4 text-slate-400" />
            <h2 className="text-base font-black text-slate-300 dark:text-slate-800 uppercase tracking-tighter transition-colors">Documentation Workspace</h2>
            <p className="max-w-xs text-[10px] font-medium mt-2 opacity-20 uppercase tracking-[0.3em] leading-relaxed text-slate-400 dark:text-slate-400">Select a leaf from the archive index to begin drafting.</p>
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
      users: [DEFAULT_USER],
      isDarkMode: true 
    };
  });

  // Sync dark mode state with HTML class
  useEffect(() => {
    if (state.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.isDarkMode]);

  useEffect(() => {
    localStorage.setItem('figdoc_state', JSON.stringify(state));
  }, [state]);

  const handleUpdateProject = (updatedProject: Project) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === updatedProject.id ? updatedProject : p)
    }));
  };

  const handleUpdateState = (updates: Partial<AppState>) => setState(prev => ({ ...prev, ...updates }));

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <nav className="w-14 flex-shrink-0 flex flex-col items-center py-6 border-r border-slate-200 dark:border-slate-900 bg-white dark:bg-[#020617] z-50 transition-colors duration-300">
        <Link to="/" className={`p-3 rounded-2xl transition-all mb-4 ${location.pathname === '/' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-300 dark:text-slate-800 hover:text-primary dark:hover:text-slate-400'}`}>
          <Icons.Layout className="w-5 h-5" />
        </Link>
        <Link to="/settings" className={`p-3 rounded-2xl transition-all ${location.pathname === '/settings' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-300 dark:text-slate-800 hover:text-primary dark:hover:text-slate-400'}`}>
          <Icons.Settings className="w-5 h-5" />
        </Link>
        <div className="mt-auto flex flex-col items-center gap-6">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-primary-800 flex items-center justify-center text-white font-black text-xs shadow-xl shadow-primary/10 border border-white/10">
            {state.currentUser.name.charAt(0)}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <Routes>
          <Route path="/" element={
            <ProjectDashboard 
              projects={state.projects} 
              templates={state.templates}
              defaultTemplateId={state.defaultTemplateId}
              onAddProject={(data) => {
                const newProject: Project = { 
                  id: `p-${Date.now()}`, 
                  title: data.title,
                  description: data.description,
                  defaultTemplateId: data.defaultTemplateId,
                  createdAt: Date.now(), 
                  lastModified: Date.now(), 
                  epics: [] 
                };
                setState(prev => ({ ...prev, projects: [newProject, ...prev.projects] }));
                navigate(`/project/${newProject.id}`);
              }} 
              onDeleteProject={(id) => setState(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }))}
            />
          } />
          <Route path="/project/:projectId" element={
            <ProjectWorkspace state={state} onUpdateProject={handleUpdateProject} onUpdateState={handleUpdateState} />
          } />
          <Route path="/settings" element={<Settings state={state} onUpdateState={handleUpdateState} />} />
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

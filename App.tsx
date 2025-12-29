
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Epic, Story, UserRole, User, Project, StoryVersion } from './types.ts';
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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
          stories: epic.stories.map(s => {
            if (s.id === updatedStory.id) {
              const hasMajorChange = s.description !== updatedStory.description || s.title !== updatedStory.title;
              const versions = s.versions || [];
              if (hasMajorChange) {
                const newVersion: StoryVersion = {
                  id: `v-${Date.now()}`,
                  timestamp: Date.now(),
                  title: s.title,
                  description: s.description,
                  acceptanceCriteria: s.acceptanceCriteria,
                  happyPath: s.happyPath,
                  sadPath: s.sadPath,
                  authorName: state.currentUser.name
                };
                return { ...updatedStory, versions: [newVersion, ...versions].slice(0, 15) };
              }
              return updatedStory;
            }
            return s;
          })
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
    if (window.innerWidth < 768) setIsMobileSidebarOpen(false);
  };

  const handleDeleteStory = (storyId: string) => {
    const updatedEpics = project.epics.map(epic => ({
      ...epic,
      stories: epic.stories.filter(s => s.id !== storyId)
    }));
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
    if (activeStoryId === storyId) setActiveStoryId(null);
  };

  const handleMoveStory = (storyId: string, targetEpicId: string) => {
    let storyToMove: Story | null = null;
    const epicsWithRemovedStory = project.epics.map(epic => {
      const storyIdx = epic.stories.findIndex(s => s.id === storyId);
      if (storyIdx !== -1) {
        storyToMove = { ...epic.stories[storyIdx], epicId: targetEpicId };
        return { ...epic, stories: epic.stories.filter(s => s.id !== storyId) };
      }
      return epic;
    });
    if (!storyToMove) return;
    const updatedEpics = epicsWithRemovedStory.map(epic => {
      if (epic.id === targetEpicId) {
        return { ...epic, stories: [...epic.stories, storyToMove!], isOpen: true };
      }
      return epic;
    });
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
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
      <header className="h-14 md:h-12 border-b border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between z-40 shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-3 md:gap-5">
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-2 text-slate-400 hover:text-primary transition-colors"
          >
            <Icons.Layout className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[11px] md:text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight leading-none truncate max-w-[120px] md:max-w-none">
              {project.title}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
               <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className={`w-1 h-1 rounded-full ${state.figmaConfig.connected ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                  <span className={`text-[6px] font-black uppercase tracking-widest ${state.figmaConfig.connected ? 'text-primary' : 'text-slate-400 dark:text-slate-600'}`}>
                    {state.figmaConfig.connected ? 'Online' : 'Offline'}
                  </span>
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative" ref={templateDropdownRef}>
            <button 
              onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/40 px-2 md:px-3 py-1.5 md:py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all group"
            >
              <Icons.FileText className="w-3 h-3 md:w-2.5 md:h-2.5 text-slate-400 dark:text-slate-600 group-hover:text-primary" />
              <span className="hidden xs:inline text-[7px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{selectedTemplate.name}</span>
              <Icons.ChevronDown className={`w-3 h-3 md:w-2 md:h-2 text-slate-400 dark:text-slate-700 transition-transform ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isTemplateDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#020617] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 overflow-hidden">
                {state.templates.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => {
                      onUpdateProject({ ...project, defaultTemplateId: t.id, lastModified: Date.now() });
                      setIsTemplateDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${project.defaultTemplateId === t.id ? 'text-primary' : 'text-slate-500 dark:text-slate-500'}`}
                  >
                    <Icons.FileText className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold uppercase tracking-tight">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={handleConnectMCP}
            disabled={isConnectingMCP}
            className={`p-1.5 md:p-1 rounded-lg transition-all relative ${state.figmaConfig.connected ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-700 hover:text-primary dark:hover:text-slate-300 border border-slate-200 dark:border-slate-800'}`}
          >
            {isConnectingMCP ? <div className="w-4 h-4 md:w-3 md:h-3 border border-primary/30 border-t-primary rounded-full animate-spin"></div> : <Icons.Tool className="w-4 h-4 md:w-3 md:h-3" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex">
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
            onMoveStory={handleMoveStory}
            isDarkMode={state.isDarkMode}
            onToggleDarkMode={() => onUpdateState({ isDarkMode: !state.isDarkMode })}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
            <div className="relative w-4/5 max-w-xs h-full animate-in slide-in-from-left duration-300">
              <Sidebar 
                epics={project.epics}
                activeStoryId={activeStoryId}
                onSelectStory={(s) => { setActiveStoryId(s.id); setIsMobileSidebarOpen(false); }}
                onAddEpic={() => {
                  const newEpic = { id: `e-${Date.now()}`, title: 'New Epic', description: '', stories: [], isOpen: true };
                  onUpdateProject({ ...project, epics: [...project.epics, newEpic] });
                }}
                onAddStory={handleAddStory}
                onDeleteEpic={handleDeleteEpic}
                onDeleteStory={handleDeleteStory}
                onToggleEpic={(id) => onUpdateProject({ ...project, epics: project.epics.map(e => e.id === id ? { ...e, isOpen: !e.isOpen } : e) })}
                onRenameEpic={handleRenameEpic}
                onMoveStory={handleMoveStory}
                isDarkMode={state.isDarkMode}
                onToggleDarkMode={() => onUpdateState({ isDarkMode: !state.isDarkMode })}
              />
            </div>
          </div>
        )}

        {activeStory ? (
          <Editor 
            story={activeStory}
            onUpdate={handleUpdateStory}
            onDelete={handleDeleteStory}
            onMoveStory={handleMoveStory}
            epics={project.epics}
            templates={state.templates}
            currentUser={state.currentUser}
            users={state.users}
            figmaConfig={state.figmaConfig}
            globalFontSize={state.globalEditorFontSize}
            onUpdateGlobalFontSize={(size) => onUpdateState({ globalEditorFontSize: size })}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 text-center p-8 transition-colors duration-300">
            <Icons.FileText className="w-12 h-12 md:w-16 md:h-16 opacity-5 mb-4 text-slate-400" />
            <h2 className="text-sm md:text-base font-black text-slate-300 dark:text-slate-800 uppercase tracking-tighter">Workspace Index</h2>
            <p className="max-w-xs text-[10px] font-medium mt-3 opacity-30 uppercase tracking-[0.3em] leading-relaxed text-slate-400">Select a story from the index to begin architecting.</p>
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
      isDarkMode: true,
      globalEditorFontSize: 48 // Default large size as per screenshot
    };
  });

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
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      {/* Sidebar Navigation - Desktop */}
      <nav className="hidden md:flex w-14 flex-shrink-0 flex-col items-center py-6 border-r border-slate-200 dark:border-slate-900 bg-white dark:bg-[#020617] z-50 transition-colors duration-300">
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

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden pb-[70px] md:pb-0">
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

      {/* Mobile Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-[70px] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-900 flex items-center justify-around px-6 z-[60] shadow-2xl transition-colors duration-300">
        <Link to="/" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/' ? 'text-primary' : 'text-slate-400'}`}>
          <Icons.Layout className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">Dash</span>
        </Link>
        <Link to="/settings" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/settings' ? 'text-primary' : 'text-slate-400'}`}>
          <Icons.Settings className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">Space</span>
        </Link>
        <div className="flex flex-col items-center gap-1">
          <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 font-black text-[10px] border border-slate-200 dark:border-slate-800">
            {state.currentUser.name.charAt(0)}
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Profile</span>
        </div>
      </nav>
    </div>
  );
};

const App = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;

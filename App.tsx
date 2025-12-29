
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppState, Epic, Story, UserRole, User, Project, StoryRelationship, Template } from './types.ts';
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
  onUpdateProject 
}: { 
  state: AppState, 
  onUpdateProject: (p: Project) => void 
}) => {
  const { projectId } = useParams();
  const project = state.projects.find(p => p.id === projectId);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
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

  if (!project) return <div className="p-8">Project not found</div>;

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

  const handleMoveStory = (storyId: string, targetEpicId: string) => {
    const sourceEpic = project.epics.find(e => e.stories.some(s => s.id === storyId));
    if (!sourceEpic || sourceEpic.id === targetEpicId) return;
    const storyToMove = sourceEpic.stories.find(s => s.id === storyId);
    if (!storyToMove) return;
    const updatedStory = { ...storyToMove, epicId: targetEpicId };
    const updatedEpics = project.epics.map(e => {
      if (e.id === sourceEpic.id) return { ...e, stories: e.stories.filter(s => s.id !== storyId) };
      if (e.id === targetEpicId) return { ...e, stories: [...e.stories, updatedStory], isOpen: true };
      return e;
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
    setIsMobileSidebarOpen(false);
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

  const handleDeleteEpic = (epicId: string) => {
    const epicToDelete = project.epics.find(e => e.id === epicId);
    if (activeStoryId && epicToDelete?.stories.some(s => s.id === activeStoryId)) {
      setActiveStoryId(null);
    }
    const updatedEpics = project.epics.filter(e => e.id !== epicId);
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
  };

  const handleDeleteStory = (storyId: string) => {
    if (activeStoryId === storyId) setActiveStoryId(null);
    const updatedEpics = project.epics.map(epic => ({
      ...epic,
      stories: epic.stories.filter(s => s.id !== storyId)
    }));
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
  };

  const handleRenameEpic = (epicId: string, newTitle: string) => {
    const updatedEpics = project.epics.map(e => e.id === epicId ? { ...e, title: newTitle } : e);
    onUpdateProject({ ...project, epics: updatedEpics, lastModified: Date.now() });
  };

  const selectedTemplate = state.templates.find(t => t.id === project.defaultTemplateId) || state.templates[0];

  return (
    <div className="flex flex-col flex-1 overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="h-14 md:h-16 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-6 flex items-center justify-between z-40 shadow-sm shrink-0">
        <div className="flex items-center gap-2 md:gap-6 flex-1 truncate">
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 md:hidden"
          >
            <Icons.Layout className="w-5 h-5" />
          </button>
          <div className="flex flex-col truncate">
            <input 
              type="text" 
              value={project.title}
              onChange={(e) => onUpdateProject({ ...project, title: e.target.value, lastModified: Date.now() })}
              className="text-sm md:text-lg font-black tracking-tight bg-transparent border-none outline-none focus:ring-0 dark:text-white p-0 h-5 md:h-6 truncate"
            />
            <div className="flex items-center gap-1.5 md:gap-2 mt-0.5">
               <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 shrink-0">
                  <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
                  <span className="text-[8px] md:text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">Live</span>
               </div>
               <span className="text-[8px] md:text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">Synced: Just now</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 hidden md:block shrink-0"></div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-2">
          {/* Custom Template Selector */}
          <div className="relative" ref={templateDropdownRef}>
            <button 
              onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
              className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-2 md:px-4 py-1.5 md:py-2 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-primary-500/30 transition-all shadow-sm active:scale-95 group"
            >
              <Icons.FileText className="w-3.5 h-3.5 text-primary-500 hidden sm:block" />
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="text-[10px] md:text-xs font-black text-primary-600 truncate max-w-[80px] md:max-w-[140px] uppercase tracking-tight">{selectedTemplate.name}</span>
                <Icons.ChevronDown className={`w-3 h-3 md:w-3.5 md:h-3.5 text-primary-500 transition-transform duration-300 ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isTemplateDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 md:w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-800 mb-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Architecture</span>
                </div>
                {state.templates.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => {
                      onUpdateProject({ ...project, defaultTemplateId: t.id, lastModified: Date.now() });
                      setIsTemplateDropdownOpen(false);
                    }}
                    className={`
                      w-full flex items-start gap-3 px-4 py-3 text-xs font-bold transition-colors text-left
                      ${project.defaultTemplateId === t.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}
                    `}
                  >
                    <Icons.FileText className={`w-4 h-4 mt-0.5 shrink-0 ${project.defaultTemplateId === t.id ? 'text-primary-500' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{t.name}</span>
                        {project.defaultTemplateId === t.id && <div className="w-1 h-1 rounded-full bg-primary-500"></div>}
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium mt-0.5 line-clamp-1">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => project.epics[0] && handleAddStory(project.epics[0].id)}
            className="p-2 md:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors"
          >
            <Icons.Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-300" 
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar wrapper for responsiveness */}
        <div className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:z-10
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <Sidebar 
            epics={project.epics}
            activeStoryId={activeStoryId}
            onSelectStory={(s) => {
              setActiveStoryId(s.id);
              setIsMobileSidebarOpen(false);
            }}
            onAddEpic={handleAddEpic}
            onAddStory={handleAddStory}
            onDeleteEpic={handleDeleteEpic}
            onDeleteStory={handleDeleteStory}
            onToggleEpic={handleToggleEpic}
            onRenameEpic={handleRenameEpic}
            onMoveStory={handleMoveStory}
          />
        </div>

        {/* Content Area */}
        {activeStory ? (
          <Editor 
            story={activeStory}
            onUpdate={handleUpdateStory}
            onDelete={handleDeleteStory}
            onMoveStory={handleMoveStory}
            epics={project.epics}
            templates={state.templates}
            selectedTemplateId={project.defaultTemplateId}
            currentUser={state.currentUser}
            users={state.users}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400 dark:bg-slate-950 transition-colors text-center">
            <div className="p-6 md:p-10 space-y-4 md:space-y-6 max-w-sm">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 dark:bg-slate-900/50 border border-transparent dark:border-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Icons.FileText className="w-8 h-8 md:w-10 md:h-10 opacity-20" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">Ready to Document?</h3>
              <p className="text-xs md:text-sm dark:text-slate-400">Select an existing user story from the sidebar or create a new one to begin building your specifications.</p>
              <button 
                onClick={() => project.epics[0] && handleAddStory(project.epics[0].id)}
                className="px-6 py-2 md:py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
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
    const confirmation = window.confirm("Delete this project and all its documentation permanently?");
    if (!confirmation) return;
    setState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== projectId)
    }));
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Icon Sidebar - Hidden on mobile, shown on md+ */}
      <div className="hidden md:flex w-16 flex-shrink-0 flex-col items-center py-6 border-r border-slate-100 dark:border-slate-800 gap-6 bg-white dark:bg-slate-900 z-50">
        <Link 
          to="/" 
          className={`p-3 rounded-2xl transition-all ${location.pathname === '/' ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          title="Dashboard"
        >
          <Icons.Layout className="w-6 h-6" />
        </Link>
        <Link 
          to="/settings" 
          className={`p-3 rounded-2xl transition-all ${location.pathname === '/settings' ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          title="Settings"
        >
          <Icons.Settings className="w-6 h-6" />
        </Link>
        <div className="mt-auto flex flex-col items-center gap-4">
          <button 
            onClick={() => setState(prev => ({ ...prev, isDarkMode: !prev.isDarkMode }))}
            className="p-3 rounded-2xl text-slate-400 hover:text-primary-500 transition-colors"
          >
            {state.isDarkMode ? <Icons.Sparkles className="w-5 h-5 text-amber-400" /> : <Icons.Clock className="w-5 h-5" />}
          </button>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary-500/20">
            {state.currentUser.name.charAt(0)}
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar - Hidden on md+ */}
      <div className="md:hidden h-14 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-around z-50 order-last shrink-0">
        <Link to="/" className={`p-2 rounded-xl ${location.pathname === '/' ? 'text-primary-600' : 'text-slate-400'}`}>
          <Icons.Layout className="w-6 h-6" />
        </Link>
        <Link to="/settings" className={`p-2 rounded-xl ${location.pathname === '/settings' ? 'text-primary-600' : 'text-slate-400'}`}>
          <Icons.Settings className="w-6 h-6" />
        </Link>
        <button 
          onClick={() => setState(prev => ({ ...prev, isDarkMode: !prev.isDarkMode }))}
          className="p-2 text-slate-400"
        >
          {state.isDarkMode ? <Icons.Sparkles className="w-6 h-6 text-amber-400" /> : <Icons.Clock className="w-6 h-6" />}
        </button>
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


import React, { useState } from 'react';
import { AppState, UserRole, Template } from '../types';
import { Icons } from '../constants';
import { TemplateManager } from './TemplateManager';

interface SettingsProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
}

export const Settings: React.FC<SettingsProps> = ({ state, onUpdateState }) => {
  const [activeSubTab, setActiveSubTab] = useState<'integrations' | 'templates' | 'team'>('integrations');

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Workspace</h1>
            <p className="text-slate-500 mt-2 text-lg">Manage your project ecosystem and preferences.</p>
          </div>
        </header>

        {/* Local Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveSubTab('integrations')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'integrations' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            Integrations
          </button>
          <button 
            onClick={() => setActiveSubTab('templates')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'templates' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            Templates
          </button>
          <button 
            onClick={() => setActiveSubTab('team')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'team' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            Team
          </button>
        </div>

        {activeSubTab === 'integrations' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Integration Card */}
            <section className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <Icons.Figma />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Figma Bridge</h2>
                    <p className="text-sm text-slate-500">Connect to Figma API for visual context ingestion.</p>
                </div>
              </div>
              <div className="p-8 space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personal Access Token</label>
                  <div className="flex gap-3">
                    <input 
                      type="password"
                      value={state.figmaConfig.apiKey}
                      onChange={(e) => onUpdateState({ figmaConfig: { ...state.figmaConfig, apiKey: e.target.value } })}
                      placeholder="figd_..."
                      className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-4 focus:ring-emerald-500/10 outline-none dark:text-white transition-all font-mono"
                    />
                    <button 
                      onClick={() => onUpdateState({ figmaConfig: { ...state.figmaConfig, connected: true } })}
                      className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      {state.figmaConfig.connected ? 'Active' : 'Authorize'}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* General Prefs */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Dark Workspace</h3>
                    <p className="text-xs text-slate-500">High contrast for deep work sessions</p>
                </div>
                <button 
                  onClick={() => onUpdateState({ isDarkMode: !state.isDarkMode })}
                  className={`w-14 h-8 rounded-full transition-colors relative ${state.isDarkMode ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                    <div className={`absolute top-1.5 left-1.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${state.isDarkMode ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>
            </section>
          </div>
        )}

        {activeSubTab === 'templates' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <TemplateManager 
              templates={state.templates}
              defaultTemplateId={state.defaultTemplateId}
              onUpdateTemplates={(templates) => onUpdateState({ templates })}
              onSetDefaultTemplate={(id) => onUpdateState({ defaultTemplateId: id })}
            />
          </div>
        )}

        {activeSubTab === 'team' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <section className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Collaborators</h2>
                <button className="text-xs text-emerald-500 font-black uppercase tracking-widest hover:underline">Invite Member</button>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {state.users.map(user => (
                  <div key={user.id} className="p-6 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black uppercase shadow-inner">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{user.name}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-[9px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest ${
                        user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' : 
                        user.role === UserRole.EDITOR ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {user.role}
                      </span>
                      <button className="text-slate-300 hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icons.Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

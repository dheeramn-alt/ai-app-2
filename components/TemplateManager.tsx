
import React, { useState } from 'react';
import { Template } from '../types.ts';
import { Icons } from '../constants.tsx';

interface TemplateManagerProps {
  templates: Template[];
  defaultTemplateId: string;
  onUpdateTemplates: (templates: Template[]) => void;
  onSetDefaultTemplate: (id: string) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({ 
  templates, 
  defaultTemplateId, 
  onUpdateTemplates,
  onSetDefaultTemplate 
}) => {
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const handleSave = () => {
    if (!editingTemplate) return;
    
    if (templates.find(t => t.id === editingTemplate.id)) {
      onUpdateTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
    } else {
      onUpdateTemplates([...templates, editingTemplate]);
    }
    setEditingTemplate(null);
  };

  const createNewTemplate = () => {
    const newT: Template = {
      id: `t-${Date.now()}`,
      name: 'New Story Preset',
      description: 'Custom narrative structure.',
      structure: {
        hasDescription: true,
        hasAcceptanceCriteria: true,
        hasHappyPath: true,
        hasSadPath: true
      }
    };
    setEditingTemplate(newT);
  };

  const deleteTemplate = (id: string) => {
    if (id === defaultTemplateId) {
      alert("Cannot delete the default template.");
      return;
    }
    if (confirm("Permanently remove this documentation template?")) {
      onUpdateTemplates(templates.filter(t => t.id !== id));
    }
  };

  const toggleField = (field: keyof Template['structure']) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      structure: {
        ...editingTemplate.structure,
        [field]: !editingTemplate.structure[field]
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Narrative Presets</h2>
          <p className="text-sm text-slate-500 mt-1">Structure definitions for User Stories and Technical Specs.</p>
        </div>
        <button 
          onClick={createNewTemplate}
          className="flex items-center gap-2.5 px-6 py-3 bg-primary-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-500 transition-all shadow-xl shadow-primary-600/20"
        >
          <Icons.Plus className="w-4 h-4" />
          Add Preset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map(template => (
          <div 
            key={template.id} 
            className={`p-6 rounded-[32px] border transition-all duration-300 relative group ${
              template.id === defaultTemplateId 
                ? 'bg-primary-50/50 border-primary-200 dark:bg-primary-950/20 dark:border-primary-800' 
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
            }`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${template.id === defaultTemplateId ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                  <Icons.FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    {template.name}
                    {template.id === defaultTemplateId && (
                      <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">{template.description}</p>
                </div>
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => setEditingTemplate(template)} className="p-2.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-primary-500 transition-all shadow-sm">
                  <Icons.Edit className="w-4 h-4" />
                </button>
                <button onClick={() => deleteTemplate(template.id)} className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-slate-400 hover:text-rose-500 transition-all shadow-sm">
                  <Icons.Trash className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 mb-6">
              {Object.entries(template.structure).map(([key, value]) => (
                value && typeof value === 'boolean' && (
                  <span key={key} className="text-[9px] px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full font-black uppercase tracking-widest border border-slate-200/50 dark:border-slate-700/50">
                    {key.replace('has', '')}
                  </span>
                )
              ))}
            </div>

            {template.id !== defaultTemplateId && (
              <button 
                onClick={() => onSetDefaultTemplate(template.id)}
                className="w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary-500 transition-all border-t border-slate-50 dark:border-slate-800 mt-2"
              >
                Set as Active Default
              </button>
            )}
          </div>
        ))}
      </div>

      {editingTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[44px] shadow-3xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-500 flex h-[80vh]">
            <div className="w-1/2 p-10 space-y-8 overflow-y-auto border-r border-slate-100 dark:border-slate-800 no-scrollbar">
              <h3 className="text-2xl font-black dark:text-white tracking-tighter">Preset Config</h3>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Label</label>
                  <input 
                    type="text" 
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white transition-all font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tagline</label>
                  <input 
                    type="text" 
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white transition-all text-sm"
                  />
                </div>

                <div className="pt-4 space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Required Content Blocks</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'hasDescription', label: 'Narrative' },
                      { key: 'hasAcceptanceCriteria', label: 'Acceptance' },
                      { key: 'hasHappyPath', label: 'Happy Flow' },
                      { key: 'hasSadPath', label: 'Edge Cases' }
                    ].map(field => (
                      <button 
                        key={field.key}
                        onClick={() => toggleField(field.key as any)}
                        className={`flex items-center justify-between px-5 py-4 rounded-[24px] border transition-all ${
                          editingTemplate.structure[field.key as keyof Template['structure']]
                            ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-widest">{field.label}</span>
                        {editingTemplate.structure[field.key as keyof Template['structure']] && <div className="w-2 h-2 rounded-full bg-primary-500 shadow-sm shadow-primary-500/50"></div>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setEditingTemplate(null)}
                  className="flex-1 py-5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-5 bg-primary-600 text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-2xl shadow-primary-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Save Preset
                </button>
              </div>
            </div>

            <div className="w-1/2 bg-slate-50 dark:bg-slate-950/50 p-10 overflow-y-auto no-scrollbar relative">
              <div className="absolute top-6 left-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Live Workspace Preview</span>
              </div>

              <div className="mt-12 bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <div className="w-24 h-1 rounded-full bg-primary-500/20"></div>
                  <h4 className="text-xl font-black tracking-tight dark:text-white truncate">Sample Document Instance</h4>
                </div>

                {editingTemplate.structure.hasDescription && (
                  <div className="space-y-3">
                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Narrative</label>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-full"></div>
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-5/6"></div>
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-4/6 opacity-50"></div>
                    </div>
                  </div>
                )}

                {editingTemplate.structure.hasAcceptanceCriteria && (
                  <div className="space-y-4">
                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Acceptance Criteria</label>
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded bg-primary-100 dark:bg-primary-900/40 flex-shrink-0"></div>
                          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-full"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  {editingTemplate.structure.hasHappyPath && (
                    <div className="space-y-3">
                      <label className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-500"></div> Happy Path
                      </label>
                      <div className="h-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800"></div>
                    </div>
                  )}
                  {editingTemplate.structure.hasSadPath && (
                    <div className="space-y-3">
                      <label className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-rose-500"></div> Edge Logic
                      </label>
                      <div className="h-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800"></div>
                    </div>
                  )}
                </div>
                
                {!editingTemplate.structure.hasDescription && 
                 !editingTemplate.structure.hasAcceptanceCriteria && 
                 !editingTemplate.structure.hasHappyPath && 
                 !editingTemplate.structure.hasSadPath && (
                   <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                     <Icons.FileText className="w-12 h-12 mb-4" />
                     <p className="text-[10px] font-black uppercase tracking-widest">Enable blocks to preview</p>
                   </div>
                 )}
              </div>

              <div className="mt-8 px-8 flex gap-4">
                <div className="p-4 bg-primary-50 dark:bg-primary-950/30 rounded-2xl border border-primary-100 dark:border-primary-900/50 flex-1">
                  <p className="text-[10px] leading-relaxed text-primary-700 dark:text-primary-300">
                    <strong>Pro-tip:</strong> Use focused templates for bug reports and complex narratives for architectural blueprints.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


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
      description: 'Custom structure.',
      structure: { hasDescription: true, hasAcceptanceCriteria: true, hasHappyPath: true, hasSadPath: true }
    };
    setEditingTemplate(newT);
  };

  const deleteTemplate = (id: string) => {
    if (id === defaultTemplateId) {
      alert("Cannot delete the default template.");
      return;
    }
    if (confirm("Remove this template?")) {
      onUpdateTemplates(templates.filter(t => t.id !== id));
    }
  };

  const toggleField = (field: keyof Template['structure']) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      structure: { ...editingTemplate.structure, [field]: !editingTemplate.structure[field] }
    });
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Narrative Presets</h2>
          <p className="text-sm text-slate-500 mt-1">Define documentation structure.</p>
        </div>
        <button onClick={createNewTemplate} className="flex items-center justify-center gap-2.5 px-6 py-3 bg-primary-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-500/10 hover:bg-primary-500 transition-all">
          <Icons.Plus className="w-4 h-4" /> Add Preset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map(template => (
          <div 
            key={template.id} 
            className={`p-6 rounded-[28px] md:rounded-[32px] border transition-all duration-500 relative group flex flex-col ${
              template.id === defaultTemplateId 
                ? 'bg-slate-200 dark:bg-[#0f172a] border-primary-500 ring-4 ring-primary-500/10 shadow-xl' 
                : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
            }`}
          >
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${template.id === defaultTemplateId ? 'bg-primary-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                  <Icons.FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className={`font-bold text-sm md:text-base truncate ${template.id === defaultTemplateId ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'}`}>{template.name}</h3>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{template.description}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingTemplate(template)} className="p-2 text-slate-400 hover:text-primary-500"><Icons.Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteTemplate(template.id)} className="p-2 text-slate-400 hover:text-rose-500"><Icons.Trash className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6 md:mb-8">
              {Object.entries(template.structure).map(([key, value]) => (
                value && typeof value === 'boolean' && (
                  <span key={key} className={`text-[8px] md:text-[9px] px-3 py-1.5 rounded-lg font-black uppercase tracking-[0.1em] border transition-colors ${
                    template.id === defaultTemplateId
                      ? 'bg-slate-300/50 dark:bg-slate-950/50 border-slate-400/20 text-slate-700 dark:text-slate-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200/50 dark:border-slate-700/50 text-slate-500 dark:text-slate-400'
                  }`}>
                    {key.replace('has', '').toUpperCase()}
                  </span>
                )
              ))}
            </div>

            {template.id !== defaultTemplateId ? (
              <button 
                onClick={() => onSetDefaultTemplate(template.id)} 
                className="w-full py-2.5 mt-auto text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary-500 border-t border-slate-50 dark:border-slate-800 transition-all"
              >
                Set Default
              </button>
            ) : (
              <div className="w-full py-2.5 mt-auto text-center border-t border-primary-500/20">
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary-500">Active Blueprint</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {editingTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[44px] shadow-3xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 flex flex-col lg:flex-row h-[90vh] lg:h-[80vh]">
            <div className="w-full lg:w-1/2 p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 no-scrollbar">
              <h3 className="text-xl md:text-2xl font-black dark:text-white tracking-tighter">Edit Preset</h3>
              <div className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Label</label>
                  <input type="text" value={editingTemplate.name} onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})} className="w-full px-4 md:px-6 py-3 md:py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none dark:text-white font-bold text-sm md:text-base" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Content Blocks</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {[
                      { key: 'hasDescription', label: 'Narrative' },
                      { key: 'hasAcceptanceCriteria', label: 'Acceptance' },
                      { key: 'hasHappyPath', label: 'Happy Flow' },
                      { key: 'hasSadPath', label: 'Edge Cases' }
                    ].map(field => (
                      <button key={field.key} onClick={() => toggleField(field.key as any)} className={`flex items-center justify-between px-4 py-3 md:py-4 rounded-xl md:rounded-[24px] border transition-all ${editingTemplate.structure[field.key as keyof Template['structure']] ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                        <span className="text-[10px] font-black uppercase">{field.label}</span>
                        {editingTemplate.structure[field.key as keyof Template['structure']] && <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                <button onClick={() => setEditingTemplate(null)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Discard</button>
                <button onClick={handleSave} className="flex-1 py-4 bg-primary-600 text-white rounded-xl md:rounded-[24px] text-[10px] font-black uppercase shadow-2xl">Save</button>
              </div>
            </div>
            <div className="hidden lg:block lg:w-1/2 bg-slate-50 dark:bg-slate-950/50 p-10 overflow-y-auto no-scrollbar">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-6">Preview</span>
              <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-xl space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-3/4"></div>
                <div className="space-y-3">
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-full"></div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

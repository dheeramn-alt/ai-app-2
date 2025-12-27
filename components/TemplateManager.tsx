
import React, { useState } from 'react';
import { Template } from '../types';
import { Icons } from '../constants';

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
      name: 'New Custom Template',
      description: 'A custom structure for your stories.',
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
    if (confirm("Delete this template?")) {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">Documentation Templates</h2>
          <p className="text-sm text-slate-500">Define the structure of your user stories and specs.</p>
        </div>
        <button 
          onClick={createNewTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
        >
          <Icons.Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(template => (
          <div 
            key={template.id} 
            className={`p-5 rounded-3xl border transition-all relative group ${
              template.id === defaultTemplateId 
                ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' 
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${template.id === defaultTemplateId ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <Icons.FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    {template.name}
                    {template.id === defaultTemplateId && (
                      <span className="text-[8px] px-1.5 py-0.5 bg-blue-600 text-white rounded uppercase tracking-tighter">Default</span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">{template.description}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingTemplate(template)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                  <Icons.Edit className="w-4 h-4" />
                </button>
                <button onClick={() => deleteTemplate(template.id)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                  <Icons.Trash className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(template.structure).map(([key, value]) => (
                value && (
                  <span key={key} className="text-[9px] px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg font-bold uppercase tracking-wider">
                    {key.replace('has', '')}
                  </span>
                )
              ))}
            </div>

            {template.id !== defaultTemplateId && (
              <button 
                onClick={() => onSetDefaultTemplate(template.id)}
                className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-colors border-t border-slate-50 dark:border-slate-800 mt-2"
              >
                Set as Default
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Editor Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <h3 className="text-xl font-bold dark:text-white">Template Configuration</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Template Name</label>
                  <input 
                    type="text" 
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                  <input 
                    type="text" 
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 dark:text-white"
                  />
                </div>

                <div className="pt-4 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Sections</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'hasDescription', label: 'Narrative' },
                      { key: 'hasAcceptanceCriteria', label: 'Requirements' },
                      { key: 'hasHappyPath', label: 'Happy Flow' },
                      { key: 'hasSadPath', label: 'Edge Cases' }
                    ].map(field => (
                      <button 
                        key={field.key}
                        onClick={() => toggleField(field.key as any)}
                        className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
                          editingTemplate.structure[field.key as keyof Template['structure']]
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-bold">{field.label}</span>
                        {editingTemplate.structure[field.key as keyof Template['structure']] && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setEditingTemplate(null)}
                  className="flex-1 py-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

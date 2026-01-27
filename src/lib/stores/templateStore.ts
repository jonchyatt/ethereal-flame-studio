import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { VisualTemplate, TemplateSettings } from '@/lib/templates/types';

interface TemplateState {
  templates: VisualTemplate[];
  activeTemplateId: string | null;

  // CRUD actions
  saveTemplate: (name: string, settings: TemplateSettings, options?: {
    description?: string;
    thumbnail?: string;
  }) => string; // Returns new template ID
  loadTemplate: (id: string) => TemplateSettings | null;
  deleteTemplate: (id: string) => void;
  updateTemplate: (id: string, updates: Partial<Omit<VisualTemplate, 'id' | 'createdAt' | 'isBuiltIn'>>) => void;
  setActiveTemplate: (id: string | null) => void;

  // Query helpers
  getUserTemplates: () => VisualTemplate[];
  getBuiltInTemplates: () => VisualTemplate[];
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: [],
      activeTemplateId: null,

      saveTemplate: (name, settings, options = {}) => {
        const id = crypto.randomUUID();
        const newTemplate: VisualTemplate = {
          id,
          name,
          description: options.description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          thumbnail: options.thumbnail,
          isBuiltIn: false,
          settings,
        };
        set((state) => ({
          templates: [...state.templates, newTemplate],
          activeTemplateId: id,
        }));
        return id;
      },

      loadTemplate: (id) => {
        const template = get().templates.find(t => t.id === id);
        if (template) {
          set({ activeTemplateId: id });
          return template.settings;
        }
        return null;
      },

      deleteTemplate: (id) => {
        const template = get().templates.find(t => t.id === id);
        if (template?.isBuiltIn) return; // Cannot delete built-in

        set((state) => ({
          templates: state.templates.filter(t => t.id !== id),
          activeTemplateId: state.activeTemplateId === id ? null : state.activeTemplateId,
        }));
      },

      updateTemplate: (id, updates) => {
        const template = get().templates.find(t => t.id === id);
        if (template?.isBuiltIn) return; // Cannot modify built-in

        set((state) => ({
          templates: state.templates.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
          ),
        }));
      },

      setActiveTemplate: (id) => set({ activeTemplateId: id }),

      getUserTemplates: () => get().templates.filter(t => !t.isBuiltIn),
      getBuiltInTemplates: () => get().templates.filter(t => t.isBuiltIn),
    }),
    {
      name: 'ethereal-flame-templates',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist templates and active ID
        templates: state.templates.filter(t => !t.isBuiltIn), // Only user templates
        activeTemplateId: state.activeTemplateId,
      }),
    }
  )
);

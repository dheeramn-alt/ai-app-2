
export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface StoryVersion {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  happyPath: string;
  sadPath: string;
  authorName: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  epics: Epic[];
  createdAt: number;
  lastModified: number;
  defaultTemplateId: string; // New field for project-specific templates
  thumbnail?: string;
}

export interface Epic {
  id: string;
  title: string;
  description: string;
  stories: Story[];
  isOpen?: boolean;
}

export interface Story {
  id: string;
  epicId: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  happyPath: string;
  sadPath: string;
  status: 'Draft' | 'Ready' | 'In Progress' | 'Completed';
  figmaUrl?: string;
  figmaScreenshot?: string;
  versions?: StoryVersion[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  structure: {
    hasDescription: boolean;
    hasAcceptanceCriteria: boolean;
    hasHappyPath: boolean;
    hasSadPath: boolean;
    customFields?: string[];
  };
}

export interface AppState {
  projects: Project[];
  templates: Template[];
  defaultTemplateId: string;
  figmaConfig: {
    apiKey: string;
    connected: boolean;
  };
  currentUser: User;
  users: User[];
  isDarkMode: boolean;
}

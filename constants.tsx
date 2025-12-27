import React from 'react';
import { Epic, UserRole, Template, Project } from './types';

export const INITIAL_EPICS: Epic[] = [
  {
    id: 'e1',
    title: 'Authentication & Onboarding',
    description: 'User registration, login, and initial setup flows.',
    isOpen: true,
    stories: [
      {
        id: 's1',
        epicId: 'e1',
        title: 'Sign Up with Email',
        description: 'As a new user, I want to create an account using my email address.',
        acceptanceCriteria: [
          'Email must be valid format',
          'Password must be at least 8 characters',
          'Send verification email upon success'
        ],
        happyPath: 'User enters valid details, clicks sign up, redirects to verification page.',
        sadPath: 'User enters existing email, error message "Email already in use" is shown.',
        status: 'Ready',
        versions: []
      },
      {
        id: 's2',
        epicId: 'e1',
        title: 'Login with SSO',
        description: 'As a returning user, I want to log in quickly using Google or Github.',
        acceptanceCriteria: [
          'OAuth window opens correctly',
          'User data is synced on first login',
          'Redirect to dashboard after auth'
        ],
        happyPath: 'User clicks Google button, selects account, lands on dashboard.',
        sadPath: 'User cancels OAuth flow, remains on login page.',
        status: 'Draft',
        versions: []
      }
    ]
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Main Platform Redesign',
    description: 'The core product redesign project including the new auth flow and profile systems.',
    createdAt: Date.now() - 86400000 * 7,
    lastModified: Date.now(),
    defaultTemplateId: 't1',
    epics: INITIAL_EPICS
  },
  {
    id: 'p2',
    title: 'Mobile App 2.0',
    description: 'Rebuilding the iOS and Android applications with React Native.',
    createdAt: Date.now() - 86400000 * 2,
    lastModified: Date.now() - 3600000,
    defaultTemplateId: 't1',
    epics: []
  }
];

export const INITIAL_TEMPLATES: Template[] = [
  {
    id: 't1',
    name: 'Agile Standard',
    description: 'Classic User Story format with AC and Scenarios.',
    structure: {
      hasDescription: true,
      hasAcceptanceCriteria: true,
      hasHappyPath: true,
      hasSadPath: true
    }
  },
  {
    id: 't2',
    name: 'Gherkin Syntax',
    description: 'Given-When-Then structured acceptance criteria.',
    structure: {
      hasDescription: true,
      hasAcceptanceCriteria: true,
      hasHappyPath: false,
      hasSadPath: false
    }
  },
  {
    id: 't3',
    name: 'Technical Spec',
    description: 'Focus on API endpoints and data schemas.',
    structure: {
      hasDescription: true,
      hasAcceptanceCriteria: true,
      hasHappyPath: true,
      hasSadPath: true
    }
  }
];

export const Icons = {
  Figma: () => (
    <svg width="24" height="24" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 28.5C19 25.8478 20.0536 23.3043 21.9289 21.4289C23.8043 19.5536 26.3478 18.5 29 18.5C31.6522 18.5 34.1957 19.5536 36.0711 21.4289C37.9464 23.3043 39 25.8478 39 28.5C39 31.1522 37.9464 33.6957 36.0711 35.5711C34.1957 37.4464 31.6522 38.5 29 38.5C26.3478 38.5 23.8043 37.4464 21.9289 35.5711C20.0536 33.6957 19 31.1522 19 28.5Z" fill="#1ABCFE"/>
      <path d="M0 47.5C0 44.8478 1.05357 42.3043 2.92893 40.4289C4.8043 38.5536 7.34784 37.5 10 37.5H19V57H10C7.34784 57 4.8043 55.9464 2.92893 54.0711C1.05357 52.1957 0 49.6522 0 47.5Z" fill="#0ACF83"/>
      <path d="M0 28.5C0 25.8478 1.05357 23.3043 2.92893 21.4289C4.8043 19.5536 7.34784 18.5 10 18.5H19V38.5H10C7.34784 38.5 4.8043 37.4464 2.92893 35.5711C1.05357 33.6957 0 31.1522 0 28.5Z" fill="#A259FF"/>
      <path d="M0 9.5C0 6.84784 1.05357 4.3043 2.92893 2.42893C4.8043 0.55357 7.34784 -1.19209e-07 10 0H19V19H10C7.34784 19 4.8043 17.9464 2.92893 16.0711C1.05357 14.1957 0 11.6522 0 9.5Z" fill="#F24E1E"/>
      <path d="M19 0H28.5C31.1522 0 33.6957 1.05357 35.5711 2.92893C37.4464 4.8043 38.5 7.34784 38.5 10C38.5 12.6522 37.4464 15.1957 35.5711 17.0711C33.6957 18.9464 31.1522 20 28.5 20H19V0Z" fill="#FF7262"/>
    </svg>
  ),
  Folder: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"></path></svg>
  ),
  FileText: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
  ),
  ChevronRight: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
  ),
  ChevronLeft: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
  ),
  Plus: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  ),
  Search: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
  ),
  Sparkles: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
  ),
  Trash: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
  ),
  Edit: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
  ),
  Save: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
  ),
  Undo: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>
  ),
  Layout: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
  ),
  Settings: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
  ),
  Clock: ({ className = "" }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  )
};
# FigDoc AI 🎨 📄

**FigDoc AI** is an intelligent documentation bridge designed for modern product teams. It seamlessly transforms Figma designs into high-quality, actionable User Stories and technical specifications using Google Gemini AI.

## ✨ Key Features

- **MCP-Figma Bridge**: Connect directly to Figma designs using Personal Access Tokens.
- **AI-Powered Specifications**: Automatically generate descriptions, acceptance criteria, and technical flows from design snapshots.
- **Collaborative Presence**: See which team members are working on specific stories in real-time.
- **Version History & Audit Trail**: Full timeline of edits with the ability to preview and revert to previous snapshots.
- **Smart Narrative Templates**: Customizable presets for Epics, User Stories, and Bug Reports.
- **Dark Mode Workspace**: A high-contrast, aesthetics-focused UI designed for deep work.

## 🚀 Deployment to Vercel

FigDoc AI is built as a modern React application utilizing ES modules and Import Maps, making it highly performant and easy to deploy.

### 1. Prerequisites
- A [Vercel](https://vercel.com) account.
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey).

### 2. One-Click Deploy (Manual Setup)
If you are importing your repository into Vercel:

1.  **Import Project**: Connect your GitHub/GitLab/Bitbucket repository.
2.  **Framework Preset**: Select `Other` or `Vite` (if using a build tool). For this structure, Vercel will serve the `index.html` as the entry point.
3.  **Environment Variables**:
    - Add a new variable: `API_KEY`.
    - Set the value to your **Google Gemini API Key**.
4.  **Build & Output Settings**: 
    - If you are not using a build script, leave them as default. Vercel will serve the static files.
5.  **Deploy**: Click "Deploy".

### 3. Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Link and deploy
vercel

# Add your API Key
vercel env add API_KEY
```

## 🛠 Local Development

To run this project locally without a complex build pipeline:

1.  Clone the repository.
2.  Ensure you have a local server (like `npx serve` or Live Server in VS Code).
3.  Set your environment variable (if your local server supports `.env`) or rely on the application's runtime injection.

```bash
# Example using serve
npx serve .
```

## 📦 Project Structure

- `index.html`: Entry point with Tailwind CSS and Import Maps.
- `index.tsx`: Main React mounting logic.
- `App.tsx`: Core routing and state management.
- `types.ts`: TypeScript interfaces for the domain model.
- `services/gemini.ts`: Integration layer for Google Gemini AI.
- `components/`: Modular UI components for the Editor, Sidebar, and Dashboard.

## 🛡 License

This project is licensed under the MIT License.

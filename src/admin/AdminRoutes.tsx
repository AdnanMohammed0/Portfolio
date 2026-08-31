import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { RequireAdmin } from './RequireAdmin';
import { LoginPage } from './LoginPage';
import { DashboardHome } from './DashboardHome';
import { ProjectManager } from './ProjectManager';
import { ProjectEditor } from './ProjectEditor';
import { MediaManager } from './MediaManager';
import {
  AboutEditor,
  ContactEditor,
  ExperienceEditor,
  HeroEditor,
  SettingsEditor,
  SkillsEditor,
} from './ContentEditors';

/** The whole dashboard, code-split away from the public bundle. */
export default function AdminRoutes() {
  // Keep the dashboard out of search results.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const previousTitle = document.title;
    document.title = 'Dashboard';
    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);

  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />

      <Route
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="projects" element={<ProjectManager />} />
        <Route path="projects/:id" element={<ProjectEditor />} />
        <Route path="media" element={<MediaManager />} />
        <Route path="hero" element={<HeroEditor />} />
        <Route path="about" element={<AboutEditor />} />
        <Route path="skills" element={<SkillsEditor />} />
        <Route path="experience" element={<ExperienceEditor />} />
        <Route path="contact" element={<ContactEditor />} />
        <Route path="settings" element={<SettingsEditor />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}

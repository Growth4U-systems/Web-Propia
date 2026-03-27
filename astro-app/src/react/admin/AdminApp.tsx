import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import DashboardPage from './pages/DashboardPage';
import BlogAdminPage from './pages/BlogAdminPage';
import CasosAdminPage from './pages/CasosAdminPage';
import VisibilidadPage from './pages/VisibilidadPage';
import ValidationPage from './pages/ValidationPage';
import ChecklistPage from './pages/ChecklistPage';
import FeedbackAdminPage from './pages/FeedbackAdminPage';
import LeadMagnetsAdminPage from './pages/LeadMagnetsAdminPage';
import LeadsAdminPage from './pages/LeadsAdminPage';
import InstagramPage from './pages/InstagramPage';
import LinkedInPage from './pages/LinkedInPage';
import LinkedInBotPage from './pages/LinkedInBotPage';
import InstagramBotPage from './pages/InstagramBotPage';
import NewsletterPage from './pages/NewsletterPage';
import PartnersPage from './pages/PartnersPage';
import TwitterPage from './pages/TwitterPage';

export default function AdminApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin/" element={<DashboardPage />} />
          <Route path="/admin/blog/" element={<BlogAdminPage />} />
          <Route path="/admin/casos-de-exito/" element={<CasosAdminPage />} />
          <Route path="/admin/lead-magnets/" element={<LeadMagnetsAdminPage />} />
          <Route path="/admin/instagram/" element={<InstagramPage />} />
          <Route path="/admin/instagram-bot/" element={<InstagramBotPage />} />
          <Route path="/admin/linkedin/" element={<LinkedInPage />} />
          <Route path="/admin/linkedin-bot/" element={<LinkedInBotPage />} />
          <Route path="/admin/twitter/" element={<TwitterPage />} />
          <Route path="/admin/visibilidad/" element={<VisibilidadPage />} />
          <Route path="/admin/seo/" element={<Navigate to="/admin/visibilidad/" replace />} />
          <Route path="/admin/geo/" element={<Navigate to="/admin/visibilidad/" replace />} />
          <Route path="/admin/seo-geo-audit/" element={<Navigate to="/admin/visibilidad/" replace />} />
          <Route path="/admin/keyword-briefs/" element={<Navigate to="/admin/visibilidad/" replace />} />
          <Route path="/admin/newsletter/" element={<NewsletterPage />} />
          <Route path="/admin/partners/" element={<PartnersPage />} />
          <Route path="/admin/validation/" element={<ValidationPage />} />
          <Route path="/admin/checklist/" element={<ChecklistPage />} />
          <Route path="/admin/feedback/" element={<FeedbackAdminPage />} />
          <Route path="/admin/leads/" element={<LeadsAdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

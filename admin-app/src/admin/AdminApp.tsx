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

export default function AdminApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/blog/" element={<BlogAdminPage />} />
          <Route path="/casos-de-exito/" element={<CasosAdminPage />} />
          <Route path="/lead-magnets/" element={<LeadMagnetsAdminPage />} />
          <Route path="/instagram/" element={<InstagramPage />} />
          <Route path="/instagram-bot/" element={<InstagramBotPage />} />
          <Route path="/linkedin/" element={<LinkedInPage />} />
          <Route path="/linkedin-bot/" element={<LinkedInBotPage />} />
          <Route path="/visibilidad/" element={<VisibilidadPage />} />
          <Route path="/seo/" element={<Navigate to="/visibilidad/" replace />} />
          <Route path="/geo/" element={<Navigate to="/visibilidad/" replace />} />
          <Route path="/seo-geo-audit/" element={<Navigate to="/visibilidad/" replace />} />
          <Route path="/keyword-briefs/" element={<Navigate to="/visibilidad/" replace />} />
          <Route path="/newsletter/" element={<NewsletterPage />} />
          <Route path="/partners/" element={<PartnersPage />} />
          <Route path="/validation/" element={<ValidationPage />} />
          <Route path="/checklist/" element={<ChecklistPage />} />
          <Route path="/feedback/" element={<FeedbackAdminPage />} />
          <Route path="/leads/" element={<LeadsAdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

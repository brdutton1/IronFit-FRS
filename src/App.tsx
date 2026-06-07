import { Navigate, Route, Routes } from 'react-router-dom';
import AuthGate from '@/components/common/AuthGate';
import MagicLinkForm from '@/components/common/MagicLinkForm';
import TrainerDashboard from '@/components/trainer/TrainerDashboard';
import TrainerSettings from '@/components/trainer/TrainerSettings';
import ControlCenter from '@/components/owner/ControlCenter';
import MovementsLibrary from '@/components/trainer/MovementsLibrary';
import MovementEditor from '@/components/trainer/MovementEditor';
import VideoLibrary from '@/components/trainer/VideoLibrary';
import VideoEditor from '@/components/trainer/VideoEditor';
import ClientDetail from '@/components/trainer/ClientDetail';
import IntakeForm from '@/components/intake/IntakeForm';
import ClientDashboard from '@/components/client/ClientDashboard';
import StretchFinder from '@/components/client/StretchFinder';
import ClientSettings from '@/components/client/ClientSettings';
import ProgressDashboard from '@/components/client/ProgressDashboard';
import MovementDetail from '@/components/client/MovementDetail';
import PerformanceScreen from '@/components/client/PerformanceScreen';
import SummaryScreen from '@/components/client/SummaryScreen';
import MessagesScreen from '@/components/chat/MessagesScreen';
import ChatThreadScreen from '@/components/chat/ChatThreadScreen';
import ClientChatScreen from '@/components/chat/ClientChatScreen';
import { useAuth } from '@/lib/session';

function IndexRedirect() {
  const { loading, session, profile } = useAuth();
  if (loading) {
    return <div className="flex min-h-full items-center justify-center text-slate-400">Loading…</div>;
  }
  if (!session) return <Navigate to="/auth" replace />;
  return <Navigate to={profile?.role === 'trainer' ? '/trainer' : '/client'} replace />;
}

function AuthRoute() {
  const { session, profile } = useAuth();
  if (session) return <Navigate to={profile?.role === 'trainer' ? '/trainer' : '/client'} replace />;
  return <MagicLinkForm />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexRedirect />} />
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/intake/:code" element={<IntakeForm />} />

      {/* Trainer */}
      <Route path="/trainer" element={<AuthGate role="trainer"><TrainerDashboard /></AuthGate>} />
      <Route path="/trainer/settings" element={<AuthGate role="trainer"><TrainerSettings /></AuthGate>} />
      <Route path="/control" element={<AuthGate role="trainer" owner><ControlCenter /></AuthGate>} />
      <Route path="/trainer/clients/:clientId" element={<AuthGate role="trainer"><ClientDetail /></AuthGate>} />
      <Route path="/trainer/movements" element={<AuthGate role="trainer"><MovementsLibrary /></AuthGate>} />
      <Route path="/trainer/movements/new" element={<AuthGate role="trainer"><MovementEditor /></AuthGate>} />
      <Route path="/trainer/movements/:id" element={<AuthGate role="trainer"><MovementEditor /></AuthGate>} />
      <Route path="/trainer/videos" element={<AuthGate role="trainer"><VideoLibrary /></AuthGate>} />
      <Route path="/trainer/videos/new" element={<AuthGate role="trainer"><VideoEditor /></AuthGate>} />
      <Route path="/trainer/videos/:id" element={<AuthGate role="trainer"><VideoEditor /></AuthGate>} />
      <Route path="/trainer/messages" element={<AuthGate role="trainer"><MessagesScreen /></AuthGate>} />
      <Route path="/trainer/messages/:partnerId" element={<AuthGate role="trainer"><ChatThreadScreen /></AuthGate>} />

      {/* Client */}
      <Route path="/client" element={<AuthGate role="client"><ClientDashboard /></AuthGate>} />
      <Route path="/client/stretch" element={<AuthGate role="client"><StretchFinder /></AuthGate>} />
      <Route path="/client/settings" element={<AuthGate role="client"><ClientSettings /></AuthGate>} />
      <Route path="/client/progress" element={<AuthGate role="client"><ProgressDashboard /></AuthGate>} />
      <Route path="/client/messages" element={<AuthGate role="client"><ClientChatScreen /></AuthGate>} />
      <Route path="/client/movements/:id" element={<AuthGate role="client"><MovementDetail /></AuthGate>} />
      <Route path="/client/movements/:id/perform" element={<AuthGate role="client"><PerformanceScreen /></AuthGate>} />
      <Route path="/client/movements/:id/summary" element={<AuthGate role="client"><SummaryScreen /></AuthGate>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

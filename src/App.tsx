import { Navigate, Route, Routes } from 'react-router-dom';
import AuthGate from '@/components/common/AuthGate';
import MagicLinkForm from '@/components/common/MagicLinkForm';
import TrainerDashboard from '@/components/trainer/TrainerDashboard';
import MovementEditor from '@/components/trainer/MovementEditor';
import ClientDashboard from '@/components/client/ClientDashboard';
import MovementDetail from '@/components/client/MovementDetail';
import PerformanceScreen from '@/components/client/PerformanceScreen';
import SummaryScreen from '@/components/client/SummaryScreen';
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

      {/* Trainer */}
      <Route path="/trainer" element={<AuthGate role="trainer"><TrainerDashboard /></AuthGate>} />
      <Route path="/trainer/movements/new" element={<AuthGate role="trainer"><MovementEditor /></AuthGate>} />
      <Route path="/trainer/movements/:id" element={<AuthGate role="trainer"><MovementEditor /></AuthGate>} />

      {/* Client */}
      <Route path="/client" element={<AuthGate role="client"><ClientDashboard /></AuthGate>} />
      <Route path="/client/movements/:id" element={<AuthGate role="client"><MovementDetail /></AuthGate>} />
      <Route path="/client/movements/:id/perform" element={<AuthGate role="client"><PerformanceScreen /></AuthGate>} />
      <Route path="/client/movements/:id/summary" element={<AuthGate role="client"><SummaryScreen /></AuthGate>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

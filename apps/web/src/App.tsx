import { Navigate, Route, Routes } from 'react-router-dom';
import TodayPage from './pages/TodayPage';

/** One route in V1: the Today page (docs/REPOS_V1.md §3). */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TodayPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

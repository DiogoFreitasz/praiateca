import { BrowserRouter, Routes, Route } from 'react-router';

import AppLayout from '../components/layout/AppLayout';

import Dashboard from '../pages/Dashboard';
import Missions from '../pages/Missions';
import Quiz from '../pages/Quiz';
import Results from '../pages/Results';
import Achievements from '../pages/Achievements';
import NotFound from '../pages/NotFound';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="missoes" element={<Missions />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="resultados" element={<Results />} />
          <Route path="conquistas" element={<Achievements />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
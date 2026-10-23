import { BrowserRouter, Routes, Route } from 'react-router';

import AppLayout from '../components/layout/AppLayout';

import Dashboard from '../pages/Dashboard';
import Missions from '../pages/Missions';
import Quiz from '../pages/Quiz';
import Results from '../pages/Results';
import Achievements from '../pages/Achievements';
import NotFound from '../pages/NotFound';
import { QuizResultProvider } from '../context/QuizResultProvider';
import { ProgressProvider } from '../context/ProgressProvider';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="missoes" element={<Missions />} />
        <Route path="quiz" element={<Quiz />} />
        <Route path="quiz/:missionId" element={<Quiz />} />
        <Route path="resultados" element={<Results />} />
        <Route path="resultados/:missionId" element={<Results />} />
        <Route path="resultados/:missionId/revisao" element={<Results review />} />
        <Route path="conquistas" element={<Achievements />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ProgressProvider>
        <QuizResultProvider>
          <AppRoutes />
        </QuizResultProvider>
      </ProgressProvider>
    </BrowserRouter>
  );
}

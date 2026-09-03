import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './routes/DashboardPage';
import { ExpensesPage } from './routes/ExpensesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

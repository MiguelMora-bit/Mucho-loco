import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './routes/DashboardPage';
import { ExpensesPage } from './routes/ExpensesPage';
import { TransfersPage } from './routes/TransfersPage';
import { PayrollPage } from './routes/PayrollPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="payroll" element={<PayrollPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

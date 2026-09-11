import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './routes/LoginPage';
import { DashboardPage } from './routes/DashboardPage';
import { ExpensesPage } from './routes/ExpensesPage';
import { TransfersPage } from './routes/TransfersPage';
import { PayrollPage } from './routes/PayrollPage';
import { ExecutiveReportsPage } from './routes/ExecutiveReportsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="transfers" element={<TransfersPage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="reports" element={<ExecutiveReportsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

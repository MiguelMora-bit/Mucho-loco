import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RequireManager } from './components/layout/RequireManager';
import { LoginPage } from './routes/LoginPage';
import { PickupOrdersPage } from './routes/PickupOrdersPage';
import { CounterSalePage } from './routes/CounterSalePage';
import { QrValidationPage } from './routes/QrValidationPage';
import { CashRegisterPage } from './routes/CashRegisterPage';
import { ReportsPage } from './routes/ReportsPage';
import { AttendancePage } from './routes/AttendancePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<PickupOrdersPage />} />
            <Route path="counter" element={<CounterSalePage />} />
            <Route path="qr" element={<QrValidationPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route element={<RequireManager />}>
              <Route path="cash-register" element={<CashRegisterPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

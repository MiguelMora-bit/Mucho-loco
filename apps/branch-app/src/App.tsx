import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './routes/LoginPage';
import { PickupOrdersPage } from './routes/PickupOrdersPage';
import { CounterSalePage } from './routes/CounterSalePage';
import { QrValidationPage } from './routes/QrValidationPage';

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
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

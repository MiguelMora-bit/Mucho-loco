import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { PickupOrdersPage } from './routes/PickupOrdersPage';
import { CounterSalePage } from './routes/CounterSalePage';
import { QrValidationPage } from './routes/QrValidationPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<PickupOrdersPage />} />
          <Route path="counter" element={<CounterSalePage />} />
          <Route path="qr" element={<QrValidationPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

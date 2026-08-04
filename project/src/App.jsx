import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import BookingPage from './pages/BookingPage';
import AdminPage from './pages/AdminPage';
import DriversPage from './pages/DriversPage';
import TrackPage from './pages/TrackPage';
import PaymentPage from './pages/PaymentPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<BookingPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/payment" element={<PaymentPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

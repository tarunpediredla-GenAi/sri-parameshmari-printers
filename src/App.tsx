import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import { StoreProvider } from './context/StoreContext';
import AdminPage from './pages/AdminPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ContactPage from './pages/ContactPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import OrderDetailPage from './pages/OrderDetailPage';
import PolicyPage from './pages/PolicyPage';
import ProductDetailPage from './pages/ProductDetailPage';
import QuotePage from './pages/QuotePage';
import ShopPage from './pages/ShopPage';

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <div className="min-h-screen flex flex-col bg-[#F2F5F1] text-[#2B1D14]">
          <Navbar />
          <AuthModal />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/quote" element={<QuotePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/policy/:slug" element={<PolicyPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </StoreProvider>
    </BrowserRouter>
  );
}

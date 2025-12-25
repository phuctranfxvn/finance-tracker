import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Wallets from "./pages/Wallets";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Savings from "./pages/Savings";
import Debts from "./pages/Debts";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import QuickAddPage from "./pages/QuickAddPage";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";

import Register from "./pages/Register";
import { useAuth } from "./context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

function RequireAuth() {
  const { token, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<RequireAuth />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<QuickAddPage />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="wallets" element={<Wallets />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="savings" element={<Savings />} />
                <Route path="debts" element={<Debts />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;

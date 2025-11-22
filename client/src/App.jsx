import { BrowserRouter, Routes, Route } from "react-router-dom";

// Auth
import Login from "./pages/auth/Login";
import ResetPassword from "./pages/auth/ResetPassword";

// Dashboard
import Dashboard from "./pages/dashboard/Dashboard";

// Products
import ProductList from "./pages/products/ProductList";
import ProductCreateEdit from "./pages/products/ProductCreateEdit";

// Receipts
import ReceiptList from "./pages/receipts/ReceiptList";
import ReceiptCreate from "./pages/receipts/ReceiptCreate";

// Delivery
import DeliveryList from "./pages/delivery/DeliveryList";
import DeliveryCreate from "./pages/delivery/DeliveryCreate";

// Transfers
import TransferList from "./pages/transfers/TransferList";
import TransferCreate from "./pages/transfers/TransferCreate";

// Stock Adjustment
import StockAdjustment from "./pages/adjustments/StockAdjustment";

// Profile
import Profile from "./pages/profile/Profile";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Auth */}
        <Route path="/" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Products */}
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/new" element={<ProductCreateEdit />} />
        <Route path="/products/edit/:id" element={<ProductCreateEdit />} />

        {/* Receipts */}
        <Route path="/receipts" element={<ReceiptList />} />
        <Route path="/receipts/new" element={<ReceiptCreate />} />

        {/* Delivery Orders */}
        <Route path="/delivery" element={<DeliveryList />} />
        <Route path="/delivery/new" element={<DeliveryCreate />} />

        {/* Transfers */}
        <Route path="/transfers" element={<TransferList />} />
        <Route path="/transfers/new" element={<TransferCreate />} />

        {/* Stock Adjustment */}
        <Route path="/adjustments" element={<StockAdjustment />} />

        {/* Profile */}
        <Route path="/profile" element={<Profile />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;

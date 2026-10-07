import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

import AppLayout from "./App";
import Dashboard from "./pages/Dashboard";
import Estoque from "./pages/Estoque";
import Validades from "./pages/Validades";
import Produtos from "./pages/Produtos";
import Movimentacoes from "./pages/Movimentacoes";
import Locais from "./pages/Locais";
import Vendas from "./pages/Vendas";
import Relatorios from "./pages/Relatorios";
import Login from "./pages/Login";
import Configuracoes from "./pages/Configuracoes";
import { RequireAuth } from "./components/auth/RequireAuth";
import { AccessGuard } from "./components/auth/AccessGuard";
import { AuthProvider } from "./contexts/AuthContext";

import "./index.css";

const router = createHashRouter([
  { path: "/login", Component: Login },
  {
    Component: RequireAuth,
    children: [{
      path: "/",
      Component: AppLayout,
      children: [
        { index: true, element: <AccessGuard permission="dashboard.view"><Dashboard /></AccessGuard> },
        { path: "dashboard", element: <AccessGuard permission="dashboard.view"><Dashboard /></AccessGuard> },
        { path: "estoque", element: <AccessGuard permission="stock.view"><Estoque /></AccessGuard> },
        { path: "validades", element: <AccessGuard permission="stock.view"><Validades /></AccessGuard> },
        { path: "produtos", element: <AccessGuard permission="products.view"><Produtos /></AccessGuard> },
        { path: "movimentacoes", element: <AccessGuard permission="stock.view"><Movimentacoes /></AccessGuard> },
        { path: "locais", element: <AccessGuard permission="locations.view"><Locais /></AccessGuard> },
        { path: "vendas", element: <AccessGuard permission="sales.view"><Vendas /></AccessGuard> },
        { path: "relatorios", element: <AccessGuard permission="reports.view"><Relatorios /></AccessGuard> },
        { path: "configuracoes", element: <AccessGuard adminOnly><Configuracoes /></AccessGuard> },
      ],
    }],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);

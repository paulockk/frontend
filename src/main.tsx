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
import { RequireAuth } from "./components/auth/RequireAuth";
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
        { index: true, Component: Dashboard },
        { path: "dashboard", Component: Dashboard },
        { path: "estoque", Component: Estoque },
        { path: "validades", Component: Validades },
        { path: "produtos", Component: Produtos },
        { path: "movimentacoes", Component: Movimentacoes },
        { path: "locais", Component: Locais },
        { path: "vendas", Component: Vendas },
        { path: "relatorios", Component: Relatorios },
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

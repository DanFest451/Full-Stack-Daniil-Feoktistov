import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Drive from "./pages/Drive";
import Editor from "./pages/Editor";
import PublicView from "./pages/PublicView";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/drive" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {}
      <Route path="/public/:token" element={<PublicView />} />

      {}
      <Route element={<RequireAuth />}>
        <Route path="/drive" element={<Drive />} />
        <Route path="/docs/:id" element={<Editor />} />
      </Route>

      <Route path="*" element={<div style={{ padding: 16 }}>404 Not Found</div>} />
    </Routes>
  );
}

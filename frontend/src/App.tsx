import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import StudentHome from "./pages/Student/Home";
import Help from "./pages/Help";
import StudentSession from "./pages/Student/Session";
import TeacherHome from "./pages/Teacher/Home";
import AdminHome from "./pages/Admin/Home";
import Layout from "./components/Layout";
import { useAuth } from "./store/auth";
import type { ReactElement } from "react";


function Protected({ role, children }: { role: string; children: ReactElement }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  const user = useAuth((s) => s.user);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : user.role === "teacher" ? (
              <Navigate to="/teacher" replace />
            ) : (
              <Navigate to="/student" replace />
            )
          }
        />
        <Route path="/student" element={<Protected role="student"><StudentHome /></Protected>} />
        <Route path="/student/session" element={<Protected role="student"><StudentSession /></Protected>} />
        <Route path="/help" element={<Protected role=""><Help /></Protected>} />
        <Route path="/teacher" element={<Protected role="teacher"><TeacherHome /></Protected>} />
        <Route path="/admin" element={<Protected role="admin"><AdminHome /></Protected>} />
      </Routes>
    </BrowserRouter>
  );
}
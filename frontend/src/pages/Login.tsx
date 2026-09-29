import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../store/auth";

export default function Login() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const setUser = useAuth((s) => s.setUser);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const form = new URLSearchParams();
      form.append("username", username);
      form.append("password", password);
      const { data } = await api.post("/api/auth/login", form);
      localStorage.setItem("token", data.access_token);          // ← сначала токен
      localStorage.setItem("user", JSON.stringify({
        full_name: data.full_name,
        role: data.role,
      }));                                                        // ← затем user
      setUser({ full_name: data.full_name, role: data.role });    // ← обновляем state
      nav("/admin", { replace: true });                           // ← идём в кабинет
    } catch {
      setErr("Неверный логин или пароль");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="bg-white p-8 rounded shadow w-96 space-y-4">
        <h1 className="text-xl font-bold">Тренажёр ДДС 112</h1>
        <input className="w-full border p-2 rounded" placeholder="Логин"
               value={username} onChange={(e) => setU(e.target.value)} />
        <input className="w-full border p-2 rounded" type="password" placeholder="Пароль"
               value={password} onChange={(e) => setP(e.target.value)} />
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button className="w-full bg-blue-600 text-white p-2 rounded">Войти</button>
      </form>
    </div>
  );
}
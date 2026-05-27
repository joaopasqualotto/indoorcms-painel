import { useState } from "react";
import { login } from "./api";

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user",  JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0b0f",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Syne', sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Glow */}
      <div style={{
        position: "fixed", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,229,255,.06) 0%, transparent 70%)",
        top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none"
      }} />

      <div style={{
        background: "#11131a", border: "1px solid #1f2333",
        borderRadius: 16, padding: "40px 36px", width: 380, maxWidth: "92vw",
        boxShadow: "0 24px 60px rgba(0,0,0,.5)"
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 38, height: 38, background: "#00e5ff", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#000", fontSize: 18, fontWeight: 800
          }}>⬛</div>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.5px" }}>
            INDOOR<span style={{ color: "#00e5ff" }}>CMS</span>
          </span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0", marginBottom: 6 }}>Bem-vindo</h1>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 28 }}>Faça login para acessar o painel</p>

        <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono'", color: "#64748b", marginBottom: 6 }}>E-MAIL</div>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@indoorcms.com" required
              style={{
                width: "100%", background: "#0a0b0f", border: "1px solid #1f2333",
                borderRadius: 8, padding: "11px 14px", color: "#e2e8f0",
                fontFamily: "'Syne'", fontSize: 14, outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono'", color: "#64748b", marginBottom: 6 }}>SENHA</div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{
                width: "100%", background: "#0a0b0f", border: "1px solid #1f2333",
                borderRadius: 8, padding: "11px 14px", color: "#e2e8f0",
                fontFamily: "'Syne'", fontSize: 14, outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)",
              borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#ef4444"
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            background: "#00e5ff", color: "#000", border: "none",
            borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 800,
            fontFamily: "'Syne'", cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1, marginTop: 6
          }}>
            {loading ? "Entrando..." : "Entrar →"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, fontFamily: "'DM Mono'", color: "#64748b" }}>
          admin@indoorcms.com / admin123
        </div>
      </div>
    </div>
  );
}

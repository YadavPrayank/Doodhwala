import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './supabase';
import { logoutUser } from './auth';
import RolePicker from './screens/RolePicker';
import OwnerLogin from './screens/OwnerLogin';
import OwnerDashboard from './screens/OwnerDashboard';
import CustomerLogin from './screens/CustomerLogin';
import CustomerHome from './screens/CustomerHome';
import WorkerLogin from './screens/WorkerLogin';
import WorkerHome from './screens/WorkerHome';
import AdminPanel from './screens/AdminPanel';

function MainApp() {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedRole = localStorage.getItem('role');
    const savedUser = JSON.parse(localStorage.getItem('user'));
    if (savedRole && savedUser) {
      const table = savedRole === 'owner' ? 'owners' : savedRole === 'worker' ? 'workers' : 'customers';
      supabase.from(table).update({ is_logged_in: true }).eq('id', savedUser.id);
      setRole(savedRole);
      setUser(savedUser);
    }
  }, []);

  function onLogin(role, userData) {
    setRole(role);
    setUser(userData);
    localStorage.setItem('role', role);
    localStorage.setItem('user', JSON.stringify(userData));
  }

async function logout() {
    if (user && role) {
      await logoutUser(user.email, role);
    }
    setRole(null);
    setUser(null);
    localStorage.clear();
  }

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: '#F7F4EF' }}>
      {!role && <RolePicker onPick={setRole} />}
      {role === 'owner' && !user && <OwnerLogin onLogin={onLogin} />}
      {role === 'owner' && user && <OwnerDashboard user={user} onLogout={logout} />}
      {role === 'customer' && !user && <CustomerLogin onLogin={onLogin} />}
      {role === 'customer' && user && <CustomerHome user={user} onLogout={logout} />}
      {role === 'worker' && !user && <WorkerLogin onLogin={onLogin} />}
      {role === 'worker' && user && <WorkerHome user={user} onLogout={logout} />}
    </div>
  );
}

function AdminRoute() {
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const ADMIN_PIN = '2024';

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F1F2E', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap');`}</style>
        <div style={{ fontFamily: 'DM Serif Display', fontSize: 28, color: 'white', marginBottom: 8 }}>Admin Panel</div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>Enter your 4-digit PIN</div>
        <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="• • • •"
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && (pin === ADMIN_PIN ? setAuthed(true) : setError('Wrong PIN.'))}
            style={{ padding: '16px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.15)', fontSize: 28, fontFamily: 'DM Mono', textAlign: 'center', letterSpacing: 12, background: 'rgba(255,255,255,0.08)', color: 'white' }}
          />
          {error && <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#F5A623', textAlign: 'center' }}>{error}</div>}
          <button
            onClick={() => pin === ADMIN_PIN ? setAuthed(true) : setError('Wrong PIN.')}
            style={{ padding: '16px', background: '#2E7D5E', color: 'white', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans', cursor: 'pointer' }}>
            Enter
          </button>
        </div>
      </div>
    );
  }

  return <AdminPanel onClose={() => setAuthed(false)} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/admin" element={<AdminRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
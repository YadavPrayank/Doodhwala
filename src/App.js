import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import RolePicker from './screens/RolePicker';
import OwnerLogin from './screens/OwnerLogin';
import OwnerDashboard from './screens/OwnerDashboard';
import CustomerLogin from './screens/CustomerLogin';
import CustomerHome from './screens/CustomerHome';
import WorkerLogin from './screens/WorkerLogin';
import WorkerHome from './screens/WorkerHome';

export default function App() {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);

  function logout() {
    setRole(null);
    setUser(null);
    localStorage.clear();
  }

  useEffect(() => {
    const savedRole = localStorage.getItem('role');
    const savedUser = JSON.parse(localStorage.getItem('user'));
    if (savedRole && savedUser) {
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
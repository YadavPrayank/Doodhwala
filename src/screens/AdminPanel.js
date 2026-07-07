import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const C = {
  navy: '#0F1F2E',
  green: '#2E7D5E',
  greenLight: '#E8F5F0',
  cream: '#F7F4EF',
  border: '#E4DDD4',
  steel: '#6B7F8E',
  white: '#FFFFFF',
  amber: '#F5A623',
  red: '#D94F3D',
};

export default function AdminPanel({ onClose }) {
  const [tab, setTab] = useState('billing');
  const [owners, setOwners] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [o, c, w, a] = await Promise.all([
      supabase.from('owners').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('workers').select('*').order('created_at', { ascending: false }),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setOwners(o.data || []);
    setCustomers(c.data || []);
    setWorkers(w.data || []);
    setActivity(a.data || []);
    setLoading(false);
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans', color: 'rgba(255,255,255,0.5)' }}>
      Loading...
    </div>
  );

  const totalRevenue = owners.reduce((sum, o) => {
    const count = customers.filter(c => c.shop_code === o.shop_code).length;
    return sum + (count * 15);
  }, 0);

  const today = new Date().toISOString().split('T')[0];
  const newToday = activity.filter(a => a.created_at.startsWith(today) && a.action === 'registered');
  const loginsToday = activity.filter(a => a.created_at.startsWith(today) && a.action === 'login');
  const logoutsToday = activity.filter(a => a.created_at.startsWith(today) && a.action === 'logout');

  return (
    <div style={{ minHeight: '100vh', background: C.navy, paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ padding: '52px 24px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Developer access</div>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 28, color: C.white }}>Doodhwala Admin</div>
        </div>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 16 }}>✕</button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, padding: '0 24px 20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total shops', value: owners.length },
          { label: 'Total customers', value: customers.length },
          { label: 'Total workers', value: workers.length },
          { label: 'Monthly revenue', value: `₹${totalRevenue}` },
          { label: 'New today', value: newToday.length },
          { label: 'Logins today', value: loginsToday.length },
          { label: 'Logouts today', value: logoutsToday.length },
        ].map(s => (
          <div key={s.label} style={{ flex: '1 1 28%', background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontFamily: 'DM Mono', fontSize: 20, fontWeight: 700, color: C.white }}>{s.value}</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '0 24px 16px', overflowX: 'auto' }}>
        {[
          ['billing', 'Billing'],
          ['activity', 'Activity'],
          ['customers', 'Customers'],
          ['workers', 'Workers'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
            background: tab === key ? C.green : 'rgba(255,255,255,0.08)',
            color: tab === key ? C.white : 'rgba(255,255,255,0.6)',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Billing */}
        {tab === 'billing' && (
          <>
            <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
              ₹15 per registered customer per month. Customer count is based on total registrations — not logins.
            </div>
            {owners.length === 0 && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>No shops registered yet.</div>
            )}
            {owners.map(o => {
              const shopCustomers = customers.filter(c => c.shop_code === o.shop_code);
              const shopWorkers = workers.filter(w => w.shop_code === o.shop_code);
              const amount = shopCustomers.length * 15;
              const onlineCustomers = shopCustomers.filter(c => c.is_logged_in).length;
              return (
                <div key={o.id} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 18, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: 'DM Serif Display', fontSize: 20, color: C.white }}>{o.shop_name}</div>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{o.name} · {o.phone}</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 12, color: C.green, marginTop: 4 }}>Code: {o.shop_code}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 26, fontWeight: 700, color: C.green }}>₹{amount}</div>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>this month</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { label: 'Customers', value: shopCustomers.length },
                      { label: 'Online now', value: onlineCustomers },
                      { label: 'Workers', value: shopWorkers.length },
                      { label: '@₹15 each', value: `₹${amount}` },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'DM Mono', fontSize: 15, fontWeight: 700, color: C.white }}>{s.value}</div>
                        <div style={{ fontFamily: 'DM Sans', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Activity */}
        {tab === 'activity' && (
          <>
            <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Last 100 events across all shops</div>
            {activity.length === 0 && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>No activity yet.</div>
            )}
            {activity.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>
                  {a.action === 'registered' ? '🆕' : a.action === 'login' ? '🔐' : '🚪'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 13.5, fontWeight: 700, color: C.white }}>{a.name}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {a.role} · {a.action} · {a.shop_code}
                  </div>
                </div>
                <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'right', flexShrink: 0 }}>
                  <div>{new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                  <div>{new Date(a.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Customers */}
        {tab === 'customers' && (
          <>
            <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{customers.length} total registered customers across all shops</div>
            {customers.length === 0 && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>No customers yet.</div>
            )}
            {customers.map(c => {
              const owner = owners.find(o => o.shop_code === c.shop_code);
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700, color: C.white }}>{c.name}</div>
                      {c.is_logged_in && <span style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: C.green, background: `${C.green}25`, padding: '2px 7px', borderRadius: 999 }}>Online</span>}
                      {c.is_new && <span style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: C.amber, background: `${C.amber}25`, padding: '2px 7px', borderRadius: 999 }}>New</span>}
                    </div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{c.phone}</div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{owner?.shop_name || c.shop_code}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 16, fontWeight: 700, color: c.balance <= 2 ? C.amber : C.green }}>{c.balance || 0}L</div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>remaining</div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Workers */}
        {tab === 'workers' && (
          <>
            <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{workers.length} total workers across all shops</div>
            {workers.length === 0 && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>No workers yet.</div>
            )}
            {workers.map(w => {
              const owner = owners.find(o => o.shop_code === w.shop_code);
              const assigned = customers.filter(c => c.assigned_worker_id === w.id).length;
              return (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700, color: C.white }}>{w.name}</div>
                      {w.is_logged_in && <span style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: C.green, background: `${C.green}25`, padding: '2px 7px', borderRadius: 999 }}>Online</span>}
                    </div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{w.phone}</div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{owner?.shop_name || w.shop_code}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 16, fontWeight: 700, color: C.white }}>{assigned}</div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>customers</div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
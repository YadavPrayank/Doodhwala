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
  amberLight: '#FEF3DC',
  red: '#D94F3D',
};

export default function OwnerDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [openCustomer, setOpenCustomer] = useState(null);
  const [openWorker, setOpenWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel('owner-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_requests' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [c, w, r, n] = await Promise.all([
      supabase.from('customers').select('*').eq('shop_code', user.shop_code),
      supabase.from('workers').select('*').eq('shop_code', user.shop_code),
      supabase.from('daily_requests').select('*').eq('shop_code', user.shop_code).eq('date', today),
      supabase.from('notifications').select('*').eq('shop_code', user.shop_code).eq('target_role', 'owner').order('created_at', { ascending: false }),
    ]);
    setCustomers(c.data || []);
    setWorkers(w.data || []);
    setRequests(r.data || []);
    setNotifications(n.data || []);
    setLoading(false);
  }

  async function fetchNotifications() {
    const { data } = await supabase.from('notifications').select('*').eq('shop_code', user.shop_code).eq('target_role', 'owner').order('created_at', { ascending: false });
    setNotifications(data || []);
  }

  async function markNotifRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    fetchNotifications();
  }

  async function assignWorker(customerId, workerId) {
    await supabase.from('customers').update({ assigned_worker_id: workerId }).eq('id', customerId);
    if (workerId) {
      const customer = customers.find(c => c.id === customerId);
      await supabase.from('notifications').insert({
        shop_code: user.shop_code,
        target_role: 'worker',
        target_id: workerId,
        title: 'New customer assigned',
        body: `${customer.name} has been assigned to you`,
      });
    }
    fetchAll();
  }

  async function markRead(customerId) {
    await supabase.from('customers').update({ is_new: false }).eq('id', customerId);
    fetchAll();
  }

  const unread = notifications.filter(n => !n.is_read).length;
  const newCustomers = customers.filter(c => c.is_new);
  const totalLitres = requests.reduce((sum, r) => sum + Number(r.litres), 0);

  if (loading) return (
    <div style={{ padding: 40, fontFamily: 'DM Sans', color: C.steel, textAlign: 'center' }}>Loading...</div>
  );

  if (openCustomer) {
    return <CustomerDetail
      c={openCustomer}
      workers={workers}
      requests={requests}
      onBack={() => { setOpenCustomer(null); fetchAll(); }}
      assignWorker={assignWorker}
      shopCode={user.shop_code}
    />;
  }

  if (openWorker) {
    return <WorkerDetail
      w={openWorker}
      customers={customers}
      requests={requests}
      onBack={() => { setOpenWorker(null); fetchAll(); }}
      assignWorker={assignWorker}
    />;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, paddingBottom: 80 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap');`}</style>

      <div style={{ padding: '52px 24px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.steel }}>Good morning,</div>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 28, color: C.navy }}>{user.name}</div>
          <div style={{ fontFamily: 'DM Mono', fontSize: 13, color: C.green, marginTop: 4 }}>Code: {user.shop_code}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowNotifs(true)} style={{ position: 'relative', width: 42, height: 42, borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            🔔
            {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: C.amber, color: C.white, fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>}
          </button>
          <button onClick={onLogout} style={{ width: 42, height: 42, borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>🚪</button>
        </div>
      </div>

      {newCustomers.length > 0 && (
        <div onClick={() => setTab('customers')} style={{ margin: '0 24px 16px', background: C.amberLight, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: `1px solid ${C.amber}30` }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1, fontFamily: 'DM Sans', fontSize: 13.5, fontWeight: 700, color: C.navy }}>{newCustomers.length} new {newCustomers.length === 1 ? 'customer' : 'customers'} — assign to a worker</div>
          <span style={{ color: C.amber }}>→</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, padding: '0 24px 16px' }}>
        {[
          { label: 'Customers', value: customers.length },
          { label: "Today's litres", value: `${totalLitres}L` },
          { label: 'Workers', value: workers.length },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: C.white, borderRadius: 16, padding: '14px 12px', border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: 'DM Mono', fontSize: 22, fontWeight: 700, color: C.navy }}>{s.value}</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: C.steel, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 24px 16px' }}>
        {[['customers', 'Customers'], ['workers', 'Workers']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '11px 0', borderRadius: 12, border: `1px solid ${C.border}`, cursor: 'pointer',
            fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14,
            background: tab === key ? C.navy : C.white,
            color: tab === key ? C.white : C.navy,
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tab === 'customers' && customers.map(c => {
          const request = requests.find(r => r.customer_id === c.id);
          const worker = workers.find(w => w.id === c.assigned_worker_id);
          return (
            <button key={c.id} onClick={() => { setOpenCustomer(c); markRead(c.id); }} style={{
              display: 'flex', alignItems: 'center', gap: 12, background: C.white,
              border: `1.5px solid ${c.is_new ? C.amber : C.border}`,
              borderRadius: 16, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', width: '100%',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 700, color: C.navy }}>{c.name}</div>
                  {c.is_new && <span style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.amber, background: C.amberLight, padding: '2px 8px', borderRadius: 999 }}>New</span>}
                  {requests.find(r => r.customer_id === c.id && r.status === 'pending') && <span style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.amber, background: C.amberLight, padding: '2px 8px', borderRadius: 999 }}>⚠️ Approval needed</span>}
                  {c.balance <= 2 && c.balance > 0 && <span style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.amber, background: C.amberLight, padding: '2px 8px', borderRadius: 999 }}>Low</span>}
                  {c.balance <= 0 && c.total_assigned > 0 && <span style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.red, background: '#FDECEA', padding: '2px 8px', borderRadius: 999 }}>Empty</span>}
                </div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel }}>{c.address}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel, marginTop: 4 }}>
                  {request ? `${request.litres}L · ${request.product}` : 'No request yet'}
                  {' · '}
                  {c.balance || 0}L remaining
                  {worker ? ` · 🚴 ${worker.name}` : ' · ⚠️ No worker'}
                </div>
              </div>
              <span style={{ color: C.steel }}>→</span>
            </button>
          );
        })}

        {tab === 'workers' && workers.map(w => {
          const count = customers.filter(c => c.assigned_worker_id === w.id).length;
          return (
            <button key={w.id} onClick={() => setOpenWorker(w)} style={{
              display: 'flex', alignItems: 'center', gap: 12, background: C.white,
              border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 16px',
              cursor: 'pointer', textAlign: 'left', width: '100%',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚴</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 700, color: C.navy }}>{w.name}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel, marginTop: 3 }}>{count} customer{count !== 1 ? 's' : ''} assigned</div>
              </div>
              <span style={{ color: C.steel }}>→</span>
            </button>
          );
        })}
      </div>

      {showNotifs && (
        <div style={{ position: 'fixed', inset: 0, background: C.cream, zIndex: 50, maxWidth: 430, margin: '0 auto' }}>
          <div style={{ padding: '52px 24px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setShowNotifs(false)} style={{ width: 40, height: 40, borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>←</button>
            <div style={{ fontFamily: 'DM Serif Display', fontSize: 24, color: C.navy }}>Notifications</div>
          </div>
          <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.length === 0 && <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.steel, textAlign: 'center', padding: 40 }}>No notifications yet.</div>}
            {notifications.map(n => (
              <button key={n.id} onClick={() => markNotifRead(n.id)} style={{
                display: 'flex', gap: 12, padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
                textAlign: 'left', width: '100%',
                background: n.is_read ? C.white : C.greenLight,
                border: `1px solid ${n.is_read ? C.border : C.green + '40'}`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700, color: C.navy }}>{n.title}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel, marginTop: 3 }}>{n.body}</div>
                </div>
                {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: 999, background: C.green, marginTop: 4, flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function BalanceHistoryCard({ customerId }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    supabase.from('balance_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setHistory(data || []));
  }, [customerId]);

  if (history.length === 0) return null;

  return (
    <div style={{ background: C.white, borderRadius: 18, padding: 18, border: `1px solid ${C.border}` }}>
      <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.steel, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Balance history</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.map((h, i) => (
          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: C.cream, borderRadius: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 13.5, fontWeight: 700, color: C.navy }}>
                {h.previous_balance}L → {h.new_balance}L
              </div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel, marginTop: 2 }}>
                {new Date(h.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' · '}
                {new Date(h.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 16, fontWeight: 700, color: C.green }}>+{h.new_balance}L</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function CustomerDetail({ c, workers, requests, onBack, assignWorker, shopCode }) {
  const [newBalance, setNewBalance] = useState('');
  const [topupMsg, setTopupMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [customerData, setCustomerData] = useState(c);
  const request = requests.find(r => r.customer_id === c.id);
  const worker = workers.find(w => w.id === customerData.assigned_worker_id);

async function topUpBalance() {
    if (!newBalance || isNaN(newBalance) || Number(newBalance) <= 0) {
      setTopupMsg('Enter a valid amount.');
      return;
    }
    setSaving(true);
    const total = Number(newBalance);

    // Save history before updating
    await supabase.from('balance_history').insert({
      customer_id: c.id,
      shop_code: c.shop_code,
      previous_balance: customerData.balance || 0,
      new_balance: total,
      assigned_by: 'Owner',
    });

    const { data } = await supabase.from('customers').update({
      balance: total,
      total_assigned: total,
    }).eq('id', c.id).select().single();

    if (data) setCustomerData(data);

    // Notify customer
    await supabase.from('notifications').insert({
      shop_code: c.shop_code,
      target_role: 'customer',
      target_id: c.id,
      title: 'Balance updated',
      body: `Your milk balance has been set to ${total}L by your owner`,
    });

    setTopupMsg('Balance updated successfully!');
    setNewBalance('');
    setSaving(false);
  }
async function handleRequestAction(requestId, status) {
    await supabase.from('daily_requests').update({ status }).eq('id', requestId);

    // Notify customer
    await supabase.from('notifications').insert({
      shop_code: c.shop_code,
      target_role: 'customer',
      target_id: c.id,
      title: status === 'confirmed' ? '✅ Request approved!' : '❌ Request declined',
      body: status === 'confirmed'
        ? `Your request has been approved by the owner. Delivery will proceed tomorrow.`
        : `Your request was declined by the owner. Please contact them for more details.`,
    });

    // Refresh request
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_requests')
      .select('*')
      .eq('customer_id', c.id)
      .eq('date', today)
      .maybeSingle();

    if (data) {
      // Force re-render by updating parent
      onBack();
    }
  }
  const balance = customerData.balance || 0;
  const totalAssigned = customerData.total_assigned || 0;
  const used = totalAssigned - balance;

  return (
    <div style={{ minHeight: '100vh', background: C.cream, paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap');`}</style>
      <div style={{ padding: '52px 24px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 24, color: C.navy }}>{c.name}</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.steel }}>{c.address}</div>
        </div>
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Balance card */}
        <div style={{ background: C.navy, borderRadius: 20, padding: 24 }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 }}>Milk balance</div>
          <div style={{ display: 'flex' }}>
            {[
              { label: 'Total assigned', value: `${totalAssigned}L` },
              { label: 'Used', value: `${used}L` },
              { label: 'Remaining', value: `${balance}L` },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: 1, borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingRight: i < 2 ? 16 : 0, paddingLeft: i > 0 ? 16 : 0 }}>
                <div style={{ fontFamily: 'DM Mono', fontSize: 24, fontWeight: 700, color: i === 2 ? (balance <= 2 ? C.amber : C.green) : C.white }}>{s.value}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top up */}
        <div style={{ background: C.white, borderRadius: 18, padding: 18, border: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.steel, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Assign / top up balance</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.steel, marginBottom: 12 }}>Enter total litres after customer pays. This replaces the current balance.</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="number"
              placeholder="e.g. 43"
              value={newBalance}
              onChange={e => { setNewBalance(e.target.value); setTopupMsg(''); }}
              style={{ flex: 1, padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 18, fontFamily: 'DM Mono', fontWeight: 700, color: C.navy, background: C.cream }}
            />
            <button onClick={topUpBalance} disabled={saving} style={{ padding: '14px 20px', background: C.green, color: C.white, border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              Set
            </button>
          </div>
          {topupMsg && <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: topupMsg.includes('success') ? C.green : C.amber, marginTop: 10 }}>{topupMsg}</div>}
        </div>

        {/* Contact */}
        <div style={{ background: C.white, borderRadius: 18, padding: 18, border: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.steel, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Contact</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.navy }}>📞 {c.phone}</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.navy, marginTop: 6 }}>📍 {c.address}</div>
        </div>

      {/* Today's request */}
        <div style={{ background: C.white, borderRadius: 18, padding: 18, border: `1px solid ${request?.status === 'pending' ? C.amber : C.border}` }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.steel, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Today's request</div>
          {request ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 32, fontWeight: 700, color: C.green }}>{request.litres}L</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.steel, marginTop: 4 }}>{request.product}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {request.status === 'pending' && (
                    <span style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: C.amber, background: C.amberLight, padding: '4px 10px', borderRadius: 999 }}>
                      Needs approval
                    </span>
                  )}
                  {request.status === 'confirmed' && (
                    <span style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: C.green, background: C.greenLight, padding: '4px 10px', borderRadius: 999 }}>
                      Confirmed
                    </span>
                  )}
                  {request.status === 'declined' && (
                    <span style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: C.red, background: '#FDECEA', padding: '4px 10px', borderRadius: 999 }}>
                      Declined
                    </span>
                  )}
                </div>
              </div>

              {request.status === 'pending' && (
                <div style={{ marginTop: 12, padding: 14, background: C.amberLight, borderRadius: 12, border: `1px solid ${C.amber}30` }}>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.navy, marginBottom: 12 }}>
                    ⚠️ Customer requested <b>{request.litres}L</b> but only has <b>{customerData.balance}L</b> remaining. Approve to allow delivery anyway?
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => handleRequestAction(request.id, 'confirmed')} style={{
                      flex: 1, padding: '12px', background: C.green, color: C.white,
                      border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
                      fontFamily: 'DM Sans', cursor: 'pointer',
                    }}>
                      ✓ Approve
                    </button>
                    <button onClick={() => handleRequestAction(request.id, 'declined')} style={{
                      flex: 1, padding: '12px', background: C.red, color: C.white,
                      border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
                      fontFamily: 'DM Sans', cursor: 'pointer',
                    }}>
                      ✗ Decline
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.steel }}>No request yet for today</div>
          )}
        </div>

        {/* Assigned worker */}
        <div style={{ background: C.white, borderRadius: 18, padding: 18, border: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.steel, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Assigned worker</div>
          {worker ? (
            <div style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 12 }}>🚴 {worker.name}</div>
          ) : (
            <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.amber, marginBottom: 12 }}>Not assigned yet</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {workers.map(w => (
              <button key={w.id} onClick={() => assignWorker(c.id, w.id)} style={{
                padding: '10px 14px', borderRadius: 12,
                border: `1.5px solid ${customerData.assigned_worker_id === w.id ? C.green : C.border}`,
                background: customerData.assigned_worker_id === w.id ? C.greenLight : C.white,
                fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
                color: customerData.assigned_worker_id === w.id ? C.green : C.navy,
                cursor: 'pointer', textAlign: 'left',
              }}>
                {customerData.assigned_worker_id === w.id ? '✓ ' : ''}{w.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  {/* Balance history */}
        <BalanceHistoryCard customerId={c.id} />
}

function WorkerDetail({ w, customers, requests, onBack, assignWorker }) {
  const assignedCustomers = customers.filter(c => c.assigned_worker_id === w.id);
  const unassignedCustomers = customers.filter(c => !c.assigned_worker_id);

  return (
    <div style={{ minHeight: '100vh', background: C.cream, paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap');`}</style>
      <div style={{ padding: '52px 24px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 24, color: C.navy }}>{w.name}</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.steel }}>{assignedCustomers.length} customers assigned</div>
        </div>
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: C.white, borderRadius: 18, padding: 18, border: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.steel, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Assigned customers</div>
          {assignedCustomers.length === 0 && <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.steel }}>No customers assigned yet.</div>}
          {assignedCustomers.map(c => {
            const request = requests.find(r => r.customer_id === c.id);
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: C.cream, borderRadius: 12, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700, color: C.navy }}>{c.name}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel }}>{c.address}</div>
                  {request && <div style={{ fontFamily: 'DM Mono', fontSize: 13, color: C.green, marginTop: 4 }}>{request.litres}L · {request.product}</div>}
                </div>
                <button onClick={() => assignWorker(c.id, null)} style={{ background: 'none', border: 'none', color: '#D94F3D', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans', cursor: 'pointer' }}>Remove</button>
              </div>
            );
          })}
        </div>

        {unassignedCustomers.length > 0 && (
          <div style={{ background: C.white, borderRadius: 18, padding: 18, border: `1.5px solid ${C.green}` }}>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.steel, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Assign customers</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel, marginBottom: 12 }}>Only unassigned customers shown here.</div>
            {unassignedCustomers.map(c => (
              <button key={c.id} onClick={() => assignWorker(c.id, w.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: C.cream,
                border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 8,
                cursor: 'pointer', width: '100%', textAlign: 'left',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700, color: C.navy }}>{c.name}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel }}>{c.address}</div>
                </div>
                <span style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: C.green, background: C.greenLight, padding: '4px 10px', borderRadius: 999 }}>Assign</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
}
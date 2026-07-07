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
};

export default function CustomerHome({ user, onLogout }) {
  const [litres, setLitres] = useState('');
  const [product, setProduct] = useState('');
  const [todayRequest, setTodayRequest] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [customerData, setCustomerData] = useState(user);

  useEffect(() => {
    fetchData();
    const sub = supabase
      .channel('customer-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchData() {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [req, notifs, cust] = await Promise.all([
      supabase.from('daily_requests').select('*').eq('customer_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('notifications').select('*').eq('target_role', 'customer').eq('target_id', user.id).order('created_at', { ascending: false }),
      supabase.from('customers').select('*').eq('id', user.id).single(),
    ]);
    if (req.data) {
      setTodayRequest(req.data);
      setLitres(String(req.data.litres));
      setProduct(req.data.product);
    }
    setNotifications(notifs.data || []);
    if (cust.data) setCustomerData(cust.data);
    setLoading(false);
  }

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_role', 'customer')
      .eq('target_id', user.id)
      .order('created_at', { ascending: false });
    setNotifications(data || []);
  }

  async function markNotifRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    fetchNotifications();
  }

 async function saveRequest() {
    if (!litres || isNaN(litres) || Number(litres) <= 0) {
      setMessage('Enter a valid litre amount.');
      return;
    }
    if (!product.trim()) {
      setMessage('Enter the milk product name.');
      return;
    }
    setSaving(true);
    setMessage('');
    const today = new Date().toISOString().split('T')[0];
    const requestedLitres = Number(litres);
    const exceedsBalance = requestedLitres > customerData.balance;
    const status = exceedsBalance ? 'pending' : 'confirmed';

    try {
      if (todayRequest) {
        await supabase.from('daily_requests').update({
          litres: requestedLitres,
          product: product.trim(),
          status,
        }).eq('id', todayRequest.id);
      } else {
        await supabase.from('daily_requests').insert({
          customer_id: user.id,
          shop_code: user.shop_code,
          litres: requestedLitres,
          product: product.trim(),
          date: today,
          status,
        });
      }

      // If exceeds balance notify owner for approval
      if (exceedsBalance) {
        await supabase.from('notifications').insert({
          shop_code: user.shop_code,
          target_role: 'owner',
          title: '⚠️ Approval needed',
          body: `${customerData.name} requested ${requestedLitres}L but only has ${customerData.balance}L remaining`,
        });
        setMessage('Request sent — waiting for owner approval since it exceeds your balance.');
      } else {
        setMessage('Request saved successfully!');
      }

      fetchData();
    } catch (err) {
      setMessage('Something went wrong. Try again.');
    }
    setSaving(false);
  }
  const unread = notifications.filter(n => !n.is_read).length;
  const balance = customerData.balance || 0;
  const totalAssigned = customerData.total_assigned || 0;
  const used = totalAssigned - balance;
  const isLow = balance <= 2 && balance > 0;
  const isEmpty = balance === 0;

  if (loading) return (
    <div style={{ padding: 40, fontFamily: 'DM Sans', color: C.steel, textAlign: 'center' }}>Loading...</div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.cream, paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ padding: '52px 24px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: C.steel, marginBottom: 8 }}>
  How many litres? 
  <span style={{ color: customerData.balance <= 2 ? C.amber : C.green, marginLeft: 6 }}>
    {customerData.balance}L remaining
  </span>
</div>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 28, color: C.navy }}>{customerData.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowNotifs(true)} style={{ position: 'relative', width: 42, height: 42, borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            🔔
            {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: C.amber, color: C.white, fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>}
          </button>
          <button onClick={onLogout} style={{ width: 42, height: 42, borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>🚪</button>
        </div>
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Balance card */}
        <div style={{ background: C.navy, borderRadius: 20, padding: 24 }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 }}>Your milk balance</div>
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { label: 'Total assigned', value: `${totalAssigned}L` },
              { label: 'Used', value: `${used}L` },
              { label: 'Remaining', value: `${balance}L` },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: 1, borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingRight: i < 2 ? 16 : 0, paddingLeft: i > 0 ? 16 : 0 }}>
                <div style={{ fontFamily: 'DM Mono', fontSize: 24, fontWeight: 700, color: i === 2 ? (isLow ? C.amber : C.green) : C.white }}>{s.value}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {isLow && (
            <div style={{ marginTop: 16, background: C.amberLight, borderRadius: 10, padding: '10px 14px', fontFamily: 'DM Sans', fontSize: 13, color: C.amber, fontWeight: 600 }}>
              ⚠️ Running low — contact your owner to top up soon
            </div>
          )}
          {isEmpty && totalAssigned === 0 && (
            <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', fontFamily: 'DM Sans', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              No balance assigned yet — pay your owner to get started
            </div>
          )}
        </div>

      {/* Today's confirmed request */}
        {todayRequest && (
          <div style={{ background: todayRequest.status === 'declined' ? '#FDECEA' : todayRequest.status === 'pending' ? C.amberLight : C.navy, borderRadius: 20, padding: 24 }}>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: todayRequest.status === 'declined' ? C.red : todayRequest.status === 'pending' ? C.amber : 'rgba(255,255,255,0.45)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
              {todayRequest.status === 'declined' ? 'Request declined' : todayRequest.status === 'pending' ? 'Waiting for approval' : "Tomorrow's delivery"}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontFamily: 'DM Mono', fontSize: 40, fontWeight: 700, color: todayRequest.status === 'declined' ? C.red : todayRequest.status === 'pending' ? C.amber : C.white }}>{todayRequest.litres}L</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 15, color: todayRequest.status === 'declined' ? C.red : todayRequest.status === 'pending' ? C.amber : 'rgba(255,255,255,0.55)' }}>
                {todayRequest.product} · {todayRequest.status === 'declined' ? 'Declined ✗' : todayRequest.status === 'pending' ? 'Pending ⏳' : 'Confirmed ✓'}
              </div>
            </div>
            {todayRequest.status === 'declined' && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.red, marginTop: 10 }}>
                Your request was declined. Please contact your owner to top up your balance.
              </div>
            )}
          </div>
        )}

        {/* Request form */}
        {balance > 0 && (
          <div style={{ background: C.white, borderRadius: 20, padding: 20, border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.steel, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 }}>
              {todayRequest ? "Change tomorrow's order" : "Set tomorrow's order"}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: C.steel, marginBottom: 8 }}>How many litres? (max {balance}L remaining)</div>
              <input
                type="number"
                placeholder="e.g. 2"
                value={litres}
                onChange={e => { setLitres(e.target.value); setMessage(''); }}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 20, fontFamily: 'DM Mono', fontWeight: 700, color: C.navy, background: C.cream }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: C.steel, marginBottom: 8 }}>Which milk?</div>
              <input
                type="text"
                placeholder="e.g. Full Cream, Toned, Buffalo Milk"
                value={product}
                onChange={e => { setProduct(e.target.value); setMessage(''); }}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 15, fontFamily: 'DM Sans', color: C.navy, background: C.cream }}
              />
            </div>

            {message && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: message.includes('success') ? C.green : C.amber, marginBottom: 12 }}>
                {message}
              </div>
            )}

            <button onClick={saveRequest} disabled={saving} style={{
              width: '100%', padding: '16px', background: C.green, color: C.white, border: 'none',
              borderRadius: 14, fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans', cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving...' : todayRequest ? 'Update request' : 'Submit request'}
            </button>
            <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel, textAlign: 'center', marginTop: 10 }}>
              Submit before 9:00 PM tonight
            </div>
          </div>
        )}
      </div>

      {/* Notifications panel */}
      {showNotifs && (
        <div style={{ position: 'fixed', inset: 0, background: C.cream, zIndex: 50, maxWidth: 430, margin: '0 auto' }}>
          <div style={{ padding: '52px 24px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setShowNotifs(false)} style={{ width: 40, height: 40, borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>←</button>
            <div style={{ fontFamily: 'DM Serif Display', fontSize: 24, color: C.navy }}>Notifications</div>
          </div>
          <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.length === 0 && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.steel, textAlign: 'center', padding: 40 }}>
                No notifications yet.
              </div>
            )}
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
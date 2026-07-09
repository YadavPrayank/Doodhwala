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

export default function WorkerHome({ user, onLogout }) {
  const [stops, setStops] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeStop, setActiveStop] = useState(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetchData();
    const sub = supabase
      .channel('worker-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchData() {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('assigned_worker_id', user.id);

    if (!customers || customers.length === 0) {
      setStops([]);
      setDelivered([]);
      setLoading(false);
      return;
    }

    const customerIds = customers.map(c => c.id);

    const { data: requests } = await supabase
      .from('daily_requests')
      .select('*')
      .in('customer_id', customerIds)
      .eq('date', today);

    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('*')
      .eq('worker_id', user.id)
      .gte('delivered_at', `${today}T00:00:00`);

    const deliveredIds = (deliveries || []).map(d => d.customer_id);

    const stopsWithDetails = (requests || []).map(r => {
      const customer = customers.find(c => c.id === r.customer_id);
      return { ...r, customer };
    }).filter(r => r.customer);

    setStops(stopsWithDetails.filter(s => !deliveredIds.includes(s.customer_id)));
    setDelivered(stopsWithDetails.filter(s => deliveredIds.includes(s.customer_id)));
    await fetchNotifications();
    setLoading(false);
  }

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_role', 'worker')
      .eq('target_id', user.id)
      .order('created_at', { ascending: false });
    setNotifications(data || []);
  }

  async function markNotifRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    fetchNotifications();
  }

  async function markDelivered() {
    if (!activeStop) return;
    setMarking(true);
    try {
      await supabase.from('deliveries').insert({
        customer_id: activeStop.customer_id,
        worker_id: user.id,
        shop_code: user.shop_code,
        litres: activeStop.litres,
        product: activeStop.product,
      });

      const newBalance = Number(activeStop.customer.balance) - Number(activeStop.litres);

      await supabase.from('customers').update({
        balance: newBalance,
      }).eq('id', activeStop.customer_id);

      await supabase.from('notifications').insert({
        shop_code: user.shop_code,
        target_role: 'owner',
        title: 'Delivery complete',
        body: `${user.name} delivered ${activeStop.litres}L ${activeStop.product} to ${activeStop.customer.name}`,
      });

      await supabase.from('notifications').insert({
        shop_code: user.shop_code,
        target_role: 'customer',
        target_id: activeStop.customer_id,
        title: 'Your milk was delivered!',
        body: `${activeStop.litres}L ${activeStop.product} delivered by ${user.name}. Remaining balance: ${newBalance}L`,
      });

      if (newBalance <= 2 && newBalance > 0) {
        await supabase.from('notifications').insert({
          shop_code: user.shop_code,
          target_role: 'owner',
          title: `⚠️ ${activeStop.customer.name} is running low`,
          body: `Only ${newBalance}L remaining — ask them to top up soon`,
        });
      }

      if (newBalance <= 0) {
        await supabase.from('notifications').insert({
          shop_code: user.shop_code,
          target_role: 'owner',
          title: `🚨 ${activeStop.customer.name}'s balance is empty`,
          body: `Balance has run out — no more deliveries until they top up`,
        });
      }

      setActiveStop(null);
      setPhotoTaken(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
    setMarking(false);
  }

  const unread = notifications.filter(n => !n.is_read).length;

  if (loading) return (
    <div style={{ padding: 40, fontFamily: 'DM Sans', color: C.steel, textAlign: 'center' }}>Loading...</div>
  );

  if (activeStop) {
    return (
      <div style={{ minHeight: '100vh', background: C.cream }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap');`}</style>
        <div style={{ padding: '52px 24px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { setActiveStop(null); setPhotoTaken(false); }} style={{ width: 40, height: 40, borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>←</button>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 24, color: C.navy }}>{activeStop.customer.name}</div>
        </div>

        <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: C.navy, borderRadius: 20, padding: 32, textAlign: 'center' }}>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>Deliver today</div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 72, fontWeight: 700, color: C.white, lineHeight: 1 }}>{activeStop.litres}L</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 15, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>{activeStop.product}</div>
          </div>

          <div style={{ background: C.white, borderRadius: 18, padding: 18, border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.steel, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Delivery address</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 15, color: C.navy, lineHeight: 1.6 }}>📍 {activeStop.customer.address}</div>
          </div>

          <button onClick={() => setPhotoTaken(true)} style={{
            padding: '28px 16px', borderRadius: 18, cursor: 'pointer', width: '100%',
            border: `2px ${photoTaken ? 'solid' : 'dashed'} ${photoTaken ? C.green : C.border}`,
            background: photoTaken ? C.greenLight : C.white,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            <div style={{ fontSize: 28 }}>{photoTaken ? '✅' : '📷'}</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: photoTaken ? C.green : C.navy }}>
              {photoTaken ? 'Photo attached' : 'Take a photo (optional)'}
            </div>
          </button>

          <button onClick={markDelivered} disabled={marking} style={{
            padding: '18px', background: C.green, color: C.white, border: 'none',
            borderRadius: 16, fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans',
            cursor: 'pointer', opacity: marking ? 0.7 : 1,
          }}>
            {marking ? 'Marking...' : '✓ Mark as delivered'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap');`}</style>

      <div style={{ padding: '52px 24px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.steel }}>Good morning,</div>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 28, color: C.navy }}>{user.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowNotifs(true)} style={{ position: 'relative', width: 42, height: 42, borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            🔔
            {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: C.amber, color: C.white, fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>}
          </button>
          <button onClick={onLogout} style={{ width: 42, height: 42, borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>🚪</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, padding: '0 24px 20px' }}>
        {[
          { label: 'Stops left', value: stops.length },
          { label: 'Delivered', value: delivered.length },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: C.white, borderRadius: 16, padding: '14px', border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: 'DM Mono', fontSize: 26, fontWeight: 700, color: C.navy }}>{s.value}</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stops.length === 0 && delivered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: 'DM Sans', fontSize: 14, color: C.steel }}>
            No deliveries assigned for today.
          </div>
        )}

 {(() => {
          // Group stops by building + area
        const groups = {};
          stops.forEach(s => {
            const building = (s.customer.building || '').trim().toLowerCase();
            const area = (s.customer.area || '').trim().toLowerCase();
            const key = building && area
              ? `${building}||${area}`
              : building || area || 'unknown';
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
          });
          return Object.entries(groups).map(([groupKey, groupStops]) => (
            <div key={groupKey}>
              {/* Building group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, marginTop: 4 }}>
               <div style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: C.navy }}>
                🏢 {groupStops[0].customer.building} — {groupStops[0].customer.area}
              </div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: C.steel, marginTop: 2 }}>
                {groupStops.length} stop{groupStops.length !== 1 ? 's' : ''} in this building
              </div>
               <div style={{ flex: 1, height: 1, background: C.border }} />
                <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: C.steel }}>{groupStops.length} stop{groupStops.length !== 1 ? 's' : ''}</div>
              </div>

              {/* Stops in this building */}
              {groupStops.map(s => (
                <button key={s.id} onClick={() => setActiveStop(s)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, background: C.white,
                  border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 16px',
                  cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: 8,
                }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🥛</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 700, color: C.navy }}>{s.customer.name}</div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel, marginTop: 2 }}>
                    {s.customer.flat ? `Flat ${s.customer.flat}` : s.customer.address}
                  </div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel, marginTop: 1 }}>{s.product}</div>
                  </div>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 20, fontWeight: 700, color: C.green }}>{s.litres}L</div>
                  <span style={{ color: C.steel, marginLeft: 4 }}>→</span>
                </button>
              ))}
            </div>
          ));
        })()}
     {delivered.length > 0 && (
          <>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.steel, letterSpacing: 1, textTransform: 'uppercase', marginTop: 8, marginBottom: 8 }}>Delivered</div>
            {delivered.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, background: C.white,
                border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 16px',
                opacity: 0.5, marginBottom: 8,
              }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 700, color: C.navy, textDecoration: 'line-through' }}>{s.customer.name}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel, marginTop: 2 }}>{s.customer.flat || s.customer.address}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.steel, marginTop: 1 }}>{s.product}</div>
                </div>
                <div style={{ fontFamily: 'DM Mono', fontSize: 20, fontWeight: 700, color: C.green }}>{s.litres}L</div>
              </div>
            ))}
          </>
        )}
      </div>

      {showNotifs && (
        <div style={{ position: 'fixed', inset: 0, background: C.cream, zIndex: 50, maxWidth: 430, margin: '0 auto' }}>
          <div style={{ padding: '52px 24px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setShowNotifs(false)} style={{ width: 40, height: 40, borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>←</button>
            <div style={{ fontFamily: 'DM Serif Display', fontSize: 24, color: C.navy }}>Notifications</div>
          </div>
          <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.length === 0 && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.steel, textAlign: 'center', padding: 40 }}>No notifications yet.</div>
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
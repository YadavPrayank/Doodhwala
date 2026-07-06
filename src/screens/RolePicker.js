import React from 'react';

const C = {
  navy: '#0F1F2E',
  green: '#2E7D5E',
  cream: '#F7F4EF',
  border: '#E4DDD4',
  steel: '#6B7F8E',
  white: '#FFFFFF',
};

export default function RolePicker({ onPick }) {
  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap');`}</style>

      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ width: 70, height: 70, background: C.green, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M6 2h12l-1 4H7L6 2z" fill="white" opacity="0.4"/>
            <path d="M5 6h14l2 14H3L5 6z" fill="white" opacity="0.2"/>
            <path d="M5 6h14l2 14H3L5 6z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M6 2h12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ fontFamily: 'DM Serif Display', fontSize: 38, color: C.white, marginBottom: 8 }}>Doodhwala</div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>Digital milk delivery</div>
      </div>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { role: 'owner', label: 'Owner', desc: 'Manage your dairy shop', icon: '🏪' },
          { role: 'worker', label: 'Worker', desc: 'View your deliveries', icon: '🚴' },
          { role: 'customer', label: 'Customer', desc: 'Order your daily milk', icon: '🥛' },
        ].map(r => (
          <button key={r.role} onClick={() => onPick(r.role)} style={{
            display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: '18px 20px',
            cursor: 'pointer', textAlign: 'left', width: '100%',
          }}>
            <div style={{ fontSize: 28 }}>{r.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 16, fontWeight: 700, color: C.white }}>{r.label}</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{r.desc}</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        ))}
      </div>
    </div>
  );
}
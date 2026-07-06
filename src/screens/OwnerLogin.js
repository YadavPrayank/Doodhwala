import React, { useState } from 'react';
import { supabase } from '../supabase';
import { checkAndLogin, registerUser } from '../auth';

const C = {
  navy: '#0F1F2E',
  green: '#2E7D5E',
  cream: '#F7F4EF',
  border: '#E4DDD4',
  steel: '#6B7F8E',
  white: '#FFFFFF',
  amber: '#F5A623',
};

function generateShopCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  return letters[Math.floor(Math.random() * 26)] +
    letters[Math.floor(Math.random() * 26)] +
    digits[Math.floor(Math.random() * 10)] +
    digits[Math.floor(Math.random() * 10)] +
    digits[Math.floor(Math.random() * 10)] +
    digits[Math.floor(Math.random() * 10)];
}

export default function OwnerLogin({ onLogin }) {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function checkPhone() {
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await checkAndLogin(phone, 'owner');

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.user) {
      onLogin('owner', result.user);
    } else {
      setStep('details');
    }
    setLoading(false);
  }

  async function createShop() {
    if (!shopName.trim()) { setError('Enter your shop name.'); return; }
    if (!ownerName.trim()) { setError('Enter your name.'); return; }
    setLoading(true);
    setError('');

    const shopCode = generateShopCode();

    const result = await registerUser(phone, 'owner', shopCode, {
      name: ownerName,
      shop_name: shopName,
      shop_code: shopCode,
    });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onLogin('owner', result.user);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, padding: '60px 24px 24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'DM Serif Display', fontSize: 30, color: C.navy, marginBottom: 6 }}>
          {step === 'phone' ? 'Owner login' : 'Set up your shop'}
        </div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.steel }}>
          {step === 'phone' ? 'Enter your phone number to continue.' : 'Tell us about your dairy shop.'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {step === 'phone' && (
          <input type="tel" placeholder="Phone number" value={phone}
            onChange={e => { setPhone(e.target.value); setError(''); }}
            style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'DM Sans', background: C.white }} />
        )}

        {step === 'details' && (
          <>
            <input type="text" placeholder="Shop name (e.g. Sharma Dairy)" value={shopName}
              onChange={e => { setShopName(e.target.value); setError(''); }}
              style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'DM Sans', background: C.white }} />
            <input type="text" placeholder="Your full name" value={ownerName}
              onChange={e => { setOwnerName(e.target.value); setError(''); }}
              style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'DM Sans', background: C.white }} />
          </>
        )}

        {error && (
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.amber }}>{error}</div>
        )}

        <button onClick={step === 'phone' ? checkPhone : createShop} disabled={loading}
          style={{ padding: '16px', background: C.green, color: C.white, border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Please wait...' : step === 'phone' ? 'Continue' : 'Create shop'}
        </button>

        {step !== 'phone' && (
          <button onClick={() => { setStep('phone'); setError(''); }}
            style={{ background: 'none', border: 'none', color: C.steel, fontSize: 13, fontFamily: 'DM Sans', cursor: 'pointer' }}>
            Start over
          </button>
        )}
      </div>
    </div>
  );
}
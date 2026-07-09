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

export default function CustomerLogin({ onLogin }) {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [shopCode, setShopCode] = useState('');
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [building, setBuilding] = useState('');
  const [flat, setFlat] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function checkPhone() {
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await checkAndLogin(phone, 'customer');

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.user) {
      onLogin('customer', result.user);
    } else {
      setStep('shopcode');
    }
    setLoading(false);
  }

  async function checkShopCode() {
    if (!shopCode.trim()) { setError('Enter the shop code.'); return; }
    setLoading(true);
    setError('');
    const { data } = await supabase
      .from('owners')
      .select('*')
      .eq('shop_code', shopCode.trim().toUpperCase())
      .maybeSingle();

    if (!data) { setError('Wrong shop code. Ask your owner.'); setLoading(false); return; }
    setStep('details');
    setLoading(false);
  }

  async function createAccount() {
    if (!name.trim()) { setError('Enter your name.'); return; }
    if (!area.trim()) { setError('Enter your area / locality.'); return; }
    if (!building.trim()) { setError('Enter your building name.'); return; }
    if (!flat.trim()) { setError('Enter your flat / room number.'); return; }
    setLoading(true);
    setError('');

    const fullAddress = `${flat}, ${building}, ${area}`;

    const result = await registerUser(phone, 'customer', shopCode.trim().toUpperCase(), {
      name,
      address: fullAddress,
      area: area.trim(),
      building: building.trim(),
      flat: flat.trim(),
    });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onLogin('customer', result.user);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, padding: '60px 24px 24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'DM Serif Display', fontSize: 30, color: C.navy, marginBottom: 6 }}>
          {step === 'phone' && 'Customer login'}
          {step === 'shopcode' && 'Shop code'}
          {step === 'details' && 'Your details'}
        </div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.steel }}>
          {step === 'phone' && 'Enter your phone number to continue.'}
          {step === 'shopcode' && 'Ask your dairy owner for their shop code.'}
          {step === 'details' && 'Fill in your details so the worker can find you.'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {step === 'phone' && (
          <input type="tel" placeholder="Phone number" value={phone}
            onChange={e => { setPhone(e.target.value); setError(''); }}
            style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'DM Sans', background: C.white }} />
        )}

        {step === 'shopcode' && (
          <input type="text" placeholder="Shop code (e.g. SD4521)" value={shopCode}
            onChange={e => { setShopCode(e.target.value); setError(''); }}
            style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 18, fontFamily: 'DM Mono', textAlign: 'center', letterSpacing: 4, textTransform: 'uppercase', background: C.white }} />
        )}

        {step === 'details' && (
          <>
           <input type="text" placeholder="Flat / Room no. (e.g. B-204, 2nd Floor)" value={flat}
              onChange={e => { setFlat(e.target.value); setError(''); }}
              style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'DM Sans', background: C.white }} />
            <input type="text" placeholder="Building / Society name (e.g. Sai Niwas)" value={building}
              onChange={e => { setBuilding(e.target.value); setError(''); }}
              style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'DM Sans', background: C.white }} />
            <input type="text" placeholder="Area / Locality (e.g. Sector 5, Kharghar)" value={area}
              onChange={e => { setArea(e.target.value); setError(''); }}
              style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'DM Sans', background: C.white }} /> </>
        )}

        {error && (
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.amber }}>{error}</div>
        )}

        <button
          onClick={step === 'phone' ? checkPhone : step === 'shopcode' ? checkShopCode : createAccount}
          disabled={loading}
          style={{ padding: '16px', background: C.green, color: C.white, border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Please wait...' : step === 'phone' ? 'Continue' : step === 'shopcode' ? 'Confirm shop' : 'Create account'}
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
import React, { useState } from 'react';
import { supabase } from '../supabase';
import { checkAndLogin, verifyOtp, registerUser } from '../auth';

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
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [shopCode, setShopCode] = useState('');
  const [name, setName] = useState('');
  const [flat, setFlat] = useState('');
  const [building, setBuilding] = useState('');
  const [area, setArea] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function checkEmail() {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await checkAndLogin(email, 'customer');

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.user) {
      setIsNew(false);
      setStep('otp');
    } else {
      setIsNew(true);
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

  async function submitDetails() {
    if (!name.trim()) { setError('Enter your name.'); return; }
    if (!flat.trim()) { setError('Enter your flat / room number.'); return; }
    if (!building.trim()) { setError('Enter your building name.'); return; }
    if (!area.trim()) { setError('Enter your area / locality.'); return; }
    setLoading(true);
    setError('');

    const { error: otpError } = await supabase.auth.signInWithOtp({
  email: email.trim().toLowerCase(),
  options: {
    shouldCreateUser: false,
    emailRedirectTo: null,
  }
});
    if (otpError) { setError('Failed to send OTP. Try again.'); setLoading(false); return; }

    setStep('otp');
    setLoading(false);
  }

  async function checkOtp() {
    if (otp.length !== 6) { setError('Enter the 6-digit code.'); return; }
    setLoading(true);
    setError('');

    if (isNew) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp,
        type: 'email',
      });

      if (verifyError) { setError('Wrong code. Try again.'); setLoading(false); return; }

      const fullAddress = `${flat}, ${building}, ${area}`;
      const result = await registerUser(email, 'customer', shopCode.trim().toUpperCase(), {
        name,
        address: fullAddress,
        flat: flat.trim(),
        building: building.trim(),
        area: area.trim(),
      });

      if (!result.success) { setError(result.error); setLoading(false); return; }
      onLogin('customer', result.user);
    } else {
      const result = await verifyOtp(email, otp, 'customer');
      if (!result.success) { setError(result.error); setLoading(false); return; }
      onLogin('customer', result.user);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, padding: '60px 24px 24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'DM Serif Display', fontSize: 30, color: C.navy, marginBottom: 6 }}>
          {step === 'email' && 'Customer login'}
          {step === 'shopcode' && 'Shop code'}
          {step === 'details' && 'Your details'}
          {step === 'otp' && 'Check your email'}
        </div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.steel }}>
          {step === 'email' && 'Enter your email address to continue.'}
          {step === 'shopcode' && 'Ask your dairy owner for their shop code.'}
          {step === 'details' && 'Fill in your details so the worker can find you.'}
          {step === 'otp' && `We sent a 6-digit code to ${email}`}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {step === 'email' && (
          <input type="email" placeholder="Email address" value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'DM Sans', background: C.white }} />
        )}

        {step === 'shopcode' && (
          <input type="text" placeholder="Shop code (e.g. SD4521)" value={shopCode}
            onChange={e => { setShopCode(e.target.value); setError(''); }}
            style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 18, fontFamily: 'DM Mono', textAlign: 'center', letterSpacing: 4, textTransform: 'uppercase', background: C.white }} />
        )}

        {step === 'details' && (
          <>
            <input type="text" placeholder="Your full name" value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'DM Sans', background: C.white }} />
            <input type="text" placeholder="Flat / Room no. (e.g. B-204, 2nd Floor)" value={flat}
              onChange={e => { setFlat(e.target.value); setError(''); }}
              style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'DM Sans', background: C.white }} />
            <input type="text" placeholder="Building / Society name (e.g. Sai Niwas)" value={building}
              onChange={e => { setBuilding(e.target.value); setError(''); }}
              style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'DM Sans', background: C.white }} />
            <input type="text" placeholder="Area / Locality (e.g. Sector 5, Kharghar)" value={area}
              onChange={e => { setArea(e.target.value); setError(''); }}
              style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'DM Sans', background: C.white }} />
          </>
        )}

        {step === 'otp' && (
          <input type="tel" inputMode="numeric" placeholder="6-digit code" value={otp} maxLength={6}
            onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
            style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 24, fontFamily: 'DM Mono', textAlign: 'center', letterSpacing: 8, background: C.white }} />
        )}

        {error && <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.amber }}>{error}</div>}

        <button
          onClick={step === 'email' ? checkEmail : step === 'shopcode' ? checkShopCode : step === 'details' ? submitDetails : checkOtp}
          disabled={loading}
          style={{ padding: '16px', background: C.green, color: C.white, border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Please wait...' : step === 'email' ? 'Continue' : step === 'shopcode' ? 'Confirm shop' : step === 'details' ? 'Send verification code' : 'Verify & create account'}
        </button>

        {step !== 'email' && (
          <button onClick={() => { setStep('email'); setOtp(''); setError(''); }}
            style={{ background: 'none', border: 'none', color: C.steel, fontSize: 13, fontFamily: 'DM Sans', cursor: 'pointer' }}>
            Start over
          </button>
        )}
      </div>
    </div>
  );
}
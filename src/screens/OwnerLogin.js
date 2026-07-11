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
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
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

    const result = await checkAndLogin(email, 'owner');

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.user) {
      // Existing user — OTP sent
      setIsNew(false);
      setStep('otp');
    } else {
      // New user
      setIsNew(true);
      setStep('details');
    }
    setLoading(false);
  }

  async function checkOtp() {
    if (otp.length !== 6) { setError('Enter the 6-digit code.'); return; }
    setLoading(true);
    setError('');

    const result = await verifyOtp(email, otp, 'owner');

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onLogin('owner', result.user);
    setLoading(false);
  }

  async function createShop() {
    if (!shopName.trim()) { setError('Enter your shop name.'); return; }
    if (!ownerName.trim()) { setError('Enter your name.'); return; }
    setLoading(true);
    setError('');

    // Send OTP first
    const { error: otpError } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() });
    if (otpError) { setError('Failed to send OTP. Try again.'); setLoading(false); return; }

    setStep('otp_register');
    setLoading(false);
  }

  async function verifyAndRegister() {
    if (otp.length !== 6) { setError('Enter the 6-digit code.'); return; }
    setLoading(true);
    setError('');

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: 'email',
    });

    if (verifyError) { setError('Wrong code. Try again.'); setLoading(false); return; }

    const shopCode = generateShopCode();
    const result = await registerUser(email, 'owner', shopCode, {
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
          {step === 'email' && 'Owner login'}
          {step === 'details' && 'Set up your shop'}
          {(step === 'otp' || step === 'otp_register') && 'Check your email'}
        </div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.steel }}>
          {step === 'email' && 'Enter your email address to continue.'}
          {step === 'details' && 'Tell us about your dairy shop.'}
          {(step === 'otp' || step === 'otp_register') && `We sent a 6-digit code to ${email}`}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {step === 'email' && (
          <input type="email" placeholder="Email address" value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
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

        {(step === 'otp' || step === 'otp_register') && (
          <input type="tel" inputMode="numeric" placeholder="6-digit code" value={otp} maxLength={6}
            onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
            style={{ padding: '16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 24, fontFamily: 'DM Mono', textAlign: 'center', letterSpacing: 8, background: C.white }} />
        )}

        {error && <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.amber }}>{error}</div>}

        <button
          onClick={step === 'email' ? checkEmail : step === 'details' ? createShop : step === 'otp' ? checkOtp : verifyAndRegister}
          disabled={loading}
          style={{ padding: '16px', background: C.green, color: C.white, border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Please wait...' : step === 'email' ? 'Continue' : step === 'details' ? 'Send verification code' : 'Verify & continue'}
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
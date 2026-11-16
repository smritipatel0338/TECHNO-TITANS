import React, { useState } from 'react';
import { Lock, Mail, RotateCcw, Sparkles, User } from 'lucide-react';
import { api } from '../api';

export default function AuthScreen({
  mode,
  setMode,
  form,
  setForm,
  onSubmit,
  error,
  recoveryDeadline,
  busy,
}) {
  const isRecover = mode === 'recover';
  const isForgot = mode === 'forgot';

  // Forgot Password state
  const [resetEmail, setResetEmail] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState('email'); // 'email' | 'verify'
  const [resetError, setResetError] = useState('');
  const [resetInfo, setResetInfo] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [resettingPass, setResettingPass] = useState(false);

  const handleSendGmailCode = async (e) => {
    e.preventDefault();
    setResetError('');
    const cleanEmail = resetEmail.trim().toLowerCase();

    if (!cleanEmail.endsWith('@gmail.com')) {
      setResetError('Please enter a valid @gmail.com address.');
      return;
    }

    setSendingCode(true);
    try {
      // Calls your backend SMTP route
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail }),
      });
      setResetInfo(`6-digit code successfully sent to ${cleanEmail}! Check your Gmail inbox.`);
      setResetStep('verify');
    } catch (err) {
      setResetError(err.message || 'Failed to send code via backend. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    setResetError('');

    if (newPassword.length < 8) {
      setResetError('New password must be at least 8 characters.');
      return;
    }

    setResettingPass(true);
    try {
      // Sends 'otp' to match your backend controller parameters
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: resetEmail.trim(),
          otp: enteredOtp.trim(),
          newPassword,
        }),
      });

      setResetInfo('Password updated successfully! Redirecting to login…');
      setTimeout(() => {
        setMode('login');
        setResetStep('email');
        setResetInfo('');
      }, 1500);
    } catch (err) {
      setResetError(err.message || 'Failed to reset password. Please check your code.');
    } finally {
      setResettingPass(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="logo">
          Future<span>You</span> 🌱
        </div>
        <div className="auth-hero">
          <div className="hero-sun" />
          <div className="hero-tree">🌳</div>
          <div className="hero-copy">
            <span className="eyebrow">YOUR HABITS. YOUR STORY.</span>
            <h1>
              Grow into the
              <br />
              <em>future you</em>
              <br />
              dream of.
            </h1>
            <p>Every little choice plants a seed. See where your habits could take you.</p>
          </div>
        </div>
        <div className="auth-foot">✦ A tiny step today is a big branch tomorrow.</div>
      </div>

      <div className="auth-right">
        {/* FORGOT PASSWORD / RESET VIA GMAIL FLOW */}
        {isForgot ? (
          <div className="card auth-card">
            <div className="hd" style={{ '--c': 'var(--purple)' }}>
              🔑 RESET VIA GMAIL
            </div>
            <div className="bd">
              {resetInfo && (
                <div
                  style={{
                    background: '#e6f9d8',
                    color: '#235c0a',
                    border: '2px solid #58cc02',
                    borderRadius: 10,
                    padding: '8px 10px',
                    fontSize: 12,
                    fontWeight: 900,
                    marginBottom: 12,
                  }}
                >
                  {resetInfo}
                </div>
              )}

              {resetStep === 'email' ? (
                <form onSubmit={handleSendGmailCode}>
                  <p className="f" style={{ marginBottom: 14 }}>
                    Enter your registered Gmail address to receive a 6-digit reset code via backend SMTP.
                  </p>

                  <label className="auth-lbl">Email address</label>
                  <div className="input-wrap">
                    <Mail size={17} />
                    <input
                      required
                      type="email"
                      placeholder="yourname@gmail.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </div>

                  {resetError && <div className="form-error">{resetError}</div>}

                  <button
                    type="submit"
                    className="btn green big"
                    style={{ marginTop: 18, fontFamily: "'Bangers', cursive", fontSize: 20, letterSpacing: '0.04em' }}
                    disabled={sendingCode}
                  >
                    {sendingCode ? 'SENDING CODE…' : 'SEND 6-DIGIT CODE TO GMAIL ▶'}
                  </button>

                  <p className="switch-auth">
                    <button type="button" onClick={() => setMode('login')}>
                      ← Back to Log in
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleVerifyAndReset}>
                  <label className="auth-lbl">6-Digit Gmail Code</label>
                  <div className="input-wrap">
                    <Sparkles size={17} />
                    <input
                      required
                      maxLength="6"
                      inputMode="numeric"
                      placeholder="123456"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <label className="auth-lbl">New Password</label>
                  <div className="input-wrap">
                    <Lock size={17} />
                    <input
                      required
                      minLength="8"
                      type="password"
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  {resetError && <div className="form-error">{resetError}</div>}

                  <button
                    type="submit"
                    className="btn green big"
                    style={{ marginTop: 18, fontFamily: "'Bangers', cursive", fontSize: 20, letterSpacing: '0.04em' }}
                    disabled={resettingPass}
                  >
                    {resettingPass ? 'UPDATING…' : 'UPDATE PASSWORD ▶'}
                  </button>

                  <p className="switch-auth">
                    <button type="button" onClick={() => setResetStep('email')}>
                      Resend code
                    </button>
                    {' · '}
                    <button type="button" onClick={() => setMode('login')}>
                      ← Back to Log in
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* STANDARD LOGIN / REGISTER / RECOVER CARD */
          <form className="card auth-card" onSubmit={onSubmit}>
            <div
              className="hd"
              style={{ '--c': isRecover ? 'var(--orange)' : 'var(--green)' }}
            >
              {isRecover
                ? '🔄 Recover Your Garden'
                : mode === 'login'
                ? '🌼 Welcome Back'
                : '🌱 Plant Your First Seed'}
            </div>
            <div className="bd">
              <p className="f" style={{ marginBottom: 14 }}>
                {isRecover
                  ? 'Deleted accounts stay recoverable for 6 months (180 days). Enter your email and password to restore everything.'
                  : mode === 'login'
                  ? 'Your living tree twin missed you.'
                  : 'Create an account to save your habits and grow with friends.'}
              </p>

              {mode === 'register' && (
                <>
                  <label className="auth-lbl">Your name</label>
                  <div className="input-wrap">
                    <User size={17} />
                    <input
                      required
                      placeholder="Smriti Patel"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <label className="auth-lbl">Username</label>
                  <div className="input-wrap">
                    <span style={{ fontWeight: 900 }}>@</span>
                    <input
                      required
                      minLength="3"
                      placeholder="yourname"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />
                  </div>
                </>
              )}

              <label className="auth-lbl">Email address</label>
              <div className="input-wrap">
                <Mail size={17} />
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              {/* Forgot password link placed right under email */}
              {mode === 'login' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    style={{
                      border: 0,
                      background: 'none',
                      color: 'var(--green)',
                      fontSize: 12,
                      fontWeight: 900,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <label className="auth-lbl" style={{ marginTop: mode === 'login' ? 2 : 10 }}>Password</label>
              <div className="input-wrap">
                <Lock size={17} />
                <input
                  required
                  minLength="8"
                  type="password"
                  placeholder={isRecover ? 'Enter your account password' : 'At least 8 characters'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              {recoveryDeadline && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '2px solid var(--orange)',
                    background: 'color-mix(in srgb, var(--orange) 15%, var(--card))',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  ⏳ Scheduled permanent deletion:{' '}
                  <b>{new Date(recoveryDeadline).toLocaleDateString()}</b>. Confirm your password above to cancel deletion and restore your account.
                </div>
              )}

              {error && <div className="form-error">{error}</div>}

              <button
                className={`btn ${isRecover ? 'orange' : 'green'} big`}
                style={{ marginTop: 18 }}
                disabled={busy}
              >
                {busy
                  ? 'Please wait…'
                  : isRecover
                  ? 'Restore My Account ▶'
                  : mode === 'login'
                  ? 'Enter my garden ▶'
                  : 'Create my account ▶'}
              </button>

              <p className="switch-auth">
                {mode === 'login' ? 'New to Future You?' : 'Already growing here?'}{' '}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                >
                  {mode === 'login' ? 'Create account' : 'Log in'}
                </button>
              </p>

              {mode !== 'recover' && (
                <p className="switch-auth" style={{ marginTop: 6 }}>
                  <button
                    type="button"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={() => setMode('recover')}
                  >
                    <RotateCcw size={13} /> Deleted your account? Recover within 6 months
                  </button>
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
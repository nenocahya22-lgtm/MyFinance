import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Lock, Unlock, Eye, EyeOff, Check, KeySquare, HelpCircle } from 'lucide-react';
import { hashSHA256 } from '../utils/crypto';

interface SecurityGateProps {
  onUnlock: () => void;
  isAppLocked: boolean;
  onPINConfigChange: () => void;
}

export default function SecurityGate({ onUnlock, isAppLocked, onPINConfigChange }: SecurityGateProps) {
  // Persistence state
  const [hasPinConfigured, setHasPinConfigured] = useState<boolean>(() => {
    return !!localStorage.getItem('keuangan_secure_pin');
  });

  const [pinInput, setPinInput] = useState<string>('');
  const [setupPin, setSetupPin] = useState<string>('');
  const [setupConfirm, setSetupConfirm] = useState<string>('');
  const [hintInput, setHintInput] = useState<string>('');
  const [savedHint, setSavedHint] = useState<string>(() => {
    return localStorage.getItem('keuangan_secure_pin_hint') || '';
  });

  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Status check
  useEffect(() => {
    setHasPinConfigured(!!localStorage.getItem('keuangan_secure_pin'));
    setSavedHint(localStorage.getItem('keuangan_secure_pin_hint') || '');
  }, [isAppLocked]);

  const handleVerifyUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPin = localStorage.getItem('keuangan_secure_pin');
    
    // Support comparing both securely hashed SHA-256 and old legacy plaintext
    const isMatched = storedPin && (
      storedPin === hashSHA256(pinInput) || 
      storedPin === pinInput // Backward compatibility fallback
    );

    if (isMatched) {
      // Auto-upgrade legacy plaintext PIN if matched
      if (storedPin === pinInput) {
        localStorage.setItem('keuangan_secure_pin', hashSHA256(pinInput));
      }
      setErrorMsg('');
      setPinInput('');
      onUnlock();
    } else {
      setErrorMsg('PIN keamanan tidak sesuai! Silakan coba lagi.');
      setPinInput('');
    }
  };

  const handleCreatePIN = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupPin) {
      setErrorMsg('PIN baru tidak boleh kosong!');
      return;
    }

    if (setupPin.length < 4) {
      setErrorMsg('PIN minimal harus terdiri dari 4 digit angka!');
      return;
    }

    if (setupPin !== setupConfirm) {
      setErrorMsg('Konfirmasi PIN tidak cocok dengan PIN baru!');
      return;
    }

    // Save PIN securely hashed
    localStorage.setItem('keuangan_secure_pin', hashSHA256(setupPin));
    if (hintInput.trim()) {
      localStorage.setItem('keuangan_secure_pin_hint', hintInput.trim());
    }
    
    setSuccessMsg('PIN Keamanan Anda berhasil dikonfigurasi!');
    setErrorMsg('');
    setTimeout(() => {
      setHasPinConfigured(true);
      setSuccessMsg('');
      onUnlock();
      onPINConfigChange();
    }, 1500);
  };

  // Numpad key helper
  const handleNumClick = (num: string) => {
    setErrorMsg('');
    if (!hasPinConfigured) {
      // In setup mode, use standard input fields for confirmation correctness
      return;
    }

    if (pinInput.length < 8) {
      setPinInput((prev) => prev + num);
    }
  };

  return (
    <div id="security-lockscreen-portal" className="fixed inset-0 z-50 bg-slate-50/98 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-8 relative overflow-hidden">
        
        {/* Aesthetic design element */}
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Lock className="w-40 h-40 text-indigo-900" />
        </div>

        {/* Lock / Unlock Icon Status Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-55 bg-indigo-50 text-indigo-650 flex items-center justify-center shadow-xs border border-indigo-100 animate-pulse">
            {hasPinConfigured ? <Lock className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7 text-emerald-600" />}
          </div>
          <div>
            <h2 id="portal-main-heading" className="text-xl font-black text-slate-850 tracking-tight">
              {hasPinConfigured ? 'Keamanan Terkunci' : 'Konfigurasi PIN Pengunci'}
            </h2>
            <p id="portal-sub-desc" className="text-xs text-slate-400 font-medium px-4">
              {hasPinConfigured 
                ? 'Masukkan PIN keamanan Anda untuk mengakses data pembukuan keluarga.'
                : 'PENTING: Lindungi data keuangan rumah tangga agar tidak diakses sembarang orang di perangkat ini.'}
            </p>
          </div>
        </div>

        {/* Dynamic Portal Body */}
        {!hasPinConfigured ? (
          /* FORM A: First Time PIN Setup Grid (Strict valid blank initial setup state) */
          <form id="form-setup-pin" onSubmit={handleCreatePIN} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600">Buat PIN Baru (Minimal 4 digit)</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="Masukkan angka PIN pilihan"
                  value={setupPin}
                  onChange={(e) => {
                    setSetupPin(e.target.value.replace(/[^0-9]/g, ''));
                    setErrorMsg('');
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-black text-slate-850 tracking-widest focus:ring-4 focus:ring-indigo-105 focus:ring-indigo-100 focus:border-indigo-55 transition-all text-center placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600">Ulangi Konfirmasi PIN</label>
              <input
                type={showPin ? 'text' : 'password'}
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={8}
                placeholder="Konfirmasi ulang PIN"
                value={setupConfirm}
                onChange={(e) => {
                  setSetupConfirm(e.target.value.replace(/[^0-9]/g, ''));
                  setErrorMsg('');
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-black text-slate-850 tracking-widest focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-center placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                Pertanyaan Bantuan Hint <span className="font-normal text-slate-400">(Opsional)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Tanggal lahir anak ketiga"
                value={hintInput}
                onChange={(e) => setHintInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-400"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-bold leading-normal text-center">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-850 text-xs font-bold leading-normal text-center flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {successMsg}
              </div>
            )}

            <button
              id="btn-save-pin"
              type="submit"
              className="w-full py-3.5 px-4 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-indigo-655 cursor-pointer transition-all active:scale-97"
            >
              Simpan & Aktifkan Kunci
            </button>
          </form>
        ) : (
          /* FORM B: Interactive PIN Access Lockscreen with Numeric Keyboard Clickers */
          <form id="form-verify-pin" onSubmit={handleVerifyUnlock} className="space-y-6">
            
            {/* Display code circles */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  readOnly
                  placeholder="● ● ● ●"
                  value={pinInput}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-extrabold text-slate-900 tracking-widest focus:outline-hidden"
                />
                
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {savedHint && (
                <p className="text-[10px] text-slate-400 text-center italic font-semibold">
                  Petunjuk PIN: <span className="text-slate-600 font-bold">"{savedHint}"</span>
                </p>
              )}
            </div>

            {/* Error alerts */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 text-xs font-bold text-center rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Premium Numpad Integration */}
            <div className="grid grid-cols-3 gap-3.5 max-w-[280px] mx-auto pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleNumClick(val)}
                  className="w-14 h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-150/60 flex items-center justify-center text-lg font-black text-slate-750 transition-all active:scale-90 cursor-pointer mx-auto shadow-2xs hover:border-slate-305"
                >
                  {val}
                </button>
              ))}
              
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setPinInput('');
                }}
                className="w-14 h-14 rounded-2xl bg-rose-50/50 hover:bg-rose-50 border border-rose-100 flex items-center justify-center text-xs font-black text-rose-600 transition-all active:scale-90 cursor-pointer mx-auto"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => handleNumClick('0')}
                className="w-14 h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-150/60 flex items-center justify-center text-lg font-black text-slate-750 transition-all active:scale-90 cursor-pointer mx-auto shadow-2xs"
              >
                0
              </button>

              <button
                type="submit"
                disabled={!pinInput}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 cursor-pointer mx-auto ${
                  pinInput 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10' 
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <Check className="w-5 h-5 font-black" />
              </button>
            </div>

            {/* Access recovery warning */}
            <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed">
              *PIN disimpan offline di dalam local storage browser Anda demi keleluasaan hak akses privasi mutlak.
            </p>
          </form>
        )}

      </div>
    </div>
  );
}

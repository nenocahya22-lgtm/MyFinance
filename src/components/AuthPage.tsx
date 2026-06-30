import React, { useState } from 'react';
import { Coins, Users, Shield, CheckCircle, AlertTriangle, Copy, Eye, EyeOff, KeyRound } from 'lucide-react';

interface AuthPageProps {
  onAuth: (token: string, user: any) => void;
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'join'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newFamily, setNewFamily] = useState<{ code: string; username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setNewFamily(null);

    if (!username.trim() || !password.trim()) {
      setError('Username & password wajib diisi');
      return;
    }
    if (mode === 'register' && password.length < 4) {
      setError('Password minimal 4 karakter');
      return;
    }
    if (mode === 'join' && !familyCode.trim()) {
      setError('Kode keluarga wajib diisi');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'join') {
        const res = await fetch('/api/auth/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            familyCode: familyCode.trim().toUpperCase(),
            username: username.trim(),
            password,
            name: username.trim(),
            role: 'ANGGOTA',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Gagal bergabung ke keluarga');
          setLoading(false);
          return;
        }
        localStorage.setItem('keuangan_sync_token', data.token);
        localStorage.setItem('keuangan_sync_user', JSON.stringify(data.user));
        localStorage.setItem('keuangan_sync_code', data.user.family.code);
        onAuth(data.token, data.user);
        return;
      }

      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register'
        ? { name: name.trim() || username.trim(), username: username.trim(), password }
        : { username: username.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal');
        setLoading(false);
        return;
      }

      if (mode === 'register') {
        setNewFamily({
          code: data.user.family.code,
          username: data.user.username,
          password,
        });
        setSuccess(`Keluarga "${data.user.family.name}" berhasil dibuat!`);
      } else {
        localStorage.setItem('keuangan_sync_token', data.token);
        localStorage.setItem('keuangan_sync_user', JSON.stringify(data.user));
        localStorage.setItem('keuangan_sync_code', data.user.family.code);
        onAuth(data.token, data.user);
      }
    } catch (err: any) {
      setError('Gagal terhubung ke server');
    }
    setLoading(false);
  };

  const copyFamilyCode = () => {
    if (!newFamily) return;
    const text = `🏠 Finanku Keluarga\nKode Keluarga: ${newFamily.code}\nUsername: ${newFamily.username}\nPassword: ${newFamily.password}\n\nAkses di: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const continueToApp = () => {
    const user = {
      id: newFamily?.username,
      username: newFamily?.username,
      name: name || username,
      role: 'KEPALA_KELUARGA',
      family: { code: newFamily?.code },
    };
    localStorage.setItem('keuangan_sync_user', JSON.stringify(user));
    onAuth('', user);
  };

  if (newFamily) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Keluarga Berhasil Dibuat!</h2>
            <p className="text-sm text-slate-500 mt-1">Simpan kredensial ini untuk masuk kembali</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kode Keluarga</span>
              <span className="text-lg font-black text-indigo-600 tracking-wider font-mono">{newFamily.code}</span>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="text-sm">
              <span className="text-slate-400">Username:</span>{' '}
              <span className="font-bold text-slate-800">{newFamily.username}</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-400">Password:</span>{' '}
              <span className="font-bold text-indigo-600">{newFamily.password}</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Catat kode keluarga ini! Pasangan Anda perlu kode ini untuk bergabung.</span>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={copyFamilyCode} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer">
              {copied ? <><CheckCircle className="w-4 h-4" /> Tersalin!</> : <><Copy className="w-4 h-4" /> Salin Kredensial</>}
            </button>
            <button onClick={continueToApp} className="w-full py-3 bg-black hover:bg-slate-800 text-white rounded-xl text-sm font-bold cursor-pointer">
              Mulai Aplikasi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Coins className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Finanku</h1>
          <p className="text-sm text-slate-400 font-medium">Rumah Tangga Pro</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
          <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl mb-6">
            <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${mode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              Masuk
            </button>
            <button onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${mode === 'register' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              Keluarga Baru
            </button>
            <button onClick={() => { setMode('join'); setError(''); setSuccess(''); }}
              className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${mode === 'join' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              Gabung
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Nama Keluarga</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Contoh: Keluarga Budi"
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                />
              </div>
            )}

            {mode === 'join' && (
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Kode Keluarga</label>
                <div className="relative">
                  <input type="text" value={familyCode} onChange={e => setFamilyCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: FAM_3A2F1B"
                    className="w-full h-11 pl-8 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 font-mono tracking-wider focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  Minta kode keluarga dari Kepala Keluarga.
                </p>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder={mode === 'register' ? 'kepala_keluarga' : mode === 'join' ? 'Buat username' : 'Masukkan username'}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Minimal 4 karakter' : 'Masukkan password'}
                  className="w-full h-11 px-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-12 bg-black hover:bg-slate-800 text-white rounded-xl text-sm font-bold cursor-pointer disabled:opacity-40 transition-colors">
              {loading ? 'Memproses...' : mode === 'register' ? 'Buat Keluarga Baru' : mode === 'join' ? 'Gabung Keluarga' : 'Masuk'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <p className="text-[10px] text-indigo-700 font-semibold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 shrink-0" />
                Masuk dengan username & password yang diberikan Kepala Keluarga.
              </p>
            </div>
          )}

          {mode === 'register' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                Anda akan menjadi Kepala Keluarga. Bisa tambah anggota (pasangan/anak) nanti.
              </p>
            </div>
          )}

          {mode === 'join' && (
            <div className="mt-4 p-3 bg-cyan-50 border border-cyan-100 rounded-xl">
              <p className="text-[10px] text-cyan-700 font-semibold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 shrink-0" />
                Masukkan kode keluarga, lalu buat username & password sendiri untuk bergabung.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { TrendingUp, Lock, Mail, User, Shield, Users, Landmark, AlertCircle } from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess: (token: string, refreshToken: string, user: any, family: any) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'OWNER' | 'MEMBER'>('OWNER');
  const [familyAction, setFamilyAction] = useState<'create' | 'join'>('create');
  const [familyCode, setFamilyCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [errorPayload, setErrorPayload] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPayload(null);
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email, password }
      : { 
          email, 
          password, 
          name, 
          role, 
          familyCode: familyAction === 'join' ? familyCode : undefined, 
          familyName: familyAction === 'create' ? familyName : undefined 
        };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Try to parse as JSON first, fallback to text if it fails
      let data;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server merespon dengan format ${contentType || 'tidak dikenal'}. Status: ${response.status}. Respon: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Terjadi kesalahan sistem!');
      }

      // Success
      onAuthSuccess(data.token, data.refreshToken, data.user, data.family);
    } catch (err: any) {
      setErrorPayload(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl p-8 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/30 mb-3">
            <TrendingUp className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-wider">
            SakuKeluarga
          </h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
            Realtime Family Finance Hub
          </p>
        </div>

        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isLogin ? 'Selamat Datang Kembali' : 'Gabung SakuKeluarga'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isLogin 
              ? 'Kelola pengeluaran harian dan target bersama secara koordinatif.' 
              : 'Daftar dan bangun pembukuan keuangan bersama pasangan secara instan.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorPayload && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-150 dark:border-red-900/60 rounded-2xl text-red-600 dark:text-red-400 text-xs font-semibold mb-5 animate-slide-up">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{errorPayload}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* REGISTER: Name */}
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Budi Handoyo"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Alamat Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@keluarga.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* REGISTER: Roles & Family Unit Association */}
          {!isLogin && (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Peran Pengguna (Role)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('OWNER')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      role === 'OWNER'
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Owner (Kepala)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('MEMBER')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      role === 'MEMBER'
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Member (Anggota)
                  </button>
                </div>
              </div>

              {/* Family Action Preference */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Unit Keluarga
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFamilyAction('create')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      familyAction === 'create'
                        ? 'bg-slate-900 dark:bg-slate-850 text-white border-slate-950 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <Landmark className="w-4 h-4" />
                    Buat Ruang Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => setFamilyAction('join')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      familyAction === 'join'
                        ? 'bg-slate-900 dark:bg-slate-850 text-white border-slate-950 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Gabung Kode PIN
                  </button>
                </div>
              </div>

              {/* Action input panel based on choice */}
              {familyAction === 'create' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Nama Unit Keluarga Baru
                  </label>
                  <input
                    type="text"
                    required
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="e.g. Saku Handoyo"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Kode PIN Keluarga (6 Digit)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={familyCode}
                    onChange={(e) => setFamilyCode(e.target.value)}
                    placeholder="FAM-XXXXXX"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60 rounded-2xl text-xs font-bold tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Dapatkan Kode PIN dari pemilik akun (Kepala) Keluarga Anda.
                  </span>
                </div>
              )}

            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-450 active:scale-[0.98] text-white text-xs font-extrabold rounded-2xl transition-all duration-150 shadow-md shadow-indigo-600/10 mt-2 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : isLogin ? (
              'Masuk Sesi Keluarga'
            ) : (
              'Daftar Akun Keluarga'
            )}
          </button>

        </form>

        {/* Footer toggles */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorPayload(null);
            }}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            {isLogin 
              ? 'Belum tergabung? Daftarkan akun baru keluarga' 
              : 'Sudah memiliki akun terdaftar? Masuk kembali'}
          </button>
        </div>

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, Copy, CheckCircle, Users, KeyRound, Shield, RefreshCw, Download, Trash2, AlertTriangle, Eye, EyeOff, Share2 } from 'lucide-react';

interface SettingsPageProps {
  authUser: any;
  familyCode: string;
  authToken: string;
  onClose: () => void;
  onRefreshToken: () => void;
  onExportCSV: () => void;
  onClearAll: () => void;
}

export default function SettingsPage({ authUser, familyCode, authToken, onClose, onRefreshToken, onExportCSV, onClearAll }: SettingsPageProps) {
  const [tab, setTab] = useState<'family' | 'security' | 'data'>('family');
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('ANAK');
  const [newCreds, setNewCreds] = useState<any>(null);

  const headers = authToken ? { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' } : {};

  const copyCode = () => {
    const text = `🏠 Finanku Keluarga\nKode: ${familyCode}\n\nBagikan kode ini ke pasangan/anggota keluarga untuk bergabung.\nAkses di: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const fetchMembers = async () => {
    if (!authToken) return;
    setLoadingMembers(true);
    try {
      const res = await fetch('/api/family/members', { headers });
      const data = await res.json();
      setMembers(data.users || []);
    } catch {}
    setLoadingMembers(false);
  };

  React.useEffect(() => {
    if (tab === 'family' && authToken) fetchMembers();
  }, [tab, authToken]);

  const addMember = async () => {
    if (!newMemberName.trim() || !authToken) return;
    try {
      const res = await fetch('/api/family/members', {
        method: 'POST', headers,
        body: JSON.stringify({ name: newMemberName.trim(), role: newMemberRole }),
      });
      const data = await res.json();
      if (res.ok && data.member) {
        setNewCreds(data.member);
        setNewMemberName('');
        fetchMembers();
      }
    } catch {}
  };

  const removeMember = async (username: string) => {
    if (!confirm(`Hapus ${username} dari keluarga?`)) return;
    await fetch(`/api/family/members/${username}`, { method: 'DELETE', headers });
    fetchMembers();
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = { KEPALA_KELUARGA: 'Kepala', PASANGAN: 'Pasangan', ANAK: 'Anak' };
    return labels[role] || role;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-[20px] shadow-xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e2e7] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#191c1f]">Pengaturan</h2>
              <p className="text-xs text-[#8d969e]">{authUser?.name || 'Finanku'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[#f4f4f4] flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4 text-[#505a63]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#f4f4f4] mx-4 mt-4 p-1 rounded-xl shrink-0">
          {(['family', 'security', 'data'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                tab === t ? 'bg-white text-[#191c1f] shadow-sm' : 'text-[#8d969e] hover:text-[#505a63]'
              }`}>
              {t === 'family' ? '👨‍👩‍👧‍👦 Keluarga' : t === 'security' ? '🔒 Keamanan' : '⚙️ Data'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {/* FAMILY TAB */}
          {tab === 'family' && (
            <div className="space-y-4">
              {/* Family Code */}
              <div className="bg-[#f4f4f4] rounded-[12px] p-4">
                <label className="text-[11px] font-bold text-[#505a63] mb-1 block">Kode Keluarga</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white rounded-[12px] h-11 flex items-center px-4 border border-[#e2e2e7]">
                    <span className="text-sm font-black text-indigo-600 font-mono tracking-wider">{familyCode || '—'}</span>
                  </div>
                  {familyCode && (
                    <button onClick={copyCode} className="h-11 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[12px] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors">
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Tersalin' : 'Salin'}
                    </button>
                  )}
                </div>
                {familyCode && (
                  <p className="text-[10px] text-[#8d969e] mt-2 font-medium">
                    Bagikan kode ini ke pasangan/anggota keluarga agar bisa login dan sinkron data.
                  </p>
                )}
                {!authToken && (
                  <p className="text-[10px] text-amber-600 mt-2 font-semibold">
                    Login/Register dulu untuk mendapatkan kode keluarga.
                  </p>
                )}
              </div>

              {/* Members List */}
              <div className="bg-[#f4f4f4] rounded-[12px] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-[#505a63]">Anggota Keluarga ({members.length})</span>
                  <button onClick={() => { setShowAddMember(!showAddMember); setNewCreds(null); }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                    + Tambah
                  </button>
                </div>

                {showAddMember && (
                  <div className="bg-white rounded-[12px] p-3 mb-3 space-y-2 border border-[#e2e2e7]">
                    <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
                      placeholder="Nama anggota (contoh: Istri, Anak)"
                      className="w-full h-10 px-3 bg-[#f4f4f4] rounded-[10px] text-sm font-semibold text-[#191c1f] outline-none"
                    />
                    <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)}
                      className="w-full h-10 px-3 bg-[#f4f4f4] rounded-[10px] text-sm font-semibold text-[#191c1f] outline-none">
                      <option value="PASANGAN">Pasangan</option>
                      <option value="ANAK">Anak</option>
                    </select>
                    <button onClick={addMember}
                      className="w-full h-10 bg-black text-white rounded-[10px] text-xs font-bold cursor-pointer hover:bg-[#16181a] transition-colors">
                      Tambah Anggota
                    </button>
                  </div>
                )}

                {newCreds && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-[12px] p-3 mb-3">
                    <p className="text-xs font-bold text-emerald-800 mb-1">✅ Anggota ditambahkan!</p>
                    <div className="bg-white rounded-[8px] p-2 text-xs font-mono space-y-1">
                      <p><span className="text-[#8d969e]">Username:</span> <strong>{newCreds.username}</strong></p>
                      <p><span className="text-[#8d969e]">Password:</span> <strong className="text-indigo-600">{newCreds.plainPassword}</strong></p>
                    </div>
                    <button onClick={() => {
                      const text = `👋 Akun Finanku Keluarga\nUsername: ${newCreds.username}\nPassword: ${newCreds.plainPassword}\nKode Keluarga: ${familyCode}\n\nLogin di: ${window.location.origin}`;
                      navigator.clipboard.writeText(text);
                      alert('Kredensial disalin!');
                    }}
                      className="mt-2 w-full h-9 bg-black text-white rounded-[10px] text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5">
                      <Copy className="w-3.5 h-3.5" /> Salin & Bagikan
                    </button>
                    <button onClick={() => setNewCreds(null)} className="mt-1 w-full text-[10px] text-center text-[#505a63] cursor-pointer">Tutup</button>
                  </div>
                )}

                {loadingMembers ? (
                  <div className="text-center py-6 text-xs text-[#8d969e]">Memuat...</div>
                ) : members.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="w-10 h-10 mx-auto mb-2 text-[#c9c9cd]" />
                    <p className="text-xs font-medium text-[#8d969e]">Belum ada anggota</p>
                    <p className="text-[10px] text-[#8d969e]">Tambah pasangan atau anak</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {members.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-white transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-[#e2e2e7] flex items-center justify-center text-xs font-bold text-[#505a63]">
                          {m.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#191c1f] truncate">{m.name}</p>
                          <p className="text-[11px] text-[#8d969e]">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium text-[10px] ${
                              m.role === 'KEPALA_KELUARGA' ? 'bg-indigo-50 text-indigo-700' :
                              m.role === 'PASANGAN' ? 'bg-emerald-50 text-emerald-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {roleLabel(m.role)}
                            </span>
                            <span className="ml-2">{m.isOnline ? '🟢 Online' : '⚪ Offline'}</span>
                          </p>
                        </div>
                        {authUser?.role === 'KEPALA_KELUARGA' && m.username !== authUser?.id && (
                          <button onClick={() => removeMember(m.username)}
                            className="w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-all">
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {tab === 'security' && (
            <div className="space-y-4">
              <div className="bg-[#f4f4f4] rounded-[12px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span className="text-[11px] font-bold text-[#505a63]">PIN Aplikasi</span>
                </div>
                <p className="text-[10px] text-[#8d969e] font-medium mb-3">
                  Kunci aplikasi dengan PIN agar data tetap aman.
                </p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                    localStorage.getItem('keuangan_secure_pin')
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {localStorage.getItem('keuangan_secure_pin') ? '✅ PIN Aktif' : '⚠️ Belum Ada PIN'}
                  </span>
                </div>
              </div>

              <div className="bg-[#f4f4f4] rounded-[12px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span className="text-[11px] font-bold text-[#505a63]">Sesi</span>
                </div>
                <p className="text-[10px] text-[#8d969e] font-medium mb-1">Status: <span className="text-emerald-600 font-bold">Terkoneksi</span></p>
                <p className="text-[10px] text-[#8d969e] mb-3">Username: {authUser?.username || 'Lokal'}</p>
                {authToken && (
                  <button onClick={onRefreshToken}
                    className="h-9 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-[10px] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Perbarui Token
                  </button>
                )}
              </div>
            </div>
          )}

          {/* DATA TAB */}
          {tab === 'data' && (
            <div className="space-y-4">
              <div className="bg-[#f4f4f4] rounded-[12px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span className="text-[11px] font-bold text-[#505a63]">Ekspor Data</span>
                </div>
                <p className="text-[10px] text-[#8d969e] font-medium mb-3">
                  Download data transaksi untuk backup atau analisis.
                </p>
                <div className="flex gap-2">
                  <button onClick={onExportCSV}
                    className="flex-1 h-10 bg-white border border-[#e2e2e7] hover:bg-[#f4f4f4] rounded-[10px] text-xs font-bold text-[#505a63] cursor-pointer transition-colors">
                    CSV
                  </button>
                </div>
              </div>

              <div className="bg-[#f4f4f4] rounded-[12px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span className="text-[11px] font-bold text-[#505a63]">Reset Data</span>
                </div>
                <p className="text-[10px] text-[#8d969e] font-medium mb-3">
                  Hapus semua data lokal. Data di server tidak terpengaruh.
                </p>
                <button onClick={() => {
                  if (confirm('Hapus semua data lokal?')) {
                    onClearAll();
                    onClose();
                  }
                }}
                  className="h-10 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-[10px] text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Semua Data Lokal
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-[12px] p-3">
                <p className="text-[10px] text-amber-800 font-semibold flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Data Anda disimpan di server (terenkripsi) dan di browser lokal. Pastikan Anda login untuk menyimpan perubahan ke server.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, User, Shield, Crown, Copy, Trash2, Check, Share2 } from 'lucide-react';

interface MemberUser {
  id: string;
  username: string;
  name: string;
  role: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

interface FamilyMembersPanelProps {
  token: string;
  currentUser: string;
  currentRole: string;
  apiBase: string;
  onClose: () => void;
}

export default function FamilyMembersPanel({ token, currentUser, currentRole, apiBase, onClose }: FamilyMembersPanelProps) {
  const [members, setMembers] = useState<MemberUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState('ANAK');
  const [newMember, setNewMember] = useState<{ username: string; plainPassword: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const isHead = currentRole === 'KEPALA_KELUARGA';

  const fetchMembers = () => {
    fetch(`${apiBase}/api/family/members`, { headers })
      .then(r => r.json())
      .then(d => {
        setMembers(d.users || []);
        setOnlineCount(d.onlineCount || 0);
      })
      .catch(() => {});
  };

  useEffect(() => { fetchMembers(); }, [token]);
  useEffect(() => { if (open) fetchMembers(); }, []);

  const addMember = async () => {
    if (!addName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/family/members`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: addName.trim(), role: addRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewMember(data.member);
        setAddName('');
        fetchMembers();
      } else {
        setError(data.error || 'Gagal menambah anggota');
      }
    } catch { setError('Gagal menghubungi server'); }
    setLoading(false);
  };

  const removeMember = async (username: string) => {
    if (!confirm(`Hapus ${username} dari keluarga?`)) return;
    await fetch(`${apiBase}/api/family/members/${username}`, { method: 'DELETE', headers });
    fetchMembers();
  };

  const copyCredentials = () => {
    if (!newMember) return;
    const text = `👋 Akun Keluarga Finanku\nUsername: ${newMember.username}\nPassword: ${newMember.plainPassword}\nNama: ${newMember.name}\n\nAkses di: https://myfinance-nenocahya22-lgtms-projects.vercel.app`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = { KEPALA_KELUARGA: 'Kepala', PASANGAN: 'Pasangan', ANAK: 'Anak' };
    return labels[role] || role;
  };

  const roleIcon = (role: string) => {
    if (role === 'KEPALA_KELUARGA') return <Crown className="w-3.5 h-3.5" />;
    if (role === 'PASANGAN') return <Shield className="w-3.5 h-3.5" />;
    return <User className="w-3.5 h-3.5" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-[20px] shadow-xl animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e2e7] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#000] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#191c1f]">Anggota Keluarga</h2>
              <p className="text-xs text-[#8d969e]">
                <span className="inline-block w-2 h-2 rounded-full bg-[#00a87e] mr-1.5"></span>
                {onlineCount} online · {members.length} total
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[#f4f4f4] flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4 text-[#505a63]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {/* Add Member (head only) */}
          {isHead && !newMember && (
            <div className="mb-4">
              {showAdd ? (
                <div className="bg-[#f4f4f4] rounded-[12px] p-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#505a63] mb-1 block">Nama Anggota</label>
                    <input
                      type="text" value={addName} onChange={e => setAddName(e.target.value)}
                      placeholder="Contoh: Ibu, Kaka, Adik"
                      className="w-full h-11 px-4 bg-white rounded-[12px] text-sm text-[#191c1f] border border-[#e2e2e7] outline-none focus:border-[#494fdf]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#505a63] mb-1 block">Peran</label>
                    <select
                      value={addRole} onChange={e => setAddRole(e.target.value)}
                      className="w-full h-11 px-4 bg-white rounded-[12px] text-sm text-[#191c1f] border border-[#e2e2e7] outline-none focus:border-[#494fdf]"
                    >
                      <option value="ANAK">Anak</option>
                      <option value="PASANGAN">Pasangan</option>
                    </select>
                  </div>
                  {error && <p className="text-xs text-[#e23b4a]">{error}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setShowAdd(false)} className="flex-1 h-11 rounded-[12px] border border-[#e2e2e7] text-sm font-semibold text-[#505a63] cursor-pointer hover:bg-white transition-colors">Batal</button>
                    <button onClick={addMember} disabled={loading || !addName.trim()} className="flex-1 h-11 rounded-[12px] bg-[#000] text-white text-sm font-semibold cursor-pointer disabled:opacity-30 hover:bg-[#16181a] transition-colors">
                      {loading ? 'Menambah...' : 'Tambah'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAdd(true)} className="w-full h-12 rounded-[12px] border-2 border-dashed border-[#e2e2e7] text-sm font-semibold text-[#505a63] flex items-center justify-center gap-2 cursor-pointer hover:border-[#494fdf] hover:text-[#494fdf] transition-colors">
                  <UserPlus className="w-4 h-4" /> Tambah Anggota Baru
                </button>
              )}
            </div>
          )}

          {/* New member credentials */}
          {newMember && (
            <div className="mb-4 bg-[#f4f4f4] rounded-[12px] p-4 border-l-4 border-[#00a87e]">
              <p className="text-sm font-semibold text-[#191c1f] mb-2">✅ Anggota berhasil ditambahkan!</p>
              <div className="bg-white rounded-[8px] p-3 space-y-1.5 text-sm font-mono">
                <p><span className="text-[#8d969e]">Username:</span> <strong>{newMember.username}</strong></p>
                <p><span className="text-[#8d969e]">Password:</span> <strong className="text-[#494fdf]">{newMember.plainPassword}</strong></p>
                <p><span className="text-[#8d969e]">Nama:</span> {newMember.name}</p>
              </div>
              <button onClick={copyCredentials} className="mt-3 w-full h-11 rounded-[12px] bg-[#000] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-[#16181a] transition-colors">
                {copied ? <><Check className="w-4 h-4" /> Tersalin!</> : <><Copy className="w-4 h-4" /> Salin Kredensial</>}
              </button>
              <button onClick={() => setNewMember(null)} className="mt-2 w-full text-xs text-[#505a63] text-center cursor-pointer hover:text-[#191c1f]">Tutup</button>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-1">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-[12px] hover:bg-[#f4f4f4] transition-colors group">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#e2e2e7] flex items-center justify-center text-[#505a63]">
                    {roleIcon(m.role)}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${m.isOnline ? 'bg-[#00a87e]' : 'bg-[#c9c9cd]'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#191c1f] truncate">
                    {m.name}
                    {m.username === currentUser && <span className="text-[#8d969e] font-normal text-xs ml-1">(Anda)</span>}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[#8d969e]">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${m.role === 'KEPALA_KELUARGA' ? 'bg-[#494fdf]/10 text-[#494fdf]' : m.role === 'PASANGAN' ? 'bg-[#00a87e]/10 text-[#00a87e]' : 'bg-[#f4f4f4] text-[#505a63]'}`}>
                      {roleLabel(m.role)}
                    </span>
                    <span>{m.isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
                {isHead && m.username !== currentUser && (
                  <button onClick={() => removeMember(m.username)} className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-[#e23b4a]/10 flex items-center justify-center cursor-pointer transition-all" title="Hapus">
                    <Trash2 className="w-3.5 h-3.5 text-[#e23b4a]" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {members.length === 0 && (
            <div className="text-center py-10">
              <Users className="w-12 h-12 mx-auto mb-3 text-[#c9c9cd]" />
              <p className="text-sm font-medium text-[#8d969e]">Belum ada anggota</p>
              {isHead && <p className="text-xs text-[#8d969e] mt-1">Tambah anggota keluarga untuk mulai</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

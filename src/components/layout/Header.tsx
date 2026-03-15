import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

function Avatar({ name, photoURL }: { name: string; photoURL: string | null }) {
  const [failed, setFailed] = useState(false);
  const initial = name[0]?.toUpperCase() ?? '?';

  if (photoURL && !failed) {
    return (
      <img
        src={photoURL}
        alt=""
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setFailed(true)}
        className="w-8 h-8 rounded-full border border-slate-700 object-cover"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-slate-900">
      {initial}
    </div>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="glass sticky top-0 z-50 px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BookOpen className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <h1 className="text-lg font-display font-bold text-white tracking-tight leading-none">LingoForge</h1>
            <p className="text-[11px] text-slate-500 tracking-wide uppercase">Language Learning Engine</p>
          </div>
        </button>

        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={user.displayName ?? user.email ?? '?'} photoURL={user.photoURL} />
              <span className="text-sm text-slate-400 hidden sm:block">
                {user.displayName ?? user.email}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

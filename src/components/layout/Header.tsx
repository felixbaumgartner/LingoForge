import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CloudCheck,
  CloudOff,
  House,
  Loader2,
  LogOut,
  Sparkles,
  Library,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/appStore';
import { LANGUAGES } from '../../types/language';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const language = useAppStore((s) => s.language);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const retrySync = useAppStore((s) => s.retrySync);
  const routeLanguage = location.pathname.split('/')[2];
  const activeLanguage = LANGUAGES.some((item) => item.id === routeLanguage) ? routeLanguage : language;
  const [offline, setOffline] = useState(!navigator.onLine);
  const [showSync, setShowSync] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  useEffect(() => {
    function online() {
      setOffline(false);
      void retrySync();
    }
    function offline() {
      setOffline(true);
    }
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [retrySync]);
  const syncLabel = offline
    ? 'Saved on device'
    : syncStatus === 'loading'
      ? 'Saving progress'
      : syncStatus === 'error'
        ? 'Sync needs attention'
        : syncStatus === 'saved'
          ? 'Progress saved'
          : 'Saved on device';
  const links = [
    { to: '/', label: 'Today', icon: House },
    { to: `/missions/${activeLanguage}`, label: 'Missions', icon: BookOpen },
    { to: `/practice/${activeLanguage}`, label: 'Practice', icon: Sparkles },
    { to: `/vocabulary/${activeLanguage}`, label: 'Vocabulary', icon: Library },
  ];
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="app-header sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 h-[76px]">
          <button
            onClick={() => navigate('/')}
            aria-label="LingoForge home"
            className="flex items-center gap-2.5 sm:gap-3 shrink-0"
          >
            <span className="w-9 h-9 rounded-xl bg-emerald-300 text-slate-950 flex items-center justify-center">
              <BookOpen className="w-5 h-5" strokeWidth={2.2} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Lingo<span className="text-emerald-300">Forge</span>
            </span>
          </button>
          <nav
            aria-label="Main navigation"
            className="hidden md:flex items-center gap-1 rounded-xl bg-slate-900/60 p-1 border border-slate-800/70"
          >
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={label}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                onClick={() => setShowSync((value) => !value)}
                aria-expanded={showSync}
                aria-label={syncLabel}
                className={`inline-flex items-center gap-1.5 rounded-lg p-2 text-xs ${offline || syncStatus === 'error' ? 'text-amber-300' : 'text-slate-400'}`}
              >
                {syncStatus === 'loading' && !offline ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : offline || syncStatus === 'error' ? (
                  <CloudOff className="w-4 h-4" />
                ) : (
                  <CloudCheck className="w-4 h-4" />
                )}
                <span className="hidden xl:inline">{syncLabel}</span>
              </button>
              {showSync && (
                <div className="absolute top-12 right-0 w-64 p-4 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
                  <p className="font-medium text-sm mb-2">{syncLabel}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {offline || syncStatus !== 'saved'
                      ? 'Your progress is kept on this device. Connect to the internet to sync it with your account.'
                      : 'Your progress is saved to your account and available when you sign in on another device.'}
                  </p>
                  {!offline && syncStatus === 'error' && (
                    <button
                      onClick={() => void retrySync()}
                      className="inline-flex items-center gap-2 text-xs text-emerald-300 mt-3"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Try syncing again
                    </button>
                  )}
                </div>
              )}
            </div>
            {user && (
              <>
                <div
                  aria-label={user.displayName ?? 'Your account'}
                  className="w-8 h-8 rounded-full border border-slate-600 bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-200"
                >
                  {(user.displayName ?? user.email ?? 'L')[0].toUpperCase()}
                </div>
                <button
                  onClick={async () => {
                    setLogoutError(false);
                    try {
                      await logout();
                    } catch {
                      setLogoutError(true);
                    }
                  }}
                  aria-label="Sign out"
                  className="p-2 text-slate-500 hover:text-white rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
        <nav
          aria-label="Mobile navigation"
          className="md:hidden grid grid-cols-4 gap-1 border-t border-slate-800/70 px-2 pb-2 pt-1.5"
        >
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium ${isActive ? 'text-emerald-200 bg-emerald-300/10' : 'text-slate-400'}`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      {logoutError && (
        <p role="alert" className="text-center py-3 px-4 bg-amber-400/10 text-amber-200 text-sm">
          Couldn’t sign out. Please try again.
        </p>
      )}
    </>
  );
}

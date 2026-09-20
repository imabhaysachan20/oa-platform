import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, ShieldAlert, UserCheck, Sun, Moon } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Button } from '../components/ui/Button';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isConcurrentSession = searchParams.get('reason') === 'concurrent_session';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useAuthStore((s) => s.setAuth);
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authApi.login(email, password);
      setAuth(res.access_token, res.user);
      if (res.user.role === 'admin') {
        navigate('/admin/exams');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (type: 'student' | 'admin') => {
    if (type === 'admin') {
      setEmail('admin@usefulbi.com');
      setPassword('Admin@12345');
    } else {
      setEmail('student1@usefulbi.com');
      setPassword('Student@12345');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative transition-colors duration-150">
      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 shadow-sm transition"
        >
          {theme === 'dark' ? (
            <Sun size={18} className="text-amber-400" />
          ) : (
            <Moon size={18} className="text-ubi-800" />
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        {/* UsefulBI Official Logo Header */}
        <div className="inline-flex items-center justify-center mb-5">
          <img
            src="/UsefulBI_Logo_Main.webp"
            alt="UsefulBI Logo"
            className="h-12 sm:h-14 w-auto object-contain"
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          UBI<span className="text-ubi-800 dark:text-ubi-400">code</span> Portal
        </h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
          Technical Assessment & Hiring Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-8 px-6 shadow-xl rounded-2xl sm:px-10 transition-colors">
          <form className="space-y-4" onSubmit={handleLogin}>
            {isConcurrentSession && !error && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 dark:bg-amber-950/40 dark:border-amber-700/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs font-medium flex items-start gap-2.5 shadow-sm">
                <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-bold block text-amber-950 dark:text-amber-100">Session Terminated</strong>
                  Your account was logged in from another device or window. Only one active candidate session is permitted at a time.
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@usefulbi.com"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ubi-800 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ubi-800 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full py-2.5 text-sm font-semibold gap-2 mt-2">
              <span>Sign In</span>
              <ArrowRight size={16} />
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center mb-3">
              Quick Test Credentials
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillCredentials('student')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition font-medium"
              >
                <UserCheck size={14} className="text-ubi-800 dark:text-ubi-400" />
                <span>Student Demo</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition font-medium"
              >
                <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400" />
                <span>Admin Demo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

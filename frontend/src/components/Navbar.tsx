import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Shield, User as UserIcon, BookOpen, Users, Sun, Moon, Code2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="border-b border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 transition-colors duration-150 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Product Badge */}
          <Link to="/" className="flex items-center gap-3 group">
            {/* UsefulBI Logo */}
            <div className="flex items-center justify-center">
              <img
                src="/UsefulBI_Logo_Main.webp"
                alt="UsefulBI Logo"
                className="h-8 sm:h-9 w-auto object-contain transition group-hover:opacity-90"
              />
            </div>

            <div className="hidden sm:flex flex-col border-l border-slate-200 dark:border-slate-800 pl-3">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  UBI<span className="text-ubi-800 dark:text-ubi-400">code</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-ubi-50 text-ubi-800 dark:bg-ubi-950 dark:text-ubi-300 border border-ubi-200 dark:border-ubi-800 uppercase tracking-wider">
                  Assessment
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Enterprise Testing Platform
              </span>
            </div>
          </Link>

          {/* Admin Navigation */}
          {isAdmin && (
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
              <Link
                to="/admin/exams"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  location.pathname.startsWith('/admin/exams')
                    ? 'bg-ubi-800 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen size={14} />
                <span>Exams</span>
              </Link>
              <Link
                to="/admin/questions"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  location.pathname.startsWith('/admin/questions')
                    ? 'bg-ubi-800 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <Code2 size={14} />
                <span>Question Bank</span>
              </Link>
              <Link
                to="/admin/students"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  location.pathname.startsWith('/admin/students')
                    ? 'bg-ubi-800 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <Users size={14} />
                <span>Students</span>
              </Link>
            </div>
          )}

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition border border-slate-200/80 dark:border-slate-800"
            >
              {theme === 'dark' ? (
                <Sun size={17} className="text-amber-400" />
              ) : (
                <Moon size={17} className="text-ubi-800" />
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                  {isAdmin ? (
                    <Shield size={15} className="text-ubi-800 dark:text-amber-400 shrink-0" />
                  ) : (
                    <UserIcon size={15} className="text-ubi-800 dark:text-ubi-400 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-900 dark:text-slate-200">{user.name}</span>
                  {user.roll_no && (
                    <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-mono">
                      ({user.roll_no})
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition border border-slate-200/80 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500/30"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-ubi-800 text-white hover:bg-ubi-900 shadow-sm transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

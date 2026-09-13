import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Code2, LogOut, Shield, User as UserIcon, Activity, BookOpen, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-lg shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition">
              <Code2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                UBI<span className="text-indigo-400">code</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                by UsefulBI
              </span>
            </div>
          </Link>

          {/* Admin Navigation */}
          {isAdmin && (
            <div className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
              <Link
                to="/admin/exams"
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  location.pathname.startsWith('/admin/exams')
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BookOpen size={14} />
                Exams
              </Link>
              <Link
                to="/admin/questions"
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  location.pathname.startsWith('/admin/questions')
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Code2 size={14} />
                Question Bank
              </Link>
              <Link
                to="/admin/students"
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  location.pathname.startsWith('/admin/students')
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users size={14} />
                Students
              </Link>
            </div>
          )}

          {/* User Profile & Actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
                  {isAdmin ? (
                    <Shield size={16} className="text-amber-400" />
                  ) : (
                    <UserIcon size={16} className="text-indigo-400" />
                  )}
                  <span className="font-medium text-slate-200">{user.name}</span>
                  {user.roll_no && (
                    <span className="text-xs text-slate-400">({user.roll_no})</span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition border border-transparent hover:border-rose-500/20"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition"
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

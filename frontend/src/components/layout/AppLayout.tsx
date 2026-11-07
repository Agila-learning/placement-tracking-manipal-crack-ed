import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, FileText, BarChart2,
  Settings, ChevronLeft, ChevronRight, LogOut, Bell,
  ChevronDown, Landmark, Store, UserCheck, Shield, Menu
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Candidates', to: '/candidates', icon: <Users className="w-5 h-5" /> },
  {
    label: 'Masters',
    to: '/masters',
    icon: <Settings className="w-5 h-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
    children: [
      { label: 'Banks', to: '/masters/banks', icon: <Landmark className="w-4 h-4" /> },
      { label: 'Programs', to: '/masters/programs', icon: <Building2 className="w-4 h-4" /> },
      { label: 'Vendors', to: '/masters/vendors', icon: <Store className="w-4 h-4" /> },
    ],
  },
  {
    label: 'HR Management',
    to: '/users',
    icon: <UserCheck className="w-5 h-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  { label: 'Reports', to: '/reports', icon: <BarChart2 className="w-5 h-5" /> },
  {
    label: 'Audit Logs',
    to: '/audit',
    icon: <Shield className="w-5 h-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
];

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mastersOpen, setMastersOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-fic-yellow rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-fic-navy font-black text-sm">FIC</span>
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-sm leading-tight">Forge India</div>
            <div className="text-fic-yellow text-xs font-medium">Connect CRM</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.roles && !item.roles.includes(user?.role || '')) return null;

          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setMastersOpen(!mastersOpen)}
                  className={`fic-sidebar-link w-full ${collapsed ? 'justify-center' : 'justify-between'}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown className={`w-4 h-4 transition-transform ${mastersOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>
                {mastersOpen && !collapsed && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          `fic-sidebar-link text-sm py-2 ${isActive ? 'fic-sidebar-link-active' : ''}`
                        }
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `fic-sidebar-link ${isActive ? 'fic-sidebar-link-active' : ''} ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : ''}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className={`px-3 py-4 border-t border-white/10 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed && (
          <div className="mb-3 px-2">
            <div className="text-white text-sm font-semibold truncate">{user?.name}</div>
            <div className="text-slate-400 text-xs capitalize">
              {user?.role?.replace('_', ' ').toLowerCase()}
            </div>
          </div>
        )}
        <button onClick={handleLogout} className="fic-sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-900/20">
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-fic-navy transition-all duration-300 ease-in-out flex-shrink-0 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 ml-14 bg-fic-navy text-white w-6 h-6 rounded-full border border-white/20 flex items-center justify-center hover:bg-fic-navy-light z-20 shadow-lg hidden md:flex"
          style={{ left: collapsed ? '52px' : '228px' }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-fic-navy z-40 md:hidden transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-fic-border px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-slate-500 hover:text-slate-700"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-slate-500 text-sm hidden sm:block">
              Banking Placement CRM
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
              <div className="text-xs text-slate-400">{user?.employeeId}</div>
            </div>
            <div className="w-9 h-9 bg-fic-navy rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};


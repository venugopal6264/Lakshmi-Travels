import { BarChart3, DollarSign, Fuel, LogOut, User2, Menu, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface NavigationProps {
    currentPage: string;
    onPageChange: (page: string) => void;
}

export default function Navigation({ currentPage, onPageChange }: NavigationProps) {
    const { user, loading, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
        { id: 'payments', label: 'Payment Tracker', icon: DollarSign, path: '/payment-tracker' },
        { id: 'fuel', label: 'Fuel Tracker', icon: Fuel, path: '/fuel-dashboard' },
    ];

    const buildHref = (basePath: string) => basePath;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        // Allow open-in-new-tab/window via modifier keys; only SPA-navigate on plain left-click
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onPageChange(id);
        setMobileOpen(false);
    };

    return (
        <nav className="sticky top-0 z-40 bg-gradient-to-r from-blue-700 via-indigo-600 to-emerald-600 shadow-md">
            <div className="container mx-auto px-3 sm:px-4">
                <div className="flex items-center justify-between h-14 sm:h-16">
                    <div className="flex items-center gap-3">
                        {/* Place your logo file at public/logo.png */}
                        <img
                            src="/logo.png"
                            alt="Lakshmi Travels logo"
                            className="h-8 w-8 object-contain bg-white rounded-md p-0.5 ring-1 ring-white/30 shadow-sm"
                        />
                        <h1 className="text-lg sm:text-xl font-bold text-white">Lakshmi Travels</h1>
                    </div>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentPage === item.id;
                            const href = buildHref(item.path);
                            return (
                                <a
                                    key={item.id}
                                    href={href}
                                    onClick={(e) => handleClick(e, item.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${isActive
                                        ? 'bg-white text-blue-700 font-medium'
                                        : 'text-white/90 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </a>
                            );
                        })}
                        {!loading && user && (
                            <div className="ml-3 pl-3 border-l border-white/20 flex items-center">
                                {user.picture ? (
                                    <img src={user.picture} alt="avatar" className="w-6 h-6 rounded-full mr-2 ring-2 ring-white/30" />
                                ) : (
                                    <User2 className="w-5 h-5 text-white/90 mr-2" />
                                )}
                                <button onClick={logout} className="flex items-center gap-1 px-3 py-2 rounded-md text-white/90 hover:text-white hover:bg-white/10">
                                    <LogOut className="w-4 h-4" /> Logout
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                        aria-label="Open menu"
                        onClick={() => setMobileOpen((v) => !v)}
                    >
                        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>

                {/* Mobile menu panel */}
                <div className={`md:hidden transition-all duration-200 overflow-hidden ${mobileOpen ? 'max-h-96' : 'max-h-0'}`}>
                    <div className="py-2 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentPage === item.id;
                            const href = buildHref(item.path);
                            return (
                                <a
                                    key={item.id}
                                    href={href}
                                    onClick={(e) => handleClick(e, item.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-md mx-1 ${isActive
                                        ? 'bg-white text-blue-700 font-medium shadow'
                                        : 'text-white/90 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-sm">{item.label}</span>
                                </a>
                            );
                        })}
                        {!loading && user && (
                            <div className="border-t border-white/10 mt-2 pt-2 mx-1 flex items-center justify-between px-4">
                                <div className="flex items-center gap-2">
                                    {user.picture ? (
                                        <img src={user.picture} alt="avatar" className="w-6 h-6 rounded-full ring-2 ring-white/30" />
                                    ) : (
                                        <User2 className="w-5 h-5 text-white/90" />
                                    )}
                                    <span className="text-white/90 text-sm">{user.name || 'User'}</span>
                                </div>
                                <button onClick={logout} className="flex items-center gap-1 px-3 py-2 rounded-md text-white/90 hover:text-white hover:bg-white/10">
                                    <LogOut className="w-4 h-4" /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

import { BarChart3, DollarSign, Car, LogOut, User2, Menu, X, Search, Home, Users } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface NavigationProps {
    currentPage: string;
    onPageChange: (page: string) => void;
    onOpenPnrSearch?: () => void;
}

export default function Navigation({ currentPage, onPageChange, onOpenPnrSearch }: NavigationProps) {
    const { user, loading, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const hasAdminRole = (u: unknown): u is {
        picture?: string | null; role: string
    } => {
        if (!u || typeof u !== 'object') return false;
        const obj = u as Record<string, unknown>;
        return typeof obj.role === 'string' && (obj.picture == null || typeof obj.picture === 'string');
    };
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
        { id: 'payments', label: 'Payments', icon: DollarSign, path: '/payment-tracker' },
        { id: 'customers', label: 'Customers', icon: Users, path: '/customers' },
        { id: 'vehicles', label: 'Vehicles', icon: Car, path: '/vehicles' },
        { id: 'apartments', label: 'Apartments', icon: Home, path: '/apartments' }
    ];

    const buildHref = (basePath: string) => basePath;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
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
                                {/* PNR Search trigger */}
                                <button
                                    type="button"
                                    onClick={() => onOpenPnrSearch?.()}
                                    className="mr-3 inline-flex items-center justify-center rounded-full p-2 text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                                    title="PNR Search"
                                >
                                    <Search className="w-5 h-5" />
                                </button>
                                {/* User avatar/icon – clickable for admins to open Accounts page */}
                                {user.picture ? (
                                    <button
                                        type="button"
                                        onClick={() => hasAdminRole(user) && user.role === 'admin' && onPageChange('accounts')}
                                        title={hasAdminRole(user) && user.role === 'admin' ? 'Open Accounts' : 'User'}
                                        className={`mr-2 ring-2 ring-white/30 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/60 ${hasAdminRole(user) && user.role === 'admin' ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
                                    >
                                        <img src={user.picture} alt="avatar" className="w-6 h-6" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => hasAdminRole(user) && user.role === 'admin' && onPageChange('accounts')}
                                        title={hasAdminRole(user) && user.role === 'admin' ? 'Open Accounts' : 'User'}
                                        className={`mr-2 text-white/90 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-white/60 ${hasAdminRole(user) && user.role === 'admin' ? 'cursor-pointer hover:bg-white/10' : 'cursor-default'}`}
                                    >
                                        <User2 className="w-5 h-5" />
                                    </button>
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
                                    <button
                                        type="button"
                                        onClick={() => onOpenPnrSearch?.()}
                                        className="rounded-full p-2 text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                                        title="PNR Search"
                                    >
                                        <Search className="w-5 h-5" />
                                    </button>
                                    {(hasAdminRole(user) && user.role === 'admin') ? (
                                        <button
                                            type="button"
                                            onClick={() => onPageChange('accounts')}
                                            className="rounded-full ring-2 ring-white/30 overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/60 hover:brightness-110"
                                            title="Open Accounts"
                                        >
                                            {user.picture ? (
                                                <img src={user.picture} alt="avatar" className="w-6 h-6" />
                                            ) : (
                                                <User2 className="w-5 h-5 text-white/90 m-0.5" />
                                            )}
                                        </button>
                                    ) : (
                                        user.picture ? (
                                            <img src={user.picture} alt="avatar" className="w-6 h-6 rounded-full ring-2 ring-white/30" />
                                        ) : (
                                            <User2 className="w-5 h-5 text-white/90" />
                                        )
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

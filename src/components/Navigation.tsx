import { BarChart3, DollarSign, Car, LogOut, User2, Search, Home, Users, StickyNote, TrendingUp, Menu, X, Bell } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface NavigationProps {
    currentPage: string;
    onPageChange: (page: string) => void;
    onOpenPnrSearch?: () => void;
}

export default function Navigation({ currentPage, onPageChange, onOpenPnrSearch }: NavigationProps) {
    const { user, loading, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
        { id: 'payments', label: 'Payments', icon: DollarSign, path: '/payment-tracker' },
        { id: 'customers', label: 'Customers', icon: Users, path: '/customers' },
        { id: 'vehicles', label: 'Vehicles', icon: Car, path: '/vehicles' },
        { id: 'apartments', label: 'Apartments', icon: Home, path: '/apartments' },
        { id: 'notes', label: 'Notes', icon: StickyNote, path: '/notes' },
        { id: 'salary', label: 'Salary', icon: TrendingUp, path: '/salary' },
    ];

    const handleNavigation = (navItemId: string) => {
        const item = navItems.find((i) => i.id === navItemId);
        if (item) {
            const targetPage = item.path === '/payment-tracker' ? 'payments'
                : item.path === '/dashboard' ? 'dashboard'
                    : item.path === '/vehicles' ? 'vehicles'
                        : item.path === '/apartments' ? 'apartments'
                            : item.path === '/customers' ? 'customers'
                                : item.path === '/notes' ? 'notes'
                                    : item.path === '/salary' ? 'salary'
                                        : 'dashboard';
            onPageChange(targetPage);
            setMobileMenuOpen(false); // Close mobile menu after navigation
        }
    };

    const isActive = (id: string) => {
        return currentPage === id ||
            (id === 'payments' && currentPage === 'payments') ||
            (id === 'dashboard' && currentPage === 'dashboard');
    };

    if (loading) {
        return (
            <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 shadow-xl flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </aside>
        );
    }

    if (!user) return null;

    return (
        <>
            {/* Mobile Top Navigation Bar */}
            <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-emerald-600 shadow-lg">
                {/* Top Row with Icons */}
                <div className="flex items-center justify-between px-2 py-2">
                    {/* Hamburger Menu */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-lg hover:bg-white/20 text-white"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>

                    {/* Logo/Brand - Center */}
                    <button
                        onClick={() => onPageChange('dashboard')}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <img
                            src="/LakshmiTravels.png"
                            alt="Logo"
                            className="h-8 w-8 object-contain bg-white rounded-md p-1 ring-2 ring-white/30 shadow-md"
                        />
                    </button>

                    {/* Right Icons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onOpenPnrSearch?.()}
                            className="p-2 rounded-lg hover:bg-white/20 text-white relative"
                            title="Search"
                        >
                            <Search className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => onPageChange('accounts')}
                            className="p-2 rounded-lg hover:bg-white/20 text-white relative"
                            title="Account Settings"
                        >
                            <User2 className="w-6 h-6" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-white/20 text-white relative" title="Notifications">
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 bg-slate-900 border-b border-slate-700 shadow-lg max-h-[80vh] overflow-y-auto">

                        {/* Navigation Items */}
                        <div className="py-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNavigation(item.id)}
                                        className={`w-full flex items-center gap-3 px-6 py-3 text-left ${active
                                            ? 'bg-blue-600 text-white border-l-4 border-blue-400'
                                            : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* User Section */}
                        <div className="border-t border-slate-700 p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                    <User2 className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">
                                        {user.name || user.email || 'User'}
                                    </p>
                                    <p className="text-xs text-gray-400">Online</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    logout();
                                    setMobileMenuOpen(false);
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="font-medium">Logout</span>
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Desktop Top Horizontal Bar - Full Width - Hidden on Mobile */}
            <div className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-emerald-600 shadow-lg">
                <div className="flex items-center justify-between gap-3 px-4 py-2">
                    {/* Logo and Brand Name on Left */}
                    <button
                        onClick={() => onPageChange('dashboard')}
                        className="flex items-center gap-3 hover:opacity-90 transition-opacity"
                    >
                        <img
                            src="/LakshmiTravels.png"
                            alt="Lakshmi Travels logo"
                            className="h-10 w-10 object-contain bg-white rounded-md ring-2 ring-white/30 shadow-md"
                        />
                        <div>
                            <h1 className="text-lg font-bold text-white">Lakshmi Travels</h1>
                            <p className="text-xs text-white/70">Travel Management</p>
                        </div>
                    </button>

                    {/* Right Side Buttons */}
                    <div className="flex items-center gap-3">
                        {/* Search Button */}
                        <button
                            onClick={() => onOpenPnrSearch?.()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all text-white border border-white/30 shadow-md hover:shadow-lg"
                            title="PNR Search"
                        >
                            <Search className="w-5 h-5" />
                            <span className="text-sm font-medium">Search</span>
                        </button>

                        {/* Account Button */}
                        <button
                            onClick={() => onPageChange('accounts')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all text-white border border-white/30 shadow-md hover:shadow-lg"
                            title="Account Settings"
                        >
                            <User2 className="w-5 h-5" />
                            <span className="text-sm font-medium">Account</span>
                        </button>

                        {/* Logout Button */}
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white transition-all shadow-md hover:shadow-lg border border-white/20"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-sm font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Desktop Vertical Sidebar - Below Horizontal Bar - Hidden on Mobile */}
            <aside className="hidden md:flex fixed top-[64px] bottom-0 left-0 z-40 w-64 bg-slate-900 shadow-xl flex-col">
                {/* Navigation Items */}
                <nav className="flex-1 overflow-y-auto py-4 px-2">
                    <div className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavigation(item.id)}
                                    className={`
                                        w-full flex items-center gap-3 px-4 py-3 rounded-lg
                                        transition-all duration-200 group
                                        ${active
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                        }
                                    `}
                                >
                                    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'} transition-colors`} />
                                    <span className="font-medium text-sm">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>
            </aside>
        </>
    );
}

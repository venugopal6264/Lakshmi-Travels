import { BarChart3, DollarSign, FileText, Plus, Fuel, LogOut, User2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface NavigationProps {
    currentPage: string;
    onPageChange: (page: string) => void;
}

export default function Navigation({ currentPage, onPageChange }: NavigationProps) {
    const { user, loading, logout } = useAuth();
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
        { id: 'create', label: 'Create Ticket', icon: Plus, path: '/create-ticket' },
        { id: 'payments', label: 'Payment Tracker', icon: DollarSign, path: '/payment-tracker' },
        { id: 'fuel', label: 'Fuel Tracker', icon: Fuel, path: '/fuel-dashboard' },
    ];

    const buildHref = (basePath: string) => basePath;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        // Allow open-in-new-tab/window via modifier keys; only SPA-navigate on plain left-click
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onPageChange(id);
    };

    return (
        <nav className="bg-white shadow-sm border-b">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <h1 className="text-xl font-bold text-gray-900">Lakshmi Travels</h1>
                    </div>

                    <div className="flex items-center space-x-1">
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
                                        ? 'bg-blue-100 text-blue-700 font-medium'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </a>
                            );
                        })}
                                                {/* Show logout only when authenticated; no login button in the header */}
                                                {!loading && user && (
                                                    <div className="ml-3 pl-3 border-l border-gray-200 flex items-center">
                                                        {user.picture ? (
                                                            <img src={user.picture} alt="avatar" className="w-6 h-6 rounded-full mr-2" />
                                                        ) : (
                                                            <User2 className="w-5 h-5 text-gray-500 mr-2" />
                                                        )}
                                                        <button onClick={logout} className="flex items-center gap-1 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
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

import { BarChart3, DollarSign, FileText, Plus, Fuel } from 'lucide-react';

interface NavigationProps {
    currentPage: string;
    onPageChange: (page: string) => void;
}

export default function Navigation({ currentPage, onPageChange }: NavigationProps) {
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

                    <div className="flex space-x-1">
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
                    </div>
                </div>
            </div>
        </nav>
    );
}

import { TrendingUp, DollarSign } from 'lucide-react';
import { ApiSalary } from '../../services/api';

export function SummaryCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
    return (
        <div className={`${color} rounded-lg p-2 border border-gray-200`}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-600 mb-1">{title}</div>
                    <div className="text-xl font-bold text-gray-800">{value}</div>
                </div>
                <div className="rounded-full bg-white p-2">{icon}</div>
            </div>
        </div>
    );
}

export function YearlyTotalPercentageChart({ salaries }: { salaries: ApiSalary[] }) {
    // Sort by year ascending for proper display
    const sortedData = [...salaries].sort((a, b) => a.year - b.year);
    const maxPercentage = Math.max(...sortedData.map(s => s.totalPercentage), 25);

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Year vs Total % Increase
            </h3>
            <div className="space-y-3">
                {sortedData.map((sal) => {
                    const percentage = (sal.totalPercentage / maxPercentage) * 100;
                    return (
                        <div key={sal.year} className="flex items-center gap-2">
                            <div className="w-12 text-xs font-semibold text-gray-700">{sal.year}</div>
                            <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-end px-2 transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                >
                                    <span className="text-xs font-semibold text-white">
                                        {sal.totalPercentage.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function YearlyBonusPercentageChart({ salaries }: { salaries: ApiSalary[] }) {
    // Sort by year ascending for proper display
    const sortedData = [...salaries].sort((a, b) => a.year - b.year);
    const maxPercentage = Math.max(...sortedData.map(s => s.bonusPercentage), 10);

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Year vs Bonus %
            </h3>
            <div className="space-y-3">
                {sortedData.map((sal) => {
                    const percentage = maxPercentage > 0 ? (sal.bonusPercentage / maxPercentage) * 100 : 0;
                    return (
                        <div key={sal.year} className="flex items-center gap-2">
                            <div className="w-12 text-xs font-semibold text-gray-700">{sal.year}</div>
                            <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-end px-2 transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                >
                                    <span className="text-xs font-semibold text-white">
                                        {sal.bonusPercentage.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, Download, TrendingUp, DollarSign, Percent, Eye } from 'lucide-react';
import { ApiSalary, apiService } from '../services/api';
import {
    SummaryCard,
    YearlyTotalPercentageChart,
    YearlyBonusPercentageChart,
    SalaryEditor,
    generateCSV
} from '../utils/salary';

export default function SalaryPage() {
    const [salaries, setSalaries] = useState<ApiSalary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<ApiSalary | null>(null);
    const [viewingComponents, setViewingComponents] = useState<ApiSalary | null>(null);

    useEffect(() => {
        loadSalaries();
    }, []);

    const loadSalaries = async () => {
        try {
            setLoading(true);
            const data = await apiService.getSalaries();
            setSalaries(data);
        } catch {
            setError('Failed to load salary records');
        } finally {
            setLoading(false);
        }
    };

    const openNew = () => {
        setEditing(null);
        setEditorOpen(true);
    };

    const onSave = async (data: Omit<ApiSalary, '_id' | 'createdAt' | 'updatedAt'>, id?: string) => {
        try {
            if (id) {
                await apiService.updateSalary(id, data);
            } else {
                await apiService.createSalary(data);
            }
            await loadSalaries();
            setEditorOpen(false);
            setEditing(null);
        } catch {
            setError('Failed to save salary record');
        }
    };

    const onDelete = async (id: string) => {
        if (!confirm('Delete this salary record?')) return;
        try {
            await apiService.deleteSalary(id);
            setSalaries(prev => prev.filter(s => s._id !== id));
        } catch {
            setError('Failed to delete');
        }
    };

    const exportReport = () => {
        const csv = generateCSV(salaries);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `salary-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
    const pct = (n: number) => `${n.toFixed(2)}%`;

    // Calculate components for display if they don't exist
    const getComponents = (salary: ApiSalary) => {
        if (salary.components) return salary.components;

        // Calculate components on-the-fly for old records
        const finalSal = salary.finalSalary;
        const basic = Math.round(finalSal * 0.40);
        const hra = Math.round(finalSal * 0.16);
        const pf = Math.round(basic * 0.12);
        const gratuity = Math.round(basic * 0.048);
        const nps = Math.round(basic * 0.05);

        const lta = 30000;
        const phone = 18000;
        const fuel = 21600;
        const food = 26400;

        // Special Allowance = Remaining amount (Final Salary - Basic - HRA - PF - Gratuity - NPS - LTA - Phone - Fuel - Food)
        const specialAllowance = finalSal - basic - hra - pf - gratuity - nps - lta - phone - fuel - food;

        const basicMonth = Math.round(basic / 12);
        const hraMonth = Math.round(hra / 12);
        const specialAllowanceMonth = Math.round(specialAllowance / 12);
        const pfMonth = Math.round(pf / 12);
        const gratuityMonth = Math.round(gratuity / 12);
        const npsMonth = Math.round(nps / 12);
        const ltaMonth = Math.round(lta / 12);
        const phoneMonth = Math.round(phone / 12);
        const fuelMonth = Math.round(fuel / 12);
        const foodMonth = Math.round(food / 12);

        const grossSalary = basic + hra + specialAllowance;
        const total = grossSalary + lta + phone + fuel + food;
        const totalRetails = pf + gratuity + nps;
        const ctcPM = total + totalRetails;

        return {
            basic: { annual: basic, month: basicMonth },
            hra: { annual: hra, month: hraMonth },
            specialAllowance: { annual: specialAllowance, month: specialAllowanceMonth },
            grossSalary: { annual: grossSalary, month: Math.round(grossSalary / 12) },
            lta: { annual: lta, month: ltaMonth },
            phone: { annual: phone, month: phoneMonth },
            fuel: { annual: fuel, month: fuelMonth },
            food: { annual: food, month: foodMonth },
            total: { annual: total, month: Math.round(total / 12) },
            pf: { annual: pf, month: pfMonth },
            gratuity: { annual: gratuity, month: gratuityMonth },
            nps: { annual: nps, month: npsMonth },
            totalRetails: { annual: totalRetails, month: Math.round(totalRetails / 12) },
            ctcPM: { annual: ctcPM, month: Math.round(ctcPM / 12) }
        };
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 px-6 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" /> Salary Management
                    </h1>
                    <div className="flex gap-2">
                        <button
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white px-3 py-1.5 hover:from-green-600 hover:to-teal-600 ring-1 ring-white/20 shadow-sm"
                            onClick={exportReport}
                        >
                            <Download className="h-4 w-4" /> Export
                        </button>
                        <button
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1.5 hover:from-emerald-600 hover:to-teal-600 ring-1 ring-white/20 shadow-sm"
                            onClick={openNew}
                        >
                            <Plus className="h-4 w-4" /> New
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-2">
                {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
                {loading ? (
                    <div className="text-sm text-gray-600">Loading...</div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        {salaries.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                                <SummaryCard
                                    title="Current CTC"
                                    value={fmt(salaries[0]?.finalSalary || 0)}
                                    icon={<DollarSign className="h-5 w-5 text-green-600" />}
                                    color="bg-green-50"
                                />
                                <SummaryCard
                                    title="Latest Hike"
                                    value={pct(salaries[0]?.hikePercentage || 0)}
                                    icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
                                    color="bg-blue-50"
                                />
                                <SummaryCard
                                    title="Total Increase"
                                    value={pct(salaries[0]?.totalPercentage || 0)}
                                    icon={<Percent className="h-5 w-5 text-purple-600" />}
                                    color="bg-purple-50"
                                />
                            </div>
                        )}

                        {/* Bar Charts */}
                        {salaries.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
                                <YearlyTotalPercentageChart salaries={salaries} />
                                <YearlyBonusPercentageChart salaries={salaries} />
                            </div>
                        )}

                        {/* Salary Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-indigo-100 to-purple-100 text-gray-800">
                                        <th className="px-2 py-2 text-left">Year</th>
                                        <th className="px-2 py-2 text-right">Previous</th>
                                        <th className="px-2 py-2 text-right">Hike %</th>
                                        <th className="px-2 py-2 text-right">Hike Amount</th>
                                        <th className="px-2 py-2 text-right">Revision %</th>
                                        <th className="px-2 py-2 text-right">Total %</th>
                                        <th className="px-2 py-2 text-right">Final</th>
                                        <th className="px-2 py-2 text-right">Bonus %</th>
                                        <th className="px-2 py-2 text-right">Bonus Amount</th>
                                        <th className="px-2 py-2 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salaries.map((sal, i) => {
                                        const hikeAmount = Math.round(sal.previousSalary * sal.hikePercentage / 100);
                                        return (
                                            <tr key={sal._id} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                                                <td className="px-2 py-2 font-semibold">
                                                    <div className="flex items-center gap-2">
                                                        {sal.year}
                                                        <button
                                                            className="p-1 rounded hover:bg-indigo-100"
                                                            title="View Component Breakdown"
                                                            onClick={() => setViewingComponents(sal)}
                                                        >
                                                            <Eye className="h-4 w-4 text-indigo-600" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-right">{fmt(sal.previousSalary)}</td>
                                                <td className="px-2 py-2 text-right">{pct(sal.hikePercentage)}</td>
                                                <td className="px-2 py-2 text-right">{fmt(hikeAmount)}</td>
                                                <td className="px-2 py-2 text-right">{pct(sal.revisionPercentage)}</td>
                                                <td className="px-2 py-2 text-right font-semibold text-blue-700">{pct(sal.totalPercentage)}</td>
                                                <td className="px-2 py-2 text-right font-semibold text-green-700">{fmt(sal.finalSalary)}</td>
                                                <td className="px-2 py-2 text-right">{pct(sal.bonusPercentage)}</td>
                                                <td className="px-2 py-2 text-right">{fmt(sal.bonusAmount)}</td>
                                                <td className="px-2 py-2 text-center">
                                                    <button
                                                        className="p-1 rounded hover:bg-gray-200 mr-1"
                                                        title="Edit"
                                                        onClick={() => {
                                                            setEditing(sal);
                                                            setEditorOpen(true);
                                                        }}
                                                    >
                                                        <Edit3 className="h-4 w-4 text-blue-600" />
                                                    </button>
                                                    <button
                                                        className="p-1 rounded hover:bg-gray-200"
                                                        title="Delete"
                                                        onClick={() => sal._id && onDelete(sal._id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-600" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {editorOpen && (
                    <SalaryEditor
                        initial={editing}
                        salaries={salaries}
                        onClose={() => {
                            setEditorOpen(false);
                            setEditing(null);
                        }}
                        onSave={onSave}
                    />
                )}

                {/* Component Breakdown Modal */}
                {viewingComponents && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center">
                                <h2 className="text-xl font-bold">Salary Component Breakdown - {viewingComponents.year}</h2>
                                <button
                                    className="text-white hover:text-gray-200 text-2xl font-bold"
                                    onClick={() => setViewingComponents(null)}
                                >
                                    ×
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                                {(() => {
                                    const components = getComponents(viewingComponents);
                                    return (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-indigo-100">
                                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Component</th>
                                                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Monthly (₹)</th>
                                                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Annual (₹)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white">
                                                    <tr className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-gray-700">Basic (40%)</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.basic?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.basic?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-gray-700">HRA (16%)</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.hra?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.hra?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-gray-700">Special Allowance (Remaining)</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.specialAllowance?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.specialAllowance?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="border-b bg-indigo-50">
                                                        <td className="px-4 py-2 font-semibold text-gray-800">Gross Salary</td>
                                                        <td className="px-4 py-2 text-right font-semibold text-gray-800">{components.grossSalary?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-semibold text-gray-800">{components.grossSalary?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-gray-700">LTA</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.lta?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.lta?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-gray-700">Phone</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.phone?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.phone?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-gray-700">Fuel</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.fuel?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.fuel?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-gray-700">Food</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.food?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.food?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="border-b bg-indigo-50">
                                                        <td className="px-4 py-2 font-semibold text-gray-800">Total</td>
                                                        <td className="px-4 py-2 text-right font-semibold text-gray-800">{components.total?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-semibold text-gray-800">{components.total?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-gray-700">PF (12% of Basic)</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.pf?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.pf?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-gray-700">Gratuity (4.8% of Basic)</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.gratuity?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.gratuity?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-gray-700">NPS (5% of Basic)</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.nps?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{components.nps?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="border-b bg-indigo-50">
                                                        <td className="px-4 py-2 font-semibold text-gray-800">Total Retirals</td>
                                                        <td className="px-4 py-2 text-right font-semibold text-gray-800">{components.totalRetails?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-2 text-right font-semibold text-gray-800">{components.totalRetails?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                    <tr className="bg-indigo-100">
                                                        <td className="px-4 py-3 font-bold text-gray-900">CTC PM</td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{components.ctcPM?.month?.toLocaleString('en-IN') || 0}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{components.ctcPM?.annual?.toLocaleString('en-IN') || 0}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Floating Add Salary button */}
            <button
                type="button"
                title="Add New Salary Record"
                aria-label="Add New Salary Record"
                onClick={openNew}
                className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-xl ring-2 ring-emerald-400/50 flex items-center justify-center transition transform hover:scale-110 hover:shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff' }}
            >
                <Plus className="w-7 h-7" />
            </button>
        </div>
    );
}

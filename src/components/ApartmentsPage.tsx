import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, ApiFlat, ApiRentRecord, ApiTenant } from '../services/api';
import { Calendar, Home, Plus, Search, Eye, History, Edit3 } from 'lucide-react';
import { AddFlatModal, EditTenantModal, HistoryModal } from '../utils/Apartments/FlatModals';
import { AddTenantModal, ViewMemberModal } from '../utils/Apartments/MemberModal';
import { MonthKey, ym, flatCardClass, statusBadgeClass, statusLabel, changeTenantBtnClass } from '../utils/Apartments/flatUtils';

export default function ApartmentsPage() {
    const [flats, setFlats] = useState<ApiFlat[]>([]);
    const [, setTenants] = useState<ApiTenant[]>([]);
    const [rents, setRents] = useState<ApiRentRecord[]>([]);
    const [month, setMonth] = useState<MonthKey>(ym());
    const [loading, setLoading] = useState(false);
    const [showAddFlat, setShowAddFlat] = useState(false);
    const [showAddTenantFor, setShowAddTenantFor] = useState<ApiFlat | null>(null);
    const [historyFor, setHistoryFor] = useState<ApiFlat | null>(null);
    const [history, setHistory] = useState<ApiTenant[] | null>(null);
    const [filter, setFilter] = useState<'all' | 'occupied' | 'vacant'>('all');
    const [query, setQuery] = useState('');
    const [editTenant, setEditTenant] = useState<ApiTenant | null>(null);
    const [viewTenant, setViewTenant] = useState<ApiTenant | null>(null);

    const loadAll = useCallback(async (m: MonthKey = month) => {
        setLoading(true);
        try {
            const [f, t, r] = await Promise.all([
                apiService.getFlats(),
                apiService.getTenants(),
                apiService.getRents(m),
            ]);
            setFlats(f);
            setTenants(t);
            setRents(r);
        } finally {
            setLoading(false);
        }
    }, [month]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const rentByFlat = useMemo(() => {
        const map: Record<string, ApiRentRecord | undefined> = {};
        for (const r of rents) {
            const key = typeof r.flat === 'string' ? r.flat : (r.flat as ApiFlat)._id!;
            map[key] = r;
        }
        return map;
    }, [rents]);

    const handleCreateFlat = async (number: string, notes: string) => {
        await apiService.createFlat(number, notes);
        await loadAll();
        setShowAddFlat(false);
    };

    const handleAddTenant = async (flat: ApiFlat, input: { name: string; phone?: string; aadharNumber?: string; startDate: string; rentAmount: number; deposit?: number }) => {
        await apiService.createTenant({ ...input, flatId: flat._id! });
        await loadAll();
        setShowAddTenantFor(null);
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => setMonth(e.target.value);
    const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value);
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value as 'all' | 'occupied' | 'vacant');
    const handleShowAddFlat = () => setShowAddFlat(true);
    const handleCloseAddFlat = () => setShowAddFlat(false);
    const handleCloseAddTenant = () => setShowAddTenantFor(null);
    const handleAddTenantForCurrent = (input: { name: string; phone?: string; aadharNumber?: string; startDate: string; rentAmount: number; deposit?: number }) => {
        if (showAddTenantFor) handleAddTenant(showAddTenantFor, input);
    };
    const handleCloseHistory = () => { setHistoryFor(null); setHistory(null); };
    const handleCloseEditTenant = () => setEditTenant(null);
    const handleSaveEditTenant = async (patch: Partial<ApiTenant>) => {
        if (!editTenant?._id) return;
        await apiService.updateTenant(editTenant._id, patch);
        setEditTenant(null);
        await loadAll();
    };
    const handleCloseViewTenant = () => setViewTenant(null);
    const handleEditFromView = (t: ApiTenant) => { setViewTenant(null); setEditTenant(t); };

    const handleTogglePaid = async (flat: ApiFlat) => {
        // Mark Paid: set paid=true, amount=tenant's rentAmount, set paidDate to today
        const tenant = flat.currentTenant as ApiTenant | null;
        if (!tenant) return;
        const tenantId = typeof tenant === 'string' ? (tenant as unknown as string) : (tenant as ApiTenant)._id!;
        await apiService.upsertRent({
            flatId: flat._id!,
            tenantId,
            month,
            amount: (tenant as ApiTenant).rentAmount ?? 0,
            paid: true,
            paidDate: new Date().toISOString().split('T')[0]
        });
        await loadAll();
    };

    const filteredFlats = useMemo(() => {
        let list = flats;
        if (filter === 'occupied') list = list.filter(f => !!f.currentTenant);
        if (filter === 'vacant') list = list.filter(f => !f.currentTenant);
        if (query.trim()) {
            const q = query.toLowerCase();
            list = list.filter(f => {
                const tn = (f.currentTenant as ApiTenant | null)?.name?.toLowerCase() || '';
                const num = (f.number || '').toLowerCase();
                const adh = (f.currentTenant as ApiTenant | null)?.aadharNumber?.toLowerCase() || '';
                return tn.includes(q) || num.includes(q) || adh.includes(q);
            });
        }
        return list;
    }, [flats, filter, query]);

    const openHistory = async (flat: ApiFlat) => {
        setHistoryFor(flat);
        setHistory(null);
        const data = await apiService.getFlatTenants(flat._id!);
        setHistory(data);
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-emerald-600 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2 flex-shrink-0"><Home className="w-5 h-5" /> Apartments</h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-white/15 text-white rounded-full px-2 py-2 ring-1 ring-white/30">
                        <Calendar className="w-4 h-4" />
                        <input type="month" value={month} onChange={handleMonthChange} className="bg-transparent focus:outline-none" />
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-white/15 text-white rounded-full px-2 py-2 ring-1 ring-white/30">
                        <Search className="w-4 h-4" />
                        <input value={query} onChange={handleQueryChange} placeholder="Search tenant or flat" className="bg-transparent placeholder:text-white/80 focus:outline-none" />
                    </div>
                    <select value={filter} onChange={handleFilterChange} className="bg-white/90 text-indigo-700 rounded-full px-2 py-2 text-sm">
                        <option value="all">All</option>
                        <option value="occupied">Occupied</option>
                        <option value="vacant">Vacant</option>
                    </select>
                    <button onClick={handleShowAddFlat} className="inline-flex items-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-full font-medium hover:bg-indigo-50">
                        <Plus className="w-4 h-4" /> Add Flat
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-500">Loading…</div>
            ) : filteredFlats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No flats found</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {filteredFlats.map((f, idx) => {
                        const rr = rentByFlat[f._id!];
                        const tenant = f.currentTenant as ApiTenant | null;
                        const isPaid = rr?.paid;
                        const changeBtnLabel = isPaid ? 'Change Tenant' : 'Change';
                        return (
                            <div
                                key={f._id}
                                className={flatCardClass(tenant, isPaid)}
                            >
                                {/* Status indicator */}
                                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                                    <div className={statusBadgeClass(tenant, isPaid)}>
                                        {statusLabel(tenant, isPaid)}
                                    </div>
                                </div>

                                <div className="p-4">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Flat #{idx + 1}</div>
                                            <h3 className="text-2xl font-bold text-gray-900">{f.number}</h3>
                                        </div>
                                        <button
                                            type="button"
                                            title="View occupied history"
                                            className="inline-flex items-center justify-center rounded-lg bg-purple-100 text-purple-700 p-2 hover:bg-purple-200 transition-colors"
                                            onClick={() => openHistory(f)}
                                        >
                                            <History className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Tenant Info */}
                                    <div className="mb-4 min-h-[60px]">
                                        {tenant ? (
                                            <div>
                                                <div className="text-xs text-gray-500 mb-1">Member</div>
                                                <button
                                                    type="button"
                                                    className="text-lg font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-2"
                                                    onClick={() => setViewTenant(tenant)}
                                                >
                                                    {tenant.name}
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {tenant.phone && (
                                                    <div className="text-sm text-gray-600 mt-1">{tenant.phone}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <span className="text-gray-400 text-sm">No tenant</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Rent Amount */}
                                    {tenant && (
                                        <div className="mb-4 p-3 rounded-lg bg-white/70 border border-gray-200">
                                            <div className="text-xs text-gray-500 mb-1">Rent Amount</div>
                                            <div className="text-2xl font-bold text-gray-900">
                                                ₹{rr?.paid ? (rr?.amount ?? 0).toLocaleString() : 0}
                                            </div>
                                            {!isPaid && tenant.rentAmount && (
                                                <div className="text-xs text-gray-500 mt-1">Expected: ₹{tenant.rentAmount.toLocaleString()}</div>
                                            )}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 mt-4">
                                        {tenant ? (
                                            <>
                                                {!isPaid && (
                                                    <button
                                                        type="button"
                                                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                                                        onClick={() => handleTogglePaid(f)}
                                                    >
                                                        Mark Paid
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    title="Change tenant"
                                                    className={changeTenantBtnClass(isPaid)}
                                                    onClick={() => setShowAddTenantFor(f)}
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                    {changeBtnLabel}
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                                                onClick={() => setShowAddTenantFor(f)}
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Tenant
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Flat Modal */}
            {showAddFlat && (
                <AddFlatModal onClose={handleCloseAddFlat} onCreate={handleCreateFlat} />
            )}

            {/* Add/Change Tenant Modal */}
            {showAddTenantFor && (
                <AddTenantModal flat={showAddTenantFor} onClose={handleCloseAddTenant} onCreate={handleAddTenantForCurrent} />
            )}

            {/* Tenant History Modal */}
            {historyFor && (
                <HistoryModal flat={historyFor} history={history} onClose={handleCloseHistory} />)
            }

            {/* Edit Tenant Modal */}
            {editTenant && (
                <EditTenantModal tenant={editTenant} onClose={handleCloseEditTenant} onSave={handleSaveEditTenant} />
            )}

            {/* View Member Modal */}
            {viewTenant && (
                <ViewMemberModal
                    tenant={viewTenant}
                    onClose={handleCloseViewTenant}
                    onEdit={handleEditFromView}
                />
            )}
        </div>
    );
}

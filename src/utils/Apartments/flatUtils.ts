import { ApiTenant } from '../../services/api';

export type MonthKey = string; // YYYY-MM

export function ym(d = new Date()): MonthKey {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function flatCardClass(tenant: ApiTenant | null, isPaid: boolean | undefined): string {
    if (!tenant) return 'relative rounded-xl border-2 shadow-sm hover:shadow-md transition-shadow border-gray-200 bg-gradient-to-br from-gray-50 to-white';
    if (isPaid) return 'relative rounded-xl border-2 shadow-sm hover:shadow-md transition-shadow border-emerald-200 bg-gradient-to-br from-emerald-50 to-white';
    return 'relative rounded-xl border-2 shadow-sm hover:shadow-md transition-shadow border-amber-200 bg-gradient-to-br from-amber-50 to-white';
}

export function statusBadgeClass(tenant: ApiTenant | null, isPaid: boolean | undefined): string {
    if (!tenant) return 'absolute top-3 right-[-32px] w-32 h-6 transform rotate-45 text-center text-xs font-semibold text-white shadow-sm bg-gray-400';
    if (isPaid) return 'absolute top-3 right-[-32px] w-32 h-6 transform rotate-45 text-center text-xs font-semibold text-white shadow-sm bg-emerald-500';
    return 'absolute top-3 right-[-32px] w-32 h-6 transform rotate-45 text-center text-xs font-semibold text-white shadow-sm bg-amber-500';
}

export function statusLabel(tenant: ApiTenant | null, isPaid: boolean | undefined): string {
    if (!tenant) return 'Vacant';
    return isPaid ? 'Paid' : 'Unpaid';
}

export function changeTenantBtnClass(isPaid: boolean | undefined): string {
    return `${isPaid ? 'flex-1' : ''} inline-flex items-center justify-center gap-2 rounded-lg border-2 border-indigo-200 bg-white px-4 py-2.5 text-indigo-700 text-sm font-medium hover:bg-indigo-50 transition-colors`;
}

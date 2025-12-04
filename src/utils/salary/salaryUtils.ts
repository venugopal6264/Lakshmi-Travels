import { ApiSalary } from '../../services/api';

export function generateCSV(salaries: ApiSalary[]): string {
    const headers = [
        'Year', 'Hike %', 'Previous Salary', 'Final Salary', 'Revision %',
        'Revision Amount', 'Total %', 'Bonus %', 'Bonus Amount',
        'Basic (Annual)', 'HRA (Annual)', 'Special Allowance (Annual)', 'Gross Salary (Annual)',
        'LTA (Annual)', 'Phone (Annual)', 'Fuel (Annual)', 'Food (Annual)', 'Total (Annual)',
        'PF (Annual)', 'Gratuity (Annual)', 'NPS (Annual)', 'Total Retirals (Annual)', 'CTC PM (Annual)',
        'Basic (Monthly)', 'HRA (Monthly)', 'Special Allowance (Monthly)', 'Gross Salary (Monthly)',
        'LTA (Monthly)', 'Phone (Monthly)', 'Fuel (Monthly)', 'Food (Monthly)', 'Total (Monthly)',
        'PF (Monthly)', 'Gratuity (Monthly)', 'NPS (Monthly)', 'Total Retirals (Monthly)', 'CTC PM (Monthly)',
        'Notes'
    ];
    const rows = salaries.map((s) => [
        s.year,
        s.hikePercentage,
        s.previousSalary,
        s.finalSalary,
        s.revisionPercentage,
        s.revisionAmount,
        s.totalPercentage,
        s.bonusPercentage,
        s.bonusAmount,
        s.components?.basic?.annual || 0,
        s.components?.hra?.annual || 0,
        s.components?.specialAllowance?.annual || 0,
        s.components?.grossSalary?.annual || 0,
        s.components?.lta?.annual || 0,
        s.components?.phone?.annual || 0,
        s.components?.fuel?.annual || 0,
        s.components?.food?.annual || 0,
        s.components?.total?.annual || 0,
        s.components?.pf?.annual || 0,
        s.components?.gratuity?.annual || 0,
        s.components?.nps?.annual || 0,
        s.components?.totalRetails?.annual || 0,
        s.components?.ctcPM?.annual || 0,
        s.components?.basic?.month || 0,
        s.components?.hra?.month || 0,
        s.components?.specialAllowance?.month || 0,
        s.components?.grossSalary?.month || 0,
        s.components?.lta?.month || 0,
        s.components?.phone?.month || 0,
        s.components?.fuel?.month || 0,
        s.components?.food?.month || 0,
        s.components?.total?.month || 0,
        s.components?.pf?.month || 0,
        s.components?.gratuity?.month || 0,
        s.components?.nps?.month || 0,
        s.components?.totalRetails?.month || 0,
        s.components?.ctcPM?.month || 0,
        s.notes || '',
    ]);
    return [headers, ...rows].map((r) => r.join(',')).join('\n');
}

export function formatCurrency(n: number): string {
    return `₹${n.toLocaleString('en-IN')}`;
}

export function formatPercentage(n: number): string {
    return `${n.toFixed(2)}%`;
}

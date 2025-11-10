export type VehicleType = 'car' | 'bike';

export type FuelEntry = {
    id: string;
    date: string; // YYYY-MM-DD
    vehicle: VehicleType;
    entryType: 'refueling' | 'service' | 'repair';
    odometer?: string;
    liters: string; // keep as string for inputs
    pricePerLiter: string;
    total: string; // auto-calculated
    notes?: string;
};

// NEW: promote MonthRow type for reuse across components
export type MonthRow = {
    year: number;
    month: number; // 0-based
    label: string;
    car: { liters: number; fuelSpend: number; serviceSpend: number; repairSpend: number };
    bike: { liters: number; fuelSpend: number; serviceSpend: number; repairSpend: number };
};

// Simple INR formatter used across charts
export const fmtINR = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

// Short number formatter for axis ticks (e.g., 24.8k, 1.2M)
export const fmtShort = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e7) return `${Math.round(n / 1e6)}M`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (abs >= 1e4) return `${Math.round(n / 1e3)}k`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
    return Math.round(n).toLocaleString();
};

// Compact month label e.g., Jan ’25
export const fmtMonthYY = (ts: number) => {
    const d = new Date(ts);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const yy = String(d.getFullYear()).slice(-2);
    return `${month} ’${yy}`;
};

export const hexToRgb = (hex: string) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return { r: 59, g: 130, b: 246 }; // fallback blue-500
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
};
export const clamp = (n: number, a = 0, b = 255) => Math.max(a, Math.min(b, n));

export const withAlpha = (hex: string, alpha: number) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
};

import { useState, useEffect } from 'react';
import { ApiSalary } from '../../services/api';

export function SalaryEditor({
    initial,
    onClose,
    onSave,
    salaries,
}: {
    initial?: ApiSalary | null;
    onClose: () => void;
    onSave: (data: Omit<ApiSalary, '_id' | 'createdAt' | 'updatedAt'>, id?: string) => void;
    salaries: ApiSalary[];
}) {
    // Get last year's final salary for new records
    const getLastYearSalary = () => {
        if (initial) return initial.previousSalary || 0;
        const sorted = [...salaries].sort((a, b) => b.year - a.year);
        return sorted[0]?.finalSalary || 0;
    };

    const [year, setYear] = useState(initial?.year || new Date().getFullYear());
    const [hikePercentage, setHikePercentage] = useState(initial?.hikePercentage || 0);
    const [previousSalary, setPreviousSalary] = useState(getLastYearSalary());
    const [finalSalary, setFinalSalary] = useState(initial?.finalSalary || 0);
    const [revisionPercentage, setRevisionPercentage] = useState(initial?.revisionPercentage || 0);
    const [revisionAmount, setRevisionAmount] = useState(initial?.revisionAmount || 0);
    const [totalPercentage, setTotalPercentage] = useState(initial?.totalPercentage || 0);
    const [bonusPercentage, setBonusPercentage] = useState(initial?.bonusPercentage || 0);
    const [bonusAmount, setBonusAmount] = useState(initial?.bonusAmount || 0);
    const [notes, setNotes] = useState(initial?.notes || '');
    const [components, setComponents] = useState(initial?.components || {});

    // Additional calculated fields for display
    const [hikeAmount, setHikeAmount] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);

    // Calculate salary components based on final salary
    const calculateComponents = (finalSal: number) => {
        const basic = Math.round(finalSal * 0.40); // 40% of salary
        const hra = Math.round(finalSal * 0.16); // 16% of salary
        const pf = Math.round(basic * 0.12); // 12% of basic
        const gratuity = Math.round(basic * 0.048); // 4.8% of basic
        const nps = Math.round(basic * 0.05); // 5% of basic

        // Fixed annual amounts
        const lta = 30000;
        const phone = 18000;
        const fuel = 21600;
        const food = 26400;

        // Special Allowance = Remaining amount (Final Salary - Basic - HRA - PF - Gratuity - NPS - LTA - Phone - Fuel - Food)
        const specialAllowance = finalSal - basic - hra - pf - gratuity - nps - lta - phone - fuel - food;

        // Calculate monthly values
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

        // Calculate totals
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

    // Initialize components when editing or when final salary is available
    useEffect(() => {
        if (initial?.finalSalary && !initial?.components) {
            setComponents(calculateComponents(initial.finalSalary));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Calculate final salary based on hike and revision
    const calculateFinalSalary = (prevSal: number, hike: number, revPct: number) => {
        // First apply hike percentage
        const afterHike = prevSal + (prevSal * hike / 100);
        // Then apply revision percentage on after-hike amount
        const afterRevision = afterHike + (afterHike * revPct / 100);
        return Math.round(afterRevision);
    };

    // Calculate revision amount
    const calculateRevisionAmount = (prevSal: number, hike: number, revPct: number) => {
        const afterHike = prevSal + (prevSal * hike / 100);
        return Math.round(afterHike * revPct / 100);
    };

    // Handle hike percentage change
    const handleHikeChange = (value: number) => {
        setHikePercentage(value);
        const hikeAmt = Math.round(previousSalary * value / 100);
        setHikeAmount(hikeAmt);
        const newFinalSalary = calculateFinalSalary(previousSalary, value, revisionPercentage);
        setFinalSalary(newFinalSalary);
        const newRevAmount = calculateRevisionAmount(previousSalary, value, revisionPercentage);
        setRevisionAmount(newRevAmount);
        const totalAmt = previousSalary + hikeAmt + newRevAmount;
        setTotalAmount(totalAmt);
        // Calculate total percentage based on actual total increase
        const totalPct = previousSalary > 0 ? ((totalAmt - previousSalary) / previousSalary) * 100 : 0;
        setTotalPercentage(Math.round(totalPct * 100) / 100);
        // Calculate components based on final salary
        setComponents(calculateComponents(newFinalSalary));
    };

    // Handle revision percentage change
    const handleRevisionChange = (value: number) => {
        setRevisionPercentage(value);
        const newFinalSalary = calculateFinalSalary(previousSalary, hikePercentage, value);
        setFinalSalary(newFinalSalary);
        const newRevAmount = calculateRevisionAmount(previousSalary, hikePercentage, value);
        setRevisionAmount(newRevAmount);
        const totalAmt = previousSalary + hikeAmount + newRevAmount;
        setTotalAmount(totalAmt);
        // Calculate total percentage based on actual total increase
        const totalPct = previousSalary > 0 ? ((totalAmt - previousSalary) / previousSalary) * 100 : 0;
        setTotalPercentage(Math.round(totalPct * 100) / 100);
        // Calculate components based on final salary
        setComponents(calculateComponents(newFinalSalary));
    };

    // Handle bonus percentage change
    const handleBonusChange = (value: number) => {
        setBonusPercentage(value);
        const newBonusAmount = Math.round(previousSalary * value / 100);
        setBonusAmount(newBonusAmount);
    };

    // Handle previous salary change (recalculate everything)
    const handlePreviousSalaryChange = (value: number) => {
        setPreviousSalary(value);
        const hikeAmt = Math.round(value * hikePercentage / 100);
        setHikeAmount(hikeAmt);
        const newFinalSalary = calculateFinalSalary(value, hikePercentage, revisionPercentage);
        setFinalSalary(newFinalSalary);
        const newRevAmount = calculateRevisionAmount(value, hikePercentage, revisionPercentage);
        setRevisionAmount(newRevAmount);
        const totalAmt = value + hikeAmt + newRevAmount;
        setTotalAmount(totalAmt);
        // Calculate total percentage based on actual total increase
        const totalPct = value > 0 ? ((totalAmt - value) / value) * 100 : 0;
        setTotalPercentage(Math.round(totalPct * 100) / 100);
        const newBonusAmount = Math.round(value * bonusPercentage / 100);
        setBonusAmount(newBonusAmount);
        // Calculate components based on final salary
        setComponents(calculateComponents(newFinalSalary));
    };

    const handleSave = () => {
        const data: Omit<ApiSalary, '_id' | 'createdAt' | 'updatedAt'> = {
            year,
            hikePercentage,
            previousSalary,
            finalSalary,
            revisionPercentage,
            revisionAmount,
            totalPercentage,
            bonusPercentage,
            bonusAmount,
            notes,
            components,
        };
        onSave(data, initial?._id);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                    <h2 className="text-lg font-semibold text-gray-800">{initial ? 'Edit Salary Record' : 'New Salary Record'}</h2>
                    <button className="p-1 rounded hover:bg-gray-200" onClick={onClose}>
                        ×
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Year */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                            <input
                                type="number"
                                className="w-full border rounded px-2 py-2"
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                            />
                        </div>

                        {/* Previous Salary */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Previous Salary *</label>
                            <input
                                type="number"
                                className="w-full border rounded px-2 py-2 bg-gray-50"
                                value={previousSalary}
                                onChange={(e) => handlePreviousSalaryChange(parseFloat(e.target.value) || 0)}
                                title="Auto-populated from last year's final salary"
                            />
                        </div>

                        {/* Hike % */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hike % *</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full border rounded px-2 py-2"
                                value={hikePercentage}
                                onChange={(e) => handleHikeChange(parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        {/* Hike Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hike Amount</label>
                            <input
                                type="number"
                                className="w-full border rounded px-2 py-2 bg-gray-50"
                                value={hikeAmount}
                                readOnly
                                title="Auto-calculated based on hike %"
                            />
                        </div>

                        {/* Revision % */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Revision %</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full border rounded px-2 py-2"
                                value={revisionPercentage}
                                onChange={(e) => handleRevisionChange(parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        {/* Revision Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Revision Amount</label>
                            <input
                                type="number"
                                className="w-full border rounded px-2 py-2 bg-gray-50"
                                value={revisionAmount}
                                readOnly
                                title="(Previous Salary + Hike Amount) × Revision %"
                            />
                        </div>

                        {/* Total % */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total %</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full border rounded px-2 py-2 bg-gray-50"
                                value={totalPercentage}
                                readOnly
                                title="Total percentage increase: ((Total Amount - Previous Salary) / Previous Salary) × 100"
                            />
                        </div>

                        {/* Total Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                            <input
                                type="number"
                                className="w-full border rounded px-2 py-2 bg-gray-50"
                                value={totalAmount}
                                readOnly
                                title="Previous Salary + Hike Amount + Revision Amount"
                            />
                        </div>

                        {/* Bonus % */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bonus %</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full border rounded px-2 py-2"
                                value={bonusPercentage}
                                onChange={(e) => handleBonusChange(parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        {/* Bonus Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Amount</label>
                            <input
                                type="number"
                                className="w-full border rounded px-2 py-2 bg-gray-50"
                                value={bonusAmount}
                                readOnly
                                title="Auto-calculated based on bonus % of previous salary"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            className="w-full border rounded px-2 py-2 min-h-[80px]"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50">
                    <button className="px-4 py-2 rounded border text-sm" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="px-4 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700" onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

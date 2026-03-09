import { X } from 'lucide-react';
import { genderBtnClass } from './customerUtils';

// ─── CustomerFormModal ────────────────────────────────────────────────────────

interface CustomerFormModalProps {
    formTitle: string;
    saveLabel: string;
    customersName: string;
    customersAccount: string;
    customersDob: string;
    customersAge: string;
    customersGender: 'male' | 'female';
    customersAadhar: string;
    isDuplicateName: boolean;
    existingAccounts: string[];
    onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAccountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDobChange: (value: string) => void;
    onAgeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onGenderChange: (g: 'male' | 'female') => void;
    onAadharChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSave: () => void;
    onCancel: () => void;
}

export function CustomerFormModal({
    formTitle,
    saveLabel,
    customersName,
    customersAccount,
    customersDob,
    customersAge,
    customersGender,
    customersAadhar,
    isDuplicateName,
    existingAccounts,
    onNameChange,
    onAccountChange,
    onDobChange,
    onAgeChange,
    onGenderChange,
    onAadharChange,
    onSave,
    onCancel,
}: CustomerFormModalProps) {
    const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => onDobChange(e.target.value);
    const handleFemale = () => onGenderChange('female');
    const handleMale = () => onGenderChange('male');

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-2xl m-4 my-10">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-emerald-600 via-cyan-500 to-indigo-600 shadow-2xl">
                    <div className="bg-white rounded-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-sm">
                            <h3 className="text-base sm:text-lg font-semibold tracking-wide">{formTitle}</h3>
                            <button onClick={onCancel} aria-label="Close" className="p-2 rounded-full bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                    <input type="text" value={customersName} onChange={onNameChange} className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Enter full name" />
                                    {isDuplicateName && (<p className="text-[10px] text-amber-600 mt-1">Duplicate name found. You can still save.</p>)}
                                </div>
                                {/* Account */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Account</label>
                                    <input type="text" value={customersAccount} onChange={onAccountChange} list="customers-account-suggestions" className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Search or add new account" />
                                    <datalist id="customers-account-suggestions">
                                        {existingAccounts.map((acc) => (<option key={acc} value={acc} />))}
                                    </datalist>
                                </div>
                                {/* DOB */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth <span className="text-gray-400 font-normal">(optional)</span></label>
                                    <input type="date" value={customersDob} onChange={handleDobChange} className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    <p className="text-[10px] text-gray-500 mt-1">Setting DOB auto-fills age.</p>
                                </div>
                                {/* Age */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
                                    <input type="number" min="0" max="120" value={customersAge} onChange={onAgeChange} className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Enter age" />
                                </div>
                                {/* Gender */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                                    <div className="inline-flex rounded-md border bg-white p-1 shadow-sm">
                                        <button type="button" onClick={handleFemale} className={genderBtnClass(customersGender === 'female')} aria-pressed={customersGender === 'female'}>Female</button>
                                        <button type="button" onClick={handleMale} className={genderBtnClass(customersGender === 'male')} aria-pressed={customersGender === 'male'}>Male</button>
                                    </div>
                                </div>
                                {/* Aadhar */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Aadhar Number</label>
                                    <input type="text" value={customersAadhar} onChange={onAadharChange} className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Enter Aadhar number" />
                                </div>
                            </div>
                            <div className="mt-2 flex justify-between items-center gap-2">
                                <button type="button" onClick={onCancel} className="border px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md">Cancel</button>
                                <button type="button" onClick={onSave} className="border px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow">{saveLabel}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

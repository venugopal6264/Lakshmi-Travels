/** Returns Tailwind classes for a gender toggle button. */
export function genderBtnClass(selected: boolean): string {
    return `px-3 py-1.5 text-xs rounded-md transition ${selected ? 'bg-emerald-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`;
}

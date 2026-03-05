# GitHub Copilot Instructions

## Code Style & Architecture

### JSX must contain only tags — no logic
The HTML/JSX portion of every component must contain **only** tags and references.
All logic must live in named functions, helpers, or computed variables **before** the return statement.

**❌ Don't do this — logic inside JSX:**
```tsx
<input onChange={(e) => setName(e.target.value)} />
<button className={`px-3 ${active ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>Save</button>
<td>{dob ? String(dob).slice(0, 10) : '-'}</td>
<h3>{editingId ? 'Edit Record' : 'Create Record'}</h3>
{list.map((item, i) => {
    const flag = item.age > 60;
    const cls = flag ? 'bg-rose-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50';
    return <tr className={cls}>...</tr>;
})}
```

**✅ Do this instead — extract to named functions/variables:**
```tsx
// Outside component (pure, no hooks):
function formatDob(dob: unknown): string {
    return dob ? String(dob).slice(0, 10) : '-';
}
function rowClass(item: Item, index: number): string {
    if (item.age > 60) return 'bg-rose-50';
    return index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
}
function btnClass(active: boolean): string {
    return `px-3 ${active ? 'bg-blue-600 text-white' : 'text-gray-700'}`;
}

// Inside component (handlers and derived values):
const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value);
const formTitle = editingId ? 'Edit Record' : 'Create Record';

// JSX — tags and references only:
<input onChange={handleNameChange} />
<button className={btnClass(active)}>Save</button>
<td>{formatDob(dob)}</td>
<h3>{formTitle}</h3>
{list.map((item, i) => <tr className={rowClass(item, i)}>...</tr>)}
```

### Extraction rules

| What to extract | Where to put it |
|---|---|
| Pure value transforms (format, compute class, calculate age) | **Outside** component as a named function |
| Reusable indicator UI (sort arrow, badge, status dot) | **Outside** component as a small React component |
| `onChange`, `onClick` handlers with logic | **Inside** component as a named `const handle*` |
| Derived display values (`formTitle`, `saveLabel`, `rowClass`) | **Inside** component as a `const` before `return` |

### Pure helpers go outside the component
Functions that take only plain values (no state, no hooks) must be declared **outside** the component function so they are not recreated on every render and are easily testable.

```tsx
// ✅ Pure helper — outside component
function calcAgeFromDob(dob: string | null | undefined): number | undefined { ... }

// ✅ Pure sub-component — outside component
function SortIndicator({ column, sortColumn, sortDir }: ...) { ... }

// ✅ Handler — inside component (needs state setters)
const handleDobChange = (value: string) => {
    setDob(value);
    const age = calcAgeFromDob(value);
    if (age != null) setAge(String(age));
};
```

### Naming conventions
- Event handlers: `handle<Target><Event>` — e.g. `handleSearchChange`, `handleDobChange`, `handleSearchClear`
- Computed CSS classes: `<element>Class` or `<element>BtnClass` — e.g. `genderBtnClass`, `rowClass`
- Derived display values: descriptive noun — e.g. `formTitle`, `saveLabel`, `formattedDob`
- Sub-components: `PascalCase` — e.g. `SortIndicator`, `StatusBadge`

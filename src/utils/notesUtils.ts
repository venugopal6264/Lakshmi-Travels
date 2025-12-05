import { ApiNote } from '../services/api';

// Type for note input data
export type NoteInput = Partial<Pick<ApiNote, 'title' | 'content' | 'color' | 'labels' | 'pinned' | 'format' | 'tableData'>>;

// Helper: soften a hex color by mixing with white for lighter display
export const softenColor = (hex: string, factor = 0.25) => {
    if (!hex) return '#ffffff';
    const h = hex.replace('#', '');
    const parse = (p: string) => parseInt(p, 16);
    let r: number, g: number, b: number;
    if (h.length === 3) {
        r = parse(h[0] + h[0]); g = parse(h[1] + h[1]); b = parse(h[2] + h[2]);
    } else if (h.length === 6) {
        r = parse(h.slice(0, 2)); g = parse(h.slice(2, 4)); b = parse(h.slice(4, 6));
    } else {
        return hex;
    }
    const mix = (c: number) => Math.round(c + (255 - c) * factor);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

// Available note colors
export const noteColors = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fecaca', '#e9d5ff', '#fecdd3', '#d1fae5', '#e5e7eb'];

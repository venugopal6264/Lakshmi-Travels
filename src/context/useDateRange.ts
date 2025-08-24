import { useContext } from 'react';
import { DateRangeContext } from './DateRangeContext';

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error('useDateRange must be used within a DateRangeProvider');
  return ctx;
}

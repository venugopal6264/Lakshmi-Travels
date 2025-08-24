import React, { createContext, useState } from 'react';

export type DateRange = { from: string; to: string };

type Ctx = {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
};

export const DateRangeContext = createContext<Ctx | undefined>(undefined);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  return (
    <DateRangeContext.Provider value={{ dateRange, setDateRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}


export {}

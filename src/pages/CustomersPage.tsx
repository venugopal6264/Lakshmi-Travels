import { useEffect, useState } from 'react';
import CustomersDetails from '../components/CustomersDetails';
import { apiService, ApiTicket } from '../services/api';

export default function CustomersPage() {
    const [existingAccounts, setExistingAccounts] = useState<string[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const tickets: ApiTicket[] = await apiService.getTickets();
                const accounts = Array.from(new Set((tickets || []).map(t => t.account).filter(Boolean))) as string[];
                setExistingAccounts(accounts);
            } catch {
                setExistingAccounts([]);
            }
        })();
    }, []);

    return (
        <div className="p-4">
            <CustomersDetails open={true} onClose={() => { /* page mode: no-op */ }} existingAccounts={existingAccounts} asPage />
        </div>
    );
}
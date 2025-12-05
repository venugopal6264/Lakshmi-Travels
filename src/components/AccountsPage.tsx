import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

interface UserRow { _id: string; username: string; role: string; createdAt?: string; updatedAt?: string; passwordHint?: string }

export default function AccountsPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resettingId, setResettingId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [showResetModal, setShowResetModal] = useState<null | UserRow>(null);
    const [passwordHint, setPasswordHint] = useState('');

    const load = async () => {
        try {
            setLoading(true);
            const res = await apiService.getUsers();
            setUsers(res.users || []);
        } catch {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const openReset = (user: UserRow) => {
        setShowResetModal(user);
        setNewPassword('');
        setPasswordHint(user.passwordHint || '');
    };

    const handleReset = async () => {
        if (!showResetModal) return;
        if (newPassword.length < 6) { alert('Password must be at least 6 characters'); return; }
        try {
            setResettingId(showResetModal._id);
            if (passwordHint.trim().length === 0) { alert('Password hint is required'); return; }
            await apiService.resetUserPassword(showResetModal._id, newPassword, passwordHint.trim());
            alert('Password reset successfully');
            setShowResetModal(null);
        } catch {
            alert('Failed to reset password');
        } finally {
            setResettingId(null);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">User Accounts</h2>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            {loading ? (
                <div className="text-gray-500">Loading users…</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded-md overflow-hidden">
                        <thead>
                            <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-left">
                                <th className="px-2 py-2 font-medium">Username</th>
                                <th className="px-2 py-2 font-medium">Role</th>
                                <th className="px-2 py-2 font-medium">Password Hint</th>
                                <th className="px-2 py-2 font-medium">Created</th>
                                <th className="px-2 py-2 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.map((u, idx) => (
                                <tr key={u._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50'}>
                                    <td className="px-2 py-2 font-medium text-gray-900">{u.username}</td>
                                    <td className="px-2 py-2">{u.role === 'admin' ? <span className="inline-block px-2 py-0.5 text-xs rounded bg-red-100 text-red-700">Admin</span> : <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-700">User</span>}</td>
                                    <td className="px-2 py-2 text-sm text-indigo-700 truncate max-w-[180px]" title={u.passwordHint || ''}>{u.passwordHint || <span className="text-gray-400">—</span>}</td>
                                    <td className="px-2 py-2 text-gray-700">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</td>
                                    <td className="px-2 py-2">
                                        <button onClick={() => openReset(u)} className="text-indigo-600 hover:text-indigo-800 font-medium">Reset</button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">No users found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white w-full max-w-sm rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-medium mb-3">Reset Password</h3>
                        <p className="text-sm text-gray-600 mb-4">User: <span className="font-semibold">{showResetModal.username}</span></p>
                        <input
                            type="password"
                            className="w-full border rounded-md px-2 py-2 mb-3"
                            placeholder="New password (min 6 chars)"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                        <input
                            type="text"
                            className="w-full border rounded-md px-2 py-2 mb-3"
                            placeholder="Password hint (required)"
                            value={passwordHint}
                            onChange={e => setPasswordHint(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setShowResetModal(null)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                            <button
                                onClick={handleReset}
                                disabled={resettingId === showResetModal._id}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >{resettingId === showResetModal._id ? 'Saving…' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

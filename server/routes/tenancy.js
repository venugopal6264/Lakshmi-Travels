import express from 'express';
import Flat from '../models/Flat.js';
import Tenant from '../models/Tenant.js';
import RentRecord from '../models/RentRecord.js';

const router = express.Router();

// Flats
router.get('/flats', async (req, res) => {
    const flats = await Flat.find({}).populate({ path: 'currentTenant', select: 'name phone aadharNumber startDate rentAmount deposit active endDate' });
    res.json(flats);
});

router.post('/flats', async (req, res) => {
    const { number, notes } = req.body || {};
    if (!number) return res.status(400).json({ message: 'number is required' });
    const flat = await Flat.create({ number, notes });
    res.json(flat);
});

// Tenants
router.get('/tenants', async (req, res) => {
    const tenants = await Tenant.find({}).populate('flat');
    res.json(tenants);
});

// tenant history for a flat (active and inactive)
router.get('/flats/:id/tenants', async (req, res) => {
    const { id } = req.params;
    const tenants = await Tenant.find({ flat: id }).sort({ startDate: -1 }).select('name phone aadharNumber startDate endDate rentAmount deposit active');
    res.json(tenants);
});

router.post('/tenants', async (req, res) => {
    const { name, phone, aadharNumber = '', startDate, endDate = null, rentAmount, deposit = 0, flatId } = req.body || {};
    if (!name || !startDate || !rentAmount || !flatId) return res.status(400).json({ message: 'name, startDate, rentAmount, flatId required' });
    const flat = await Flat.findById(flatId);
    if (!flat) return res.status(404).json({ message: 'Flat not found' });
    // If current tenant exists, mark inactive
    if (flat.currentTenant) {
        await Tenant.findByIdAndUpdate(flat.currentTenant, { active: false, endDate: startDate });
    }
    const tenant = await Tenant.create({ name, phone, aadharNumber, startDate, endDate, rentAmount, deposit, flat: flat._id, active: true });
    flat.currentTenant = tenant._id;
    await flat.save();
    res.json(await tenant.populate('flat'));
});

router.put('/tenants/:id', async (req, res) => {
    const { id } = req.params;
    const patch = req.body || {};
    const updated = await Tenant.findByIdAndUpdate(id, patch, { new: true }).populate('flat');
    if (!updated) return res.status(404).json({ message: 'Tenant not found' });
    res.json(updated);
});

// Ensure monthly unpaid rent records exist for all current tenants
async function ensureMonthlyRents(targetMonth) {
    if (!targetMonth) return;
    // Find all flats with an active current tenant
    const flats = await Flat.find({ currentTenant: { $ne: null } }).populate({ path: 'currentTenant', select: 'rentAmount' });
    if (!flats || flats.length === 0) return;
    const ops = [];
    for (const f of flats) {
        const tenantId = f.currentTenant?._id;
        if (!tenantId) continue;
        // Check if a record exists for this flat/tenant/month
        // Only create if missing; do not overwrite existing paid/unpaid state
        // We avoid race by using upsert with $setOnInsert
        ops.push(RentRecord.updateOne(
            { flat: f._id, tenant: tenantId, month: targetMonth },
            {
                $setOnInsert: {
                    amount: f.currentTenant.rentAmount || 0,
                    maintenance: 0,
                    paid: false,
                    paidDate: null,
                    notes: ''
                }
            },
            { upsert: true }
        ));
    }
    if (ops.length) await Promise.all(ops);
}

// Rent Records
router.get('/rents', async (req, res) => {
    const { month } = req.query; // optional YYYY-MM filter
    const monthStr = month ? String(month) : undefined;
    // On explicit month query, ensure records for that month (makes 1st-of-month reset implicit)
    if (monthStr) {
        try { await ensureMonthlyRents(monthStr); } catch (e) { /* non-blocking */ }
    }
    const query = monthStr ? { month: monthStr } : {};
    const rents = await RentRecord.find(query).populate('flat').populate('tenant');
    res.json(rents);
});

router.post('/rents/upsert', async (req, res) => {
    const { flatId, tenantId, month, amount, maintenance = 0, paid = false, paidDate = null, notes = '' } = req.body || {};
    if (!flatId || !tenantId || !month || !amount) return res.status(400).json({ message: 'flatId, tenantId, month, amount required' });
    const doc = await RentRecord.findOneAndUpdate(
        { flat: flatId, tenant: tenantId, month },
        { $set: { amount, maintenance, paid, paidDate, notes } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('flat').populate('tenant');
    res.json(doc);
});

router.put('/rents/:id/toggle', async (req, res) => {
    const { id } = req.params;
    const rr = await RentRecord.findById(id);
    if (!rr) return res.status(404).json({ message: 'Rent record not found' });
    rr.paid = !rr.paid;
    rr.paidDate = rr.paid ? (new Date().toISOString().split('T')[0]) : null;
    await rr.save();
    res.json(await rr.populate('flat').populate('tenant'));
});

export default router;

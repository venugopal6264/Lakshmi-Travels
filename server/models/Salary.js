import mongoose from 'mongoose';

const salarySchema = new mongoose.Schema({
    year: { type: Number, required: true },
    hikePercentage: { type: Number, default: 0 },
    previousSalary: { type: Number, required: true },
    finalSalary: { type: Number, required: true },
    revisionPercentage: { type: Number, default: 0 },
    revisionAmount: { type: Number, default: 0 },
    totalPercentage: { type: Number, default: 0 },
    bonusPercentage: { type: Number, default: 0 },
    bonusAmount: { type: Number, default: 0 },
    // Detailed component breakdown
    components: {
        basic: { month: Number, annual: Number },
        hra: { month: Number, annual: Number },
        specialAllowance: { month: Number, annual: Number },
        grossSalary: { month: Number, annual: Number },
        lta: { month: Number, annual: Number },
        phone: { month: Number, annual: Number },
        fuel: { month: Number, annual: Number },
        food: { month: Number, annual: Number },
        total: { month: Number, annual: Number },
        pf: { month: Number, annual: Number },
        gratuity: { month: Number, annual: Number },
        nps: { month: Number, annual: Number },
        totalRetails: { month: Number, annual: Number },
        ctcPM: { month: Number, annual: Number }
    },
    notes: String,
    effectiveDate: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

salarySchema.index({ year: 1 });

const Salary = mongoose.model('Salary', salarySchema);
export default Salary;

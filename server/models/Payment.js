import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  // Flag to indicate this payment is a partial (does not fully settle referenced tickets)
  isPartial: {
    type: Boolean,
    default: false
  },
  period: {
    type: String,
    required: true
  },
  account: {
    type: String,
    default: ''
  },
  tickets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  }]
}, {
  timestamps: true
});
const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;

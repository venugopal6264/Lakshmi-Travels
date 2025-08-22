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
  period: {
    type: String,
    required: true
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

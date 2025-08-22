import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  profit: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['train', 'bus', 'flight'],
    required: true
  },
  service: {
    type: String,
    required: true
  },
  account: {
    type: String,
    required: true
  },
  bookingDate: {
    type: Date,
    required: true
  },
  passengerName: {
    type: String,
    required: true
  },
  place: {
    type: String,
    required: true
  },
  pnr: {
    type: String,
    required: true
  },
  fare: {
    type: Number,
    required: true
  },
  refund: {
    type: Number,
    default: 0
  },
  remarks: {
    type: String,
    default: ''
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundDate: {
    type: Date,
    default: null
  },
  refundReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});


const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;

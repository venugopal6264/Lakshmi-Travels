import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
    title: { type: String, trim: true },
    content: { type: String, trim: true },
    color: { type: String, trim: true },
    labels: { type: [String], default: [] },
    pinned: { type: Boolean, default: false },
    format: { type: String, enum: ['text', 'table'], default: 'text' },
    tableData: {
        headers: { type: [String], default: [] },
        rows: { type: [[String]], default: [] }
    },
    userSub: { type: String, index: true }, // owner (sub from session)
}, { timestamps: true });

const Note = mongoose.model('Note', NoteSchema);
export default Note;

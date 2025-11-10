import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
    title: { type: String, trim: true },
    content: { type: String, required: true, trim: true },
    color: { type: String, trim: true },
    labels: { type: [String], default: [] },
    pinned: { type: Boolean, default: false },
    userSub: { type: String, index: true }, // owner (sub from session)
}, { timestamps: true });

const Note = mongoose.model('Note', NoteSchema);
export default Note;

import mongoose from 'mongoose';
const habitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  sleep: { type: Number, min: 0, max: 24, required: true },
  study: { type: Number, min: 0, max: 24, required: true },
  screen: { type: Number, min: 0, max: 24, required: true },
  movement: { type: Number, min: 0, max: 1440, required: true },
  spending: { type: Number, min: 0, max: 1000000, required: true },
  notes: { type: String, maxlength: 300, default: '' }
}, { timestamps: true });
habitSchema.index({ user: 1, date: 1 }, { unique: true });
export default mongoose.model('Habit', habitSchema);

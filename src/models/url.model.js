import mongoose from 'mongoose';

const clickSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  source: String,     
  location: String     
});

const urlSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  shortcode: {
    type: String,
    required: true,
    unique: true
  },
  expiry: {
    type: Date,
    required: true
  },
  clicks: [clickSchema]
}, {
  timestamps: true 
});

const Url = mongoose.model('Url', urlSchema);
export default Url;

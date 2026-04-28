import mongoose from 'mongoose';

// Schema untuk Item Tabel (Slide / Scene / Scene Video)
const itemSchema = new mongoose.Schema({
  content: { type: String, required: true }, // Isi Slide / Deskripsi Visual
  note: { type: String }, // Keterangan / Referensi / Briefing
});

const requestSchema = new mongoose.Schema({
  // --- IDENTITAS UTAMA ---
  requesterName: { type: String, default: 'Divisi Acara' }, // Nanti diganti user ID
  
  targetSubDivision: { 
    type: String, 
    required: true,
    enum: ['Creative Design', 'Media Production', 'Content Conceptor', 'Marketing Strategist'] 
  },

  // --- INFO UMUM ---
  title: { type: String, required: true },
  deadline: { type: Date, required: true },
  description: { type: String },
  refLink: { type: String },
  
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Review', 'Done', 'Rejected'],
    default: 'Pending'
  },

  // --- FIELD SPESIFIK (DINAMIS) ---
  // Creative Design
  designSize: { type: String }, // 16:9, 1:1
  colorMode: { type: String },  // RGB / CMYK
  
  // Media Production & Video
  videoDuration: { type: String }, 
  backsound: { type: String },
  assetLink: { type: String }, // Link mentahan (Google Drive)

  // Content Conceptor & Marketing
  framing: { type: String }, // Landscape / Portrait
  caption: { type: String }, // Draft caption

  // --- DATA TABEL (ARRAY) ---
  items: [itemSchema]

}, { timestamps: true });

export default mongoose.model('Request', requestSchema);
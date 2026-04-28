import Request from '../models/Request.js'; // Wajib pakai .js

// FUNGSI 1: Membuat Request Baru
export const createRequest = async (req, res) => {
  try {
    const newRequest = new Request(req.body);
    const savedRequest = await newRequest.save();
    
    res.status(201).json({
      success: true,
      message: 'Request berhasil dibuat!',
      data: savedRequest
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: 'Gagal membuat request.',
      error: err.message
    });
  }
};

// FUNGSI 2: Mengambil Semua Request (dengan Filter)
export const getAllRequests = async (req, res) => {
  try {
    const { division } = req.query;
    let query = {};
    
    // Jika ada filter divisi (misal ?division=Creative Design)
    if (division && division !== 'All') {
      query.targetSubDivision = division;
    }

    const requests = await Request.find(query).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
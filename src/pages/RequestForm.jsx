import React, { useState } from 'react';
import axios from 'axios'; // Library request API
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, ArrowRight, Loader2 } from 'lucide-react';

const RequestForm = () => {
  // --- STATE MANAGEMENT ---
  const [isLoading, setIsLoading] = useState(false);
  const [division, setDivision] = useState('Creative Design');
  
  // Data Umum
  const [formData, setFormData] = useState({
    title: '',
    deadline: '',
    refLink: '',
    // Data Spesifik (digabung disini biar gampang kirimnya)
    designSize: '1:1 (Feed)',
    colorMode: 'RGB',
    videoDuration: '',
    backsound: '',
    assetLink: '',
    framing: 'Landscape',
  });

  // Data Tabel (Slide/Scenes)
  const [items, setItems] = useState([{ id: 1, content: '', note: '' }]);

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (id, field, value) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), content: '', note: '' }]);
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  // --- FUNGSI SUBMIT KE BACKEND ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Siapkan Payload (Data yang mau dikirim)
    // Kita filter item agar id tidak ikut terkirim ke DB (bersih-bersih)
    const cleanItems = items.map(({ id, ...rest }) => rest);

    const payload = {
      targetSubDivision: division,
      title: formData.title,
      deadline: formData.deadline,
      refLink: formData.refLink,
      items: cleanItems,
      
      // Kirim field spesifik tergantung divisi
      ...(division === 'Creative Design' && { 
          designSize: formData.designSize, 
          colorMode: formData.colorMode 
      }),
      ...(division === 'Media Production' && { 
          videoDuration: formData.videoDuration, 
          backsound: formData.backsound,
          assetLink: formData.assetLink
      }),
      ...(division === 'Content Conceptor' && {
          framing: formData.framing,
          // mapping field lain sesuai kebutuhan
      })
    };

    try {
      // GANTI URL INI JIKA PORT BACKEND BERBEDA
      const response = await axios.post('http://localhost:5000/api/requests', payload);
      
      alert(`🎉 SUKSES! ${response.data.message}`);
      // Reset Form atau Redirect ke Dashboard disini
      
    } catch (error) {
      console.error(error);
      alert('❌ GAGAL! Pastikan semua field wajib terisi dan Server Backend menyala.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI COMPONENTS ---
  const divisions = [
    { id: 'Creative Design', color: 'border-neon-blue text-neon-blue shadow-neon-blue' },
    { id: 'Media Production', color: 'border-neon-purple text-neon-purple shadow-neon-purple' },
    { id: 'Content Conceptor', color: 'border-neon-pink text-neon-pink shadow-neon-pink' },
    { id: 'Marketing Strategist', color: 'border-neon-green text-neon-green shadow-neon-green' }
  ];

  const renderSpecificFields = () => {
    switch (division) {
      case 'Creative Design':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs font-mono mb-1 block">UKURAN DESAIN</label>
              <select name="designSize" onChange={handleInputChange} className="w-full bg-black/50 border border-gray-700 rounded p-3 text-white focus:border-neon-blue outline-none transition-all">
                <option value="1:1 (Feed)">1:1 (Feed)</option>
                <option value="16:9 (Landscape)">16:9 (Landscape)</option>
                <option value="9:16 (Story/Reels)">9:16 (Story/Reels)</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-mono mb-1 block">MODE WARNA</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center text-white gap-2 cursor-pointer">
                  <input type="radio" name="colorMode" value="RGB" onChange={handleInputChange} defaultChecked className="accent-neon-blue" /> RGB (Digital)
                </label>
                <label className="flex items-center text-white gap-2 cursor-pointer">
                  <input type="radio" name="colorMode" value="CMYK" onChange={handleInputChange} className="accent-neon-blue" /> CMYK (Cetak)
                </label>
              </div>
            </div>
          </div>
        );
      case 'Media Production':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2">
              <label className="text-gray-400 text-xs font-mono mb-1 block">REQUEST BACKSOUND</label>
              <input type="text" name="backsound" onChange={handleInputChange} placeholder="Judul lagu..." className="w-full bg-black/50 border border-gray-700 rounded p-3 text-white focus:border-neon-purple outline-none" />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-mono mb-1 block">DURASI</label>
              <input type="text" name="videoDuration" onChange={handleInputChange} placeholder="Ex: 15 detik" className="w-full bg-black/50 border border-gray-700 rounded p-3 text-white focus:border-neon-purple outline-none" />
            </div>
             <div>
              <label className="text-gray-400 text-xs font-mono mb-1 block">LINK ASET (WAJIB)</label>
              <input type="text" name="assetLink" onChange={handleInputChange} placeholder="Google Drive Link" className="w-full bg-black/50 border border-gray-700 rounded p-3 text-white focus:border-neon-purple outline-none" />
            </div>
          </div>
        );
      default: return <div className="text-gray-500 italic">Isi form umum di bawah...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans p-4 md:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-neon-blue/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 font-mono">
            CREATE <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">REQUEST</span>
          </h1>
          <p className="text-gray-400">Branding & Marketing Request System</p>
        </div>

        {/* TABS DIVISI */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {divisions.map((div) => (
            <button
              key={div.id}
              onClick={() => setDivision(div.id)}
              className={`px-4 py-2 rounded-full font-mono text-sm border transition-all duration-300
                ${division === div.id 
                  ? `${div.color} bg-white/5` 
                  : 'border-gray-800 text-gray-500 hover:border-gray-600'
                }`}
            >
              {div.id}
            </button>
          ))}
        </div>

        {/* FORM UTAMA */}
        <motion.form 
          onSubmit={handleSubmit}
          layout
          className="bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl"
        >
          {/* BAGIAN 1: INFO UMUM */}
          <div className="space-y-6 mb-8">
            <h3 className="text-xl font-bold font-mono border-b border-gray-800 pb-2 text-neon-blue">01. GENERAL INFO</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="text-gray-400 text-xs font-mono mb-1 block">JUDUL REQUEST</label>
                <input required name="title" onChange={handleInputChange} type="text" className="w-full bg-black/50 border border-gray-700 rounded p-3 text-white focus:border-neon-blue outline-none transition-all" />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-mono mb-1 block">DEADLINE</label>
                <input required name="deadline" onChange={handleInputChange} type="date" className="w-full bg-black/50 border border-gray-700 rounded p-3 text-white focus:border-neon-blue outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-mono mb-1 block">LINK REFERENSI</label>
                <input name="refLink" onChange={handleInputChange} type="url" className="w-full bg-black/50 border border-gray-700 rounded p-3 text-white focus:border-neon-blue outline-none" />
              </div>
            </div>
          </div>

          {/* BAGIAN 2: SPESIFIK */}
          <div className="space-y-6 mb-8">
             <h3 className="text-xl font-bold font-mono border-b border-gray-800 pb-2 text-neon-purple">02. TECH SPECS</h3>
             <AnimatePresence mode='wait'>
                <motion.div 
                  key={division} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.2 }}
                >
                  {renderSpecificFields()}
                </motion.div>
             </AnimatePresence>
          </div>

          {/* BAGIAN 3: ITEMS (SLIDES/SCENES) */}
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-end border-b border-gray-800 pb-2">
              <h3 className="text-xl font-bold font-mono text-neon-green">03. CONTENT DETAILS</h3>
              <span className="text-xs text-gray-500 font-mono">{division === 'Content Conceptor' ? 'SCENES' : 'SLIDES'}</span>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="relative bg-black/30 border border-gray-800 rounded-lg p-4 group hover:border-gray-600 transition-all">
                  <div className="absolute -left-3 top-4 bg-gray-800 text-xs text-white px-2 py-0.5 rounded font-mono">#{index + 1}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-2">
                    <textarea 
                      onChange={(e) => handleItemChange(item.id, 'content', e.target.value)}
                      placeholder="Isi Konten / Deskripsi Visual..." 
                      className="bg-transparent border-b border-gray-700 focus:border-white outline-none text-sm text-gray-300 min-h-[60px] resize-none p-1"
                    />
                     <textarea 
                      onChange={(e) => handleItemChange(item.id, 'note', e.target.value)}
                      placeholder="Catatan / Briefing..." 
                      className="bg-transparent border-b border-gray-700 focus:border-white outline-none text-sm text-gray-300 min-h-[60px] resize-none p-1"
                    />
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(item.id)} className="absolute top-2 right-2 text-gray-600 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={handleAddItem} className="w-full py-3 border border-dashed border-gray-700 text-gray-400 hover:border-neon-green hover:text-neon-green rounded-lg flex justify-center gap-2 text-sm font-mono">
              <Plus size={16} /> ADD NEW ITEM
            </button>
          </div>

          {/* SUBMIT */}
          <div className="pt-6 border-t border-white/10">
            <button disabled={isLoading} className="w-full bg-gradient-to-r from-neon-blue to-neon-purple text-black font-bold py-4 rounded-lg hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] transition-all flex justify-center items-center gap-2 group disabled:opacity-50">
              {isLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {isLoading ? 'SUBMITTING...' : 'SUBMIT REQUEST'}
              {!isLoading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default RequestForm;
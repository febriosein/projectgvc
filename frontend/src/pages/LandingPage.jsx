import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import ImageUpload from '../components/ImageUpload';
import { saveToHistory } from './HistoryPage';

const API_BASE = '/api';

const LandingPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async (query) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/analyze/text`, { query });
      if (response.data) {
        saveToHistory({
          query,
          type: 'text',
          compoundName: response.data.metadata?.common_name || response.data.metadata?.iupac_name || query,
          smiles: response.data.smiles,
          resultData: response.data,
        });
        navigate('/result', { state: { data: response.data } });
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Terjadi kesalahan saat mencari senyawa. Pastikan backend berjalan.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE}/analyze/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data) {
        saveToHistory({
          query: file.name,
          type: 'image',
          compoundName: response.data.metadata?.common_name || response.data.metadata?.iupac_name || 'Image Recognition',
          smiles: response.data.smiles,
          resultData: response.data,
        });
        navigate('/result', {
          state: { data: response.data, imageFile: URL.createObjectURL(file) },
        });
      }
    } catch (err) {
      let msg;
      if (err.response?.status === 429) {
        msg = '⚠️ Kuota semua API AI (Gemini & Groq) telah habis sementara. Silakan coba lagi dalam beberapa menit, atau gunakan pencarian teks sebagai alternatif.';
      } else {
        msg = err.response?.data?.detail ||
          'Terjadi kesalahan saat memproses gambar. Pastikan gambar cukup jelas dan terang.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-stack-xl animate-fade-in w-full">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center max-w-3xl mx-auto gap-stack-md">
        <h1 className="font-headline-xl text-headline-lg-mobile md:text-headline-xl text-on-surface tracking-tight">
          Temukan Molekul Secara Instan
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          Gunakan pengenal kimia atau unggah struktur molekul untuk analisis bertenaga AI, prediksi karakteristik, dan ekstraksi data yang andal dalam sekejap.
        </p>
      </section>

      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-lg text-center font-body-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-stack-xl gap-stack-md">
          <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-body-md text-on-surface-variant">Menganalisis dengan AI...</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-stretch">
            <SearchBar onSearch={handleSearch} />
            <ImageUpload onUpload={handleImageUpload} />
          </section>

          {/* Chat AI Banner */}
          <section className="bg-surface-muted dark:bg-surface-container border border-border-subtle rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: '32px' }}>smart_toy</span>
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-on-surface mb-1">Tanya ChemVision AI</h3>
                <p className="text-sm text-on-surface-variant max-w-md">
                  Punya pertanyaan seputar reaksi kimia, sifat molekul, atau konsep dasar? Diskusikan langsung dengan asisten AI kami.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/chat')} 
              className="w-full md:w-auto shrink-0 bg-primary dark:bg-secondary text-on-primary dark:text-on-secondary px-6 py-3.5 rounded-xl font-medium text-sm hover:brightness-110 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              Mulai Chat
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </button>
          </section>
        </>
      )}
    </div>
  );
};

export default LandingPage;

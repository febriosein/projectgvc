import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import ImageUpload from '../components/ImageUpload';

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
        navigate('/result', {
          state: { data: response.data, imageFile: URL.createObjectURL(file) },
        });
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Terjadi kesalahan saat memproses gambar. Pastikan gambar cukup jelas dan terang.';
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
          Discover Molecules Instantly
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          Input chemical identifiers or upload structural diagrams for instant, AI-driven analysis, property prediction, and robust data extraction.
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
          <p className="font-body-md text-on-surface-variant">Menganalisis dengan AI (Gemini)...</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-stretch">
          <SearchBar onSearch={handleSearch} />
          <ImageUpload onUpload={handleImageUpload} />
        </section>
      )}
    </div>
  );
};

export default LandingPage;

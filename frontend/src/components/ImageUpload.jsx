import React, { useCallback, useState, useRef } from 'react';

const ImageUpload = ({ onUpload }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const videoRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
    if (isCameraActive) stopCamera();
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
  };

  const startCamera = async (e) => {
    e.stopPropagation();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setFile(null);
      setPreview(null);
    } catch (err) {
      alert("Kamera tidak dapat diakses: " + err.message);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const capturedFile = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
      handleFileSelection(capturedFile);
    }, 'image/jpeg', 0.9);
  };

  const handleUpload = () => {
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="bg-surface-base border border-border-subtle rounded-xl p-stack-lg flex flex-col gap-stack-lg transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0px_4px_20px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-stack-sm border-b border-border-subtle pb-stack-sm">
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-secondary">
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>image_search</span>
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface">Pengenalan Gambar</h2>
      </div>
      
      <div className="flex-grow flex flex-col gap-stack-md">
        {isCameraActive ? (
          <div className="relative border-2 border-border-subtle rounded-xl overflow-hidden bg-black flex-grow min-h-[200px]">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button className="bg-surface-base text-on-surface px-4 py-2 rounded-lg font-button" onClick={(e) => { e.stopPropagation(); stopCamera(); }}>Batal</button>
              <button className="bg-primary text-on-primary px-4 py-2 rounded-lg font-button flex items-center gap-2" onClick={capturePhoto}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>camera</span> Ambil
              </button>
            </div>
          </div>
        ) : preview ? (
          <div className="relative border-2 border-border-subtle rounded-xl overflow-hidden flex-grow min-h-[200px] flex flex-col">
            <img src={preview} alt="Preview" className="w-full h-full object-contain bg-surface-muted" />
            <button className="absolute top-2 right-2 bg-surface-base/80 p-2 rounded-full text-on-surface-variant hover:text-error transition-colors" onClick={clearSelection}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
            </button>
            
            <button 
              className="mt-auto w-full bg-primary text-on-primary font-button text-button py-3 hover:brightness-110 transition-all flex justify-center items-center gap-2"
              onClick={handleUpload}
            >
               Analisis Gambar
            </button>
          </div>
        ) : (
          <>
            {/* Drop Zone */}
            <div 
              className={`border-2 border-dashed rounded-xl flex-grow min-h-[200px] flex flex-col items-center justify-center gap-stack-sm p-stack-lg text-center cursor-pointer transition-colors group
                ${isDragActive ? 'border-secondary bg-surface-container-low' : 'border-outline-variant bg-surface hover:bg-surface-container-low hover:border-secondary'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload').click()}
            >
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handleChange}
              />
              <div className="w-12 h-12 rounded-full bg-surface-base shadow-sm flex items-center justify-center text-outline group-hover:text-secondary transition-colors mb-2">
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>upload_file</span>
              </div>
              <p className="font-button text-button text-on-surface">Tarik dan lepas gambar struktur di sini</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Mendukung format PNG, JPG, atau TIFF (Maks. 5MB)</p>
            </div>

            <div className="flex items-center gap-stack-sm w-full">
              <div className="h-px bg-border-subtle flex-grow"></div>
              <span className="font-label-sm text-label-sm text-outline-variant uppercase">Atau</span>
              <div className="h-px bg-border-subtle flex-grow"></div>
            </div>

            <button 
              className="w-full bg-surface-base border border-border-subtle text-primary font-button text-button py-3 rounded-lg hover:bg-surface-muted transition-all flex justify-center items-center gap-2"
              onClick={startCamera}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>photo_camera</span>
              Ambil Foto
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;

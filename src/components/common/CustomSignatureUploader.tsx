import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  PenTool,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Sparkles,
  FileSignature,
} from 'lucide-react';
import { AuthorizedSignatureDisplay } from './AuthorizedSignatureDisplay';

interface CustomSignatureUploaderProps {
  signatureImageUrl?: string;
  signerName: string;
  signerTitle: string;
  companyName: string;
  onSignatureChange: (url: string | undefined) => void;
  onSignerNameChange: (name: string) => void;
  onSignerTitleChange: (title: string) => void;
}

export const CustomSignatureUploader: React.FC<CustomSignatureUploaderProps> = ({
  signatureImageUrl,
  signerName,
  signerTitle,
  companyName,
  onSignatureChange,
  onSignerNameChange,
  onSignerTitleChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'draw' | 'type'>('upload');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Setup Canvas for drawing
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#ea580c'; // Zoolyum primary signature orange
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeTab]);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, WebP). PNG with transparent background is recommended.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;

      const img = new Image();
      img.onload = () => {
        // Compress / optimize signature size
        const maxWidth = 600;
        const maxHeight = 300;
        let width = img.width;
        let height = img.height;

        let finalDataUrl = result;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            finalDataUrl = canvas.toDataURL('image/png', 0.95);
          }
        }

        onSignatureChange(finalDataUrl);
        setSuccessMessage('Custom signature image uploaded!');
        setTimeout(() => setSuccessMessage(null), 3000);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange(dataUrl);
    setSuccessMessage('Drawn signature saved!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const removeSignature = () => {
    onSignatureChange(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
    clearCanvas();
    setSuccessMessage('Signature reset to standard stylized typography.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Signer Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Authorized Signer Name
          </label>
          <input
            type="text"
            placeholder="e.g. John Dewey"
            value={signerName}
            onChange={(e) => onSignerNameChange(e.target.value)}
            className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Signer Designation / Title
          </label>
          <input
            type="text"
            placeholder="e.g. Authorized Signature / Managing Director"
            value={signerTitle}
            onChange={(e) => onSignerTitleChange(e.target.value)}
            className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabs for Signature Mode: Upload, Draw, or Stylized Font */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-700/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Image / Scan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('draw')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'draw'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Draw Signature</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('type');
            if (signatureImageUrl) removeSignature();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'type'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <FileSignature className="w-3.5 h-3.5" />
          <span>Typography Style</span>
        </button>
      </div>

      {/* Tab 1: Upload File */}
      {activeTab === 'upload' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) processFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-orange-500 bg-orange-500/10 scale-[1.01]'
              : 'border-zinc-300 dark:border-zinc-700 hover:border-orange-400 dark:hover:border-orange-500/60 bg-zinc-50/50 dark:bg-zinc-800/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Click or drag & drop custom signature image
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Supports PNG (recommended transparent), JPG, or SVG (Max 5MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Draw on Canvas */}
      {activeTab === 'draw' && (
        <div className="space-y-2">
          <div className="border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-950 p-2 overflow-hidden shadow-inner flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={400}
              height={140}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="touch-none cursor-crosshair w-full max-w-[400px] h-[140px] bg-white rounded-lg border border-dashed border-zinc-200"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Pad</span>
            </button>

            <button
              type="button"
              onClick={saveCanvasSignature}
              disabled={!hasDrawn}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Use This Drawn Signature</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Typography Style Info */}
      {activeTab === 'type' && (
        <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/30 text-xs text-orange-900 dark:text-orange-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
          <span>
            Using dynamic calligraphy serif styling for <b>{signerName || 'Authorized Signer'}</b>.
          </span>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Live Signature Preview & Dynamic Company Name Display */}
      <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200 dark:border-zinc-700/60">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-orange-500" />
            <span>Invoice Footer Live Preview</span>
          </span>

          {signatureImageUrl && (
            <button
              type="button"
              onClick={removeSignature}
              className="flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove Uploaded Signature</span>
            </button>
          )}
        </div>

        {/* The Exact Footer Preview Target */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm max-w-xs mx-auto text-center space-y-1">
          <AuthorizedSignatureDisplay
            signatureImageUrl={signatureImageUrl}
            signerName={signerName}
            signerTitle={signerTitle}
            companyName={companyName}
            theme="pdf"
            align="center"
          />
        </div>

        <p className="text-center text-[10px] text-zinc-500 dark:text-zinc-400 mt-2">
          Company name <b className="text-zinc-700 dark:text-zinc-300">"{companyName || 'Your Company'}"</b> is automatically pulled from your Company / Brand Name above.
        </p>
      </div>
    </div>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Trash2,
  CheckCircle2,
  Sparkles,
  Palette,
  Pipette,
  RefreshCw,
  Sliders,
  Check,
} from 'lucide-react';
import { ZoolyumLogo } from './ZoolyumLogo';
import { useInvoice } from '../../context/InvoiceContext';
import {
  extractDominantColor,
  applyDynamicTheme,
  BRAND_COLOR_PRESETS,
} from '../../utils/colorExtractor';

interface CustomLogoUploaderProps {
  currentLogoUrl?: string;
  onLogoChange: (logoUrl: string | undefined) => void;
  className?: string;
  title?: string;
  description?: string;
  showColorPaletteConfig?: boolean;
}

export const CustomLogoUploader: React.FC<CustomLogoUploaderProps> = ({
  currentLogoUrl,
  onLogoChange,
  className = '',
  title = 'Company / Brand Logo',
  description = 'Upload a custom PNG logo (transparent background) — website and PDF colors will automatically adapt to match your logo!',
  showColorPaletteConfig = true,
}) => {
  const { companyProfile, setBrandColor, updateCompanyProfile } = useInvoice();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isExtractingColor, setIsExtractingColor] = useState(false);
  const [extractedSwatches, setExtractedSwatches] = useState<string[]>([]);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string; dimensions?: string } | null>(null);

  const activeBrandColor = companyProfile.brandColor || '#ea580c';

  // Extract color when a logo is present or updated
  useEffect(() => {
    if (currentLogoUrl) {
      extractDominantColor(currentLogoUrl).then(({ primary, palette }) => {
        setExtractedSwatches(palette);
      });
    } else {
      setExtractedSwatches(['#ea580c', '#f97316', '#fbbf24', '#c2410c']);
    }
  }, [currentLogoUrl]);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, WebP). PNG with transparent background is recommended.');
      return;
    }

    setIsExtractingColor(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;

      const img = new Image();
      img.onload = async () => {
        // Compress if oversized
        const maxWidth = 900;
        const maxHeight = 450;
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
            finalDataUrl = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.95);
          }
        }

        setFileDetails({
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          dimensions: `${img.width} × ${img.height} px`,
        });

        // 1. Pass the new logo URL upward
        onLogoChange(finalDataUrl);

        // 2. Automatically extract dominant colors from the uploaded logo!
        try {
          const { primary, palette, brandPalette: newPal } = await extractDominantColor(finalDataUrl);
          setExtractedSwatches(palette);
          
          // 3. Immediately apply dynamic theme across site, forms, buttons & PDF
          applyDynamicTheme(newPal);
          setBrandColor(primary);
          updateCompanyProfile({
            logoUrl: finalDataUrl,
            brandColor: primary,
            brandColorPalette: newPal,
          });
        } catch (err) {
          console.warn('Auto color extraction failed:', err);
        } finally {
          setIsExtractingColor(false);
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        }
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveLogo = () => {
    onLogoChange(undefined);
    setFileDetails(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Reset to default brand orange
    setBrandColor('#ea580c');
    updateCompanyProfile({
      logoUrl: undefined,
      brandColor: '#ea580c',
    });
  };

  const handleColorChange = (hex: string) => {
    setBrandColor(hex);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            {title}
          </label>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>

        {currentLogoUrl && (
          <button
            type="button"
            onClick={handleRemoveLogo}
            className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-2.5 py-1 rounded-lg transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Logo & Colors</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Active Logo Preview Box */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 min-h-[120px]">
          <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mb-2 flex items-center gap-1">
            <span>{currentLogoUrl ? 'Custom PNG Logo (Active)' : 'Default Vector Logo (Active)'}</span>
          </span>
          <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center min-h-[56px] w-full shadow-xs">
            {currentLogoUrl ? (
              <img
                src={currentLogoUrl}
                alt="Custom Logo Preview"
                className="max-h-12 max-w-[180px] object-contain"
              />
            ) : (
              <ZoolyumLogo size="md" variant="full" />
            )}
          </div>
          {fileDetails && currentLogoUrl ? (
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2 font-mono truncate max-w-full">
              {fileDetails.name} ({fileDetails.dimensions || fileDetails.size})
            </p>
          ) : (
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold mt-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-500" />
              <span>Auto-Matches Website & PDF Theme</span>
            </span>
          )}
        </div>

        {/* Drag & Drop Upload Trigger */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`sm:col-span-7 flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition cursor-pointer min-h-[120px] ${
            isDragging
              ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
              : 'border-zinc-300 dark:border-zinc-700 hover:border-orange-500/80 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png, image/jpeg, image/webp, image/svg+xml"
            className="hidden"
          />

          <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-1.5">
            {uploadSuccess ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : isExtractingColor ? (
              <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
            ) : (
              <Upload className="w-5 h-5 text-orange-500" />
            )}
          </div>

          <div className="text-center">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {uploadSuccess
                ? 'Logo Uploaded & Colors Synced!'
                : isExtractingColor
                ? 'Extracting Brand Color Palette...'
                : 'Click or Drag PNG Logo Here'}
            </span>
            <div className="mt-1 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-[10px] border border-orange-500/20">
                Auto Color Detection Enabled
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
              Supports Transparent PNG, SVG, JPG, WebP (Max 5MB)
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Brand Color Extraction & Sync Bar */}
      {showColorPaletteConfig && (
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Dynamic Theme & Accent Color (Site + PDF)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 shadow-xs"
                style={{ backgroundColor: activeBrandColor }}
              />
              <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {activeBrandColor.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => colorInputRef.current?.click()}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                title="Pick Custom Color"
              >
                <Pipette className="w-3.5 h-3.5" />
                <input
                  ref={colorInputRef}
                  type="color"
                  value={activeBrandColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="sr-only"
                />
              </button>
            </div>
          </div>

          {/* Extracted Swatches from Logo */}
          {extractedSwatches.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                {currentLogoUrl ? 'Colors Extracted from Your Logo:' : 'Recommended Brand Colors:'}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {extractedSwatches.map((color, idx) => {
                  const isSelected = activeBrandColor.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleColorChange(color)}
                      className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-mono text-[11px]">{color}</span>
                      {isSelected && <Check className="w-3 h-3 text-orange-500 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Popular Palette Presets */}
          <div>
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
              Brand Color Presets:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {BRAND_COLOR_PRESETS.map((preset) => {
                const isSelected = activeBrandColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => handleColorChange(preset.hex)}
                    title={preset.name}
                    className={`w-6 h-6 rounded-full border transition-transform cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'scale-115 ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-zinc-900 border-white'
                        : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Theme instantly synchronizes across all pages and PDF invoices</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

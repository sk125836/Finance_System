import React, { useState } from 'react';
import { useInvoice } from '../../context/InvoiceContext';

interface ZoolyumLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'symbol' | 'white-text';
  customLogoUrl?: string;
  customName?: string;
  fullTagline?: boolean;
  onClick?: () => void;
}

export const ZoolyumLogo: React.FC<ZoolyumLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  customLogoUrl,
  customName,
  fullTagline = false,
  onClick,
}) => {
  const { companyProfile } = useInvoice();
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    sm: { boxSize: 'w-8 h-8', textSize: 'text-base', subSize: 'text-[9px]', iconText: 'text-base', imgHeight: 'h-8 max-h-8 max-w-[140px]' },
    md: { boxSize: 'w-10 h-10', textSize: 'text-xl', subSize: 'text-[10px]', iconText: 'text-xl', imgHeight: 'h-10 max-h-10 max-w-[180px]' },
    lg: { boxSize: 'w-12 h-12', textSize: 'text-2xl', subSize: 'text-xs', iconText: 'text-2xl', imgHeight: 'h-14 max-h-14 max-w-[260px]' },
    xl: { boxSize: 'w-16 h-16', textSize: 'text-3xl', subSize: 'text-sm', iconText: 'text-3xl', imgHeight: 'h-18 max-h-18 max-w-[320px]' },
  };

  const currentSize = sizeMap[size];
  const isWhiteText = variant === 'white-text';

  // Determine if a custom uploaded PNG/image logo should be shown
  const activeLogoUrl = customLogoUrl !== undefined ? customLogoUrl : companyProfile?.logoUrl;

  if (activeLogoUrl && !imgError) {
    return (
      <div
        className={`inline-flex items-center justify-start select-none ${className} ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <img
          src={activeLogoUrl}
          alt={customName || companyProfile?.name || 'Company Logo'}
          className={`${currentSize.imgHeight} w-auto object-contain object-left shrink-0 block`}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  const activeName = customName || companyProfile?.name || 'Your Company';
  const activeTagline = companyProfile?.tagline || 'Brand & Digital';
  const initialLetter = activeName.trim().charAt(0).toUpperCase() || 'Z';

  // Signature Vector Brandmark
  const logoIcon = (
    <div className={`${currentSize.boxSize} rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 p-[1.5px] shadow-lg shadow-orange-500/20 flex items-center justify-center shrink-0`}>
      <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center font-black text-orange-500 tracking-tighter">
        <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent font-black">
          {initialLetter}
        </span>
      </div>
    </div>
  );

  if (variant === 'symbol') {
    return (
      <div className={`inline-flex items-center ${className}`} onClick={onClick}>
        {logoIcon}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 sm:gap-3 select-none min-w-0 max-w-full ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {logoIcon}
      <div className="flex flex-col justify-center leading-none min-w-0 max-w-full">
        <div className="flex items-center gap-1 min-w-0">
          <span
            className={`font-black tracking-tight leading-tight ${fullTagline ? '' : 'truncate'} ${currentSize.textSize} ${
              isWhiteText ? 'text-white' : 'text-zinc-950 dark:text-white'
            }`}
          >
            {activeName}
          </span>
        </div>
        <span
          className={`font-bold tracking-wider uppercase ${currentSize.subSize} text-orange-500 dark:text-orange-400 mt-0.5 leading-tight ${
            fullTagline ? 'whitespace-nowrap' : 'truncate max-w-[160px] sm:max-w-[200px]'
          } block`}
          title={activeTagline}
        >
          {activeTagline}
        </span>
      </div>
    </div>
  );
};

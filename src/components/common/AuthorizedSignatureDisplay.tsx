import React from 'react';

interface AuthorizedSignatureDisplayProps {
  signatureImageUrl?: string;
  signerName?: string;
  signerTitle?: string;
  companyName?: string;
  className?: string;
  theme?: 'light' | 'dark' | 'pdf';
  align?: 'left' | 'center' | 'right';
  showCompany?: boolean;
}

export const AuthorizedSignatureDisplay: React.FC<AuthorizedSignatureDisplayProps> = ({
  signatureImageUrl,
  signerName = 'John Dewey',
  signerTitle = 'Authorized Signature',
  companyName = 'Your Company',
  className = '',
  theme = 'light',
  align = 'center',
  showCompany = true,
}) => {
  const isDark = theme === 'dark';
  const isPdf = theme === 'pdf';

  // The wrapper placement in its parent container
  const positionClass = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
  }[align];

  return (
    <div className={`flex flex-col items-center justify-center text-center w-48 ${positionClass} ${className}`}>
      {/* Signature Graphic or Default Script */}
      <div className="min-h-[48px] flex items-end justify-center pb-1 w-full text-center">
        {signatureImageUrl ? (
          <img
            src={signatureImageUrl}
            alt="Authorized Signature"
            className="max-h-12 max-w-[170px] object-contain mx-auto"
          />
        ) : (
          <div className="relative flex flex-col items-center justify-center mx-auto">
            {/* Elegant authentic executive signature script */}
            <div className="relative font-serif italic text-base tracking-wide text-orange-600 font-bold select-none px-2 pb-0.5 text-center">
              <span className="relative z-10">{signerName || 'John Dewey'}</span>
              {/* Subtle signature underline flourish SVG */}
              <svg
                className="w-36 h-3 text-orange-500/80 -mt-0.5 mx-auto"
                viewBox="0 0 140 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 7C25 3 70 2 110 5C125 6 138 8 135 10C128 11 110 9 95 8C80 7 40 8 30 10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Signature Baseline - Perfectly Centered */}
      <div className="w-40 border-b border-zinc-400 dark:border-zinc-600 mx-auto"></div>

      {/* Signer Title - Centered in Middle */}
      <p
        className={`text-[10px] font-bold uppercase tracking-wider mt-1 text-center w-full mx-auto ${
          isPdf ? 'text-zinc-700' : isDark ? 'text-zinc-300' : 'text-zinc-700'
        }`}
      >
        {signerTitle || 'AUTHORIZED SIGNATURE'}
      </p>

      {/* Company Name - Always Centered in Middle */}
      {showCompany && (
        <p
          className={`text-[9px] font-medium leading-tight text-center w-full mx-auto mt-0.5 ${
            isPdf ? 'text-zinc-500' : isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          {companyName || 'Your Company'}
        </p>
      )}
    </div>
  );
};

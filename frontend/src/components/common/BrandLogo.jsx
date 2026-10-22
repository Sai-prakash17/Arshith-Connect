import React from 'react';
import logoImg from '../../assets/arshith-logo@2x.png';
import logoImg1x from '../../assets/arshith-logo.png';

/**
 * BrandLogo - Uses the exact ARSHITH Connect original logo artwork from Screenshot 2.
 * Preserves original dark forest green lettering, trademark dual dots (cyan/teal & magenta),
 * dynamic green underline swoosh, and Connect typography.
 *
 * Ensures sharp rendering at 1x and 2x pixel densities, perfect aspect ratio,
 * and responsive scaling across mobile, tablet, and desktop viewports.
 */
export default function BrandLogo({ size = 'medium', className = '', showTagline = false }) {
  // Height presets maintaining the exact natural aspect ratio (2.95 : 1)
  const heights = {
    tiny: 26,
    small: 32,
    compact: 38,
    medium: 44,
    large: 54,
  }[size] || 44;

  return (
    <div
      className={`brand-logo-container brand-logo-${size} ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '100%',
      }}
    >
      <img
        src={logoImg}
        srcSet={`${logoImg1x} 1x, ${logoImg} 2x`}
        alt="ARSHITH Connect"
        className="brand-logo-img"
        style={{
          height: `${heights}px`,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />

      {showTagline && (
        <div className="brand-logo-tagline" style={{ marginTop: '5px', textAlign: 'center' }}>
          <p
            style={{
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '2px',
              color: '#4b5563',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            CONNECT &bull; COLLABORATE &bull; GROW
          </p>
          <div
            style={{
              width: '80px',
              height: '2.5px',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #00a896, #16a34a)',
              margin: '3px auto 0 auto',
            }}
          />
        </div>
      )}
    </div>
  );
}

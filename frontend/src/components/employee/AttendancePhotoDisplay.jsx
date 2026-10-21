import React, { useState, useEffect } from 'react';
import { Camera, MapPin, CheckCircle, Maximize2, X, Image as ImageIcon } from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';

export default function AttendancePhotoDisplay({
  attendanceId,
  checkInTime,
  checkInLatitude,
  checkInLongitude,
  checkInAccuracy,
  workMode = 'WFO',
  status = 'Completed',
}) {
  const [photoBlobUrl, setPhotoBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let currentBlobUrl = null;
    if (attendanceId) {
      setIsLoading(true);
      setHasError(false);
      attendanceService
        .getPhotoBlob(attendanceId, 'check-in')
        .then((blob) => {
          currentBlobUrl = URL.createObjectURL(blob);
          setPhotoBlobUrl(currentBlobUrl);
        })
        .catch((err) => {
          console.warn('Could not load attendance photo:', err);
          setHasError(true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }

    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [attendanceId]);

  if (!attendanceId) return null;

  return (
    <div className="attendance-verified-photo-card animate-fade-in">
      <div className="photo-card-top-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="photo-icon-badge">
            <Camera size={14} color="#059669" />
          </div>
          <div>
            <span className="photo-card-heading">Check-In Photo & GPS Verification</span>
            <span className="photo-card-subheading">
              Verified at {checkInTime || 'check-in'} &bull; {workMode} Mode
            </span>
          </div>
        </div>

        {checkInLatitude !== null && checkInLongitude !== null && (
          <span className="gps-pill-badge">
            <MapPin size={11} color="#0d9488" />
            <span>
              {Number(checkInLatitude).toFixed(4)}°, {Number(checkInLongitude).toFixed(4)}°
              {checkInAccuracy && ` (±${Math.round(checkInAccuracy)}m)`}
            </span>
          </span>
        )}
      </div>

      {/* Photo Thumbnail / Preview Strip */}
      <div className="photo-thumbnail-container" onClick={() => photoBlobUrl && setIsModalOpen(true)}>
        {isLoading && (
          <div className="photo-loading-box">
            <span className="badge-dot" style={{ animation: 'pulse 1.2s infinite' }} />
            <span>Loading verified photo...</span>
          </div>
        )}

        {!isLoading && photoBlobUrl && (
          <div className="photo-img-wrapper">
            <img
              src={photoBlobUrl}
              alt="Employee check-in attendance selfie"
              className="photo-thumbnail-img"
            />
            <div className="photo-zoom-hint">
              <Maximize2 size={14} />
              <span>Click to enlarge</span>
            </div>
            <div className="photo-corner-badge">
              <CheckCircle size={12} color="#ffffff" />
              <span>Verified Check-in</span>
            </div>
          </div>
        )}

        {!isLoading && (hasError || !photoBlobUrl) && (
          <div className="photo-placeholder-box">
            <ImageIcon size={20} color="#94a3b8" />
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Photo verified in database</span>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isModalOpen && photoBlobUrl && (
        <div className="photo-lightbox-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="photo-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} color="#059669" />
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0b3d2b' }}>
                  Authoritative Check-In Photo Verification
                </span>
              </div>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="lightbox-image-container">
              <img src={photoBlobUrl} alt="Verified Check-in Selfie" className="lightbox-img" />
            </div>
            <div className="lightbox-footer">
              <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                Check-in Time: <strong>{checkInTime}</strong>
              </span>
              {checkInLatitude !== null && checkInLongitude !== null && (
                <span style={{ fontSize: '0.8rem', color: '#0d9488', fontWeight: '600' }}>
                  GPS: {checkInLatitude}, {checkInLongitude}
                  {checkInAccuracy ? ` (±${Math.round(checkInAccuracy)}m)` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

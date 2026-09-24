import React, { useState, useEffect } from 'react';
import { Music, VolumeX, Minus, Plus, Disc3 } from 'lucide-react';
import { soundFX, BGMTrackInfo } from '../utils/soundEffects';

interface MusicControlsProps {
  compact?: boolean;
}

export const MusicControls: React.FC<MusicControlsProps> = ({ compact = false }) => {
  const [musicMuted, setMusicMuted] = useState<boolean>(soundFX.musicMuted);
  const [musicVolume, setMusicVolume] = useState<number>(soundFX.musicVolume);
  const [track, setTrack] = useState<BGMTrackInfo>(soundFX.getCurrentTrack());

  // Sync state across Home Screen and In-Game HUD instances via custom event
  useEffect(() => {
    const handleSync = () => {
      setMusicMuted(soundFX.musicMuted);
      setMusicVolume(soundFX.musicVolume);
      setTrack(soundFX.getCurrentTrack());
    };
    window.addEventListener('uno-bgm-change', handleSync);
    return () => window.removeEventListener('uno-bgm-change', handleSync);
  }, []);

  const notifySync = () => {
    window.dispatchEvent(new Event('uno-bgm-change'));
  };

  const handleToggleMusicMute = () => {
    const nextMuted = !soundFX.musicMuted;
    soundFX.setMusicMuted(nextMuted);
    setMusicMuted(soundFX.musicMuted);
    notifySync();
  };

  const handleStepVolume = (delta: number) => {
    const nextVol = soundFX.adjustMusicVolume(delta);
    setMusicVolume(nextVol);
    setMusicMuted(soundFX.musicMuted);
    notifySync();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value) / 100;
    soundFX.setMusicVolume(val);
    setMusicVolume(soundFX.musicVolume);
    setMusicMuted(soundFX.musicMuted);
    notifySync();
  };

  const handleNextTrack = () => {
    const nextTrack = soundFX.cycleTrack();
    setTrack(nextTrack);
    if (soundFX.musicMuted) {
      soundFX.setMusicMuted(false);
      setMusicMuted(false);
    }
    notifySync();
  };

  const volumePercent = musicMuted ? 0 : Math.round(musicVolume * 100);

  return (
    <div
      className={`bgm-control-capsule ${compact ? 'bgm-capsule-compact' : ''} ${
        musicMuted ? 'is-bgm-muted' : 'is-bgm-playing'
      }`}
      title="100% Copyright-Free Background Music Controls (Looping)"
    >
      {/* Mute / Unmute Music Button */}
      <button
        type="button"
        className={`bgm-mute-toggle-btn ${musicMuted ? 'muted' : 'active'}`}
        onClick={handleToggleMusicMute}
        aria-label={musicMuted ? 'Unmute Background Music' : 'Mute Background Music'}
        title={musicMuted ? 'Unmute Background Music' : 'Mute Background Music'}
      >
        {musicMuted ? (
          <VolumeX size={14} />
        ) : (
          <>
            <Music size={13} />
            <span className="bgm-eq-bars" aria-hidden="true">
              <span className="eq-bar eq-1" />
              <span className="eq-bar eq-2" />
              <span className="eq-bar eq-3" />
            </span>
          </>
        )}
      </button>

      {/* Decrease Music Volume (-) */}
      <button
        type="button"
        className="bgm-vol-step-btn"
        onClick={() => handleStepVolume(-0.1)}
        disabled={musicMuted && musicVolume <= 0}
        aria-label="Reduce Music Volume"
        title="Reduce Music Volume (-10%)"
      >
        <Minus size={12} />
      </button>

      {/* Interactive Volume Slider + Percentage */}
      <div className="bgm-slider-wrap">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={volumePercent}
          onChange={handleSliderChange}
          className="bgm-volume-slider"
          aria-label="Background Music Volume"
        />
        <span className="bgm-vol-percent">{volumePercent}%</span>
      </div>

      {/* Increase Music Volume (+) */}
      <button
        type="button"
        className="bgm-vol-step-btn"
        onClick={() => handleStepVolume(0.1)}
        aria-label="Increase Music Volume"
        title="Increase Music Volume (+10%)"
      >
        <Plus size={12} />
      </button>

      {/* Copyright-Free Track Switcher */}
      <button
        type="button"
        className="bgm-track-cycle-btn"
        onClick={handleNextTrack}
        title={`Switch Copyright-Free Loop (Current: ${track.name})`}
      >
        <Disc3 size={12} className={!musicMuted ? 'spin-disc' : ''} />
        <span className="bgm-track-label">{track.name}</span>
      </button>
    </div>
  );
};

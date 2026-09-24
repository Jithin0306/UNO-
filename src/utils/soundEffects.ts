// Procedural Web Audio API sound design for tactile card-on-felt physics
// + 100% Copyright-Free Procedural Background Music Sequencer (Emerald Lounge, No Mercy Pulse, Midnight Billiards)

export interface BGMTrackInfo {
  id: 'emerald_lounge' | 'no_mercy_pulse' | 'midnight_billiards';
  name: string;
  bpm: number;
}

export const BGM_TRACKS: BGMTrackInfo[] = [
  { id: 'emerald_lounge', name: 'Emerald Lounge', bpm: 92 },
  { id: 'no_mercy_pulse', name: 'No Mercy Pulse', bpm: 108 },
  { id: 'midnight_billiards', name: 'Midnight Lo-Fi', bpm: 82 },
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  // Background Music State & Nodes
  public musicMuted: boolean = false;
  public musicVolume: number = 0.45; // 0.0 to 1.0
  public currentTrackIndex: number = 0;
  private isMusicPlaying: boolean = false;
  private musicMasterGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private stepTimer: number | null = null;
  private currentStep: number = 0;
  private unlockListenersBound: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedVol = localStorage.getItem('uno_royale_bgm_volume');
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (!Number.isNaN(parsed)) {
            this.musicVolume = Math.max(0, Math.min(1, parsed));
          }
        }
        const savedMute = localStorage.getItem('uno_royale_bgm_muted');
        if (savedMute !== null) {
          this.musicMuted = savedMute === 'true';
        }
        const savedTrack = localStorage.getItem('uno_royale_bgm_track');
        if (savedTrack !== null) {
          const idx = parseInt(savedTrack, 10);
          if (idx >= 0 && idx < BGM_TRACKS.length) {
            this.currentTrackIndex = idx;
          }
        }
      } catch {
        // Ignore storage errors
      }
      this.bindAutoUnlock();
    }
  }

  private bindAutoUnlock() {
    if (this.unlockListenersBound || typeof window === 'undefined') return;
    this.unlockListenersBound = true;

    const unlock = () => {
      this.init();
      if (!this.isMusicPlaying && !this.musicMuted) {
        this.startMusic();
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.musicMasterGain) {
      this.musicMasterGain = this.ctx.createGain();
      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);
      this.musicFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

      // Subtle studio space echo for background warmth
      const delay = this.ctx.createDelay(1.0);
      const feedback = this.ctx.createGain();
      const wetGain = this.ctx.createGain();
      delay.delayTime.setValueAtTime(0.31, this.ctx.currentTime);
      feedback.gain.setValueAtTime(0.22, this.ctx.currentTime);
      wetGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      this.musicFilter.connect(this.musicMasterGain);
      this.musicFilter.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wetGain);
      wetGain.connect(this.musicMasterGain);

      const effectiveGain = this.musicMuted ? 0 : this.musicVolume * 0.32;
      this.musicMasterGain.gain.setValueAtTime(effectiveGain, this.ctx.currentTime);
      this.musicMasterGain.connect(this.ctx.destination);
    }
  }

  private updateMasterMusicGain() {
    this.init();
    if (!this.ctx || !this.musicMasterGain) return;
    const target = this.musicMuted ? 0.0001 : Math.max(0.0001, this.musicVolume * 0.32);
    this.musicMasterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
    if (this.musicMuted && this.musicMasterGain) {
      this.musicMasterGain.gain.setValueAtTime(0, this.ctx.currentTime + 0.12);
    }
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, Number(volume.toFixed(2))));
    if (this.musicVolume > 0 && this.musicMuted) {
      this.musicMuted = false;
    }
    try {
      localStorage.setItem('uno_royale_bgm_volume', String(this.musicVolume));
      localStorage.setItem('uno_royale_bgm_muted', String(this.musicMuted));
    } catch {
      // Ignore
    }
    this.updateMasterMusicGain();
    if (!this.isMusicPlaying && !this.musicMuted && this.musicVolume > 0) {
      this.startMusic();
    }
  }

  public adjustMusicVolume(delta: number): number {
    const next = Math.max(0, Math.min(1, Number((this.musicVolume + delta).toFixed(2))));
    this.setMusicVolume(next);
    return this.musicVolume;
  }

  public setMusicMuted(muted: boolean) {
    this.musicMuted = muted;
    try {
      localStorage.setItem('uno_royale_bgm_muted', String(this.musicMuted));
    } catch {
      // Ignore
    }
    this.updateMasterMusicGain();
    if (!this.musicMuted && !this.isMusicPlaying) {
      this.startMusic();
    }
  }

  public cycleTrack(): BGMTrackInfo {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % BGM_TRACKS.length;
    try {
      localStorage.setItem('uno_royale_bgm_track', String(this.currentTrackIndex));
    } catch {
      // Ignore
    }
    if (this.isMusicPlaying) {
      this.stopMusic();
      this.startMusic();
    }
    return BGM_TRACKS[this.currentTrackIndex];
  }

  public getCurrentTrack(): BGMTrackInfo {
    return BGM_TRACKS[this.currentTrackIndex] || BGM_TRACKS[0];
  }

  public startMusic() {
    if (typeof window === 'undefined') return;
    this.init();
    if (!this.ctx || !this.musicFilter) return;
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    this.isMusicPlaying = true;
    this.updateMasterMusicGain();

    const track = this.getCurrentTrack();
    // 16th-note step duration in ms
    const stepMs = (60 / track.bpm / 4) * 1000;

    this.stepTimer = window.setInterval(() => {
      if (this.musicMuted || this.musicVolume <= 0.001) return;
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
        return;
      }
      this.playSequencerStep(this.currentStep, track.id);
      this.currentStep = (this.currentStep + 1) % 64; // 4-bar loop (64 sixteenth notes)
    }, stepMs);
  }

  public stopMusic() {
    if (this.stepTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    this.isMusicPlaying = false;
  }

  private playSequencerStep(
    step: number,
    trackId: 'emerald_lounge' | 'no_mercy_pulse' | 'midnight_billiards'
  ) {
    if (!this.ctx || !this.musicFilter) return;
    const now = this.ctx.currentTime;
    const bar = Math.floor(step / 16); // 0..3
    const stepInBar = step % 16; // 0..15

    if (trackId === 'emerald_lounge') {
      // Progression: Dm9 -> G13 -> Cmaj9 -> A7alt
      const chords = [
        [293.66, 349.23, 440.0, 523.25, 659.25], // Dm9
        [196.0, 293.66, 349.23, 493.88, 659.25], // G13
        [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj9
        [220.0, 277.18, 392.0, 466.16, 659.25], // A7alt
      ];
      const bassRoots = [73.42, 98.0, 65.41, 110.0];
      const melodyScale = [587.33, 659.25, 783.99, 880.0, 1046.5, 987.77, 659.25, 523.25];

      // Warm Rhodes chord stabs on step 0 and soft syncopation on step 10
      if (stepInBar === 0 || stepInBar === 10) {
        const dur = stepInBar === 0 ? 1.45 : 0.7;
        const vel = stepInBar === 0 ? 0.085 : 0.05;
        chords[bar].forEach((freq) => {
          this.triggerWarmKey(freq, now, dur, vel);
        });
      }

      // Walking warm sub-bass on 0, 6, 8, 14
      if (stepInBar === 0 || stepInBar === 6 || stepInBar === 8 || stepInBar === 14) {
        const mult = stepInBar === 6 ? 1.5 : stepInBar === 14 ? 1.25 : 1;
        this.triggerSubBass(bassRoots[bar] * mult, now, 0.36, 0.2);
      }

      // Brushed lounge hi-hat on even steps + swing on 3, 7, 11, 15
      if (stepInBar % 4 === 0 || stepInBar % 4 === 3) {
        this.triggerSoftHat(now, stepInBar % 4 === 0 ? 0.03 : 0.018);
      }

      // Gentle vibraphone lounge melody notes
      if (stepInBar === 4 || stepInBar === 12 || (bar % 2 === 1 && stepInBar === 14)) {
        const noteIdx = (bar * 2 + (stepInBar === 12 ? 1 : 0)) % melodyScale.length;
        this.triggerBellNote(melodyScale[noteIdx], now, 0.65, 0.045);
      }
    } else if (trackId === 'no_mercy_pulse') {
      // Progression: Am7 -> Fmaj7 -> Dm9 -> E7
      const chords = [
        [220.0, 261.63, 329.63, 392.0],
        [174.61, 220.0, 261.63, 329.63],
        [146.83, 220.0, 261.63, 329.63],
        [164.81, 207.65, 246.94, 329.63],
      ];
      const bassRoots = [55.0, 43.65, 73.42, 82.41];
      const arpNotes = chords[bar];

      // Pad swell at start of each bar
      if (stepInBar === 0) {
        chords[bar].forEach((freq) => {
          this.triggerWarmKey(freq, now, 1.8, 0.065);
        });
      }

      // Driving eighth-note synth bass pulse
      if (stepInBar % 2 === 0) {
        const oct = stepInBar % 4 === 2 ? 2 : 1;
        this.triggerSubBass(bassRoots[bar] * oct, now, 0.2, 0.19);
      }

      // Synthwave arpeggio pluck
      if (stepInBar % 2 === 1) {
        const arpFreq = arpNotes[(stepInBar >> 1) % arpNotes.length] * 2;
        this.triggerBellNote(arpFreq, now, 0.25, 0.038);
      }

      // Crisp hi-hat groove
      if (stepInBar % 2 === 0) {
        this.triggerSoftHat(now, stepInBar % 4 === 0 ? 0.035 : 0.02);
      }
    } else {
      // Midnight Billiards (Lo-Fi Chillhop): Fmaj9 -> Em7 -> Dm9 -> Cmaj9
      const chords = [
        [174.61, 220.0, 261.63, 329.63, 392.0],
        [164.81, 196.0, 246.94, 293.66, 392.0],
        [146.83, 174.61, 220.0, 261.63, 329.63],
        [130.81, 164.81, 196.0, 246.94, 293.66],
      ];
      const bassRoots = [87.31, 82.41, 73.42, 65.41];
      const lofiMelody = [523.25, 659.25, 587.33, 493.88, 440.0, 523.25, 392.0, 329.63];

      if (stepInBar === 0 || stepInBar === 9) {
        chords[bar].forEach((freq) => {
          this.triggerWarmKey(freq, now, stepInBar === 0 ? 1.6 : 0.85, 0.075);
        });
      }

      if (stepInBar === 0 || stepInBar === 7 || stepInBar === 10) {
        this.triggerSubBass(bassRoots[bar], now, 0.45, 0.21);
      }

      if (stepInBar % 2 === 0) {
        this.triggerSoftHat(now, stepInBar === 4 || stepInBar === 12 ? 0.042 : 0.02);
      }

      if (stepInBar === 2 || stepInBar === 8 || stepInBar === 13) {
        const note = lofiMelody[(bar * 2 + (stepInBar > 6 ? 1 : 0)) % lofiMelody.length];
        this.triggerBellNote(note, now, 0.55, 0.042);
      }
    }
  }

  private triggerWarmKey(freq: number, time: number, duration: number, peakGain: number) {
    if (!this.ctx || !this.musicFilter) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicFilter);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private triggerSubBass(freq: number, time: number, duration: number, peakGain: number) {
    if (!this.ctx || !this.musicFilter) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicFilter);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private triggerBellNote(freq: number, time: number, duration: number, peakGain: number) {
    if (!this.ctx || !this.musicFilter) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicFilter);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private triggerSoftHat(time: number, peakGain: number) {
    if (!this.ctx || !this.musicFilter) return;
    const osc = this.ctx.createOscillator();
    const hp = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    // Metallic high-frequency shimmer for brushed hi-hat
    osc.type = 'square';
    osc.frequency.setValueAtTime(6400, time);
    osc.frequency.exponentialRampToValueAtTime(3200, time + 0.045);

    hp.type = 'highpass';
    hp.frequency.setValueAtTime(5200, time);

    gain.gain.setValueAtTime(peakGain, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.048);

    osc.connect(hp);
    hp.connect(gain);
    gain.connect(this.musicFilter);
    osc.start(time);
    osc.stop(time + 0.052);
  }

  // ==========================================================================
  // TACTILE GAMEPLAY SOUND EFFECTS (SFX)
  // ==========================================================================

  public playCardHover() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.045);

    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playCardPlay() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Soft felt thud + card snap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.11);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playCardDraw() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playTimerTick(urgent = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = urgent ? 'square' : 'sine';
    osc.frequency.setValueAtTime(urgent ? 880 : 620, now);
    osc.frequency.exponentialRampToValueAtTime(urgent ? 440 : 480, now + 0.04);

    gain.gain.setValueAtTime(urgent ? 0.035 : 0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playSpecialEffect(
    type: 'reverse' | 'penalty' | 'uno' | 'win' | 'elimination'
  ) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'reverse') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.34);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'penalty') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(72, now + 0.28);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.31);
    } else if (type === 'elimination') {
      // Deep cinematic sub-bass gong + descending elimination chord
      const notes = [220, 196, 164.81, 110];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = idx === 3 ? 'sawtooth' : 'triangle';
        o.frequency.setValueAtTime(freq, now + idx * 0.11);
        o.frequency.exponentialRampToValueAtTime(
          freq * 0.72,
          now + idx * 0.11 + 0.48
        );
        g.gain.setValueAtTime(0.11, now + idx * 0.11);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.52);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(now + idx * 0.11);
        o.stop(now + idx * 0.11 + 0.55);
      });
    } else if (type === 'uno' || type === 'win') {
      const notes =
        type === 'win' ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 880];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.08, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.24);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.25);
      });
    }
  }
}

export const soundFX = new SoundEngine();

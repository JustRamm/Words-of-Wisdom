// Web Audio API Sound Synthesizer
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
        this.cache = {}; // Cache for decoded audio assets
        this.voices = []; // Cache for TTS voices
        this.owlInterval = null; // Interval for owl hooting
        this.ttsEnabled = true; // User preference
        this.currentTrack = null; // To avoid restarting same track
        this.musicGeneration = 0; // Prevent race conditions on async loads
        this.musicGeneration = 0; // Prevent race conditions on async loads
        this.owlTimeout = null; // Store timeout for cleanup
        this.globalPaused = false;
    }

    init() {
        if (this.initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.5;

        // Pre-load voices to avoid "first try" default voice bug
        this.loadVoices();

        this.initialized = true;
    }

    setVolume(value) {
        if (!this.initialized) return;
        this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.1);
    }

    toggleTTS(enabled) {
        this.ttsEnabled = enabled;
        if (!enabled) {
            this.stopSpeaking();
        }
    }

    stopSpeaking() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }

    loadVoices() {
        const populate = () => {
            this.voices = window.speechSynthesis.getVoices();
        };

        populate();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = populate;
        }
    }

    // Load external assets (like rain.mp3)
    async getBuffer(url) {
        if (this.cache[url]) return this.cache[url];
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.cache[url] = audioBuffer;
            return audioBuffer;
        } catch (e) {
            console.error("Failed to load audio asset:", url, e);
            return null;
        }
    }

    // Satisfying "pop" for speech bubbles
    playPop() {
        if (!this.initialized || this.globalPaused) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    // Hopeful "ding" for trust increase
    playDing() {
        if (!this.initialized || this.globalPaused) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    // Tick sound for timer
    playTick() {
        if (!this.initialized || this.globalPaused) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    // New sound for Coach Reflection Popup
    playCoachTip() {
        if (!this.initialized || this.globalPaused) return;
        const t = this.ctx.currentTime;

        // Two ascending notes
        [600, 800].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + i * 0.1);

            gain.gain.setValueAtTime(0, t + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.1, t + i * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.15);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.15);
        });
    }

    playHeartbeat() {
        if (!this.initialized || this.globalPaused) return;
        const t = this.ctx.currentTime;

        // Helper to create a thump (lub/dub)
        const playThump = (startTime, freqStart, dur, vol) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freqStart, startTime);
            osc.frequency.exponentialRampToValueAtTime(freqStart * 0.6, startTime + dur);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + dur);
        };

        // "Lub" - Deep, resonant
        playThump(t, 65, 0.15, 0.6);
        // "Dub" - Slightly higher, tighter
        playThump(t + 0.18, 55, 0.12, 0.4);
    }

    // Low "thud" for trust decrease or frown
    playSad() {
        if (!this.initialized || this.globalPaused) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }

    // Subtle footstep
    playStep() {
        if (!this.initialized || this.globalPaused) return;
        const noise = this.ctx.createBufferSource();
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
        noise.stop(this.ctx.currentTime + 0.1);
    }

    // Sound when finding a clue
    playInvestigate() {
        if (!this.initialized || this.globalPaused) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    async playVictory() {
        if (!this.initialized || this.globalPaused) return;
        this.stopMusic();

        try {
            const buffer = await this.getBuffer('/ThemeAudio/victory.mp3');
            if (buffer) {
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;

                const gain = this.ctx.createGain();
                gain.gain.value = 0.4;

                source.connect(gain);
                gain.connect(this.masterGain);

                source.start();
                this.musicNodes = [{ source, gain }];
            }
        } catch (e) {
            console.error("Failed to play victory sound:", e);
        }
    }

    async playMenuMusic() {
        if (!this.initialized || this.currentTrack === 'menu') return;

        try {
            const buffer = await this.getBuffer('/ThemeAudio/bc.mp3');
            if (buffer) {
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;
                source.loop = true;

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.001, this.ctx.currentTime); // Start silent

                source.connect(gain);
                gain.connect(this.masterGain);
                source.start();

                // Cross-fade logic: Faster fade for menu entry
                if (this.musicNodes) {
                    this.musicNodes.forEach(n => {
                        if (n.gain) n.gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
                        if (n.source) n.source.stop(this.ctx.currentTime + 0.9);
                        if (n.osc) n.osc.stop(this.ctx.currentTime + 0.9);
                    });
                }

                gain.gain.exponentialRampToValueAtTime(0.3, this.ctx.currentTime + 1.5);
                this.musicNodes = [{ source, gain }];
                this.currentTrack = 'menu';
            }
        } catch (e) {
            console.error("Failed to play menu music:", e);
        }
    }

    // Adaptive Ambient Pad
    async startAmbient(arg1, arg2 = 50) {
        if (!this.initialized || this.globalPaused) return;
        // Handle flexible arguments: startAmbient(theme) or startAmbient(trust, theme)
        let theme = 'park';
        let trust = 50;

        if (typeof arg1 === 'string') {
            theme = arg1; // Called as startAmbient('park')
            if (typeof arg2 === 'number') trust = arg2;
        } else if (typeof arg1 === 'number') {
            trust = arg1; // Called as startAmbient(50, 'park')
            if (typeof arg2 === 'string') theme = arg2;
        }

        // Avoid re-starting if the same theme is already playing, just update trust variations
        if (this.currentTrack === theme) {
            this.updateMusic(trust);
            return;
        }

        // Increment generation to invalidate any previous async loads
        const gen = ++this.musicGeneration;

        // Cross-fade: Start fading out existing music immediately
        if (this.musicNodes) {
            this.musicNodes.forEach(n => {
                if (n.gain) n.gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.0);
                if (n.source) n.source.stop(this.ctx.currentTime + 1.1);
                if (n.osc) n.osc.stop(this.ctx.currentTime + 1.1);
            });
            this.musicNodes = null;
        }

        if (this.owlInterval) { clearInterval(this.owlInterval); this.owlInterval = null; }
        if (this.owlTimeout) { clearTimeout(this.owlTimeout); this.owlTimeout = null; }

        this.currentTrack = theme;

        const nodes = [];

        // Special handling for Park Theme with MP3
        if (theme === 'park') {
            const buffer = await this.getBuffer('/ThemeAudio/park.mp3');
            if (buffer) {
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;
                source.loop = true;
                const gain = this.ctx.createGain();

                // Softer volume for background with fade-in
                gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.3, this.ctx.currentTime + 2);

                if (this.musicGeneration !== gen) {
                    source.stop();
                    return;
                }

                source.connect(gain);
                gain.connect(this.masterGain);
                source.start();
                nodes.push({ source, gain });
                this.musicNodes = nodes;
                return; // Exit early, don't play synth pad if MP3 works
            }
        }

        // Special handling for Campus Theme with MP3
        if (theme === 'campus') {
            const buffer = await this.getBuffer('/ThemeAudio/campus.mp3');
            if (buffer) {
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;
                source.loop = true;
                const gain = this.ctx.createGain();

                // Reduced volume as requested with fade-in
                gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.1, this.ctx.currentTime + 2);

                if (this.musicGeneration !== gen) {
                    source.stop();
                    return;
                }

                source.connect(gain);
                gain.connect(this.masterGain);
                source.start();
                nodes.push({ source, gain });
                this.musicNodes = nodes;
                return; // Exit early
            }
        }

        let freqs = trust > 50 ? [220, 277, 329, 440] : [110, 138, 164, 220];
        let type = 'sine';
        let volume = 0.02;

        // Special handling for Office Theme with Owl sfx
        if (theme === 'office') {
            type = 'sine';
            freqs = freqs.map(f => f * 0.5); // Lower, starker
            volume = 0.01;

            // Schedule periodic Owl hooting
            const playOwl = async () => {
                const buffer = await this.getBuffer('/ThemeAudio/owl.mp3');
                if (buffer && this.musicNodes) { // Check musicNodes to ensure we haven't stopped
                    const source = this.ctx.createBufferSource();
                    source.buffer = buffer;
                    const gain = this.ctx.createGain();
                    gain.gain.value = 0.25; // Subtle background hoot
                    source.connect(gain);
                    gain.connect(this.masterGain);
                    source.start();
                }
            };

            // Initial delay then interval
            this.owlTimeout = setTimeout(playOwl, 5000 + Math.random() * 5000);
            this.owlInterval = setInterval(playOwl, 25000); // Every 25 seconds
        } else if (theme === 'campus') {
            type = 'triangle';
            freqs = freqs.map(f => f * 1.5); // Higher tension
            volume = 0.015;
        } else if (theme === 'rainy_street') {
            type = 'sine';
            freqs = freqs.map(f => f * 0.8);
            volume = 0.03;
        }

        freqs.forEach(f => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(f, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(volume, this.ctx.currentTime + 2); // Smooth fade-in

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            nodes.push({ osc, gain, baseFreq: f });
        });

        // Add real rain audio asset for rainy theme
        if (theme === 'rainy_street') {
            const buffer = await this.getBuffer('/ThemeAudio/rain.mp3');
            if (buffer) {
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;
                source.loop = true;
                const gain = this.ctx.createGain();
                gain.gain.value = 0.2;
                source.connect(gain);
                gain.connect(this.masterGain);
                source.start();
                nodes.push({ source, gain });
            }
        }

        this.musicNodes = nodes;
    }

    updateMusic(trust) {
        if (!this.musicNodes) return;
        const isHigh = trust > 50;
        if (this.isHighTrust === isHigh) return; // Prevent thrashing
        this.isHighTrust = isHigh;

        const freqs = isHigh ? [220, 277, 329, 440] : [110, 138, 164, 220];

        this.musicNodes.forEach((node, i) => {
            if (node.osc) {
                const targetFreq = freqs[i] || node.baseFreq;
                node.osc.frequency.exponentialRampToValueAtTime(targetFreq, this.ctx.currentTime + 2);
            }
        });
    }

    stopMusic() {
        this.musicGeneration++; // Invalidate any pending loads
        if (this.musicNodes) {
            this.musicNodes.forEach(n => {
                if (n.gain) n.gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
                if (n.osc) n.osc.stop(this.ctx.currentTime + 0.6);
                if (n.source) n.source.stop(this.ctx.currentTime + 0.6);
            });
            this.musicNodes = null;
            this.currentTrack = null;
        }

        if (this.owlInterval) {
            clearInterval(this.owlInterval);
            this.owlInterval = null;
        }
        if (this.owlTimeout) {
            clearTimeout(this.owlTimeout);
            this.owlTimeout = null;
        }
    }

    // Voice Synthesis (TTS)
    speak(text, isSam = true, gender = 'guy', voiceParams = null, onEnd = null) {
        if (!this.ttsEnabled || !window.speechSynthesis || this.globalPaused) {
            if (onEnd) onEnd();
            return;
        }

        // Prevent error logging for intentional interruptions
        if (this.utterance) {
            this.utterance.onerror = null;
        }

        // Force-cancel previous speech thoroughly before starting new
        window.speechSynthesis.cancel();

        // Ensure voices are loaded if empty
        if (!this.voices || this.voices.length === 0) {
            this.voices = window.speechSynthesis.getVoices();
        }

        // Use a consistent internal reference to prevent garbage collection
        this.utterance = new SpeechSynthesisUtterance(text);

        // --- CRITICAL FIX FOR LONG SENTENCES ---
        this.utterance.onend = () => {
            this.utterance = null;
            if (onEnd) onEnd();
        };

        this.utterance.onerror = (event) => {
            if (event.error === 'interrupted' || event.error === 'canceled') return;
            console.warn("TTS Error/Interrupt:", event);
            this.utterance = null;
        };

        this.utterance.onboundary = () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        };

        // Use Voice Parameters if provided, otherwise fallback to defaults
        if (voiceParams) {
            this.utterance.pitch = voiceParams.pitch || 1.0;
            this.utterance.rate = voiceParams.rate || 0.9;
        } else if (gender === 'girl') {
            this.utterance.pitch = isSam ? 1.1 : 1.4; // Slightly more somber if it's the NPC in crisis
            this.utterance.rate = isSam ? 0.8 : 0.95;
        } else if (isSam) {
            this.utterance.pitch = 0.7; // Deep, somber
            this.utterance.rate = 0.75; // Slower, weighted
        } else {
            this.utterance.pitch = 1.0;
            this.utterance.rate = 0.95;
        }
        this.utterance.volume = 1.0;

        const voices = this.voices.length > 0 ? this.voices : window.speechSynthesis.getVoices();

        if (voices.length > 0) {
            const preferredVoice = voices.find(v => {
                const name = v.name.toLowerCase();
                const lang = v.lang.toLowerCase();
                if (!lang.includes('en')) return false;

                if (gender === 'girl') {
                    return name.includes('zira') || name.includes('samantha') || name.includes('female') || name.includes('hazel') || name.includes('susan');
                }

                // Differentiate Male Voices
                if (isSam) {
                    // NPC Guy: Prioritize Mark or different male tone
                    return name.includes('mark') || name.includes('james') || (name.includes('male') && !name.includes('david'));
                }
                // Player Guy: Prioritize David or Google
                return name.includes('david') || name.includes('google us english') || (name.includes('male') && name.includes('david'));
            });

            if (preferredVoice) {
                this.utterance.voice = preferredVoice;
                if (gender === 'girl' && (preferredVoice.name.toLowerCase().includes('zira') || preferredVoice.name.toLowerCase().includes('samantha'))) {
                    this.utterance.pitch = 1.1;
                }
            } else {
                this.utterance.voice = voices.find(v => {
                    const n = v.name.toLowerCase();
                    return gender === 'girl' ? n.includes('female') : (n.includes('male') && !n.includes('female'));
                }) || voices[0];
            }
        }

        window.speechSynthesis.speak(this.utterance);
    }
    pauseAll() {
        this.globalPaused = true;
        if (this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend();
        }
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
        }
    }

    resumeAll() {
        this.globalPaused = false;
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (window.speechSynthesis && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
    }
}

export const audioManager = new SoundEngine();

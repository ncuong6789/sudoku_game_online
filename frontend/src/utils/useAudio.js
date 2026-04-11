import { useCallback, useRef } from 'react';

// Tạo 1 AudioContext chung cho cả app để tiết kiệm bộ nhớ
let audioCtx;

// Helper function to create and play a tone
const playTone = (ctx, osc, gainParams, volume, duration) => {
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    if (gainParams.type === 'linear') {
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + gainParams.duration);
    } else if (gainParams.type === 'exponential') {
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + gainParams.duration); // Avoid 0 for exponential
    }

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
};

export const useAudio = () => {
    const playWinSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'square';
        
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
        osc.frequency.setValueAtTime(880, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.3); // A6
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);

        osc.start(now);
        osc.stop(now + 0.4);
    }, []);

    const playLoseSound = useCallback(() => {
        try {
            const audio = new Audio('/lose.mp3');
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } catch(e) {}
    }, []);

    const playClearLineSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
    }, []);

    const playChessMoveSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    }, []);

    const playChessCaptureSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sawtooth';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }, []);

    const playChessCheckSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        // Tạo tiếng bíp kép kịch tính
        const playBip = (startTime, freq) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.linearRampToValueAtTime(0, startTime + 0.1);
            osc.start(startTime);
            osc.stop(startTime + 0.1);
        };

        const now = audioCtx.currentTime;
        playBip(now, 1000);
        playBip(now + 0.15, 1200);
    }, []);

    const playTetrisMoveSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    }, []);

    const playTetrisRotateSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    }, []);

    const playTetrisDropSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'square';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }, []);

    const playPacmanStartSound = useCallback(() => {
        try { new window.Audio('/pacman_audio/gs_start.mp3').play().catch(()=>{}); } catch(e){}
    }, []);

    const playPacmanWakaSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }, []);

    const playPacmanPowerPillSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.25);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    }, []);

    const playPacmanEatGhostSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sawtooth';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }, []);

    const playPacmanDieSound = useCallback(() => {
        try { new window.Audio('/pacman_audio/gs_pacmandies.mp3').play().catch(()=>{}); } catch(e){}
    }, []);

    const playJungleMoveSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
    }, []);

    const playJungleCaptureSound = useCallback((capturedType = 1, attackerType = 1) => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        const now = audioCtx.currentTime;
        
        // Different sounds based on animal type
        const getSoundParams = (type) => {
            switch(type) {
                case 8: // Elephant - deep trumpet
                    return { freqStart: 80, freqEnd: 40, duration: 0.4, wave: 'sawtooth', vol: 0.2 };
                case 7: // Lion - loud roar
                    return { freqStart: 200, freqEnd: 100, duration: 0.3, wave: 'sawtooth', vol: 0.18 };
                case 6: // Tiger - fierce roar
                    return { freqStart: 250, freqEnd: 120, duration: 0.25, wave: 'sawtooth', vol: 0.18 };
                case 5: // Leopard - growl
                    return { freqStart: 300, freqEnd: 150, duration: 0.2, wave: 'square', vol: 0.15 };
                case 4: // Wolf - howl
                    return { freqStart: 400, freqEnd: 200, duration: 0.25, wave: 'sine', vol: 0.12 };
                case 3: // Dog - bark
                    return { freqStart: 500, freqEnd: 300, duration: 0.15, wave: 'square', vol: 0.12 };
                case 2: // Cat - meow (higher pitch)
                    return { freqStart: 600, freqEnd: 400, duration: 0.15, wave: 'sine', vol: 0.1 };
                case 1: // Rat - squeak
                default:
                    return { freqStart: 800, freqEnd: 600, duration: 0.1, wave: 'sine', vol: 0.1 };
            }
        };
        
        const params = getSoundParams(capturedType);
        osc.type = params.wave;
        osc.frequency.setValueAtTime(params.freqStart, now);
        osc.frequency.exponentialRampToValueAtTime(params.freqEnd, now + params.duration);
        gain.gain.setValueAtTime(params.vol, now);
        gain.gain.linearRampToValueAtTime(0, now + params.duration);
        
        osc.start(now);
        osc.stop(now + params.duration);
    }, []);

    const playJungleJumpSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }, []);

    const playJungleSelectSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    }, []);

    const playJungleWinSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        
        [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);
            gain.gain.setValueAtTime(0.1, now + i * 0.15);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.3);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.3);
        });
    }, []);

    const playJungleLoseSound = useCallback(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        
        [400, 350, 300, 250].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + i * 0.2);
            gain.gain.setValueAtTime(0.1, now + i * 0.2);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.2 + 0.25);
            osc.start(now + i * 0.2);
            osc.stop(now + i * 0.2 + 0.25);
        });
    }, []);

    const playXiangqiClickSound = useCallback(() => { try { const a = new window.Audio('/xiangqi_audio/click.wav'); a.volume = 0.6; a.play().catch(()=>{}); } catch(e){} }, []);
    const playXiangqiMoveSound = useCallback(() => { try { const a = new window.Audio('/xiangqi_audio/move.wav'); a.volume = 0.8; a.play().catch(()=>{}); } catch(e){} }, []);
    const playXiangqiCaptureSound = useCallback(() => { try { const a = new window.Audio('/xiangqi_audio/capture.wav'); a.volume = 0.9; a.play().catch(()=>{}); } catch(e){} }, []);
    const playXiangqiCheckSound = useCallback(() => { try { const a = new window.Audio('/xiangqi_audio/check.wav'); a.volume = 0.9; a.play().catch(()=>{}); } catch(e){} }, []);
    const playXiangqiIllegalSound = useCallback(() => { try { const a = new window.Audio('/xiangqi_audio/illegal.wav'); a.volume = 0.7; a.play().catch(()=>{}); } catch(e){} }, []);
    const playXiangqiWinSound = useCallback(() => { try { const a = new window.Audio('/xiangqi_audio/win.wav'); a.volume = 0.8; a.play().catch(()=>{}); } catch(e){} }, []);
    const playXiangqiLossSound = useCallback(() => { try { const a = new window.Audio('/xiangqi_audio/loss.wav'); a.volume = 0.8; a.play().catch(()=>{}); } catch(e){} }, []);

    return { 
        playWinSound, playLoseSound, playClearLineSound, 
        playChessMoveSound, playChessCaptureSound, playChessCheckSound,
        playTetrisMoveSound, playTetrisRotateSound, playTetrisDropSound,
        playPacmanStartSound, playPacmanWakaSound, playPacmanPowerPillSound, playPacmanEatGhostSound, playPacmanDieSound,
        playJungleMoveSound, playJungleCaptureSound, playJungleJumpSound, playJungleSelectSound, playJungleWinSound, playJungleLoseSound,
        playXiangqiClickSound, playXiangqiMoveSound, playXiangqiCaptureSound, playXiangqiCheckSound, playXiangqiIllegalSound, playXiangqiWinSound, playXiangqiLossSound
    };
};

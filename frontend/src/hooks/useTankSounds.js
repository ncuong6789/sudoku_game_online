import { useEffect, useRef } from 'react';

const SOUNDS = {
    START: 'https://rpg.hamsterrepublic.com/ohrrpgce/battle-city-start.mp3', // Placeholder, using common retro links
    FIRE: 'https://actions.google.com/sounds/v1/weapons/fire_power_shot.ogg', // Realistic fallback
    EXPLOSION: 'https://actions.google.com/sounds/v1/weapons/large_explosion.ogg',
    GAME_OVER: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg'
};

export function useTankSounds() {
    const audioContext = useRef(null);
    const soundBuffers = useRef({});

    useEffect(() => {
        audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
        
        const loadSound = async (name, url) => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
                soundBuffers.current[name] = audioBuffer;
            } catch (e) {
                console.error(`Failed to load sound: ${name}`, e);
            }
        };

        // Preload sounds
        Object.entries(SOUNDS).forEach(([name, url]) => loadSound(name, url));

        return () => {
            if (audioContext.current) audioContext.current.close();
        };
    }, []);

    const playSound = (name) => {
        if (!audioContext.current || !soundBuffers.current[name]) return;
        
        const source = audioContext.current.createBufferSource();
        source.buffer = soundBuffers.current[name];
        source.connect(audioContext.current.destination);
        source.start(0);
    };

    return { playSound };
}

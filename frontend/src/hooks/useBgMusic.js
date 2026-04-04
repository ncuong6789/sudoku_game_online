import { useEffect, useRef, useState } from 'react';

/**
 * useBgMusic - Hook dùng chung để phát nhạc nền cho các game.
 * @param {string} src - Đường dẫn tới file nhạc (trong /public)
 * @param {boolean} active - Có đang chơi hay không (để pause khi game over)
 * @param {number} volume - Âm lượng (0 - 1), mặc định 0.25
 */
export function useBgMusic(src, active = true, volume = 0.25) {
    const audioRef = useRef(null);
    const [muted, setMuted] = useState(false);

    useEffect(() => {
        if (!src) return;
        const audio = new Audio(src);
        audio.loop = true;
        audio.volume = muted ? 0 : volume;
        audioRef.current = audio;

        // Browsers block autoplay — play on first user interaction
        const tryPlay = () => {
            if (active && !muted) audio.play().catch(() => {});
        };
        document.addEventListener('click', tryPlay, { once: true });
        document.addEventListener('keydown', tryPlay, { once: true });

        if (active && !muted) {
            audio.play().catch(() => {
                // Autoplay blocked — will be tried on next interaction
            });
        }

        return () => {
            audio.pause();
            audio.src = '';
            document.removeEventListener('click', tryPlay);
            document.removeEventListener('keydown', tryPlay);
        };
    // eslint-disable-next-line
    }, [src]);

    // Pause/resume when active changes
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (active && !muted) {
            audio.play().catch(() => {});
        } else {
            audio.pause();
        }
    }, [active, muted]);

    // Sync volume/mute
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = muted ? 0 : volume;
    }, [muted, volume]);

    const toggleMute = () => setMuted(m => !m);

    return { muted, toggleMute };
}

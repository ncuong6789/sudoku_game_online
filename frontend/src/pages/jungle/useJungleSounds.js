import { useCallback } from 'react';
import { useAudio } from '../../utils/useAudio';

export const useJungleSounds = () => {
    const { 
        playJungleMoveSound, 
        playJungleCaptureSound, 
        playJungleJumpSound, 
        playJungleSelectSound,
        playJungleWinSound,
        playJungleLoseSound
    } = useAudio();

    const playSelect = useCallback(() => {
        playJungleSelectSound();
    }, [playJungleSelectSound]);

    const playMove = useCallback((isJump) => {
        if (isJump) {
            playJungleJumpSound();
        } else {
            playJungleMoveSound();
        }
    }, [playJungleMoveSound, playJungleJumpSound]);

    const playCapture = useCallback((capturedPieceType, attackerType) => {
        playJungleCaptureSound(capturedPieceType, attackerType);
    }, [playJungleCaptureSound]);

    const playWin = useCallback(() => {
        playJungleWinSound();
    }, [playJungleWinSound]);

    const playLose = useCallback(() => {
        playJungleLoseSound();
    }, [playJungleLoseSound]);

    return { playSelect, playMove, playCapture, playWin, playLose };
};

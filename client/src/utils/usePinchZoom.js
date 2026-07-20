import { useCallback, useEffect, useRef } from 'react';

const getTouchDistance = (touches) => {
    if (!touches || touches.length < 2) {
        return 0;
    }

    return Math.hypot(
        touches[1].clientX - touches[0].clientX,
        touches[1].clientY - touches[0].clientY
    );
};

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const usePinchZoom = ({ active, zoom, setZoom, minimum = 0.5, maximum = 4 }) => {
    const stageRef = useRef(null);
    const pinchRef = useRef({ distance: 0, zoom: 1 });

    const handleTouchStart = useCallback((event) => {
        if (event.touches.length !== 2) {
            return;
        }

        if (event.cancelable) {
            event.preventDefault();
        }
        event.stopPropagation();
        pinchRef.current = {
            distance: getTouchDistance(event.touches),
            zoom
        };
    }, [zoom]);

    const handleTouchMove = useCallback((event) => {
        if (event.touches.length !== 2 || !pinchRef.current.distance) {
            return;
        }

        if (event.cancelable) {
            event.preventDefault();
        }
        event.stopPropagation();

        const nextDistance = getTouchDistance(event.touches);
        const nextZoom = pinchRef.current.zoom * (nextDistance / pinchRef.current.distance);
        setZoom(clamp(nextZoom, minimum, maximum));
    }, [maximum, minimum, setZoom]);

    const handleTouchEnd = useCallback((event) => {
        if (event.touches.length < 2) {
            pinchRef.current.distance = 0;
        }
    }, []);

    useEffect(() => {
        const stage = stageRef.current;
        if (!active || !stage) {
            return undefined;
        }

        const preventNativeGesture = (event) => {
            if (event.cancelable) {
                event.preventDefault();
            }
        };

        stage.addEventListener('gesturestart', preventNativeGesture, { passive: false });
        stage.addEventListener('gesturechange', preventNativeGesture, { passive: false });
        stage.addEventListener('gestureend', preventNativeGesture, { passive: false });

        return () => {
            stage.removeEventListener('gesturestart', preventNativeGesture);
            stage.removeEventListener('gesturechange', preventNativeGesture);
            stage.removeEventListener('gestureend', preventNativeGesture);
        };
    }, [active]);

    return {
        stageRef,
        touchHandlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
            onTouchCancel: handleTouchEnd
        }
    };
};

export default usePinchZoom;

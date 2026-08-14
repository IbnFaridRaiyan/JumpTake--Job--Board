import { useLayoutEffect, useRef } from 'react';

const readDocumentScrollTop = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
    return Number(
        window.scrollY
        || document.scrollingElement?.scrollTop
        || document.documentElement?.scrollTop
        || document.body?.scrollTop
        || 0
    );
};

const writeDocumentScrollTop = (scrollTop) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const nextScrollTop = Math.max(0, Number(scrollTop) || 0);
    const scrollingElement = document.scrollingElement;

    if (scrollingElement) scrollingElement.scrollTop = nextScrollTop;
    document.documentElement.scrollTop = nextScrollTop;
    document.body.scrollTop = nextScrollTop;
    try {
        window.scrollTo({ top: nextScrollTop, left: 0, behavior: 'auto' });
    } catch (error) {
        // Direct scrollTop assignments above cover non-browser test environments.
    }
};

const usePortalSectionScrollIsolation = (activeSection, panelRef) => {
    const sectionPositionsRef = useRef(new Map());
    const restoreFramesRef = useRef([]);

    useLayoutEffect(() => {
        if (typeof window === 'undefined' || !activeSection) return undefined;

        const clearRestoreFrames = () => {
            restoreFramesRef.current.forEach((frameId) => window.cancelAnimationFrame(frameId));
            restoreFramesRef.current = [];
        };
        const saveSectionPosition = () => {
            sectionPositionsRef.current.set(activeSection, {
                documentTop: readDocumentScrollTop(),
                panelTop: Number(panelRef?.current?.scrollTop || 0)
            });
        };
        const restorePosition = sectionPositionsRef.current.get(activeSection) || {
            documentTop: 0,
            panelTop: 0
        };
        const applyPosition = () => {
            if (panelRef?.current) {
                panelRef.current.scrollTop = Math.max(0, restorePosition.panelTop || 0);
            }
            writeDocumentScrollTop(restorePosition.documentTop);
        };

        clearRestoreFrames();
        applyPosition();
        const firstFrame = window.requestAnimationFrame(() => {
            const secondFrame = window.requestAnimationFrame(applyPosition);
            restoreFramesRef.current = [secondFrame];
        });
        restoreFramesRef.current = [firstFrame];
        window.addEventListener('pagehide', saveSectionPosition);

        return () => {
            saveSectionPosition();
            clearRestoreFrames();
            window.removeEventListener('pagehide', saveSectionPosition);
        };
    }, [activeSection, panelRef]);
};

export default usePortalSectionScrollIsolation;

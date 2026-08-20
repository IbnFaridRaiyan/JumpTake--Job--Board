import { useEffect, useLayoutEffect, useRef } from 'react';

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
    const activeSectionRef = useRef(activeSection);
    const restoringRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const panel = panelRef?.current;
        const saveActiveSectionPosition = () => {
            const section = activeSectionRef.current;
            if (!section || restoringRef.current) return;
            sectionPositionsRef.current.set(section, {
                documentTop: readDocumentScrollTop(),
                panelTop: Number(panel?.scrollTop || 0)
            });
        };

        panel?.addEventListener('scroll', saveActiveSectionPosition, { passive: true, capture: true });
        window.addEventListener('scroll', saveActiveSectionPosition, { passive: true });
        window.addEventListener('pagehide', saveActiveSectionPosition);

        return () => {
            saveActiveSectionPosition();
            panel?.removeEventListener('scroll', saveActiveSectionPosition, true);
            window.removeEventListener('scroll', saveActiveSectionPosition);
            window.removeEventListener('pagehide', saveActiveSectionPosition);
        };
    }, [panelRef]);

    useLayoutEffect(() => {
        if (typeof window === 'undefined' || !activeSection) return undefined;

        const clearRestoreFrames = () => {
            restoreFramesRef.current.forEach((frameId) => window.cancelAnimationFrame(frameId));
            restoreFramesRef.current = [];
        };
        activeSectionRef.current = activeSection;
        restoringRef.current = true;
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
            applyPosition();
            const secondFrame = window.requestAnimationFrame(() => {
                applyPosition();
                restoringRef.current = false;
            });
            restoreFramesRef.current = [secondFrame];
        });
        restoreFramesRef.current = [firstFrame];

        return () => {
            clearRestoreFrames();
        };
    }, [activeSection, panelRef]);
};

export default usePortalSectionScrollIsolation;

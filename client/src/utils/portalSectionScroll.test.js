import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import usePortalSectionScrollIsolation from './portalSectionScroll';

const ScrollPanel = ({ section }) => {
    const panelRef = useRef(null);
    usePortalSectionScrollIsolation(section, panelRef);
    return <div ref={panelRef} data-testid="section-panel" />;
};

describe('usePortalSectionScrollIsolation', () => {
    let container;
    let animationFrameId;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        animationFrameId = 0;
        window.requestAnimationFrame = (callback) => {
            callback();
            animationFrameId += 1;
            return animationFrameId;
        };
        window.cancelAnimationFrame = jest.fn();
        window.scrollTo = jest.fn();
    });

    afterEach(() => {
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        container.remove();
    });

    it('keeps a separate scroll position for every portal section', () => {
        const renderSection = (section) => {
            act(() => {
                ReactDOM.render(<ScrollPanel section={section} />, container);
            });
            return container.querySelector('[data-testid="section-panel"]');
        };

        const panel = renderSection('talent-stories');
        act(() => {
            panel.scrollTop = 420;
            panel.dispatchEvent(new Event('scroll', { bubbles: true }));
        });

        renderSection('work-news');
        expect(panel.scrollTop).toBe(0);
        act(() => {
            panel.scrollTop = 165;
            panel.dispatchEvent(new Event('scroll', { bubbles: true }));
        });

        renderSection('my-feed');
        expect(panel.scrollTop).toBe(0);
        act(() => {
            panel.scrollTop = 72;
            panel.dispatchEvent(new Event('scroll', { bubbles: true }));
        });

        renderSection('talent-stories');
        expect(panel.scrollTop).toBe(420);
        renderSection('work-news');
        expect(panel.scrollTop).toBe(165);
        renderSection('my-feed');
        expect(panel.scrollTop).toBe(72);
        renderSection('tailor-profile');
        expect(panel.scrollTop).toBe(0);
    });
});

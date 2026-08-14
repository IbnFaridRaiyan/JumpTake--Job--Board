import { installMobileInteractionFeedback } from './mobileHaptics';

describe('mobile chat keyboard viewport handling', () => {
  let originalInnerHeight;
  let originalMatchMedia;
  let originalVisualViewport;

  beforeEach(() => {
    originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    originalMatchMedia = window.matchMedia;
    originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.body.classList.remove('jt-mobile-keyboard-open');
    document.documentElement.classList.remove('jt-mobile-keyboard-open');
    if (originalInnerHeight) Object.defineProperty(window, 'innerHeight', originalInnerHeight);
    window.matchMedia = originalMatchMedia;
    if (originalVisualViewport) {
      Object.defineProperty(window, 'visualViewport', originalVisualViewport);
    } else {
      delete window.visualViewport;
    }
  });

  it('keeps the layout height stable and exposes only the keyboard inset', () => {
    const viewportListeners = {};
    const visualViewport = {
      height: 844,
      offsetTop: 0,
      addEventListener: jest.fn((type, listener) => {
        viewportListeners[type] = listener;
      }),
      removeEventListener: jest.fn()
    };

    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: visualViewport });
    window.matchMedia = jest.fn(() => ({ matches: true }));

    document.body.innerHTML = '<div class="floating-messenger is-open"><textarea aria-label="Chat reply"></textarea></div>';
    const cleanup = installMobileInteractionFeedback();
    const input = document.querySelector('textarea');

    input.focus();
    visualViewport.height = 524;
    visualViewport.offsetTop = 36;
    viewportListeners.resize();

    expect(document.body.classList.contains('jt-mobile-keyboard-open')).toBe(true);
    expect(document.documentElement.classList.contains('jt-mobile-keyboard-open')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--jt-mobile-layout-height')).toBe('844px');
    expect(document.documentElement.style.getPropertyValue('--jt-mobile-keyboard-inset')).toBe('320px');
    expect(document.documentElement.style.getPropertyValue('--jt-mobile-viewport-offset-top')).toBe('36px');

    input.blur();
    expect(document.body.classList.contains('jt-mobile-keyboard-open')).toBe(true);

    visualViewport.height = 844;
    visualViewport.offsetTop = 0;
    viewportListeners.resize();

    expect(document.body.classList.contains('jt-mobile-keyboard-open')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--jt-mobile-keyboard-inset')).toBe('0px');
    cleanup();
  });
});

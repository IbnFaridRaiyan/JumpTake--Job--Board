import { installMobileModalScrollLock } from './mobileModalScrollLock';

describe('mobile modal scroll lock', () => {
  let originalMatchMedia;
  let originalRequestAnimationFrame;
  let originalCancelAnimationFrame;
  let originalScrollTo;
  let originalScrollX;
  let originalScrollY;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;
    originalScrollTo = window.scrollTo;
    originalScrollX = Object.getOwnPropertyDescriptor(window, 'scrollX');
    originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
    window.matchMedia = jest.fn(() => ({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }));
    window.requestAnimationFrame = (callback) => {
      callback();
      return 1;
    };
    window.cancelAnimationFrame = jest.fn();
    window.scrollTo = jest.fn();
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 12 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 480 });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.body.classList.remove('jt-mobile-modal-open');
    document.documentElement.classList.remove('jt-mobile-modal-open');
    document.documentElement.style.removeProperty('--jt-mobile-modal-scroll-x');
    document.documentElement.style.removeProperty('--jt-mobile-modal-scroll-y');
    window.matchMedia = originalMatchMedia;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    window.scrollTo = originalScrollTo;
    if (originalScrollX) Object.defineProperty(window, 'scrollX', originalScrollX);
    if (originalScrollY) Object.defineProperty(window, 'scrollY', originalScrollY);
  });

  it('freezes the page beneath a mobile modal and restores it after closing', async () => {
    document.body.innerHTML = `
      <main style="width: 320px; height: 1200px">Page</main>
      <div class="portal-profile-detail-backdrop" style="position: fixed; inset: 0">
        <article role="dialog" aria-modal="true" style="width: 280px; height: 500px">Profile</article>
      </div>
    `;
    document.querySelector('.portal-profile-detail-backdrop').getBoundingClientRect = () => ({
      width: 320,
      height: 844
    });
    document.querySelector('[role="dialog"]').getBoundingClientRect = () => ({
      width: 280,
      height: 500
    });

    const cleanup = installMobileModalScrollLock();

    expect(document.documentElement.classList.contains('jt-mobile-modal-open')).toBe(true);
    expect(document.body.classList.contains('jt-mobile-modal-open')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--jt-mobile-modal-scroll-y')).toBe('-480px');

    const backdropMove = new Event('touchmove', { bubbles: true, cancelable: true });
    document.querySelector('.portal-profile-detail-backdrop').dispatchEvent(backdropMove);
    expect(backdropMove.defaultPrevented).toBe(true);

    const dialogMove = new Event('touchmove', { bubbles: true, cancelable: true });
    document.querySelector('[role="dialog"]').dispatchEvent(dialogMove);
    expect(dialogMove.defaultPrevented).toBe(false);

    document.querySelector('.portal-profile-detail-backdrop').remove();
    await Promise.resolve();
    await Promise.resolve();

    expect(document.documentElement.classList.contains('jt-mobile-modal-open')).toBe(false);
    expect(window.scrollTo).toHaveBeenCalledWith(12, 480);
    cleanup();
  });
});

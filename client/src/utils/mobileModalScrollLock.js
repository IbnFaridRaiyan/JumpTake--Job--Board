const MOBILE_MODAL_TRIGGER_SELECTOR = [
  '[aria-modal="true"]',
  '.floating-messenger.is-open',
  '.modal-overlay',
  '.terms-modal-overlay',
  '.job-preview-overlay',
  '.application-workspace-overlay',
  '.guided-portal-tour',
  '.resume-playground-editor-mobile-overlay',
  '.jt-ai-editor-overlay',
  '[class*="-backdrop"]'
].join(',');

const MOBILE_MODAL_SURFACE_SELECTOR = [
  '[aria-modal="true"]',
  '.floating-messenger-panel',
  '.login-modal',
  '.register-modal',
  '.job-interest-modal',
  '.job-preview-modal',
  '.application-workspace-modal',
  '.message-company-profile-modal',
  '.terms-modal'
].join(',');

const isVisibleModal = (element) => {
  if (!element || element.hidden) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const hasVisibleMobileModal = () => Array.from(
  document.querySelectorAll(MOBILE_MODAL_TRIGGER_SELECTOR)
).some(isVisibleModal);

export const installMobileModalScrollLock = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {};

  const mobileQuery = window.matchMedia('(max-width: 768px)');
  let locked = false;
  let scrollX = 0;
  let scrollY = 0;
  let syncQueued = false;
  let syncFrame = 0;

  const lock = () => {
    if (locked) return;
    scrollX = window.scrollX;
    scrollY = window.scrollY;
    document.documentElement.style.setProperty('--jt-mobile-modal-scroll-x', `${-scrollX}px`);
    document.documentElement.style.setProperty('--jt-mobile-modal-scroll-y', `${-scrollY}px`);
    document.documentElement.classList.add('jt-mobile-modal-open');
    document.body.classList.add('jt-mobile-modal-open');
    locked = true;
  };

  const unlock = () => {
    if (!locked) return;
    document.documentElement.classList.remove('jt-mobile-modal-open');
    document.body.classList.remove('jt-mobile-modal-open');
    document.documentElement.style.removeProperty('--jt-mobile-modal-scroll-x');
    document.documentElement.style.removeProperty('--jt-mobile-modal-scroll-y');
    locked = false;
    window.scrollTo(scrollX, scrollY);
  };

  const sync = () => {
    syncQueued = false;
    syncFrame = 0;
    if (mobileQuery.matches && hasVisibleMobileModal()) lock();
    else unlock();
  };

  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    syncFrame = window.requestAnimationFrame(sync);
  };

  const preventBackdropScroll = (event) => {
    if (locked && !event.target?.closest?.(MOBILE_MODAL_SURFACE_SELECTOR)) {
      event.preventDefault();
    }
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-hidden', 'aria-modal', 'class', 'hidden', 'open', 'style']
  });
  mobileQuery.addEventListener?.('change', queueSync);
  document.addEventListener('touchmove', preventBackdropScroll, { passive: false, capture: true });
  sync();

  return () => {
    observer.disconnect();
    if (syncFrame) window.cancelAnimationFrame(syncFrame);
    mobileQuery.removeEventListener?.('change', queueSync);
    document.removeEventListener('touchmove', preventBackdropScroll, true);
    unlock();
  };
};

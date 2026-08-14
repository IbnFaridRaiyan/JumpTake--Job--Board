const INTERACTIVE_SELECTOR = [
  '.portal-reaction-button', '.portal-reaction-toggle', '.portal-reaction-icon-button',
  '.portal-comment-toggle', '.portal-comment-button', '.portal-comment-submit-button',
  '.portal-share-toggle', '.portal-share-copy-button', '.job-card-like-button',
  '.jt-job-action-button', '.jt-job-review-button', '.portal-public-menu-toggle',
  '.portal-public-nav-link', '.portal-profile-detail-close', '.portal-comment-modal-close',
  '.jt-modal-close', '.login-modal-close', '.terms-modal-close',
  '[aria-label*="reaction" i]', '[aria-label*="comment" i]', '[aria-label*="share" i]',
  '[aria-label*="close" i]', '[aria-label*="open" i]'
].join(',');

const STRONG_SELECTOR = [
  '.portal-reaction-button', '.portal-reaction-toggle', '.job-card-like-button',
  '.portal-comment-submit-button', '.portal-public-menu-toggle'
].join(',');

export const triggerMobileHaptic = (pattern = 10) => {
  if (typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches) return;
  if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
};

export const installMobileInteractionFeedback = () => {
  if (typeof document === 'undefined') return () => {};

  const visualViewport = window.visualViewport;
  let stableViewportHeight = Math.max(window.innerHeight, visualViewport?.height || 0);
  const syncMobileViewport = () => {
    if (!visualViewport) return;
    const visibleHeight = Math.round(visualViewport.height || window.innerHeight);
    const visibleBottom = Math.round(visibleHeight + (visualViewport.offsetTop || 0));
    const focusedElement = document.activeElement;
    const editing = Boolean(focusedElement?.matches?.('input, textarea, [contenteditable="true"]'));
    if (!editing) {
      stableViewportHeight = Math.max(window.innerHeight, visibleBottom);
    } else {
      stableViewportHeight = Math.max(stableViewportHeight, window.innerHeight);
    }
    const keyboardInset = Math.max(0, stableViewportHeight - visibleBottom);
    const keyboardOpen = editing && keyboardInset > 120;
    document.documentElement.style.setProperty('--jt-mobile-visible-height', `${visibleHeight}px`);
    document.documentElement.style.setProperty('--jt-mobile-layout-height', `${stableViewportHeight}px`);
    document.documentElement.style.setProperty('--jt-mobile-keyboard-inset', `${keyboardOpen ? keyboardInset : 0}px`);
    document.body.classList.toggle('jt-mobile-keyboard-open', keyboardOpen);
  };

  const handleClick = (event) => {
    const target = event.target?.closest?.(INTERACTIVE_SELECTOR);
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;

    triggerMobileHaptic(target.matches(STRONG_SELECTOR) ? 14 : 8);
    target.classList.remove('jt-mobile-feedback-pulse');
    // Restart the animation even when the same control is tapped repeatedly.
    void target.offsetWidth;
    target.classList.add('jt-mobile-feedback-pulse');
    window.setTimeout(() => target.classList.remove('jt-mobile-feedback-pulse'), 260);
  };

  document.addEventListener('click', handleClick, true);
  document.addEventListener('focusin', syncMobileViewport, true);
  document.addEventListener('focusout', syncMobileViewport, true);
  syncMobileViewport();
  visualViewport?.addEventListener('resize', syncMobileViewport);
  visualViewport?.addEventListener('scroll', syncMobileViewport);

  return () => {
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('focusin', syncMobileViewport, true);
    document.removeEventListener('focusout', syncMobileViewport, true);
    visualViewport?.removeEventListener('resize', syncMobileViewport);
    visualViewport?.removeEventListener('scroll', syncMobileViewport);
    document.documentElement.style.removeProperty('--jt-mobile-visible-height');
    document.documentElement.style.removeProperty('--jt-mobile-layout-height');
    document.documentElement.style.removeProperty('--jt-mobile-keyboard-inset');
    document.body.classList.remove('jt-mobile-keyboard-open');
  };
};

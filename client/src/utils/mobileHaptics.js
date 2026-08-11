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
  const syncMobileViewport = () => {
    if (!visualViewport) return;
    const visibleHeight = Math.round(visualViewport.height || window.innerHeight);
    const keyboardOpen = window.innerHeight - visibleHeight > 120;
    document.documentElement.style.setProperty('--jt-mobile-visible-height', `${visibleHeight}px`);
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
  syncMobileViewport();
  visualViewport?.addEventListener('resize', syncMobileViewport);
  visualViewport?.addEventListener('scroll', syncMobileViewport);

  return () => {
    document.removeEventListener('click', handleClick, true);
    visualViewport?.removeEventListener('resize', syncMobileViewport);
    visualViewport?.removeEventListener('scroll', syncMobileViewport);
    document.documentElement.style.removeProperty('--jt-mobile-visible-height');
    document.body.classList.remove('jt-mobile-keyboard-open');
  };
};

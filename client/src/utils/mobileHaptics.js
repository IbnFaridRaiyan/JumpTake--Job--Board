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

const MOBILE_CHAT_EDITOR_SELECTOR = 'input, textarea, [contenteditable="true"]';
const MOBILE_CHAT_SURFACE_SELECTOR = [
  '.floating-messenger.is-open',
  '.messenger-inbox',
  '.portal-widget-chat',
  '.portal-widget-assistant-chat'
].join(',');

export const triggerMobileHaptic = (pattern = 10) => {
  if (typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches) return;
  if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
};

export const installMobileInteractionFeedback = () => {
  if (typeof document === 'undefined') return () => {};

  const visualViewport = window.visualViewport;
  const virtualKeyboard = navigator.virtualKeyboard;
  const previousKeyboardOverlay = virtualKeyboard?.overlaysContent;
  let stableViewportHeight = Math.max(window.innerHeight, visualViewport?.height || 0);
  let chatKeyboardSession = false;
  let focusOutTimer = null;

  if (virtualKeyboard) {
    try {
      virtualKeyboard.overlaysContent = true;
    } catch (error) {
      // Browsers without writable VirtualKeyboard settings use visualViewport below.
    }
  }

  const syncMobileViewport = () => {
    const visibleHeight = Math.round(visualViewport?.height || window.innerHeight);
    const viewportOffsetTop = Math.max(0, Math.round(visualViewport?.offsetTop || 0));
    const visibleBottom = visibleHeight + viewportOffsetTop;
    const focusedElement = document.activeElement;
    const editingChat = Boolean(
      window.matchMedia('(max-width: 768px)').matches
      && focusedElement?.matches?.(MOBILE_CHAT_EDITOR_SELECTOR)
      && focusedElement.closest?.(MOBILE_CHAT_SURFACE_SELECTOR)
    );

    if (editingChat) {
      chatKeyboardSession = true;
      stableViewportHeight = Math.max(stableViewportHeight, window.innerHeight);
    }

    const visualKeyboardInset = Math.max(0, stableViewportHeight - visibleHeight);
    const overlayKeyboardInset = Math.max(0, Math.round(virtualKeyboard?.boundingRect?.height || 0));
    const keyboardInset = Math.max(visualKeyboardInset, overlayKeyboardInset);
    const viewportObscured = keyboardInset > 120;
    const keyboardOpen = chatKeyboardSession && viewportObscured;

    if (!viewportObscured && !editingChat) {
      chatKeyboardSession = false;
      stableViewportHeight = Math.max(window.innerHeight, visibleBottom);
    }

    document.documentElement.style.setProperty('--jt-mobile-visible-height', `${visibleHeight}px`);
    document.documentElement.style.setProperty('--jt-mobile-layout-height', `${stableViewportHeight}px`);
    document.documentElement.style.setProperty('--jt-mobile-keyboard-inset', `${keyboardOpen ? keyboardInset : 0}px`);
    document.documentElement.style.setProperty('--jt-mobile-viewport-offset-top', `${keyboardOpen ? viewportOffsetTop : 0}px`);
    document.documentElement.classList.toggle('jt-mobile-keyboard-open', keyboardOpen);
    document.body.classList.toggle('jt-mobile-keyboard-open', keyboardOpen);
  };

  const handleFocusOut = () => {
    syncMobileViewport();
    window.clearTimeout(focusOutTimer);
    focusOutTimer = window.setTimeout(syncMobileViewport, 320);
  };

  const handleOrientationChange = () => {
    chatKeyboardSession = false;
    stableViewportHeight = Math.max(window.innerHeight, visualViewport?.height || 0);
    syncMobileViewport();
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
  document.addEventListener('focusout', handleFocusOut, true);
  syncMobileViewport();
  window.addEventListener('resize', syncMobileViewport);
  window.addEventListener('orientationchange', handleOrientationChange);
  visualViewport?.addEventListener('resize', syncMobileViewport);
  visualViewport?.addEventListener('scroll', syncMobileViewport);
  virtualKeyboard?.addEventListener?.('geometrychange', syncMobileViewport);

  return () => {
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('focusin', syncMobileViewport, true);
    document.removeEventListener('focusout', handleFocusOut, true);
    window.removeEventListener('resize', syncMobileViewport);
    window.removeEventListener('orientationchange', handleOrientationChange);
    visualViewport?.removeEventListener('resize', syncMobileViewport);
    visualViewport?.removeEventListener('scroll', syncMobileViewport);
    virtualKeyboard?.removeEventListener?.('geometrychange', syncMobileViewport);
    window.clearTimeout(focusOutTimer);
    document.documentElement.style.removeProperty('--jt-mobile-visible-height');
    document.documentElement.style.removeProperty('--jt-mobile-layout-height');
    document.documentElement.style.removeProperty('--jt-mobile-keyboard-inset');
    document.documentElement.style.removeProperty('--jt-mobile-viewport-offset-top');
    document.documentElement.classList.remove('jt-mobile-keyboard-open');
    document.body.classList.remove('jt-mobile-keyboard-open');
    if (virtualKeyboard && typeof previousKeyboardOverlay === 'boolean') {
      try {
        virtualKeyboard.overlaysContent = previousKeyboardOverlay;
      } catch (error) {
        // No cleanup is required when the browser owns this setting.
      }
    }
  };
};

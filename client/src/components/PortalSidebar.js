import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import portalLogoDark from './media/logo4.png';
import portalLogoLight from './media/jumptake-logo-9.png';

const ICON_PATHS = {
    home: 'M12 2.5 2 11v10h7v-6h6v6h7V11L12 2.5Zm0 2.63 8 6.8V19h-3v-6H7v6H4v-7.07l8-6.8Z',
    dashboard: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
    briefcase: 'M10 6V5a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5Zm2 0h4V5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1Z',
    inbox: 'M4 4h16l3 7v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-7l3-7Zm1.35 2-1.7 4H8a1 1 0 0 1 .92.6 3.37 3.37 0 0 0 6.16 0A1 1 0 0 1 16 10h4.35l-1.7-4H5.35Z',
    bell: 'M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6v-5a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2Z',
    star: 'm12 2 3.1 6.28 6.9 1-5 4.87 1.18 6.87L12 17.77l-6.18 3.25L7 14.15 2 9.28l6.9-1L12 2Z',
    draft: 'M10.646.646a.5.5 0 0 1 .708 0l4 4a.5.5 0 0 1 0 .708l-1.902 1.902-.829 3.313a1.5 1.5 0 0 1-1.024 1.073L1.254 14.746 4.358 4.4A1.5 1.5 0 0 1 5.43 3.377l3.313-.828z',
    users: 'M16 11a4 4 0 1 0-3.46-6A4 4 0 1 0 8 11a6 6 0 0 0-6 6v2h12v-2a5.98 5.98 0 0 0-1.08-3.44A5 5 0 0 1 20 18v1h2v-1a7 7 0 0 0-6-7Z',
    'user-plus': 'M15 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h10.1A6.9 6.9 0 0 1 17 19c0-1.85.72-3.54 1.9-4.8A11.7 11.7 0 0 0 15 14Zm6-3V8h-2v3h-3v2h3v3h2v-3h3v-2h-3Z',
    'user-face': 'M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 12c-5.05 0-9 2.52-9 5.75V22h18v-2.25C21 16.52 17.05 14 12 14Z',
    chart: 'M4 19h16v2H2V3h2v16Zm3-2V9h3v8H7Zm5 0V5h3v12h-3Zm5 0v-6h3v6h-3Z',
    settings: 'M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.11-1.65-2-3.46-2.49 1a7.28 7.28 0 0 0-1.69-.98L15 3h-4l-.36 2.93c-.6.23-1.17.56-1.69.98l-2.49-1-2 3.46 2.11 1.65c-.04.32-.07.65-.07.98s.02.66.07.98l-2.11 1.65 2 3.46 2.49-1c.52.4 1.09.73 1.69.98L11 21h4l.36-2.93c.6-.25 1.17-.58 1.69-.98l2.49 1 2-3.46-2.11-1.65ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z',
    info: 'M11 10h2v7h-2v-7Zm0-3h2v2h-2V7Zm1-5a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
    logout: 'M10 17v-3H3v-4h7V7l5 5-5 5Zm2-15h8v20h-8v-2h6V4h-6V2Z',
    assessment: 'M5 3h14v18H5V3Zm2 2v14h10V5H7Zm2 2h6v2H9V7Zm0 4h6v2H9v-2Zm0 4h4v2H9v-2Z',
    profile: 'M4 4h16v16H4V4Zm2 2v12h12V6H6Zm2 2h8v2H8V8Zm0 3h8v2H8v-2Zm0 3h5v2H8v-2Z',
    block: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM4 12a8 8 0 0 1 12.9-6.3L5.7 16.9A7.96 7.96 0 0 1 4 12Zm8 8a7.96 7.96 0 0 1-4.9-1.7L18.3 7.1A8 8 0 0 1 12 20Z',
    sun: 'M12 4V1h2v3h-2Zm0 19v-3h2v3h-2ZM4 13H1v-2h3v2Zm19 0h-3v-2h3v2ZM13 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
    moon: 'M20.7 15.1A8.3 8.3 0 0 1 8.9 3.3 9 9 0 1 0 20.7 15.1Z',
    search: 'M10.5 3a7.5 7.5 0 1 0 4.68 13.36L20.82 22 22 20.82l-5.64-5.64A7.5 7.5 0 0 0 10.5 3Zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z',
    pricing: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 4v1.1c1.7.3 3 1.3 3 2.9h-2c0-.7-.8-1.2-2-1.2s-2 .5-2 1.2c0 .8.8 1.1 2.4 1.5 2 .5 3.8 1.3 3.8 3.5 0 1.7-1.3 2.8-3.2 3.1V19h-2v-.9c-2-.3-3.4-1.5-3.4-3.1h2c0 .8.9 1.4 2.4 1.4 1.3 0 2.2-.5 2.2-1.3 0-.8-.8-1.2-2.5-1.6C9.8 13 8 12.2 8 10c0-1.6 1.2-2.7 3-3V6h2Z'
};

const PortalIcon = ({ name = 'dashboard' }) => (
    <svg width="18" height="18" viewBox={name === 'draft' ? '0 0 16 16' : '0 0 24 24'} aria-hidden="true">
        <path d={ICON_PATHS[name] || ICON_PATHS.dashboard} />
    </svg>
);

const PortalThemeIcon = ({ mode }) => (
    <svg className="portal-public-theme-icon" viewBox="0 0 24 24" aria-hidden="true">
        {mode === 'dark' ? (
            <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
            </>
        ) : (
            <path d="M20.3 15.2A8.5 8.5 0 0 1 8.8 3.7 8.5 8.5 0 1 0 20.3 15.2Z" />
        )}
    </svg>
);

const PortalSidebar = ({
    primaryItems = [],
    secondaryItems = [],
    onLogout,
    appMode = 'dark',
    onAppModeChange,
    onSearch,
    onSettings
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuClosing, setMenuClosing] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [pageQuery, setPageQuery] = useState('');
    const [headerSearchQuery, setHeaderSearchQuery] = useState('');
    const [portalTarget, setPortalTarget] = useState(null);
    const closeTimerRef = useRef(null);

    const closePortalMenu = useCallback(() => {
        if (!menuOpen || menuClosing) return;
        setMenuClosing(true);
        // The menu can animate away while the canvas returns to focus immediately.
        // Keeping this class until the timeout leaves the page blur visible too long.
        document.documentElement.classList.remove('portal-menu-scroll-locked');
        document.body.classList.remove('portal-menu-scroll-locked');
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = window.setTimeout(() => {
            setMenuOpen(false);
            setMenuClosing(false);
        }, 180);
    }, [menuOpen, menuClosing]);

    useEffect(() => {
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') closePortalMenu();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [closePortalMenu]);

    useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

    useEffect(() => {
        setPortalTarget(document.querySelector('#root > .app-container'));
    }, []);

    useEffect(() => {
        if (!menuOpen || typeof document === 'undefined') {
            return undefined;
        }

        // The desktop menu is a navbar popover, so it must not freeze or
        // reposition the document (removing the scrollbar shifted the header).
        if (window.matchMedia('(min-width: 769px)').matches) {
            return undefined;
        }

        const html = document.documentElement;
        const body = document.body;
        const scrollY = window.scrollY;
        const previousHtmlOverflow = html.style.overflow;
        const previousBodyOverflow = body.style.overflow;
        const previousBodyPosition = body.style.position;
        const previousBodyTop = body.style.top;
        const previousBodyWidth = body.style.width;
        html.classList.add('portal-menu-scroll-locked');
        body.classList.add('portal-menu-scroll-locked');
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.width = '100%';

        const stopBackgroundScroll = (event) => {
            if (event.target instanceof Element && event.target.closest('#portal-public-menu')) return;
            event.preventDefault();
        };
        document.addEventListener('touchmove', stopBackgroundScroll, { passive: false, capture: true });
        document.addEventListener('wheel', stopBackgroundScroll, { passive: false, capture: true });

        return () => {
            document.removeEventListener('touchmove', stopBackgroundScroll, { capture: true });
            document.removeEventListener('wheel', stopBackgroundScroll, { capture: true });
            html.classList.remove('portal-menu-scroll-locked');
            body.classList.remove('portal-menu-scroll-locked');
            html.style.overflow = previousHtmlOverflow;
            body.style.overflow = previousBodyOverflow;
            body.style.position = previousBodyPosition;
            body.style.top = previousBodyTop;
            body.style.width = previousBodyWidth;
            window.scrollTo({ top: scrollY, behavior: 'auto' });
        };
    }, [menuOpen]);

    const resetPageScroll = () => {
        window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'auto' });
            document.querySelector('.home-page main.main-content')?.scrollTo({ top: 0, behavior: 'auto' });
        });
    };

    const visiblePrimaryItems = primaryItems.filter((item) => item.label.toLowerCase().includes(pageQuery.trim().toLowerCase()));
    const visibleSecondaryItems = secondaryItems.filter((item) => item.label.toLowerCase().includes(pageQuery.trim().toLowerCase()));

    const submitHeaderSearch = (event) => {
        event?.preventDefault();
        const query = headerSearchQuery.trim();
        if (!query) {
            onSearch?.('');
            return;
        }
        onSearch?.(query);
    };

    const renderItem = (item) => (
        <li key={item.id || item.label} className="portal-public-nav-item">
            <button
                type="button"
                className={`portal-public-nav-link ${item.active ? 'is-active' : ''}`}
                onClick={() => {
                    closePortalMenu();
                    setSearchOpen(false);
                    setPageQuery('');
                    item.onClick?.();
                    resetPageScroll();
                }}
                aria-current={item.active ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
            >
                <PortalIcon name={item.icon} />
                <span>{item.label}</span>
                {item.notification ? <i className="nav-notification-dot" /> : null}
            </button>
        </li>
    );

    const navigation = (
        <>
        <span className="portal-public-scroll-guard" aria-hidden="true" />
        <header id="portal-public-header" className={`portal-public-header ${menuOpen ? 'is-menu-open' : ''} ${menuClosing ? 'is-menu-closing' : ''}`} aria-label="JumpTake portal navigation">
            <div className="portal-public-header-top">
                <div className="portal-public-brand">
                    <img src={appMode === 'dark' ? portalLogoDark : portalLogoLight} alt="JumpTake" />
                </div>
                <form className={`portal-public-header-search ${headerSearchQuery ? 'has-value' : ''}`} onSubmit={submitHeaderSearch} role="search">
                    <label htmlFor="portal-desktop-search-input">Search JumpTake</label>
                    <input
                        id="portal-desktop-search-input"
                        type="search"
                        value={headerSearchQuery}
                        onChange={(event) => setHeaderSearchQuery(event.target.value)}
                        placeholder="Search..."
                        aria-label="Search JumpTake"
                        autoComplete="off"
                    />
                    <button type="submit" aria-label="Ask JumpTake AI to search" title="Ask JumpTake AI to search">
                        <PortalIcon name="search" />
                    </button>
                </form>
                <div className="portal-public-utilities">
                    <button
                        type="button"
                        onClick={() => onAppModeChange?.(appMode === 'dark' ? 'light' : 'dark')}
                        aria-label={`Switch to ${appMode === 'dark' ? 'light' : 'dark'} mode`}
                        title={`Switch to ${appMode === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        <PortalThemeIcon mode={appMode} />
                    </button>
                    <button
                        type="button"
                        className="portal-public-search-toggle"
                        onClick={() => {
                            setMenuOpen(false);
                            setSearchOpen(false);
                            setPageQuery('');
                            onSearch?.();
                        }}
                        aria-label="Open JumpTake AI chat"
                        title="JumpTake AI"
                    >
                        <PortalIcon name="search" />
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(false); resetPageScroll(); onSettings?.(); }} aria-label="Settings" title="Settings">
                        <PortalIcon name="settings" />
                    </button>
                    <button
                        type="button"
                        className={`portal-public-menu-toggle ${menuOpen ? 'is-open' : ''}`}
                        onClick={() => {
                            setSearchOpen(false);
                            setPageQuery('');
                            if (menuOpen) {
                                closePortalMenu();
                            } else {
                                window.clearTimeout(closeTimerRef.current);
                                setMenuClosing(false);
                                setMenuOpen(true);
                            }
                        }}
                        aria-label={menuOpen ? 'Close portal menu' : 'Open portal menu'}
                        aria-expanded={menuOpen}
                        aria-controls="portal-public-menu"
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                </div>
            </div>
            {menuOpen ? (
                <>
                    <button className="portal-public-menu-backdrop" type="button" onClick={closePortalMenu} aria-label="Close portal menu" />
                    <nav id="portal-public-menu" className="portal-public-menu" aria-label="Portal pages">
                        {searchOpen ? (
                            <label className="portal-public-page-search">
                                <PortalIcon name="search" />
                                <input
                                    type="search"
                                    value={pageQuery}
                                    onChange={(event) => setPageQuery(event.target.value)}
                                    placeholder="Search portal pages"
                                    autoFocus
                                />
                            </label>
                        ) : null}
                        <ul>{visiblePrimaryItems.map(renderItem)}</ul>
                        <ul>
                            {visibleSecondaryItems.map(renderItem)}
                            <li className="portal-public-nav-item">
                                <button
                                    type="button"
                                    className="portal-public-nav-link is-danger"
                                    onClick={() => { setMenuOpen(false); setSearchOpen(false); setPageQuery(''); onLogout?.(); }}
                                    aria-label="Log Out"
                                >
                                    <PortalIcon name="logout" />
                                    <span>Log Out</span>
                                </button>
                            </li>
                        </ul>
                    </nav>
                </>
            ) : null}
        </header>
        </>
    );

    return portalTarget
        ? ReactDOM.createPortal(
            <div className="home-page portal-navbar-portal-host">{navigation}</div>,
            portalTarget
        )
        : navigation;
};

export default PortalSidebar;

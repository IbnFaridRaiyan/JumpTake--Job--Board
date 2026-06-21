import React, { useEffect, useRef, useState } from 'react';
import PortalSpaceAnimation from './PortalSpaceAnimation';

const ICON_PATHS = {
    dashboard: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
    briefcase: 'M10 6V5a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1h3a2 2 0 0 1 2 2v4.5a4 4 0 0 1-2 3.46V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4.04A4 4 0 0 1 1 12.5V8a2 2 0 0 1 2-2h7Zm2 0h4V5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1Zm9 9.72A4 4 0 0 1 20 16H4a4 4 0 0 1-1-.28V20h18v-4.28ZM3 8v4.5A1.5 1.5 0 0 0 4.5 14h15a1.5 1.5 0 0 0 1.5-1.5V8H3Z',
    inbox: 'M4 4h16l3 7v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-7l3-7Zm1.35 2-1.7 4H8a1 1 0 0 1 .92.6 3.37 3.37 0 0 0 6.16 0A1 1 0 0 1 16 10h4.35l-1.7-4H5.35ZM3 12v6h18v-6h-4.42a5.36 5.36 0 0 1-9.16 0H3Z',
    bell: 'M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6v-5a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2Zm-2 1H7v-6a5 5 0 1 1 10 0v6Z',
    star: 'm12 2 3.1 6.28 6.9 1-5 4.87 1.18 6.87L12 17.77l-6.18 3.25L7 14.15 2 9.28l6.9-1L12 2Z',
    send: 'M2 21 23 3l-7 20-4-9-10-3Zm5.5-10.2 5.2 1.8 1.9 4.5 3.7-10.5-10.8 4.2Z',
    draft: 'M4 3h12l4 4v14H4V3Zm11 1.7V8h3.3L15 4.7ZM6 5v14h12V10h-5V5H6Zm2 8h8v2H8v-2Zm0 3h6v2H8v-2Z',
    users: 'M16 11a4 4 0 1 0-3.46-6A4 4 0 1 0 8 11a6 6 0 0 0-6 6v2h12v-2a5.98 5.98 0 0 0-1.08-3.44A5 5 0 0 1 20 18v1h2v-1a7 7 0 0 0-6-7Zm-8-2a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm4 8H4a4 4 0 0 1 8 0Zm4-8a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z',
    'user-plus': 'M15 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h10.1A6.9 6.9 0 0 1 17 19c0-1.85.72-3.54 1.9-4.8A11.7 11.7 0 0 0 15 14Zm6-3V8h-2v3h-3v2h3v3h2v-3h3v-2h-3Z',
    user: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z',
    chart: 'M4 19h16v2H2V3h2v16Zm3-2V9h3v8H7Zm5 0V5h3v12h-3Zm5 0v-6h3v6h-3Z',
    settings: 'M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.11-1.65-2-3.46-2.49 1a7.28 7.28 0 0 0-1.69-.98L15 3h-4l-.36 2.93c-.6.23-1.17.56-1.69.98l-2.49-1-2 3.46 2.11 1.65c-.04.32-.07.65-.07.98s.02.66.07.98l-2.11 1.65 2 3.46 2.49-1c.52.4 1.09.73 1.69.98L11 21h4l.36-2.93c.6-.25 1.17-.58 1.69-.98l2.49 1 2-3.46-2.11-1.65ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z',
    info: 'M11 10h2v7h-2v-7Zm0-3h2v2h-2V7Zm1-5a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z',
    logout: 'M10 17v-3H3v-4h7V7l5 5-5 5Zm2-15h8v20h-8v-2h6V4h-6V2Z',
    assessment: 'M5 3h14v18H5V3Zm2 2v14h10V5H7Zm2 2h6v2H9V7Zm0 4h6v2H9v-2Zm0 4h4v2H9v-2Z',
    profile: 'M4 4h16v16H4V4Zm2 2v12h12V6H6Zm2 2h8v2H8V8Zm0 3h8v2H8v-2Zm0 3h5v2H8v-2Z',
    heart: 'M12 21s-8-4.6-8-11a4.8 4.8 0 0 1 8-3.58A4.8 4.8 0 0 1 20 10c0 6.4-8 11-8 11Z'
};

const PortalIcon = ({ name = 'dashboard' }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d={ICON_PATHS[name] || ICON_PATHS.dashboard} />
    </svg>
);

const shouldStartCollapsed = () => (
    typeof window !== 'undefined'
    && window.matchMedia('(max-width: 768px)').matches
);

const PortalSidebar = ({
    userName,
    userSubtitle,
    userInitial = 'U',
    userImage = '',
    primaryItems = [],
    secondaryItems = [],
    onLogout,
    mobileSectionOpen = false
}) => {
    const [expanded, setExpanded] = useState(() => !shouldStartCollapsed());
    const toggleIdRef = useRef(`portal-sidebar-toggle-${Math.random().toString(36).slice(2)}`);
    const toggleId = toggleIdRef.current;

    useEffect(() => {
        const collapseForMobile = () => {
            if (shouldStartCollapsed()) {
                setExpanded(false);
            }
        };

        collapseForMobile();
        window.addEventListener('resize', collapseForMobile);
        return () => window.removeEventListener('resize', collapseForMobile);
    }, []);

    useEffect(() => {
        if (mobileSectionOpen) {
            setExpanded(false);
        }
    }, [mobileSectionOpen]);

    const renderItem = (item) => (
        <li key={item.id || item.label} className="sidebar__item">
            <button
                type="button"
                className={`sidebar__link ${item.active ? 'is-active' : ''} ${item.danger ? 'is-danger' : ''}`}
                data-tooltip={item.label}
                onClick={() => {
                    item.onClick?.();
                    if (mobileSectionOpen) {
                        setExpanded(false);
                    }
                }}
                aria-current={item.active ? 'page' : undefined}
            >
                <span className="icon">
                    <PortalIcon name={item.icon} />
                </span>
                <span className="text">{item.label}</span>
                {item.notification ? <span className="nav-notification-dot" /> : null}
            </button>
        </li>
    );

    return (
        <aside className={`sidebar vertical-sidebar portal-vertical-sidebar ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
            <input
                type="checkbox"
                role="switch"
                id={toggleId}
                className="checkbox-input"
                checked={expanded}
                onChange={(event) => setExpanded(event.target.checked)}
                aria-label="Toggle portal navigation"
            />
            <nav className="portal-sidebar-nav">
                <header className="portal-sidebar-header">
                    <div className="sidebar__toggle-container">
                        <label tabIndex="0" htmlFor={toggleId} className="nav__toggle">
                            <span className="toggle--icons" aria-hidden="true">
                                <svg width="24" height="24" viewBox="0 0 24 24" className="toggle-svg-icon toggle--open">
                                    <path d="M3 5a1 1 0 1 0 0 2h18a1 1 0 1 0 0-2zM2 12a1 1 0 0 1 1-1h18a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1M2 18a1 1 0 0 1 1-1h18a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1" />
                                </svg>
                                <svg width="24" height="24" viewBox="0 0 24 24" className="toggle-svg-icon toggle--close">
                                    <path d="M18.707 6.707a1 1 0 0 0-1.414-1.414L12 10.586 6.707 5.293a1 1 0 0 0-1.414 1.414L10.586 12l-5.293 5.293a1 1 0 1 0 1.414 1.414L12 13.414l5.293 5.293a1 1 0 0 0 1.414-1.414L13.414 12z" />
                                </svg>
                            </span>
                        </label>
                    </div>
                    <figure className="portal-sidebar-profile">
                        <div className="portal-sidebar-avatar">
                            {userImage ? <img src={userImage} alt="" /> : userInitial}
                        </div>
                        <figcaption>
                            <p className="portal-sidebar-user-id">{userName}</p>
                            <p className="portal-sidebar-user-role">{userSubtitle}</p>
                        </figcaption>
                    </figure>
                </header>
                <section className="sidebar__wrapper">
                    <ul className="sidebar__list list--primary">
                        <li className="sidebar__item item--heading">
                            <h2 className="sidebar__item--heading">Workspace</h2>
                        </li>
                        {primaryItems.map(renderItem)}
                    </ul>
                    <ul className="sidebar__list list--secondary">
                        <li className="sidebar__item item--heading">
                            <h2 className="sidebar__item--heading">Account</h2>
                        </li>
                        {secondaryItems.map(renderItem)}
                        <li className="sidebar__item">
                            <button
                                type="button"
                                className="sidebar__link is-danger"
                                data-tooltip="Log Out"
                                onClick={onLogout}
                            >
                                <span className="icon">
                                    <PortalIcon name="logout" />
                                </span>
                                <span className="text">Log Out</span>
                            </button>
                        </li>
                    </ul>
                    <PortalSpaceAnimation />
                </section>
            </nav>
        </aside>
    );
};

export default PortalSidebar;

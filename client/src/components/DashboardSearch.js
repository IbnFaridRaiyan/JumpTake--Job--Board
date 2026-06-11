import React, { useEffect, useState } from 'react';

const DashboardSearch = ({ onSearch, placeholder = 'What do you want to search?', compact = false }) => {
    const [query, setQuery] = useState('');
    const [mobilePlaceholder, setMobilePlaceholder] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const updatePlaceholder = () => setMobilePlaceholder(mediaQuery.matches);
        updatePlaceholder();

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', updatePlaceholder);
            return () => mediaQuery.removeEventListener('change', updatePlaceholder);
        }

        mediaQuery.addListener(updatePlaceholder);
        return () => mediaQuery.removeListener(updatePlaceholder);
    }, []);

    const submitSearch = (event) => {
        event.preventDefault();
        const cleanQuery = query.trim();
        if (!cleanQuery || typeof onSearch !== 'function') {
            return;
        }
        onSearch(cleanQuery);
    };

    return (
        <form className={`dashboard-search ${compact ? 'dashboard-search-compact' : ''}`} onSubmit={submitSearch}>
            <div className="input__container">
                <div className="shadow__input"></div>
                <button className="input__button__shadow" type="submit" aria-label="Search dashboard">
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>
                <input
                    className="input__search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={mobilePlaceholder ? 'Search' : placeholder}
                />
            </div>
        </form>
    );
};

export default DashboardSearch;

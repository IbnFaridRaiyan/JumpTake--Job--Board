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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-search" viewBox="0 0 16 16" aria-hidden="true">
                        <path
                            d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"
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

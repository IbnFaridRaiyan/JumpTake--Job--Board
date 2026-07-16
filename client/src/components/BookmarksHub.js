import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import BookmarkedCandidates from './BookmarkedCandidates';
import BookmarkedJobs from './BookmarkedJobs';
import SavedPosts from './SavedPosts';

const BOOKMARK_TABS = [
    { id: 'bookmarked-candidates', label: 'Candidates', title: 'Bookmarked Candidates', icon: 'candidates' },
    { id: 'bookmarked-jobs', label: 'Jobs', title: 'Bookmarked Jobs', icon: 'jobs' },
    { id: 'saved-posts', label: 'Saved Posts', title: 'Saved Posts', icon: 'posts' }
];

const BookmarkTabIcon = ({ name }) => {
    const paths = {
        candidates: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-7 2.24-7 5v1h14v-1c0-2.76-2.58-5-7-5Zm9.5-10 1.56 3.16 3.49.51-2.52 2.46.6 3.47-3.13-1.65-3.12 1.65.59-3.47-2.52-2.46 3.49-.51L17.5 3Z',
        jobs: 'M9 4V3a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5Zm2 0h4V3a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1Zm1 4 1.56 3.16 3.49.51-2.52 2.46.6 3.47L12 15.95 8.88 17.6l.59-3.47-2.52-2.46 3.49-.51L12 8Z',
        posts: 'M4 3h16v18H4V3Zm2 2v14h12V5H6Zm2 2h8v2H8V7Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z'
    };

    return (
        <svg className="bookmarks-hub-tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={paths[name] || paths.posts} />
        </svg>
    );
};

const BookmarksHub = forwardRef(({
    userId,
    viewerId,
    switchSection,
    onFooterBack,
    initialTab = 'bookmarked-candidates'
}, ref) => {
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        setActiveTab(initialTab === 'bookmarks' ? 'bookmarked-candidates' : initialTab);
    }, [initialTab]);

    useImperativeHandle(ref, () => ({
        goBackOneStep: () => {
            if (activeTab !== 'bookmarked-candidates') {
                setActiveTab('bookmarked-candidates');
                return true;
            }

            return false;
        }
    }), [activeTab]);

    const activeTitle = BOOKMARK_TABS.find((tab) => tab.id === activeTab)?.title || 'Bookmarks';

    const renderTabContent = () => {
        if (activeTab === 'bookmarked-jobs') {
            return (
                <BookmarkedJobs
                    userId={userId}
                    switchSection={switchSection}
                    onFooterBack={() => setActiveTab('bookmarked-candidates')}
                    embedded
                />
            );
        }

        if (activeTab === 'saved-posts') {
            return (
                <SavedPosts
                    viewerId={viewerId}
                    onFooterBack={() => setActiveTab('bookmarked-candidates')}
                    embedded
                />
            );
        }

        return (
            <BookmarkedCandidates
                userId={userId}
                onBack={onFooterBack}
                onFooterBack={onFooterBack}
                embedded
            />
        );
    };

    return (
        <section className="bookmarks-hub-container applications-container">
            <div className="section-header bookmarks-hub-header">
                <h2>{activeTitle}</h2>
            </div>

            <nav className="bookmarks-hub-nav" aria-label="Bookmarks sections">
                {BOOKMARK_TABS.map((tab) => (
                    <button
                        type="button"
                        key={tab.id}
                        className={`bookmarks-hub-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        aria-pressed={activeTab === tab.id}
                        title={tab.title}
                    >
                        <BookmarkTabIcon name={tab.icon} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>

            <div className="bookmarks-hub-panel">
                {renderTabContent()}
            </div>
        </section>
    );
});

export default BookmarksHub;

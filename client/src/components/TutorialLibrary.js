import React from 'react';
import { JUMPTAKE_TUTORIALS } from '../data/tutorials';

const PlayIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5L8 5.5Z" /></svg>
);

const TutorialCard = ({ tutorial, featured = false }) => {
    return (
        <article className={`tutorial-card${featured ? ' is-featured' : ''}`}>
            <div className="tutorial-card-media">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    poster={tutorial.poster}
                    src={tutorial.video}
                    disablePictureInPicture
                    disableRemotePlayback
                    aria-label={`${tutorial.title} video tutorial`}
                />
            </div>
            <div className="tutorial-card-copy">
                <span>{tutorial.eyebrow}</span>
                <h2>{tutorial.title}</h2>
                <p>{tutorial.description}</p>
            </div>
        </article>
    );
};

export const TutorialInlineVideo = ({ tutorial, onOpen }) => {
    if (!tutorial) return null;

    return (
        <div className={`tutorial-inline-video${onOpen ? ' has-launch-action' : ''}`}>
            <video controls playsInline preload="metadata" poster={tutorial.poster} src={tutorial.video}>
                Your browser does not support the tutorial video.
            </video>
            <div>
                <span>{tutorial.eyebrow}</span>
                <strong>{tutorial.title}</strong>
                {onOpen ? (
                    <button type="button" className="tutorial-inline-launch" onClick={onOpen}>
                        <PlayIcon />
                        Open walkthrough
                    </button>
                ) : null}
            </div>
        </div>
    );
};

const TutorialLibrary = ({ portal = false }) => {
    const LibraryRoot = portal ? 'section' : 'main';

    return (
        <LibraryRoot className={`tutorial-library${portal ? ' is-portal' : ''}`}>
            <header className="tutorial-library-heading">
                <span>JumpTake tutorials</span>
                <h1>See it once. Make it yours.</h1>
                <p>Short, practical walkthroughs for the work you can do across JumpTake.</p>
            </header>
            <section className="tutorial-grid" aria-label="JumpTake video tutorials">
                {JUMPTAKE_TUTORIALS.map((tutorial, index) => (
                    <TutorialCard key={tutorial.id} tutorial={tutorial} featured={index === 0} />
                ))}
            </section>
        </LibraryRoot>
    );
};

export default TutorialLibrary;

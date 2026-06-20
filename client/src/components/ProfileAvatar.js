import React from 'react';

const ProfileAvatar = ({
    imageSrc,
    name,
    className = '',
    imageClassName = '',
    alt
}) => {
    const fallback = String(name || 'C').trim().charAt(0).toUpperCase() || 'C';

    return (
        <div className={className}>
            {imageSrc ? (
                <img
                    src={imageSrc}
                    alt={alt || `${name || 'Profile'} profile`}
                    className={imageClassName}
                />
            ) : fallback}
        </div>
    );
};

export default ProfileAvatar;

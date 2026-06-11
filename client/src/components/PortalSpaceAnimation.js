import React from 'react';

const StarLayer = ({ className }) => (
    <div className={className}>
        <div className="star star-position1"></div>
        <div className="star star-position2"></div>
        <div className="star star-position3"></div>
        <div className="star star-position4"></div>
        <div className="star star-position5"></div>
        <div className="star star-position6"></div>
        <div className="star star-position7"></div>
    </div>
);

const PortalSpaceAnimation = () => (
    <li className="portal-space-animation" aria-hidden="true">
        <StarLayer className="box-of-star1" />
        <StarLayer className="box-of-star2" />
        <StarLayer className="box-of-star3" />
        <StarLayer className="box-of-star4" />
        <div className="astronaut">
            <div className="schoolbag"></div>
            <div className="head"></div>
            <div className="body">
                <div className="panel"></div>
            </div>
            <div className="arm arm-left"></div>
            <div className="arm arm-right"></div>
            <div className="leg leg-left"></div>
            <div className="leg leg-right"></div>
        </div>
    </li>
);

export default PortalSpaceAnimation;

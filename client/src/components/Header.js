import React from 'react';

const Header = ({ 
    title, 
    subtitle, 
    onLoginClick, 
    isCentered = false, 
    hideLoginButton = false,
    loginButtonText,
    hideLoginIcon = false
}) => {
    return (
        <header className={isCentered ? 'centered' : ''}>
            <div className="header-content">
                <div className="header-titles">
                    {title && <h1 className="header-title">{title}</h1>}
                    {subtitle && <p className="header-subtitle">{subtitle}</p>}
                </div>
                
                {!hideLoginButton && (
                    <div className="header-right">
                        <button onClick={onLoginClick} className="login-button">
                            <span className={hideLoginIcon ? '' : 'login-icon'}>
                                {hideLoginIcon ? '' : '→'} 
                            </span>
                            {loginButtonText || 'Login'}
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
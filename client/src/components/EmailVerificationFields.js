import React from 'react';

const EmailVerificationFields = ({
    verificationCode,
    onVerificationCodeChange,
    onSendCode,
    onResetVerification,
    verificationTargetEmail,
    isVerified,
    isSendingCode,
    isDisabled
}) => (
    <div className="verification-fields">
        <div className="button-group">
            <button
                type="button"
                className="secondary-button"
                onClick={onSendCode}
                disabled={isDisabled || isSendingCode}
            >
                {isSendingCode
                    ? 'Sending Verification Code...'
                    : verificationTargetEmail
                        ? 'Resend Verification Code'
                        : 'Send Verification Code'}
            </button>

            {verificationTargetEmail && !isVerified && (
                <button
                    type="button"
                    className="secondary-button"
                    onClick={onResetVerification}
                    disabled={isDisabled || isSendingCode}
                >
                    Change Email
                </button>
            )}
        </div>

        {verificationTargetEmail && (
            <div className="form-group">
                <label htmlFor="verification-code">Verification Code</label>
                <input
                    type="text"
                    id="verification-code"
                    value={verificationCode}
                    onChange={(event) => onVerificationCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="registration-input"
                    inputMode="numeric"
                    maxLength="6"
                    placeholder="Enter the 6 digit code"
                    disabled={isDisabled || isVerified}
                    required={!isVerified}
                />
                <p className="input-hint">
                    {isVerified
                        ? `Email verified for ${verificationTargetEmail}.`
                        : `We sent a 6 digit code to ${verificationTargetEmail}. Enter it here to continue.`}
                </p>
            </div>
        )}
    </div>
);

export default EmailVerificationFields;

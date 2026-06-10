import React from 'react';

const EmailVerificationFields = ({
    verificationCode,
    onVerificationCodeChange,
    onSendCode,
    verificationTargetEmail,
    isVerified,
    isSendingCode,
    isDisabled,
    showSendButton = true
}) => {
    const digits = Array.from({ length: 6 }, (_, index) => verificationCode[index] || '');

    const focusSiblingInput = (event, nextIndex) => {
        const inputGroup = event.currentTarget.closest('.verification-code-grid');
        if (!inputGroup) {
            return;
        }

        const nextInput = inputGroup.querySelector(`input[data-index="${nextIndex}"]`);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    };

    const handleDigitChange = (event, index) => {
        const sanitizedValue = event.target.value.replace(/\D/g, '');

        if (!sanitizedValue) {
            const nextDigits = [...digits];
            nextDigits[index] = '';
            onVerificationCodeChange(nextDigits.join(''));
            return;
        }

        if (sanitizedValue.length > 1) {
            const pastedDigits = sanitizedValue.slice(0, 6).split('');
            const nextDigits = Array.from({ length: 6 }, (_, digitIndex) => pastedDigits[digitIndex] || '');
            onVerificationCodeChange(nextDigits.join(''));
            return;
        }

        const nextDigits = [...digits];
        nextDigits[index] = sanitizedValue;
        onVerificationCodeChange(nextDigits.join(''));

        if (index < 5) {
            focusSiblingInput(event, index + 1);
        }
    };

    const handleDigitKeyDown = (event, index) => {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            focusSiblingInput(event, index - 1);
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            focusSiblingInput(event, index - 1);
        }

        if (event.key === 'ArrowRight' && index < 5) {
            event.preventDefault();
            focusSiblingInput(event, index + 1);
        }
    };

    const handlePaste = (event) => {
        const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pastedDigits) {
            return;
        }

        event.preventDefault();
        onVerificationCodeChange(pastedDigits);
    };

    return (
    !showSendButton && !verificationTargetEmail ? null : (
        <div className="verification-fields">
            {showSendButton && (
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
                </div>
            )}

            {verificationTargetEmail && (
                <div className="form-group">
                    <label htmlFor="verification-code-0">Verification Code</label>
                    <div className="verification-code-grid" onPaste={handlePaste}>
                        {digits.map((digit, index) => (
                            <input
                                key={index}
                                type="text"
                                id={`verification-code-${index}`}
                                data-index={index}
                                value={digit}
                                onChange={(event) => handleDigitChange(event, index)}
                                onKeyDown={(event) => handleDigitKeyDown(event, index)}
                                className="registration-input verification-code-digit"
                                inputMode="numeric"
                                maxLength="1"
                                autoComplete="one-time-code"
                                disabled={isDisabled || isVerified}
                                aria-label={`Verification code digit ${index + 1}`}
                            />
                        ))}
                    </div>
                    <p className="input-hint">
                        {isVerified
                            ? `Email verified for ${verificationTargetEmail}.`
                            : `We sent a 6 digit code to ${verificationTargetEmail}. Enter it here to continue.`}
                    </p>
                </div>
            )}
        </div>
    )
    );
};

export default EmailVerificationFields;

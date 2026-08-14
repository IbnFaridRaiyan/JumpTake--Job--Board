import { getLoginFailureMessage, LOGIN_WARNING_DURATION_MS } from './loginFeedback';

describe('login feedback', () => {
    it('keeps warning feedback visible for four seconds', () => {
        expect(LOGIN_WARNING_DURATION_MS).toBe(4000);
    });

    it('explains candidate credential failures', () => {
        expect(getLoginFailureMessage({ role: 'candidate', status: 401 }))
            .toBe('The email or password is incorrect, or this candidate account is not registered.');
    });

    it('explains missing employer accounts', () => {
        expect(getLoginFailureMessage({ role: 'employer', status: 404 }))
            .toBe('This employer account is not registered.');
    });

    it('preserves a useful server failure message', () => {
        expect(getLoginFailureMessage({ serverMessage: 'Login is temporarily unavailable.' }))
            .toBe('Login is temporarily unavailable.');
    });
});

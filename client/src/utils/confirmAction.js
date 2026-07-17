let activeConfirmation = null;

export const confirmAction = ({
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmLabel = 'Yes',
    cancelLabel = 'No'
} = {}) => {
    if (typeof document === 'undefined') {
        return Promise.resolve(false);
    }

    if (activeConfirmation) {
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        const previouslyFocused = document.activeElement;
        const backdrop = document.createElement('div');
        const dialog = document.createElement('div');
        const heading = document.createElement('h2');
        const copy = document.createElement('p');
        const actions = document.createElement('div');
        const yesButton = document.createElement('button');
        const noButton = document.createElement('button');

        backdrop.className = 'jumptake-confirm-backdrop';
        dialog.className = 'jumptake-confirm-dialog';
        actions.className = 'jumptake-confirm-actions';
        yesButton.className = 'jumptake-confirm-button jumptake-confirm-yes';
        noButton.className = 'jumptake-confirm-button jumptake-confirm-no';

        dialog.setAttribute('role', 'alertdialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'jumptake-confirm-title');
        dialog.setAttribute('aria-describedby', 'jumptake-confirm-copy');
        heading.id = 'jumptake-confirm-title';
        copy.id = 'jumptake-confirm-copy';
        heading.textContent = title;
        copy.textContent = message;
        yesButton.type = 'button';
        noButton.type = 'button';
        yesButton.textContent = confirmLabel;
        noButton.textContent = cancelLabel;

        actions.append(yesButton, noButton);
        dialog.append(heading, copy, actions);
        backdrop.append(dialog);
        document.body.append(backdrop);
        document.body.classList.add('jumptake-confirm-open');
        activeConfirmation = backdrop;

        const finish = (confirmed) => {
            document.removeEventListener('keydown', onKeyDown);
            backdrop.remove();
            document.body.classList.remove('jumptake-confirm-open');
            activeConfirmation = null;
            if (previouslyFocused instanceof HTMLElement) {
                previouslyFocused.focus({ preventScroll: true });
            }
            resolve(confirmed);
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                finish(false);
            }
        };

        yesButton.addEventListener('click', () => finish(true));
        noButton.addEventListener('click', () => finish(false));
        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) {
                finish(false);
            }
        });
        document.addEventListener('keydown', onKeyDown);
        window.requestAnimationFrame(() => noButton.focus());
    });
};

export default confirmAction;

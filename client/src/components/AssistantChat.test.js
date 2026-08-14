import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import AssistantChat from './AssistantChat';

const assistantResponse = {
    answer: 'I prepared a comment for the visible post.',
    action: 'feed-comment',
    actionPayload: {
        comment: 'Congratulations on the new role!',
        postReference: 'Ashley Gill'
    }
};

const flushAssistantResponse = async () => {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
    act(() => jest.advanceTimersByTime(5000));
};

describe('AssistantChat action approval', () => {
    let container;

    beforeEach(() => {
        jest.useFakeTimers();
        container = document.createElement('div');
        document.body.appendChild(container);
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => assistantResponse
        });
    });

    afterEach(() => {
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        container.remove();
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    const renderChatAndAsk = async (onAction) => {
        act(() => {
            ReactDOM.render(
                <AssistantChat
                    context={{ portalMode: 'candidate', view: { visiblePosts: [] } }}
                    onAction={onAction}
                />,
                container
            );
        });
        const composer = container.querySelector('.public-ai-reply-field textarea');
        act(() => Simulate.change(composer, { target: { value: 'Comment on the visible post' } }));
        await act(async () => {
            Simulate.submit(container.querySelector('.public-ai-chat-reply'));
            await Promise.resolve();
        });
        await flushAssistantResponse();
    };

    it('waits for approval and sends the edited draft to the action handler', async () => {
        const onAction = jest.fn();
        const previewPhases = [];
        const recordPreview = (event) => previewPhases.push(event.detail?.phase);
        window.addEventListener('jumptake-ai-action-preview', recordPreview);
        await renderChatAndAsk(onAction);

        expect(onAction).not.toHaveBeenCalled();
        expect(previewPhases).toEqual([]);
        const reviewEditor = container.querySelector('.assistant-action-review-editor textarea');
        expect(reviewEditor.value).toBe('Congratulations on the new role!');

        act(() => Simulate.change(reviewEditor, { target: { value: 'Congratulations, Ashley!' } }));
        act(() => Simulate.click(container.querySelector('.assistant-action-review-approve')));

        expect(onAction).not.toHaveBeenCalled();
        expect(previewPhases).toEqual([]);
        act(() => jest.advanceTimersByTime(320));
        expect(previewPhases).toEqual(['approve']);
        expect(onAction).not.toHaveBeenCalled();
        act(() => jest.advanceTimersByTime(2300));
        expect(onAction).toHaveBeenCalledTimes(1);
        expect(onAction.mock.calls[0][0]).toBe('feed-comment');
        expect(onAction.mock.calls[0][1].actionPayload.comment).toBe('Congratulations, Ashley!');
        window.removeEventListener('jumptake-ai-action-preview', recordPreview);
    });

    it('cancels without invoking the action handler', async () => {
        const onAction = jest.fn();
        await renderChatAndAsk(onAction);

        act(() => Simulate.click(container.querySelector('.assistant-action-review-reject')));

        expect(onAction).not.toHaveBeenCalled();
    });

    it('never forwards an implicit command when the server returns no action', async () => {
        const onAction = jest.fn();
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ answer: 'Tell me which post you mean.', action: '' })
        });

        await renderChatAndAsk(onAction);

        expect(container.querySelector('.assistant-action-review')).toBeNull();
        expect(onAction).not.toHaveBeenCalled();
    });

    it('replaces the legacy reply form with the dedicated mobile composer when requested', () => {
        act(() => {
            ReactDOM.render(<AssistantChat mobileComposer />, container);
        });

        expect(container.querySelector('[data-mobile-chat-composer="true"]')).not.toBeNull();
        expect(container.querySelector('.public-ai-chat-reply')).toBeNull();
        expect(container.querySelector('.mobile-chat-composer textarea').getAttribute('aria-label')).toBe('Ask JumpTake AI');
    });
});

import PostMessageService, { MessageResponse, ResponderComponentType } from '@joplin/lib/services/PostMessageService';
import { useEffect } from 'react';

export default function(frameWindow: any, isReady: boolean, pluginId: string, viewId: string, postMessage: Function) {
	useEffect(() => {
		PostMessageService.instance().registerResponder(ResponderComponentType.UserWebview, viewId, (message: MessageResponse) => {
			postMessage('postMessageService.response', { message });
		});

		return () => {
			PostMessageService.instance().unregisterResponder(ResponderComponentType.UserWebview, viewId);
		};
	}, [viewId]);

	useEffect(() => {
		if (!frameWindow) return () => {};

		function onMessage_(event: any) {

			if(!event.data || !event.data.target) {
				return;
			}
			
			if (event.data.target === 'postMessageService.registerCallback') {
				PostMessageService.instance().registerCallback(ResponderComponentType.UserWebview, viewId, (message: MessageResponse) => {
					postMessage('postMessageService.plugin_message', { message });
				});
			}
			else if (event.data.target === 'postMessageService.message') {
				void PostMessageService.instance().postMessage({
					pluginId,
					viewId,
					...event.data.message,
				});
			}
		}

		frameWindow.addEventListener('message', onMessage_);

		return () => {
			frameWindow.removeEventListener('message', onMessage_);
		};
	}, [frameWindow, isReady, pluginId, viewId]);
}

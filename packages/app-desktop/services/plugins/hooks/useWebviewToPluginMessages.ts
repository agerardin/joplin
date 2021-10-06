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

			// Registering a view that listens to a plugin
			if (event.data || event.data.target === 'postMessageService.register') {
				console.log('!!! a/ packages/app-desktop/services/plugins/hooks/useWebviewToPluginMessages.ts register a new responder');
				PostMessageService.instance().registerCallback(ResponderComponentType.UserWebview, viewId, (message: MessageResponse) => {
					console.log('!!! x/ packages/app-desktop/services/plugins/hooks/useWebviewToPluginMessages.ts we call the responder which call postMessage() method registered at startup : ', event);
					postMessage('postMessageService.plugin_message', { message });
				});
				return;
			}

			if (!event.data || event.data.target !== 'postMessageService.message') return;

			void PostMessageService.instance().postMessage({
				pluginId,
				viewId,
				...event.data.message,
			});
		}

		frameWindow.addEventListener('message', onMessage_);

		return () => {
			frameWindow.removeEventListener('message', onMessage_);
		};
	}, [frameWindow, isReady, pluginId, viewId]);
}

import PostMessageService, { MessageResponse, ResponderComponentType } from '@joplin/lib/services/PostMessageService';
import { useEffect } from 'react';

export default function(frameWindow: any, isReady: boolean, pluginId: string, viewId: string, postMessage: Function) {
	useEffect(() => {

		console.log("!!! 1bis/ packages/app-desktop/services/plugins/hooks/useWebviewToPluginMessages.ts we have registered a responder for our webview : ", event);

		PostMessageService.instance().registerResponder(ResponderComponentType.UserWebview, viewId, (message: MessageResponse) => {

			console.log("!!! 9/ packages/app-desktop/services/plugins/hooks/useWebviewToPluginMessages.ts we call the responder which call postMessage() method registered at startup : ", event);

			postMessage('postMessageService.response', { message });
		});

		return () => {
			PostMessageService.instance().unregisterResponder(ResponderComponentType.UserWebview, viewId);
		};
	}, [viewId]);

	useEffect(() => {
		if (!frameWindow) return () => {};

		function onMessage_(event: any) {

			console.log("!!! 4/ packages/app-desktop/services/plugins/hooks/useWebviewToPluginMessages.ts receives a message to forward to the postMessage service : ", event);

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

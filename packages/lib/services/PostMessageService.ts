// Passing messages across the various sandbox boundaries can be complex and is
// hard to unit test. This class is an attempt to clarify and track what happens
// when messages are sent.
//
// Essentially it works like this:
//
// The component that might post messages, for example from a content script to
// the plugin, and expect responses:
//
// - First it registers a responder with the PostMessageService - this is what
//   will be used to send back responses.
// - Whenever it sends a message it calls PostMessageService.postMessage() and
//   wait for the response
// - This class forwards the message to the relevant participant and wait for the
//   response
// - Then it sends back the response to the component using the registered
//   responder.
//
// There's still quite a bit of boiler plate code on the content script or
// webview side to mask the complexity of passing messages. In particular, it
// needs to create and return a promise when a message is posted. Then in
// another location, when the response is received, it resolves that promise.
// See UserWebviewIndex.js to see how it's done.

import Logger from '../Logger';
import PluginService from './plugins/PluginService';

const logger = Logger.create('PostMessageService');

export enum MessageParticipant {
	ContentScript = 'contentScript',
	Plugin = 'plugin',
	UserWebview = 'userWebview',
}

export enum ResponderComponentType {
	NoteTextViewer = 'noteTextViewer',
	UserWebview = 'userWebview',
}

export interface MessageResponse {
	responseId: string;
	response: any;
	error: any;
}

type MessageResponder = (message: MessageResponse)=> void;

interface Message {
	pluginId: string;
	contentScriptId: string;
	viewId: string;
	from: MessageParticipant;
	to: MessageParticipant;
	id: string;
	content: any;
}

export default class PostMessageService {

	private static instance_: PostMessageService;
	private responders_: Record<string, MessageResponder> = {};
	private callbacks_: Record<string, MessageResponder> = {};

	public static instance(): PostMessageService {
		if (this.instance_) return this.instance_;
		this.instance_ = new PostMessageService();
		return this.instance_;
	}

	public async postMessage(message: Message) {
		logger.debug('!!! 5/ packages/lib/services/PostMessageService.ts postMessage sends a message to the plugin by calling its view controller emitMessage() :', message);

		let response = null;
		let error = null;

		try {

			if(message.to === MessageParticipant.UserWebview && message.from === MessageParticipant.Plugin) {
				console.log('!!! x/ packages/lib/services/PostMessageService.ts received message from plugin', message);
				this.callback(message, message, error);
				return;
			}

			if (message.from === MessageParticipant.ContentScript && message.to === MessageParticipant.Plugin) {

				const pluginId = PluginService.instance().pluginIdByContentScriptId(message.contentScriptId);
				if (!pluginId) throw new Error(`Could not find plugin associated with content script "${message.contentScriptId}"`);
				response = await PluginService.instance().pluginById(pluginId).emitContentScriptMessage(message.contentScriptId, message.content);

			} else if (message.from === MessageParticipant.UserWebview && message.to === MessageParticipant.Plugin) {

				response = await PluginService.instance().pluginById(message.pluginId).viewController(message.viewId).emitMessage({ message: message.content });

			} else {

				throw new Error(`Unhandled message: ${JSON.stringify(message)}`);

			}
		} catch (e) {
			error = e;
		}

		console.log("!!! 7/ packages/lib/services/PostMessageService.ts postMessage receives the response from the plugin callback and sends a new message using the registered responder: ", message)

		this.sendResponse(message, response, error);
	}

	private callback(message: Message, responseContent: any, error: any) {
		logger.debug('!!! packages/lib/services/PostMessageService.ts callback', responseContent, this.responders_);
		
		let callback = this.callbacks_[[ResponderComponentType.UserWebview, message.viewId].join(':')];

		callback({
			responseId: message.id,
			response: responseContent,
			error,
		});
	}

	private sendResponse(message: Message, responseContent: any, error: any) {
		logger.debug('!!! packages/lib/services/PostMessageService.ts sendResponse', responseContent, this.responders_);

		let responder: MessageResponder = null;

		if (message.from === MessageParticipant.ContentScript) {
			responder = this.responder(ResponderComponentType.NoteTextViewer, message.viewId);
		} else if (message.from === MessageParticipant.UserWebview) {
			responder = this.responder(ResponderComponentType.UserWebview, message.viewId);
		}

		if (!responder) {
			logger.warn('Cannot respond to message because no responder was found', message);
		}

		responder({
			responseId: message.id,
			response: responseContent,
			error,
		});
	}

	private responder(type: ResponderComponentType, viewId: string): any {

		console.log("!!! packages/lib/services/PostMessageService.ts responder will be called : ", this.responders_[[type, viewId].join(':')]);

		return this.responders_[[type, viewId].join(':')];
	}

	public registerResponder(type: ResponderComponentType, viewId: string, responder: MessageResponder) {

		console.log("!!! packages/lib/services/PostMessageService.ts registerResponder");

		this.responders_[[type, viewId].join(':')] = responder;
	}

	public registerCallback(type: ResponderComponentType, viewId: string, responder: MessageResponder) {
		console.log("!!! packages/lib/services/PostMessageService.ts registerCallback");
		this.callbacks_[[type, viewId].join(':')] = responder;
	}



	public unregisterResponder(type: ResponderComponentType, viewId: string) {
		delete this.responders_[[type, viewId].join(':')];
	}

}

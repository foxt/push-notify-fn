import { handleWebPushRequest } from "./handleWebPushRequest.js";

async function getRequest(request: Request, env: Env): Promise<Response> {
	return new Response(JSON.stringify({
		"name": "pushNotify",
		"description": "Send a push notification via the Web Push API. Visit " + new URL(request.url).origin + " for more information.",
		"input": {
			type: "object",
			description: "The request body should be a JSON object containing the subscription and notification details.",
			properties: {
				subscription: {
					type: "object",
					description: "The Web Push subscription object.",
					properties: {
						endpoint: {
							type: "string",
							format: "uri",
							description: "The endpoint URL for the subscription."
						},
						p256dh: {
							type: "string",
							format: "base64url",
							description: "The base64url-encoded public key."
						},
						auth: {
							type: "string",
							format: "base64url",
							description: "The base64url-encoded authentication secret."
						}
					},
					required: ["endpoint", "p256dh", "auth"]
				},
				body: {
					type: "object",
					description: "The push data.",
					properties: {
						notification: {
							type: "object",
							description: "The Web Notification object. See https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification#options for more details. Not all fields allowed are included here for brevity.",
							properties: {
								title: { type: "string", description: "The title of the notification.", example: "Hello World" },
								body: { type: "string", description: "The body text of the notification.", example: "This is a test notification." },
							},
							required: ["title"]
						}
					},
					required: ["notification"]
				},
				ttl: {
					type: "integer",
					description: "Time to live in seconds. Defaults to 0",
					default: 0
				},
				topic: {
					type: "string",
					description: "The topic of the notification."
				},
				urgency: {
					type: "string",
					enum: ["very-low", "low", "normal", "high"],
					description: "The urgency of the notification."
				}
			},
			required: ["subscription", "body"]
		},
		output: {
			type: "object",
			description: "The response will be a JSON object indicating success or failure.",
			properties: {
				ok: {
					type: "boolean",
					description: "Indicates whether the notification was sent successfully.",
					example: true
				}
			},
			required: ["ok"]
		},
		config: {
			publicKey: env.VAPID_PUBLIC_KEY_B64,
		}
	}), {
		headers: { "Content-Type": "application/json" }
	});
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		try {
			let url = new URL(request.url);
			if (url.pathname === "/function") {
				if (request.method == 'POST') return await handleWebPushRequest(request, env);
				else if (request.method == 'GET') return await getRequest(request, env);
			}


			return env.ASSETS.fetch(request);
		} catch(e) {
			console.error(e);
			return new Response((e as any).toString(), { status: 500 })
		}
	},
} satisfies ExportedHandler<Env>;

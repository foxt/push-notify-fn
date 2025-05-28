import { handleWebPushRequest } from "./handleWebPushRequest.js";

async function getRequest(request: Request, env: Env): Promise<Response> {
	return new Response(JSON.stringify({
		"config": {
			"publicKey": env.VAPID_PUBLIC_KEY_B64,
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

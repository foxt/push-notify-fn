import { handleWebPushRequest } from "./handleWebPushRequest.js";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		try {
			let url = new URL(request.url);
			if (request.method == 'POST' && url.pathname === "/function")
				return handleWebPushRequest(request, env);

			return new Response(request.url);
		} catch(e) {
			console.error(e);
			return new Response((e as any).toString(), { status: 500 })
		}
	},
} satisfies ExportedHandler<Env>;

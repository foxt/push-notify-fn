import { sendWebPush, WebPushConfig } from "./crypto/crypto.js";
import { importECDSAKey } from "./crypto/util.js";
import { WebPushRequest } from "./schemas.js";

export async function handleWebPushRequest(request: Request, env: Env): Promise<Response> {
    let body = WebPushRequest.parse(request.json());
    let ratelimited = await env.ratelimit.limit({
        key: request.headers.get("cf-connecting-ip") || "unknown",
    })
    if (!ratelimited.success) return new Response("slow down!", { status: 429 });
    const config: WebPushConfig = {
        privateKey: await importECDSAKey(env.VAPID_PRIVATE_KEY_JWK),
        publicKeyB64: env.VAPID_PUBLIC_KEY_B64,
        vapidContactUri: env.VAPID_CONTACT_URI
    }

    // just forward on the response we get from the push service as there's some headers
    // that the end user may find useful (for example, the TTL header may be altered by the push service)
    // TODO: filter out the response so we're not sending back potentially sensitive data
    return await sendWebPush(body, config);
}

import { sendWebPush, WebPushConfig } from "./crypto/crypto.js";
import { importECDSAKey } from "./crypto/util.js";
import { WebPushRequest } from "./schemas.js";

export async function handleWebPushRequest(request: Request, env: Env): Promise<Response> {
    let body = WebPushRequest.parse(await request.json());
    let ratelimited = await env.ratelimit.limit({
        key: request.headers.get("cf-connecting-ip") || "unknown",
    })
    if (!ratelimited.success) return new Response("slow down!", { status: 429 });
    const config: WebPushConfig = {
        privateKey: await importECDSAKey(env.VAPID_PRIVATE_KEY_JWK),
        publicKeyB64: env.VAPID_PUBLIC_KEY_B64,
        vapidContactUri: env.VAPID_CONTACT_URI
    }

    await sendWebPush(body, config);
    return new Response(JSON.stringify({ok: true}), { status: 200 });
}

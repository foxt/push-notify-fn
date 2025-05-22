// based off https://web.dev/articles/push-notifications-web-push-protocol

import { VAPID_CONTACT_URI, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY_B64 } from "../config.js";
import { WebPushRequest } from "../schemas.js";
import { generateECDHKey, hkdf, makeJwt, toUrlSafeBase64, utf8Encode } from "./util.js";


const withContextLength = (array: Uint8Array) => 
    [0, array.length, ...array];

const contentEncoding = (encoding: "auth" | "nonce" | "aesgcm") =>
    utf8Encode("Content-Encoding: " + encoding + "\0");

async function encryptForWebPush(message: string, p256dh: Uint8Array, auth: Uint8Array) {
    const p256dhKey = await crypto.subtle.importKey("raw", p256dh, {
        name: "ECDH",
        namedCurve: "P-256"
    }, false, []);

    const localKeys = await generateECDHKey();

    const sharedSecret = await crypto.subtle.deriveBits(
        // @ts-ignore - the Cloudflare Workers SDK has really bad typing for the Web Crypto API
        { name: "ECDH", public: p256dhKey},
        localKeys.privateKey, 256
    );

    const prk = await hkdf(
        auth, 
        sharedSecret, 
        contentEncoding("auth"),
        32
    );

    const context = new Uint8Array([
        ...utf8Encode('P-256\0'),
        ...withContextLength(p256dh),
        ...withContextLength(localKeys.publicBytes),
    ]);

    const salt = crypto.getRandomValues(new Uint8Array(16));

    const nonceInfo = new Uint8Array([ ...contentEncoding('nonce'), ...context ]);
    const nonce = await hkdf(salt, prk, nonceInfo, 12);

    const cekInfo = new Uint8Array([ ...contentEncoding("aesgcm"), ...context ]);
    const cekBytes = await hkdf(salt, prk, cekInfo, 16);
    const ceKey = await crypto.subtle.importKey("raw", cekBytes, "AES-GCM", false, ["encrypt"]);

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: nonce,
            length: 128,
            tagLength: 128
        },
        ceKey, 
        new Uint8Array([0,0, ...utf8Encode(message)])
    );

    return {
        salt,
        localPublicKey: localKeys.publicBytes,
        encrypted,
    }
}

async function makeVapidJwt(endpointOrigin: string) {
    return await makeJwt({
        aud: endpointOrigin,
        exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60),
        sub: VAPID_CONTACT_URI
    }, VAPID_PRIVATE_KEY);
}

export async function sendWebPush(req: WebPushRequest) {
    const endpointOrigin = new URL(req.subscription.endpoint).origin;
    const vapidJwt = await makeVapidJwt(endpointOrigin);

    const body = JSON.stringify(req.body);
    const { salt, localPublicKey, encrypted } = await encryptForWebPush(
        body,
        req.subscription.p256dh,
        req.subscription.auth
    );

    const headers = new Headers({
        'Authorization': 'WebPush ' + vapidJwt,
        "Content-Encoding": "aesgcm",
        "Content-Type": "application/octet-stream",
        "Content-Length": (encrypted.byteLength).toString(),
        "Crypto-Key": `dh=${toUrlSafeBase64(localPublicKey)}; p256ecdsa=${VAPID_PUBLIC_KEY_B64}`,
        "Encryption": `salt=${toUrlSafeBase64(salt)}`,
        "TTL": req.ttl.toString(),
        ...req.topic ? { "Topic": req.topic } : {},
        ...req.urgency ? { "Urgency": req.urgency } : {},
    });
    const response = await fetch(req.subscription.endpoint, {
        method: "POST",
        headers,
        body: encrypted,
    });

    return response;
}

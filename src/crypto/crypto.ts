// based off https://web.dev/articles/push-notifications-web-push-protocol

import { generateECDHKey, hkdf, utf8Encode } from "./util.js";


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

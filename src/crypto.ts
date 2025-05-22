import { VeryBadHardcodedAppKeyPrivate } from "./AppKeys.ts";

let encoder = new TextEncoder();




const Strings = {
    P256: encoder.encode('P-256\0'),
    encodingAuth: encoder.encode("Content-Encoding: auth\0"),
    encodingNonce: encoder.encode("Content-Encoding: nonce\0"),
    encodingAESGCM: encoder.encode("Content-Encoding: aesgcm\0"),
}

// Simplified HKDF, returning keys up to 32 bytes long
async function hkdf(salt: ArrayBuffer, ikm: BufferSource, info: ArrayBufferView, length: number) {
    // Extract
    const saltKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

    const keyHmac = await crypto.subtle.sign("HMAC", saltKey, ikm);
  
    const keyKey = await crypto.subtle.importKey("raw", keyHmac, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

    // Expand
    let infoData = new Uint8Array([...new Uint8Array(info.buffer),1]);
    const infoHmac = await crypto.subtle.sign('HMAC', keyKey, infoData);
    
  
    return infoHmac.slice(0, length);
}

  
async function buildContext(sub: Uint8Array, local: Uint8Array) {
    
    return new Uint8Array([
        ...Strings.P256,
        0, sub.length,
        ...sub,
        0, local.length,
        ...local
    ])
}

export function toUrlSafeBase64(buffer: ArrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

async function makeJwt(data: any) {
    const header = {
        "typ": "JWT",
        "alg": "ES256"
    };
    let payload = toUrlSafeBase64(encoder.encode(JSON.stringify(header))) + "." + toUrlSafeBase64(encoder.encode(JSON.stringify(data)));
    let signature = await crypto.subtle.sign({ name: "ECDSA", hash: { name: "SHA-256" }}, await VeryBadHardcodedAppKeyPrivate, encoder.encode(payload));
    return payload + "." + toUrlSafeBase64(signature);
}

export async function EncryptMessage(message: string, subscription: PushSubscription) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const p256dh = await crypto.subtle.importKey("raw", subscription.getKey("p256dh")!, {
        name: "ECDH",
        namedCurve: "P-256"
    }, false, []);

    const localKeys = await crypto.subtle.generateKey({
        name: "ECDH",
        namedCurve: "P-256"
    }, false, ['deriveBits']);
    let localPublicKey = new Uint8Array(await crypto.subtle.exportKey('raw', localKeys.publicKey))

    const sharedSecret = await crypto.subtle.deriveBits({
        name: "ECDH",
        public: p256dh
    }, localKeys.privateKey, 256);

    const prk = await hkdf(subscription.getKey("auth")!, sharedSecret, Strings.encodingAuth, 32);

    const context = await buildContext(new Uint8Array(subscription.getKey("p256dh")!), localPublicKey);
    
    const nonceInfo = new Uint8Array([...Strings.encodingNonce, ...context]);
    const nonce = await hkdf(salt, prk, nonceInfo, 12);

    const cekInfo = new Uint8Array([...Strings.encodingAESGCM, ...context]);
    const cekData = await hkdf(salt, prk, cekInfo, 16);
    const cek = await crypto.subtle.importKey("raw", cekData, "AES-GCM", false, ["encrypt"]);

    const encrypted = await crypto.subtle.encrypt({
        name: "AES-GCM",
        iv: nonce,
        length: 128,
        tagLength: 128
    }, cek, new Uint8Array([0,0, ...encoder.encode(message)]));

    const jwt = await makeJwt({
        'aud': new URL(subscription.endpoint).origin,
        'exp': Math.floor(Date.now() / 1000) + (12 * 60 * 60),
        'sub': "mailto:me+webpushdemo@foxt.dev",
    });


    return {
        salt,
        localPublicKey,
        encrypted,
        jwt
    }

}

export const toUrlSafeBase64  = (buffer: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

export const fromUrlSafeBase64 = (str: string) => 
    Uint8Array.from(
        atob(str.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
    );


const textEnc = new TextEncoder();
export const utf8Encode = (str: string) => textEnc.encode(str);

// Simplified HKDF, returning keys up to 32 bytes long
export async function hkdf(salt: ArrayBuffer, ikm: BufferSource, info: ArrayBufferView, length: number) {
    // Extract
    const saltKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const keyHmac = await crypto.subtle.sign("HMAC", saltKey, ikm);
    const keyKey = await crypto.subtle.importKey("raw", keyHmac, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

    // Expand
    const infoData = new Uint8Array([...new Uint8Array(info.buffer),1]);
    const infoHmac = await crypto.subtle.sign('HMAC', keyKey, infoData);
    
    return infoHmac.slice(0, length);
}

export async function makeJwt(data: any, key: CryptoKey) {
    const payload = 
        [ { 'typ': 'JWT', 'alg': 'ES256' }, data ]
        .map((x) => JSON.stringify(x))
        .map((x) => utf8Encode(x))
        .map((x) => toUrlSafeBase64(x))
        .join('.');

    const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" }}, 
        key, 
        utf8Encode(payload)
    );
    return payload + "." + toUrlSafeBase64(signature);
}


export async function generateECDHKey() {
    const keypair = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" }, 
        false, ['deriveBits']
    ) as CryptoKeyPair;

    const publicBytes = new Uint8Array(
        // @ts-ignore - the Cloudflare Workers SDK has really bad typing for the Web Crypto API
        await crypto.subtle.exportKey('raw', keypair.publicKey)
    );

    return {
        publicKey: keypair.publicKey,
        publicBytes,
        privateKey: keypair.privateKey
    }
}

export const importECDSAKey = (jwk: string) =>
    crypto.subtle.importKey(
        "jwk",
        JSON.parse(jwk),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
    );
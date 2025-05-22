import crypto from "crypto";


export const toUrlSafeBase64  = (buffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');


crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']).then(async keypair => {
    let privateJWK = await crypto.subtle.exportKey('jwk', keypair.privateKey);
    let publicBytes = await crypto.subtle.exportKey('raw', keypair.publicKey);
    
    console.log('\n\nnpx wrangler secret put VAPID_PRIVATE_KEY_JWK')
    console.log(JSON.stringify(privateJWK));
    console.log('\nnpx wrangler secret put VAPID_PUBLIC_KEY_B64');
    console.log(toUrlSafeBase64(publicBytes));
});
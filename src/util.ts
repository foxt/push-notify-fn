
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
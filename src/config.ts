/**
 * Required by some browsers (namely Safari) otherwise notifications are rejected.
 * @see https://datatracker.ietf.org/doc/html/draft-thomson-webpush-vapid#section-2.1
 */
export const VAPID_CONTACT_URI = "mailto:me+pushnotifyfn@foxt.dev"

export const VAPID_PRIVATE_KEY: CryptoKey;
export const VAPID_PUBLIC_KEY_B64: Uint8Array;
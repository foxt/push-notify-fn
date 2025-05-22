import { z } from "zod";
import { fromUrlSafeBase64 } from "./crypto/util.js";

const zBase64Array = z.string().base64url().transform(x => fromUrlSafeBase64(x))

export const WebPushSubcription = z.object({
    endpoint: z.string().url(),
    p256dh: zBase64Array,
    auth: zBase64Array,
});
export type WebPushSubcription = z.infer<typeof WebPushSubcription>;

export const WebNotification =  z.object({
    title: z.string(),
    actions: z.array(
        z.object({
            action: z.string(),
            title: z.string(),
            icon: z.string().url().optional(),
        })
    ).optional(),
    badge: z.string().url().optional(),
    body: z.string().optional(),
    data: z.any().optional(),
    dir: z.enum(['auto', 'ltr', 'rtl']).optional(),
    icon: z.string().url().optional(),
    image: z.string().url().optional(),
    lang: z.string().optional(),
    renotify: z.boolean().optional(),
    requireInteraction: z.boolean().optional(),
    silent: z.boolean().optional(),
    tag: z.string().optional(),
    timestamp: z.number().optional(),
    vibrate: z.array(z.number()).optional(),
})
export type WebNotification = z.infer<typeof WebNotification>;

export const WebPushRequest = z.object({
    subscription: WebPushSubcription,
    body: z.object({
        notification: WebNotification
    }),
    ttl: z.number().default(0),
    topic: z.string().optional(),
    urgency: z.enum(['very-low', 'low', 'normal', 'high']).optional(),
})
export type WebPushRequest = z.infer<typeof WebPushRequest>;
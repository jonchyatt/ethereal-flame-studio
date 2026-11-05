# Custom session brief builder

Not yet on sale. No payment is taken anywhere in this flow.

- Public form: `/store/custom-order/brief` posts to `POST /api/custom-orders/brief`. Open to everyone since 2026-11-05 (the CUSTOM_ORDERS_OPEN gate was removed); the contact must be an email, the owner is notified, nothing is charged.
- The brief (goal, length, voice, music, VR scene, comfort flag, safety notes, safe-use acknowledgement) is saved in private storage at `custom-order-briefs/<orderId>.json`. A readable summary becomes the order's `details`, so the existing queue, status page and operator view work unchanged.
- Operator: `/operator/custom-orders/brief` or `GET /api/custom-orders/<id>/brief` (Bearer operator secret) returns the full brief and a suggested quote.
- Quote calculator: `src/lib/custom-orders/pricing.ts`. Every price ships blank (null), so there is no estimate until Jonathan sets numbers; the operator then quotes through the existing quote step. The calculator never sends or charges anything.
- Item 3 of the backlog (single price config) will own prices later; move `SESSION_PRICING` into it then.

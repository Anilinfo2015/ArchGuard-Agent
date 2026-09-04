# Payments domain governance

> Scope: `domain:payments` — authored by the Payments architecture team.

## HLD rules

1. Services in the `payments` domain must not call the `legacy-billing` context
   synchronously. All cross-context communication must be asynchronous (events).

2. The `payments` domain may only be called by the `checkout` and `orders` contexts.

## LLD rules

3. No module under `src/payments/**` may import from `src/legacy/**`.

4. Domain services must depend on the `payments-core` interface, not on concrete
   provider implementations (dependency inversion).

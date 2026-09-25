# Contract: portal de Stripe

`POST /payments/billing-portal-sessions` body `{ returnUrl: string, lang: 'es' | 'en' }` → `{ url }`; 409 `NO_BILLING_ACCOUNT` sin suscripción viva o sin cliente de Stripe.

`MembershipInfo.hasSubscription: boolean` (nuevo) · `autoRenews = hasSubscription && !renewalCanceled`.

`IPaymentRepository.openBillingPortal(email, returnUrl, lang): Promise<RedirectSession>` (customer-core; mock alterna la renovación).

customer-app: `POST /api/membership/portal { returnUrl, lang }` → 401 / 400 / 409 `{ error }` / 200 `{ url }`.

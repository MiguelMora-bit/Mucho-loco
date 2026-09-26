# Implementation Plan: Pagar en mostrador el atraso de una suscripción

**Branch**: `019-counter-overdue-payment` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
Backend: `MembershipBillingService.overdueInvoice(subId)` (factura abierta de la suscripción) y `settleOutOfBand(invoiceId, subId)` (`invoices.pay` con `paid_out_of_band`, luego `syncSubscription`); `recordInvoice` ignora facturas `paid_out_of_band`; `PaymentsModule` exporta el servicio. `CounterMembershipsService.getOverdue`/`settleOverdue` (Stripe primero; luego `MembershipPayment` + cobro `counter_membership` en una transacción); rutas `GET`/`POST branches/:id/memberships/overdue`; código `PAYMENT_PROVIDER_ERROR` (502). Tipos: `OverdueBalance`. branch-app: repositorio (`getOverdue`/`settleOverdue`, mock con un socio en gracia con suscripción), `MembershipTab` muestra el atraso y lo cobra, ticket.

## Constitution Check
I ✅ contrato + mock + HTTP · II ✅ el monto lo dice Stripe; el servidor registra · III ✅ tipo compartido · IV ✅ textos traducidos · V ✅ e2e con Stripe sobreescrito, tests de branch-app · VI ✅ sin cancelar ni recrear suscripciones · VII ✅ CLAUDE.md.

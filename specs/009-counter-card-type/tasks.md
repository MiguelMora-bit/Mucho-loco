---

description: "Task list for Crédito o débito en mostrador"
---

# Tasks: Crédito o débito en los cobros con tarjeta de mostrador

- [X] T001 Enum `CardType` + `cardType CardType?` en `CounterSale` y `MembershipPayment` (`schema.prisma`) + migración (dev y test); `CardType` y `cardType?` en `@mucho-loco/types`.
- [X] T002 [US1] DTOs (`create-counter-sale.dto.ts`, `counter-membership.dto.ts`) con `@IsOptional() @IsIn(['credit','debit']) cardType`; servicios lo guardan solo con `card`.
- [X] T003 [US1] `ChargesService` (`recordCounterSale` y membresía de mostrador): `method = card_<tipo>` cuando hay tipo; unit en `charges.service.spec.ts`.
- [X] T004 [US1] e2e en `branch-ops.e2e-spec.ts`: venta con `card`+`debit` → `Charge.method = card_debit`; sin tipo → `card`; renovación con `credit` → `card_credit`.
- [X] T005 [US1] branch-app: `cardType` en `counterSaleRepository.createSale` y `membershipRepository.renewMembership/signUpNewMember` (mock guarda, HTTP manda); tests.
- [X] T006 [US1] branch-app UI: selector "¿Crédito o débito?" obligatorio con tarjeta en `ProductSaleTab.tsx` y `MembershipTab.tsx`; textos es/en.
- [X] T007 Docs y validación.

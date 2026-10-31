# FinSage

## Built

- Frontend-only React + Vite + TypeScript app in `artifacts/finsage`.
- All four connected tabs: Financial X-Ray, Life Decision Simulator, Money Allocation Studio, and Roadmap.
- One editable financial profile shared through React context, with guarded localStorage persistence. Browser storage failure does not prevent use.
- Pure financial functions in `src/engine/`, including EMI, outstanding balance, monthly FIRE projection, yearly net worth, return ranges, X-Ray findings, home purchase and allocation outcomes.
- Live simulator controls, three home presets, six comparison outcomes, two-line Recharts projection, affordability warning, rule-based verdict and future X-Ray drawer.
- Allocation presets, capped buckets, goal timing, corpus ranges and an Apply action that updates the profile SIP.
- Plain CSS, the supplied palette, Inter, Indian money formatting, responsive layout, status words as well as colours, and the educational disclaimer.

## Checks

Run from the project root:

```sh
pnpm --filter @workspace/finsage test
pnpm --filter @workspace/finsage run typecheck
```

All 21 engine tests pass, including all eight section 9 scenarios and additional boundary tests. TypeScript checking passes. The running landing screen was inspected with a desktop screenshot; no application console errors appeared. No automated end-to-end browser suite was run.

For the exact section 5 EMI formula, the ₹44 lakh loan EMI is ₹38,184.22, which displays as ₹38,184. This is within ₹1 of the section 9 approximate ₹38,185; the formula is not adjusted to force a different rounded result.

## Assumptions and clarifications

- Annual investment and cash returns use nominal monthly rates (`annualRate / 12`). Contributions occur at month-end; the first annual SIP step-up applies after twelve contributions. Inflation and property appreciation use annual compounding over elapsed years.
- The profile supports adult ages 18–69 so the projection has a meaningful horizon through age 70. Historical target ages show “Already passed” in the allocation screen.
- Salary and recurring spending stay nominally constant. Inflation increases the FIRE target; there is no unstated salary-growth assumption.
- Annual SIP step-ups remain as specified. In the net-worth model, contributions above available income reduce the liquid balance rather than creating free assets. A negative projected cash balance indicates an unfunded cash-flow requirement; no overdraft interest is modelled.
- Existing EMIs have no supplied principal, rate or maturity, so they remain recurring outflows. The newly modelled home loan amortises using its supplied rate and tenure; its EMI stops on maturity.
- Cash shortfalls remain negative in Future B so insufficient funds are visible, not silently replaced by zero.
- Zero essential outflow gives unlimited emergency coverage. Zero income is not given a positive savings rate.
- Life cover is Strong with dependents when cover meets or exceeds 10× annual take-home income; the PRD explicitly defines only the inadequate-cover branches.
- Allocation presets use their exact percentages, even when a percentage creates an amount between slider steps. Manual slider movement uses ₹1,000 steps and the engine always clamps to available funds.
- Emergency top-ups grow at the cash-return assumption; short-term goals begin with no earmarked balance. No short-term contribution means “Not funded.”
- An insurance allocation means “Planned”, not purchased coverage. Loan prepayment is a budget allocation only: no existing-loan balance or rate is supplied to model a revised amortisation.
- Applying an allocation changes only monthly SIP, exactly as specified. Other bucket amounts are plans, not transactions against savings.
- Only the profile persists across reloads. Scenario controls, goal settings, tab selection and allocation plans are session state. Tabs are in-app navigation rather than separate routes.
- The idle-cash message follows the supplied illustrative rule; it is not a claim that a 6%-return FD necessarily loses to 6% inflation before tax.

## Deliberately excluded

No backend, database, authentication, API keys, LLM calls, tax calculations, account connections, additional decision types, dark mode, PDF export or analytics. The template's shared API and mockup packages are not used or needed by FinSage. No requested in-scope feature was intentionally skipped.

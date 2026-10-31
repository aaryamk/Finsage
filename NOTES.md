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

The original 21 engine tests pass, including all eight section 9 scenarios and additional boundary tests. The Extra Money extension adds 17 tests; all 38 pass. TypeScript and running-UI checks are described with the corresponding extension below. No automated end-to-end browser suite was run.

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

No backend, database, authentication, API keys, LLM calls, full tax calculator, account connections, additional life-decision types, dark mode, PDF export or analytics. Extra Money adds only the limited illustrative tax model requested for its comparisons. The template's shared API and mockup packages are not used or needed by FinSage. No requested in-scope feature was intentionally skipped.

## Extra Money extension

### Scope and integration

- Extra Money compares the six requested categories in Grow it mode and models monthly income in SWP mode. Return, volatility, deployment and versioned tax constants live together in `src/engine/windfallConstants.ts`; simulation and financial calculations live in `src/engine/windfall.ts`.
- The existing app has no Time Machine tab. Extra Money is placed after Decision Simulator without inventing a separate feature. Profile additions flow to the existing X-Ray, Simulator and Allocation Studio.
- The amount represents **new money not already counted in the profile**. Buffer and plan actions add it to the chosen profile balance and reduce the uncommitted amount, preventing another click from adding the same remainder twice. Profile changes use functional state updates.
- The uncommitted amount remains in shared session context when switching tabs, including a zero balance after adding the money. Other Extra Money controls reset on leaving the tab, and only the financial profile persists after a page reload.
- The “15+ yrs” control uses 15 years for the selected comparison. The heatmap and fan chart still show projections out to 20 years.
- Controls and source labels are modelling inputs, not purchases or orders. No product, fund or stock recommendations are made.

### Simulation assumptions

- The default simulation uses 2,000 seeded paths and monthly lognormal returns, with an arithmetic annual expected return calibrated through `log(1 + return)`. The seed is 42. Twenty yearly summaries are returned even when the selected horizon is shorter. New random seeds change sampled outcomes; the same inputs and seed reproduce them exactly.
- FD has zero volatility. Its monthly growth factor is calibrated to an effective annual 6.75%, producing a single point rather than a range. Other categories model only their specified return and volatility, not guarantees, fees, credit defaults or market-specific regimes.
- Percentiles and loss probabilities are sampled, not forecasts or personal success probabilities. A first year with loss probability below 5% is a simulated milestone, not a guarantee for subsequent years.
- STP transfers one-twelfth of the original amount at the end of each of the first twelve months. The parked balance earns liquid returns until transfer. Residual parking gains stay in liquid and continue growing. Common seeded market draws support paired comparisons; liquid/equity correlations are simplified rather than estimated from history.
- A zero-volatility custom STP also uses zero parking volatility for deterministic tests. With equal liquid and equity return assumptions, its total matches the same-rate lump-sum account.
- Median doubling time is linearly interpolated between yearly median points. If doubling does not occur within 20 years, no exact doubling date is claimed.
- Today's-rupee values discount outcomes at 6% annual inflation. In this view, “below the starting amount” is a purchasing-power comparison, not a nominal capital-loss measure.

### Illustrative tax model

- `TAX_FY_2026_27` implements the rules supplied in the attachment, not independently verified current law. The UI labels these as illustrative assumptions.
- Equity gains held **more than** twelve months use 12.5% above an annual ₹1,25,000 allowance. Holdings of twelve months or less use 20%. Hybrid is treated as equity, as explicitly requested.
- Each exit scenario assumes the full annual equity exemption is available; it does not know the user's other gains. No cess, surcharge, transaction fees, loss carry-forwards, dividend taxation or other tax relief is modelled.
- FD and liquid gains use the chosen tax slab at exit. The yearly FD tax obligation is deliberately simplified to exit tax.
- STP equity lots retain their own transfer dates and cost bases for short/long-term classification; parking gains are slab-taxed. Taxes on intermediate liquid redemptions are accrued and deducted at the final exit instead of reducing transfers during deployment. Cross-category loss set-offs are not assumed.
- SWP withdrawals target net cash when After tax is selected. Redemptions include the modelled tax on their proportionate realised gain, with the equity allowance refreshed each withdrawal year. Gains before the start date remain unrealised until withdrawals.

### Withdrawal assumptions

- Corpus grows for the selected whole-number delay before withdrawals start. Withdrawals then occur at the beginning of each month, followed by that month's return.
- The balance path covers 30 years **after withdrawals start**. “30+ years” means no depletion was observed within that window, not a promise that money lasts forever. A zero withdrawal has an unbounded modelled duration.
- Sustainable monthly income is a binary-searched, whole-rupee withdrawal supported for at least 20 years in 90% of the same sampled paths. It is illustrative, fixed nominal income, not a safe-withdrawal guarantee. Inflation does not increase withdrawals.
- For very small corpus values where 2% is below ₹1,000, the slider minimum is reduced to the maximum available; zero corpus disables funded-income actions.
- The FD monthly-interest comparison is `corpus × 6.75% / 12`, reduced by the slab in After tax mode. It excludes reinvestment and uses the currently entered corpus rather than projecting a different FD balance for a deferral.
- Computed results are memoized in bounded caches. Changing display controls reuses raw paths where possible; simulations do not use external APIs or upload the financial profile.

### Tests

The Extra Money tests cover every requested acceptance case plus tax views, inflation adjustment, percentile ordering, horizon selection, milestones, comfort labels, capped emergency funding, immutable profile additions, delayed withdrawal growth, twenty-year low-percentile survival and invalid/zero inputs.

Desktop and phone screenshots confirm that the Extra Money screen renders using the existing responsive design. TypeScript checking passes. The original landing tab remains X-Ray.

## Visual redesign

- This pass changes presentation only. The original calculation engine, simulation defaults, tax assumptions and tests are kept unchanged.
- Home is the renamed X-Ray landing view. Existing findings remain available through “Why?” drawers rather than long card explanations. Profile inputs move into a drawer; the existing profile persistence and reset behaviour are retained.
- The new Time Machine navigation exposes the existing engine's projections as a visual view, not a new calculation model. Roadmap content remains accessible outside the primary pill navigation.
- No historical balance or transaction series exists in the app. Historical-looking Home visuals must therefore be labelled as current snapshots or existing forward projections, not fabricated past-month results. No unsupported percentage-growth claim is introduced.
- The global currency-view control reuses Extra Money's existing inflation-adjusted view. It does not introduce a new inflation formula into the other financial projections; their existing nominal basis must remain disclosed.
- The current interface was preserved from its real source code as an isolated canvas reference before the redesign. Canvas references never write to the real profile's browser storage.

## Simplified Extra Money comparison

- Replaces the previous Extra Money charts, heatmap, SWP mode, STP comparison, insights and plan checklist. The screen has only amount, years and risk inputs, followed by SAFER / MEDIUM / HIGH portfolio groups.
- All nine options and the fixed mix weights live in `windfallGroupsConstants.ts`. Risk selection changes only highlighting; it is not a simulation parameter.
- Reuses the existing seeded monthly Monte Carlo paths. An additive mixed-portfolio helper combines each path's weighted holdings before taking percentiles, rather than averaging individual medians. Existing financial functions are unchanged.
- Mixed portfolios are buy-and-hold, with independent draws between holdings and no rebalancing, fees or external tax transactions. Correlations are not calibrated; displayed ranges are illustrative, not forecasts. Equity holdings share one annual capital-gains allowance within a group.
- Values show today's rupees after the existing illustrative exit-tax model: 30% slab for FD/debt, equity rates from the existing tax constants, and tax exemption for PPF. The original 6% inflation assumption remains. Negative real gains are displayed in red rather than presented as positive growth.
- “Chance of loss” means nominal capital loss after tax, before inflation adjustment. FD and PPF have zero modelled volatility and show “None”; stochastic options with fewer than 3% observed losses show “Very low,” including when the finite sample contains zero losses.
- Each individual option compares investing the full entered amount. Group values apply the suggested split; mix-bar tooltips show each allocated amount. PPF values before year 15 are illustrative locked balances, not withdrawable proceeds; statutory contribution limits still apply.
- The option drawer reuses the already-calculated annual outcomes for 1, 3, 5 and 10 years, avoiding additional simulations when it opens.
- Adding money commits the entered amount to invested corpus and consumes the shared uncommitted balance. This balance survives tab navigation; like the existing implementation, input selections and the uncommitted balance are session-only, while the financial profile is saved locally.
- Verification: all 50 unit tests pass, including the four requested comparison cases, portfolio aggregation, shared taxation, lock-in warnings and zero amounts. TypeScript checking passes.
- A browser pass confirmed risk-only highlighting, live recalculation, timeline warnings, deterministic FD/PPF drawer values, Escape/focus restoration, one-time profile addition and consumed-balance preservation across tabs. No horizontal overflow was found at 390×844 or 1440×900. Screenshots may catch the intentional 300ms count-up in progress; settled values agree with the model.

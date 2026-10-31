---
name: Windfall accounting
description: Why Extra Money inputs must be treated as unrecorded funds and not reset on ordinary tab navigation.
---

Treat the Extra Money amount as new money not yet included in the financial profile. Committing any portion to emergency savings or a plan consumes that portion of the uncommitted balance.

**Why:** Resetting a consumed amount when navigating back from X-Ray would present the same windfall as available to add again, making an apparently harmless navigation inflate the user's recorded assets.

**How to apply:** Preserve the uncommitted balance across tab changes and update the destination profile field atomically. Do not silently interpret existing recorded savings as new money.

For the simplified comparison, “chance of loss” refers to nominal after-tax capital loss, while displayed outcomes are in today's after-tax rupees.

**Why:** The user explicitly requires FD and PPF to show no principal-loss chance. An inflation-adjusted outcome can nevertheless be below the starting amount; that is purchasing-power erosion, not nominal principal loss.

**How to apply:** Preserve the distinction in future risk labels and disclose the value basis. Do not treat zero observed losses in a finite stochastic sample as a guarantee.

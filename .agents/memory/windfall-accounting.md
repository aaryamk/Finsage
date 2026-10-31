---
name: Windfall accounting
description: Why Extra Money inputs must be treated as unrecorded funds and not reset on ordinary tab navigation.
---

Treat the Extra Money amount as new money not yet included in the financial profile. Committing any portion to emergency savings or a plan consumes that portion of the uncommitted balance.

**Why:** Resetting a consumed amount when navigating back from X-Ray would present the same windfall as available to add again, making an apparently harmless navigation inflate the user's recorded assets.

**How to apply:** Preserve the uncommitted balance across tab changes and update the destination profile field atomically. Do not silently interpret existing recorded savings as new money.

import { ASSUMPTIONS as A } from '../engine/constants';

const pct = (n: number) => `${+(n * 100).toFixed(1)}%`;

export const ASSUMPTION_ROWS: [string, string][] = [
  ['Investment return (baseline)', `${pct(A.baselineReturn)} / yr`],
  ['Pessimistic / optimistic return', `${pct(A.pessimisticReturn)} / ${pct(A.optimisticReturn)}`],
  ['Inflation', `${pct(A.inflation)} / yr`],
  ['Cash / FD return', `${pct(A.cashReturn)} / yr`],
  ['Home appreciation', `${pct(A.homeAppreciation)} / yr`],
  ['FIRE multiple', `${A.fireMultiple} × annual expenses`],
  ['Home upfront costs', `${pct(A.upfrontCosts)} of price`],
  ['Home maintenance + tax', `${pct(A.homeMaintenance)} of price / yr`],
  ['Simulation horizon', `until age ${A.horizonAge}`],
];

/** The shared assumption table. Nominal, before tax. */
export function AssumptionsTable() {
  return (
    <div data-testid="popover-assumptions">
      <p className="why-note">Every tab uses these fixed, illustrative rates. Nominal, before tax.</p>
      <table className="atable"><tbody>
        {ASSUMPTION_ROWS.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
      </tbody></table>
    </div>
  );
}

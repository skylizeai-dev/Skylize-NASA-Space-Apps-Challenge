import {
  NEAR,
  coverageShare,
  type Coverage,
  type CoverageCell,
} from "@/lib/coverage";
import { FUEL_GROUP_LABEL, fmtNum, fuelGroup } from "@/lib/format";

interface Props {
  coverage: Coverage;
  cells: CoverageCell[];
  nearest: { oxygen_pct: number; pressure_kpa: number } | null;
  onJump: (oxygen_pct: number, pressure_kpa: number) => void;
}

function pct(share: number) {
  return `${Math.round(share * 100)} %`;
}

export default function GapsPanel({ coverage, cells, nearest, onJump }: Props) {
  const share = coverageShare(cells);
  const fuels = Array.from(new Set(coverage.findings.map((f) => FUEL_GROUP_LABEL[fuelGroup(f)])));
  const flows = coverage.findings.filter((f) => f.flow_cm_s !== null && f.flow_cm_s > 0).length;

  return (
    <section
      aria-label="Data gaps"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
    >
      <h3 className="text-base font-semibold">Data gaps</h3>

      <p className="text-sm">
        Your atmosphere sits in {coverage.status === "untested" ? "an" : "a"}{" "}
        <strong className="font-semibold">{coverage.status}</strong> region:{" "}
        {coverage.conditions === 0 ? (
          <>no findings within ±{NEAR.oxygen_pct} % O₂ and ±{NEAR.pressure_kpa} kPa.</>
        ) : (
          <>
            {coverage.findings.length} {coverage.findings.length === 1 ? "finding" : "findings"} from{" "}
            {coverage.conditions} test {coverage.conditions === 1 ? "condition" : "conditions"}.
            Fuels: {fuels.join(", ")}.{" "}
            {flows === 0
              ? "None with forced airflow."
              : `${flows} of ${coverage.findings.length} with forced airflow.`}
          </>
        )}
      </p>

      {coverage.status !== "tested" && nearest && (
        <p className="text-sm text-ink-2">
          Nearest tested region:{" "}
          <span className="tnum text-ink">
            {fmtNum(nearest.oxygen_pct)} % O₂, {fmtNum(nearest.pressure_kpa)} kPa
          </span>
          .{" "}
          <button
            type="button"
            onClick={() => onJump(nearest.oxygen_pct, nearest.pressure_kpa)}
            className="text-accent underline underline-offset-2"
          >
            Jump there
          </button>
        </p>
      )}

      <div className="flex flex-col gap-1.5 border-t border-line pt-3">
        <p className="text-xs text-ink-2">
          Share of the mapped plane (10 to 40 % O₂, 30 to 110 kPa)
        </p>
        <div className="flex h-3 w-full overflow-hidden rounded-sm border border-line" aria-hidden="true">
          <div className="bg-ramp-1" style={{ width: pct(share.tested).replace(" ", "") }} />
          <div className="hatch-light" style={{ width: pct(share.thin).replace(" ", "") }} />
          <div className="hatch flex-1" />
        </div>
        <p className="tnum text-xs text-ink-2">
          Tested {pct(share.tested)}, thin {pct(share.thin)}, untested {pct(share.untested)}
        </p>
      </div>

      <p className="text-xs text-muted">
        A gap is not evidence of safety. It means this dataset has no source-checked finding there.
      </p>
    </section>
  );
}

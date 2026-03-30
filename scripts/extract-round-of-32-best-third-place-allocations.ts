import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

type AllocationRow = {
  optionCode: number;
  qualifiedThirdPlaceGroups: string[];
  assignments: {
    "1A": string;
    "1B": string;
    "1D": string;
    "1E": string;
    "1G": string;
    "1I": string;
    "1K": string;
    "1L": string;
  };
};

const outputPath = "data/round-of-32-best-third-place-allocations.json";
const pdfPath = "FWC26_Competition Regulations_EN.pdf";
const EXPECTED_ROW_COUNT = 495;
const REQUIRED_OPTION_CODE = 19;

if (!existsSync(pdfPath)) {
  throw new Error(`Missing FIFA regulations PDF at "${pdfPath}". Keep the file locally before extracting the allocation dataset.`);
}

try {
  execFileSync("which", ["pdftotext"], { stdio: "ignore" });
} catch {
  throw new Error('Missing "pdftotext" in PATH. Install poppler-utils before extracting the allocation dataset.');
}

let rawText: string;

try {
  rawText = execFileSync("pdftotext", ["-f", "41", "-l", "49", "-raw", pdfPath, "-"], {
    encoding: "utf-8",
  });
} catch (error) {
  throw new Error(
    `Failed to extract round-of-32 best-third-place allocations from "${pdfPath}" with pdftotext: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}

const slotOrder = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"] as const;

const rows = rawText
  .split("\n")
  .map((line) => line.trim())
  .map((line) => line.replace(/^C\.\s+/, ""))
  .map((line) =>
    line.match(
      /^(\d{1,3})\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])$/,
    ),
  )
  .filter((match): match is RegExpMatchArray => Boolean(match))
  .map((match) => {
    const codes = match.slice(2);
    const qualifiedThirdPlaceGroups = [...new Set(codes.map((value) => value.slice(1)))].sort();

    return {
      optionCode: Number(match[1]),
      qualifiedThirdPlaceGroups,
      assignments: Object.fromEntries(
        slotOrder.map((slot, index) => [slot, codes[index].slice(1)]),
      ) as AllocationRow["assignments"],
    } satisfies AllocationRow;
  })
  .sort((left, right) => left.optionCode - right.optionCode);

const optionCodes = new Set(rows.map((row) => row.optionCode));

// The current FIFA PDF layout yields 495 allocation rows; option code 19 is a known
// valid row and acts as a quick sanity check that parsing did not drift.
if (
  rows.length !== EXPECTED_ROW_COUNT ||
  optionCodes.size !== EXPECTED_ROW_COUNT ||
  !optionCodes.has(REQUIRED_OPTION_CODE)
) {
  throw new Error(
    `Unexpected allocation matrix shape: expected rows=${EXPECTED_ROW_COUNT}, expected unique=${EXPECTED_ROW_COUNT}, required option code=${REQUIRED_OPTION_CODE}, received rows=${rows.length}, unique=${optionCodes.size}`,
  );
}

mkdirSync("data", { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(rows, null, 2)}\n`);

console.log(`Wrote ${rows.length} rows to ${outputPath}`);

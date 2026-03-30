import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

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

const rawText = execFileSync(
  "pdftotext",
  ["-f", "41", "-l", "49", "-raw", "FWC26_Competition Regulations_EN.pdf", "-"],
  {
    encoding: "utf-8",
  },
);

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

if (rows.length !== 495 || optionCodes.size !== 495 || !optionCodes.has(19)) {
  throw new Error(`Unexpected allocation matrix shape: rows=${rows.length}, unique=${optionCodes.size}`);
}

mkdirSync("data", { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(rows, null, 2)}\n`);

console.log(`Wrote ${rows.length} rows to ${outputPath}`);

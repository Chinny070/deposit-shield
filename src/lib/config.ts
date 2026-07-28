import { studionet, localnet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";

const CHAINS = { studionet, localnet, testnetAsimov, testnetBradbury } as const;

type ChainName = keyof typeof CHAINS;

const chainName = (process.env.NEXT_PUBLIC_GENLAYER_CHAIN ?? "studionet") as ChainName;

export const chain = CHAINS[chainName] ?? studionet;
export const chainLabel = chainName;

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ??
  "0x0000000000000000000000000000000000000000";

export const DEPOSIT_STATUS = {
  CREATED: 0,
  FUNDED: 1,
  MOVE_IN_RECORDED: 2,
  ACTIVE: 3,
  MOVE_OUT_SUBMITTED: 4,
  EVALUATED: 5,
  RESOLVED: 6,
  CANCELLED: 7,
} as const;

export const STATUS_LABELS: Record<number, string> = {
  [DEPOSIT_STATUS.CREATED]: "Awaiting Funding",
  [DEPOSIT_STATUS.FUNDED]: "Funded — Awaiting Move-in Evidence",
  [DEPOSIT_STATUS.MOVE_IN_RECORDED]: "Move-in Recorded — Awaiting Confirmation",
  [DEPOSIT_STATUS.ACTIVE]: "Active Tenancy",
  [DEPOSIT_STATUS.MOVE_OUT_SUBMITTED]: "Move-out Submitted — Ready for Evaluation",
  [DEPOSIT_STATUS.EVALUATED]: "Evaluated — Ready to Resolve",
  [DEPOSIT_STATUS.RESOLVED]: "Resolved",
  [DEPOSIT_STATUS.CANCELLED]: "Cancelled",
};

export const DAMAGE_LABELS: Record<string, string> = {
  NONE: "No Damage",
  MINOR: "Minor Wear",
  MODERATE: "Moderate Damage",
  SEVERE: "Severe Damage",
  INCONCLUSIVE: "Inconclusive",
};

export const DAMAGE_COLORS: Record<string, string> = {
  NONE: "text-emerald-600",
  MINOR: "text-amber-500",
  MODERATE: "text-orange-500",
  SEVERE: "text-red-600",
  INCONCLUSIVE: "text-neutral-400",
};

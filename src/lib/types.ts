export interface DepositData {
  deposit_id: number;
  landlord: string;
  tenant: string;
  deposit_amount: number;
  property_desc: string;
  status: number;
  status_name: string;
  move_in_url: string;
  move_out_url: string;
  damage_category: string;
  tenant_percent: number;
  reasoning: string;
  created_at: string;
  funded_at: string;
  move_in_at: string;
  activated_at: string;
  move_out_at: string;
  evaluated_at: string;
  resolved_at: string;
}

export type WalletMode = "injected" | "generated" | "none";

export interface WalletState {
  mode: WalletMode;
  address: string;
  connected: boolean;
}

export interface TxProgress {
  hash: string;
  status: string;
  startedAt: number;
}

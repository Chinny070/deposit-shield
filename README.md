# DepositShield

Rental security deposit arbitration on GenLayer. Neither the landlord nor the tenant decides the dispute — consensus does, using visual evidence.

## The Problem

Rental deposit disputes are adversarial by default. The landlord inspects the property, the landlord decides what counts as damage, the landlord decides how much to withhold. The tenant's only recourse is small claims court, which costs more in time than most deposits are worth. Both sides have financial incentive to lie, and the decision-maker is always one of the parties.

## Why GenLayer

Delete GenLayer from this project. What breaks? A single party — the landlord — becomes the sole arbiter of their own dispute. Every counterparty must trust them to be honest about damage they financially benefit from claiming.

GenLayer consensus replaces the single-party judge with a panel of validators who independently evaluate visual evidence. The contract fetches move-in and move-out photos, passes them to an LLM via `exec_prompt(images=[...])`, and uses `prompt_comparative` equivalence to ensure validators agree on a categorical damage assessment. No single validator can bias the outcome.

This is not web scraping dressed up as consensus. The core non-deterministic operation is irreducibly visual — comparing two images of a physical space to assess wear and damage. No regex, no price feed, no deterministic check can answer "did the tenant cause damage beyond normal wear and tear."

## How Consensus Works

One non-deterministic operation: `evaluate_condition`.

The contract:
1. Fetches the move-in evidence URL via `web.render(mode="screenshot")`
2. Fetches the move-out evidence URL via `web.render(mode="screenshot")`
3. Passes both images to `exec_prompt(images=[move_in, move_out])` with a structured prompt
4. The LLM classifies damage into one of five categories: NONE, MINOR, MODERATE, SEVERE, or INCONCLUSIVE

Equivalence principle:

> Both evaluations must agree on the damage category (NONE, MINOR, MODERATE, SEVERE, or INCONCLUSIVE). The category is what matters for the deposit split, not the exact wording. Two evaluations that name the same category are equivalent even if their reasoning sentences differ. Two evaluations that name different categories are NOT equivalent regardless of reasoning similarity.

Categories are banded to fixed payout percentages so validators agree on a category, not a float:

| Category | Tenant Receives | Landlord Receives |
|---|---|---|
| NONE | 100% | 0% |
| MINOR | 85% | 15% |
| MODERATE | 50% | 50% |
| SEVERE | 15% | 85% |
| INCONCLUSIVE | — | — (retry) |

INCONCLUSIVE is an explicit abstention. It means the evidence was insufficient to judge. The deposit stays locked and evaluation can be retried with better evidence.

## What Is Deliberately Deterministic

Everything except the visual comparison:
- Access control (who can call what, based on address matching)
- Deposit lifecycle state machine (status transitions, validation)
- Value arithmetic (payout splits, percentage calculations)
- Input validation (URL length, description length, amount > 0)
- Storage and retrieval

Making these deterministic strengthens the case for consensus. The validators are asked what the world shows, never what the contract should do.

## Architecture

```
Landlord                    Tenant
   |                          |
   |-- create_deposit ------->|  (deterministic, ~30s)
   |                          |-- fund_deposit (payable, ~30s)
   |                          |-- submit_move_in_evidence (~30s)
   |-- confirm_move_in ------>|  (~30s)
   |                          |
   |     [tenancy period]     |
   |                          |
   |-- submit_move_out ------>|  (either party, ~30s)
   |                          |
   |-- evaluate_condition ----|  (consensus, 2-5 min, permissionless)
   |                          |
   |-- resolve_deposit ------>|  (distributes funds, ~30s)
```

All writes except `evaluate_condition` are deterministic and settle in ~30 seconds. The slow consensus step is a separate transaction that anyone can trigger.

## Two-Wallet System

- **Injected wallet** (MetaMask, Rabby): detected automatically, used for signing
- **Browser wallet**: generated locally, private key persisted in localStorage, with export/import and an honest warning that it is not custody-grade

Both paths share a single identity source. The displayed address and the write account are always the same.

## Contract Address

**StudioNet:** `[TO BE DEPLOYED]`

## Setup

```bash
git clone <repo-url>
cd deposit-shield
npm install
cp .env.example .env.local
# Edit .env.local with your deployed contract address
npm run dev
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_GENLAYER_CHAIN` | `studionet` | Target chain |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | — | Deployed contract address |

### Contract Development

```bash
pip install genvm-linter genlayer-test
PYTHONIOENCODING=utf-8 genvm-lint check contracts/deposit_shield.py --json
pytest tests/direct/ -v
gltest tests/integration/ -v -s --network studionet
```

### Deployment

```bash
genlayer network set studionet
genlayer deploy --contract contracts/deposit_shield.py
```

## Test Coverage

38 direct-mode tests covering:
- Deposit creation (7 tests): valid creation, ID incrementing, input validation, query by role
- Funding (4 tests): successful funding, wrong sender, insufficient value, wrong status
- Move-in evidence (5 tests): submission, confirmation, access control, URL validation
- Move-out evidence (4 tests): submission by either party, third-party rejection, status guard
- Evaluation (9 tests): all five damage categories, malformed JSON, fenced JSON, invalid category, status guard
- Resolution (5 tests): full refund, landlord keeps most, tenant-initiated, third-party rejection, status guard
- Cancellation (5 tests): unfunded cancel, funded refund, post-move-in rejection
- Edge cases (4 tests): nonexistent deposit, empty queries, reasoning truncation

## Honest Limits

- **StudioNet balances are simulated.** Value flows (`emit_transfer`) are tracked but not proven the way they would be on a real chain.
- **Consensus writes take 2-5 minutes.** The UI shows real-time consensus stage progression.
- **UNDETERMINED happens.** Validators sometimes fail to agree. Nothing is written, and the call can be retried. The UI explains this.
- **Photo quality matters.** Blurry or mismatched photos produce INCONCLUSIVE results. The contract handles this explicitly rather than guessing.
- **Max two images per evaluation.** GenVM limits `exec_prompt` to two images. For multi-room assessments, users should create a composite image or a hosted page with all photos.

## Stack

- Next.js 16 (App Router) + TypeScript (strict)
- Tailwind CSS 4
- genlayer-js 1.1.8
- Python intelligent contract targeting GenVM
- No backend, no database — the contract is the source of truth

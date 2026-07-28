# Decision Record: DepositShield

## Candidates Evaluated

### 1. SLA Guardian (Value + Web Fetching)
Service providers stake GEN as uptime bond. Anyone triggers a check — contract fetches the service URL, evaluates SLA compliance via consensus. Bond pays out on violation.

### 2. DepositShield (Value + Visual Evidence)
Rental deposit arbitration. Landlord and tenant lock deposit on-chain. Move-in and move-out photos are compared by consensus using visual evidence. Deposit split by damage ruling.

### 3. GigVerify (Value + Web Fetching)
Freelance milestone escrow. Client posts gig with escrowed GEN per milestone. Contract fetches deliverable URLs and evaluates completion.

### 4. WhistleVault (Value + Web Fetching + Embeddings)
Anonymous tip verification with bounties. Tips matched to bounties via semantic search, evidence fetched and verified by consensus.

### 5. TruthStake (Value + Web Fetching + Embeddings)
Factual claim verification. Users register claims with evidence URLs. Challengers stake against claims. Contract fetches evidence and rules.

### 6. AdProof (Value + Visual Evidence + Web Fetching)
Advertising compliance verification. Advertisers stake bond. Anyone challenges by pointing to ad URL. Contract screenshots the ad and evaluates claims.

### 7. SkillMint (Web Fetching + Visual Evidence + Embeddings)
Verifiable skill credentials. Users claim skills with evidence URLs. Contract fetches and screenshots evidence, evaluates via consensus.

### 8. ContentGuard (Value + Web Fetching + Visual Evidence)
Content licensing enforcement. Creators register content. Buyers report infringement with URLs. Contract fetches and visually compares content.

## Capabilities Covered

| Candidate | Native Value | Web Fetching | Visual Evidence | Embeddings |
|-----------|:---:|:---:|:---:|:---:|
| SLA Guardian | x | x | | |
| DepositShield | x | | x | |
| GigVerify | x | x | | |
| WhistleVault | x | x | | x |
| TruthStake | x | x | | x |
| AdProof | x | x | x | |
| SkillMint | | x | x | x |
| ContentGuard | x | x | x | |

**Distinct capabilities represented:** 4 (value, web fetching, visual evidence, embeddings)
**Candidates involving value:** 7 of 8

## Self-Audit

**How many distinct capabilities are represented?** Four: native value, web fetching, visual evidence, embeddings. The minimum was three.

**Which two candidates are really the same idea twice?** TruthStake and WhistleVault share the same "stake-and-challenge with evidence" structure. AdProof and ContentGuard are both "detect misuse of visual content."

**What would I have picked if web access did not exist?** DepositShield. It relies entirely on visual evidence — screenshots of hosted photos — not on web scraping. The contract fetches hosted images, not live web pages. This is the strongest indicator that it's a genuine use of visual evidence, not a web-fetching project in disguise.

## Chosen: DepositShield

### Gate A — Counterfactual
Delete GenLayer. A single party — the landlord — decides their own dispute. The tenant has no recourse except small claims court. With DepositShield, neither party is the judge.

### Gate B — Two Distrusting Parties
Landlord and tenant. Landlord wants to keep the deposit; tenant wants it back. Their interests are directly opposed at move-out.

### Gate C — Irreducibly Semantic
"Did the tenant cause damage beyond normal wear and tear?" requires visual judgement. No regex, no price feed, no deterministic check can answer it.

### Gate D — Evidence the Contract Fetches Itself
The contract fetches both move-in and move-out photo URLs using `web.render(mode="screenshot")` and passes them to `exec_prompt(images=[...])`. User-submitted URLs are inputs; the contract fetches and evaluates the evidence.

### Gate E — Would a Stranger Use This Twice?
Anyone who has rented an apartment has this problem. The answer is yes.

### Gate F — Path Beyond Submission
Real-world rental deposit disputes affect millions. The concept extends to property management companies, Airbnb-style short-term rentals, and any two-party escrow with visual verification.

### Gate G — Latency Budget
- `create_deposit`: deterministic write, ~30s
- `fund_deposit`: deterministic write, ~30s
- `submit_move_in_evidence`: deterministic write, ~30s
- `confirm_move_in`: deterministic write, ~30s
- `submit_move_out_evidence`: deterministic write, ~30s
- `evaluate_condition`: ONE consensus round with TWO image fetches, ~3-5 min
- `resolve_deposit`: deterministic write, ~30s

Only one consensus round. The user who triggers evaluation knows it will take minutes; all other actions are fast. The slow step is permissionless — anyone can trigger it.

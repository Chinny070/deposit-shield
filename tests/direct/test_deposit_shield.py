import pytest
import json
from genlayer.testing import direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie


CONTRACT_PATH = "contracts/deposit_shield.py"

MOCK_MOVE_IN_URL = "https://example.com/move-in-photos"
MOCK_MOVE_OUT_URL = "https://example.com/move-out-photos"

EVAL_NONE = json.dumps({"category": "NONE", "reasoning": "Property in same condition."})
EVAL_MINOR = json.dumps({"category": "MINOR", "reasoning": "Small nail holes and scuffs."})
EVAL_MODERATE = json.dumps({"category": "MODERATE", "reasoning": "Broken window and stained carpet."})
EVAL_SEVERE = json.dumps({"category": "SEVERE", "reasoning": "Structural damage to walls and floors."})
EVAL_INCONCLUSIVE = json.dumps({"category": "INCONCLUSIVE", "reasoning": "Images too blurry to assess."})


@pytest.fixture
def contract(direct_deploy, direct_alice):
    return direct_deploy(CONTRACT_PATH, sender=direct_alice)


@pytest.fixture
def funded_contract(contract, direct_vm, direct_alice, direct_bob):
    contract.create_deposit("Test apartment, 2BR, hardwood floors", 1000, str(direct_bob), sender=direct_alice)
    direct_vm.value = 1000
    contract.fund_deposit(1, sender=direct_bob)
    direct_vm.value = 0
    return contract


@pytest.fixture
def active_contract(funded_contract, direct_alice, direct_bob):
    funded_contract.submit_move_in_evidence(1, MOCK_MOVE_IN_URL, sender=direct_bob)
    funded_contract.confirm_move_in(1, sender=direct_alice)
    return funded_contract


@pytest.fixture
def move_out_contract(active_contract, direct_alice):
    active_contract.submit_move_out_evidence(1, MOCK_MOVE_OUT_URL, sender=direct_alice)
    return active_contract


# ===== Creation Tests =====

def test_create_deposit(contract, direct_alice, direct_bob):
    contract.create_deposit("Nice apartment downtown, 1BR", 500, str(direct_bob), sender=direct_alice)
    dep = contract.get_deposit(1)
    assert dep["deposit_id"] == 1
    assert dep["landlord"].lower() == str(direct_alice).lower()
    assert dep["tenant"].lower() == str(direct_bob).lower()
    assert dep["deposit_amount"] == 500
    assert dep["status"] == 0
    assert dep["property_desc"] == "Nice apartment downtown, 1BR"


def test_create_increments_id(contract, direct_alice, direct_bob):
    contract.create_deposit("Apartment A", 100, str(direct_bob), sender=direct_alice)
    contract.create_deposit("Apartment B", 200, str(direct_bob), sender=direct_alice)
    assert contract.get_deposit_count() == 2
    assert contract.get_deposit(2)["property_desc"] == "Apartment B"


def test_create_rejects_short_desc(contract, direct_vm, direct_alice, direct_bob):
    direct_vm.expect_revert("property description must be at least 5")
    contract.create_deposit("Hi", 100, str(direct_bob), sender=direct_alice)


def test_create_rejects_zero_amount(contract, direct_vm, direct_alice, direct_bob):
    direct_vm.expect_revert("deposit amount must be positive")
    contract.create_deposit("Valid description", 0, str(direct_bob), sender=direct_alice)


def test_create_rejects_same_landlord_tenant(contract, direct_vm, direct_alice):
    direct_vm.expect_revert("landlord and tenant cannot be the same")
    contract.create_deposit("Valid description", 100, str(direct_alice), sender=direct_alice)


def test_get_deposits_by_landlord(contract, direct_alice, direct_bob):
    contract.create_deposit("Apt 1", 100, str(direct_bob), sender=direct_alice)
    contract.create_deposit("Apt 2", 200, str(direct_bob), sender=direct_alice)
    ids = contract.get_deposits_by_landlord(str(direct_alice))
    assert ids == [1, 2]


def test_get_deposits_by_tenant(contract, direct_alice, direct_bob):
    contract.create_deposit("Apt 1", 100, str(direct_bob), sender=direct_alice)
    ids = contract.get_deposits_by_tenant(str(direct_bob))
    assert ids == [1]


def test_get_all_deposit_ids(contract, direct_alice, direct_bob):
    contract.create_deposit("Apt 1", 100, str(direct_bob), sender=direct_alice)
    contract.create_deposit("Apt 2", 200, str(direct_bob), sender=direct_alice)
    assert contract.get_all_deposit_ids() == [1, 2]


# ===== Funding Tests =====

def test_fund_deposit(contract, direct_vm, direct_alice, direct_bob):
    contract.create_deposit("Test apartment", 1000, str(direct_bob), sender=direct_alice)
    direct_vm.value = 1000
    contract.fund_deposit(1, sender=direct_bob)
    dep = contract.get_deposit(1)
    assert dep["status"] == 1
    assert dep["funded_at"] != ""


def test_fund_rejects_wrong_sender(contract, direct_vm, direct_alice, direct_bob, direct_charlie):
    contract.create_deposit("Test apartment", 1000, str(direct_bob), sender=direct_alice)
    direct_vm.value = 1000
    direct_vm.expect_revert("only the designated tenant")
    contract.fund_deposit(1, sender=direct_charlie)


def test_fund_rejects_insufficient_value(contract, direct_vm, direct_alice, direct_bob):
    contract.create_deposit("Test apartment", 1000, str(direct_bob), sender=direct_alice)
    direct_vm.value = 500
    direct_vm.expect_revert("must send at least")
    contract.fund_deposit(1, sender=direct_bob)


def test_fund_rejects_wrong_status(funded_contract, direct_vm, direct_bob):
    direct_vm.value = 1000
    direct_vm.expect_revert("cannot fund")
    funded_contract.fund_deposit(1, sender=direct_bob)


# ===== Move-in Evidence Tests =====

def test_submit_move_in_evidence(funded_contract, direct_bob):
    funded_contract.submit_move_in_evidence(1, MOCK_MOVE_IN_URL, sender=direct_bob)
    dep = funded_contract.get_deposit(1)
    assert dep["status"] == 2
    assert dep["move_in_evidence_url"] == MOCK_MOVE_IN_URL


def test_move_in_rejects_wrong_sender(funded_contract, direct_vm, direct_alice):
    direct_vm.expect_revert("only the tenant")
    funded_contract.submit_move_in_evidence(1, MOCK_MOVE_IN_URL, sender=direct_alice)


def test_move_in_rejects_short_url(funded_contract, direct_vm, direct_bob):
    direct_vm.expect_revert("evidence URL must be a valid URL")
    funded_contract.submit_move_in_evidence(1, "short", sender=direct_bob)


def test_confirm_move_in(funded_contract, direct_alice, direct_bob):
    funded_contract.submit_move_in_evidence(1, MOCK_MOVE_IN_URL, sender=direct_bob)
    funded_contract.confirm_move_in(1, sender=direct_alice)
    dep = funded_contract.get_deposit(1)
    assert dep["status"] == 3
    assert dep["activated_at"] != ""


def test_confirm_rejects_non_landlord(funded_contract, direct_vm, direct_bob):
    funded_contract.submit_move_in_evidence(1, MOCK_MOVE_IN_URL, sender=direct_bob)
    direct_vm.expect_revert("only the landlord")
    funded_contract.confirm_move_in(1, sender=direct_bob)


# ===== Move-out Evidence Tests =====

def test_submit_move_out_evidence_by_landlord(active_contract, direct_alice):
    active_contract.submit_move_out_evidence(1, MOCK_MOVE_OUT_URL, sender=direct_alice)
    dep = active_contract.get_deposit(1)
    assert dep["status"] == 4
    assert dep["move_out_evidence_url"] == MOCK_MOVE_OUT_URL


def test_submit_move_out_evidence_by_tenant(active_contract, direct_bob):
    active_contract.submit_move_out_evidence(1, MOCK_MOVE_OUT_URL, sender=direct_bob)
    dep = active_contract.get_deposit(1)
    assert dep["status"] == 4


def test_move_out_rejects_third_party(active_contract, direct_vm, direct_charlie):
    direct_vm.expect_revert("only the landlord or tenant")
    active_contract.submit_move_out_evidence(1, MOCK_MOVE_OUT_URL, sender=direct_charlie)


def test_move_out_rejects_wrong_status(funded_contract, direct_vm, direct_bob):
    direct_vm.expect_revert("cannot submit move-out evidence")
    funded_contract.submit_move_out_evidence(1, MOCK_MOVE_OUT_URL, sender=direct_bob)


# ===== Evaluation Tests =====

def test_evaluate_none(move_out_contract, direct_vm, direct_alice):
    direct_vm.mock_web(r".*move-in.*", b"fake-image-data")
    direct_vm.mock_web(r".*move-out.*", b"fake-image-data")
    direct_vm.mock_llm(r".*", EVAL_NONE)

    move_out_contract.evaluate_condition(1, sender=direct_alice)
    dep = move_out_contract.get_deposit(1)
    assert dep["status"] == 5
    assert dep["damage_category"] == "NONE"
    assert dep["tenant_payout_percent"] == 100


def test_evaluate_minor(move_out_contract, direct_vm, direct_alice):
    direct_vm.mock_web(r".*", b"fake-image-data")
    direct_vm.mock_llm(r".*", EVAL_MINOR)

    move_out_contract.evaluate_condition(1, sender=direct_alice)
    dep = move_out_contract.get_deposit(1)
    assert dep["damage_category"] == "MINOR"
    assert dep["tenant_payout_percent"] == 85


def test_evaluate_moderate(move_out_contract, direct_vm, direct_alice):
    direct_vm.mock_web(r".*", b"fake-image-data")
    direct_vm.mock_llm(r".*", EVAL_MODERATE)

    move_out_contract.evaluate_condition(1, sender=direct_alice)
    dep = move_out_contract.get_deposit(1)
    assert dep["damage_category"] == "MODERATE"
    assert dep["tenant_payout_percent"] == 50


def test_evaluate_severe(move_out_contract, direct_vm, direct_alice):
    direct_vm.mock_web(r".*", b"fake-image-data")
    direct_vm.mock_llm(r".*", EVAL_SEVERE)

    move_out_contract.evaluate_condition(1, sender=direct_alice)
    dep = move_out_contract.get_deposit(1)
    assert dep["damage_category"] == "SEVERE"
    assert dep["tenant_payout_percent"] == 15


def test_evaluate_inconclusive_does_not_advance(move_out_contract, direct_vm, direct_alice):
    direct_vm.mock_web(r".*", b"fake-image-data")
    direct_vm.mock_llm(r".*", EVAL_INCONCLUSIVE)

    move_out_contract.evaluate_condition(1, sender=direct_alice)
    dep = move_out_contract.get_deposit(1)
    assert dep["status"] == 4  # stays at MOVE_OUT_SUBMITTED
    assert dep["damage_category"] == "INCONCLUSIVE"


def test_evaluate_malformed_json(move_out_contract, direct_vm, direct_alice):
    direct_vm.mock_web(r".*", b"fake-image-data")
    direct_vm.mock_llm(r".*", "this is not json at all")

    move_out_contract.evaluate_condition(1, sender=direct_alice)
    dep = move_out_contract.get_deposit(1)
    assert dep["status"] == 4
    assert dep["damage_category"] == "INCONCLUSIVE"
    assert "LLM_ERROR" in dep["evaluation_reasoning"]


def test_evaluate_fenced_json(move_out_contract, direct_vm, direct_alice):
    fenced = '```json\n{"category": "MINOR", "reasoning": "Nail holes"}\n```'
    direct_vm.mock_web(r".*", b"fake-image-data")
    direct_vm.mock_llm(r".*", fenced)

    move_out_contract.evaluate_condition(1, sender=direct_alice)
    dep = move_out_contract.get_deposit(1)
    assert dep["damage_category"] == "MINOR"


def test_evaluate_invalid_category(move_out_contract, direct_vm, direct_alice):
    bad = json.dumps({"category": "CATASTROPHIC", "reasoning": "Made up category"})
    direct_vm.mock_web(r".*", b"fake-image-data")
    direct_vm.mock_llm(r".*", bad)

    move_out_contract.evaluate_condition(1, sender=direct_alice)
    dep = move_out_contract.get_deposit(1)
    assert dep["damage_category"] == "INCONCLUSIVE"
    assert "LLM_ERROR" in dep["evaluation_reasoning"]


def test_evaluate_rejects_wrong_status(active_contract, direct_vm, direct_alice):
    direct_vm.expect_revert("cannot evaluate")
    active_contract.evaluate_condition(1, sender=direct_alice)


# ===== Resolution Tests =====

def test_resolve_none_full_refund(move_out_contract, direct_vm, direct_alice):
    direct_vm.mock_web(r".*", b"fake-image-data")
    direct_vm.mock_llm(r".*", EVAL_NONE)
    move_out_contract.evaluate_condition(1, sender=direct_alice)

    move_out_contract.resolve_deposit(1, sender=direct_alice)
    dep = move_out_contract.get_deposit(1)
    assert dep["status"] == 6
    assert dep["resolved_at"] != ""


def test_resolve_severe_landlord_keeps_most(move_out_contract, direct_vm, direct_alice):
    direct_vm.mock_web(r".*", b"fake-image-data")
    direct_vm.mock_llm(r".*", EVAL_SEVERE)
    move_out_contract.evaluate_condition(1, sender=direct_alice)

    move_out_contract.resolve_deposit(1, sender=direct_alice)
    dep = move_out_contract.get_deposit(1)
    assert dep["status"] == 6
    assert dep["tenant_payout_percent"] == 15


def test_resolve_by_tenant(move_out_contract, direct_vm, direct_alice, direct_bob):
    direct_vm.mock_web(r".*", b"fake-image-data")
    direct_vm.mock_llm(r".*", EVAL_NONE)
    move_out_contract.evaluate_condition(1, sender=direct_alice)

    move_out_contract.resolve_deposit(1, sender=direct_bob)
    dep = move_out_contract.get_deposit(1)
    assert dep["status"] == 6


def test_resolve_rejects_third_party(move_out_contract, direct_vm, direct_alice, direct_charlie):
    direct_vm.mock_web(r".*", b"fake-image-data")
    direct_vm.mock_llm(r".*", EVAL_NONE)
    move_out_contract.evaluate_condition(1, sender=direct_alice)

    direct_vm.expect_revert("only landlord or tenant")
    move_out_contract.resolve_deposit(1, sender=direct_charlie)


def test_resolve_rejects_wrong_status(move_out_contract, direct_vm, direct_alice):
    direct_vm.expect_revert("cannot resolve")
    move_out_contract.resolve_deposit(1, sender=direct_alice)


# ===== Cancellation Tests =====

def test_cancel_unfunded_by_landlord(contract, direct_alice, direct_bob):
    contract.create_deposit("Test apartment", 1000, str(direct_bob), sender=direct_alice)
    contract.cancel_deposit(1, sender=direct_alice)
    dep = contract.get_deposit(1)
    assert dep["status"] == 7


def test_cancel_unfunded_rejects_tenant(contract, direct_vm, direct_alice, direct_bob):
    contract.create_deposit("Test apartment", 1000, str(direct_bob), sender=direct_alice)
    direct_vm.expect_revert("only the landlord")
    contract.cancel_deposit(1, sender=direct_bob)


def test_cancel_funded_by_landlord(funded_contract, direct_alice):
    funded_contract.cancel_deposit(1, sender=direct_alice)
    dep = funded_contract.get_deposit(1)
    assert dep["status"] == 7


def test_cancel_funded_by_tenant(funded_contract, direct_bob):
    funded_contract.cancel_deposit(1, sender=direct_bob)
    dep = funded_contract.get_deposit(1)
    assert dep["status"] == 7


def test_cancel_rejects_after_move_in(active_contract, direct_vm, direct_alice):
    direct_vm.expect_revert("cannot cancel after move-in")
    active_contract.cancel_deposit(1, sender=direct_alice)


# ===== Edge Cases =====

def test_nonexistent_deposit(contract, direct_vm):
    direct_vm.expect_revert("deposit 999 does not exist")
    contract.get_deposit(999)


def test_empty_landlord_query(contract, direct_charlie):
    result = contract.get_deposits_by_landlord(str(direct_charlie))
    assert result == []


def test_empty_tenant_query(contract, direct_charlie):
    result = contract.get_deposits_by_tenant(str(direct_charlie))
    assert result == []


def test_deposit_count_starts_zero(contract):
    assert contract.get_deposit_count() == 0


def test_evaluate_truncates_long_reasoning(move_out_contract, direct_vm, direct_alice):
    long_reasoning = "x" * 1000
    response = json.dumps({"category": "MINOR", "reasoning": long_reasoning})
    direct_vm.mock_web(r".*", b"fake-image-data")
    direct_vm.mock_llm(r".*", response)

    move_out_contract.evaluate_condition(1, sender=direct_alice)
    dep = move_out_contract.get_deposit(1)
    assert len(dep["evaluation_reasoning"]) <= 500

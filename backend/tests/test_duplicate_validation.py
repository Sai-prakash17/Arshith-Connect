import pytest
import concurrent.futures
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.registration_request import RegistrationRequest

client = TestClient(app)

# Clean up any leftover test data before and after tests
def cleanup_test_records():
    test_ids = ["TEST-001", "TEST-002", "TEST-003", "TEST-DUP-ID", "TEST-CONCUR", "AFI-999"]
    test_emails = [
        "test_unique@arshith.com",
        "test_dup_id@arshith.com",
        "test_dup_email@arshith.com",
        "test_dup_phone@arshith.com",
        "test_dup_id_email@arshith.com",
        "test_dup_email_phone@arshith.com",
        "test_dup_id_phone@arshith.com",
        "test_dup_all@arshith.com",
        "test_case_email@arshith.com",
        "test_format_phone@arshith.com",
        "test_concur@arshith.com",
        "seed_dup@arshith.com",
    ]
    with SessionLocal() as db:
        for em in test_emails:
            db.query(RegistrationRequest).filter(RegistrationRequest.email.ilike(em)).delete()
            db.query(Employee).filter(Employee.email.ilike(em)).delete()
            db.query(User).filter(User.email.ilike(em)).delete()
        for eid in test_ids:
            db.query(RegistrationRequest).filter(RegistrationRequest.employee_id.ilike(eid)).delete()
            db.query(Employee).filter(Employee.employee_id.ilike(eid)).delete()
        db.commit()


@pytest.fixture(autouse=True)
def run_around_tests():
    cleanup_test_records()
    yield
    cleanup_test_records()


def seed_reference_employee():
    """Seed a reference employee for duplicate checks."""
    res = client.post(
        "/api/auth/register",
        json={
            "fullName": "Reference User",
            "employeeId": "TEST-001",
            "email": "seed_dup@arshith.com",
            "phone": "9812345678",
            "password": "Password@123",
            "confirmPassword": "Password@123",
        },
    )
    assert res.status_code == 201


# Case 1: All three fields are new — registration succeeds
def test_case_1_all_three_fields_new():
    res = client.post(
        "/api/auth/register",
        json={
            "fullName": "New Employee",
            "employeeId": "TEST-002",
            "email": "test_unique@arshith.com",
            "phone": "9812345001",
            "password": "Password@123",
            "confirmPassword": "Password@123",
        },
    )
    assert res.status_code == 201, f"Failed: {res.json()}"
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "PENDING"


# Case 2: Only the Employee ID exists — Employee ID error appears
def test_case_2_only_employee_id_duplicate():
    seed_reference_employee()
    res = client.post(
        "/api/auth/register",
        json={
            "fullName": "Another User",
            "employeeId": "TEST-001",  # duplicate ID
            "email": "test_dup_id@arshith.com",  # new email
            "phone": "9812345002",  # new phone
            "password": "Password@123",
            "confirmPassword": "Password@123",
        },
    )
    assert res.status_code == 409
    data = res.json()
    assert "errors" in data
    assert data["errors"].get("employee_id") == "This Employee ID already exists."
    assert "email" not in data["errors"]
    assert "phone" not in data["errors"]


# Case 3: Only the email exists — email error appears
def test_case_3_only_email_duplicate():
    seed_reference_employee()
    res = client.post(
        "/api/auth/register",
        json={
            "fullName": "Another User",
            "employeeId": "TEST-002",  # new ID
            "email": "seed_dup@arshith.com",  # duplicate email
            "phone": "9812345003",  # new phone
            "password": "Password@123",
            "confirmPassword": "Password@123",
        },
    )
    assert res.status_code == 409
    data = res.json()
    assert "errors" in data
    assert data["errors"].get("email") == "This email address is already registered."
    assert "employee_id" not in data["errors"]
    assert "phone" not in data["errors"]


# Case 4: Only the phone number exists — phone error appears
def test_case_4_only_phone_duplicate():
    seed_reference_employee()
    res = client.post(
        "/api/auth/register",
        json={
            "fullName": "Another User",
            "employeeId": "TEST-003",  # new ID
            "email": "test_dup_phone@arshith.com",  # new email
            "phone": "9812345678",  # duplicate phone
            "password": "Password@123",
            "confirmPassword": "Password@123",
        },
    )
    assert res.status_code == 409
    data = res.json()
    assert "errors" in data
    assert data["errors"].get("phone") == "This phone number is already registered."
    assert "employee_id" not in data["errors"]
    assert "email" not in data["errors"]


# Case 5: Employee ID and email both exist — both errors appear
def test_case_5_id_and_email_duplicate():
    seed_reference_employee()
    res = client.post(
        "/api/auth/register",
        json={
            "fullName": "Another User",
            "employeeId": "TEST-001",  # duplicate ID
            "email": "seed_dup@arshith.com",  # duplicate email
            "phone": "9812345005",  # new phone
            "password": "Password@123",
            "confirmPassword": "Password@123",
        },
    )
    assert res.status_code == 409
    data = res.json()
    assert "errors" in data
    assert data["errors"].get("employee_id") == "This Employee ID already exists."
    assert data["errors"].get("email") == "This email address is already registered."
    assert "phone" not in data["errors"]


# Case 6: Email and phone both exist — both errors appear
def test_case_6_email_and_phone_duplicate():
    seed_reference_employee()
    res = client.post(
        "/api/auth/register",
        json={
            "fullName": "Another User",
            "employeeId": "TEST-003",  # new ID
            "email": "seed_dup@arshith.com",  # duplicate email
            "phone": "9812345678",  # duplicate phone
            "password": "Password@123",
            "confirmPassword": "Password@123",
        },
    )
    assert res.status_code == 409
    data = res.json()
    assert "errors" in data
    assert data["errors"].get("email") == "This email address is already registered."
    assert data["errors"].get("phone") == "This phone number is already registered."
    assert "employee_id" not in data["errors"]


# Case 7: Employee ID and phone both exist — both errors appear
def test_case_7_id_and_phone_duplicate():
    seed_reference_employee()
    res = client.post(
        "/api/auth/register",
        json={
            "fullName": "Another User",
            "employeeId": "TEST-001",  # duplicate ID
            "email": "test_dup_id_phone@arshith.com",  # new email
            "phone": "9812345678",  # duplicate phone
            "password": "Password@123",
            "confirmPassword": "Password@123",
        },
    )
    assert res.status_code == 409
    data = res.json()
    assert "errors" in data
    assert data["errors"].get("employee_id") == "This Employee ID already exists."
    assert data["errors"].get("phone") == "This phone number is already registered."
    assert "email" not in data["errors"]


# Case 8: All three fields exist — all three errors appear
def test_case_8_all_three_fields_duplicate():
    seed_reference_employee()
    res = client.post(
        "/api/auth/register",
        json={
            "fullName": "Another User",
            "employeeId": "TEST-001",  # duplicate ID
            "email": "seed_dup@arshith.com",  # duplicate email
            "phone": "9812345678",  # duplicate phone
            "password": "Password@123",
            "confirmPassword": "Password@123",
        },
    )
    assert res.status_code == 409
    data = res.json()
    assert "errors" in data
    assert data["errors"].get("employee_id") == "This Employee ID already exists."
    assert data["errors"].get("email") == "This email address is already registered."
    assert data["errors"].get("phone") == "This phone number is already registered."


# Case 9: Email differs only in letter case — duplicate is detected
def test_case_9_email_case_insensitivity():
    seed_reference_employee()
    # Stored as "seed_dup@arshith.com", submitted in uppercase
    res = client.post(
        "/api/auth/register",
        json={
            "fullName": "Case Test User",
            "employeeId": "TEST-002",
            "email": "SEED_DUP@ARSHITH.COM",
            "phone": "9812345009",
            "password": "Password@123",
            "confirmPassword": "Password@123",
        },
    )
    assert res.status_code == 409
    data = res.json()
    assert "errors" in data
    assert data["errors"].get("email") == "This email address is already registered."


# Case 10: Phone number uses equivalent formatting variation — duplicate is detected
def test_case_10_phone_formatting_variations():
    seed_reference_employee()
    # Stored as "9812345678"
    # Format 1: With dashes and spaces
    res1 = client.post(
        "/api/auth/register",
        json={
            "fullName": "Format User 1",
            "employeeId": "TEST-002",
            "email": "format1@arshith.com",
            "phone": "98123-45678",
            "password": "Password@123",
            "confirmPassword": "Password@123",
        },
    )
    assert res1.status_code == 409
    assert res1.json()["errors"].get("phone") == "This phone number is already registered."

    # Format 2: With country code prefix +91 and spaces
    res2 = client.post(
        "/api/auth/register",
        json={
            "fullName": "Format User 2",
            "employeeId": "TEST-003",
            "email": "format2@arshith.com",
            "phone": "+91 98123 45678",
            "password": "Password@123",
            "confirmPassword": "Password@123",
        },
    )
    assert res2.status_code == 409
    assert res2.json()["errors"].get("phone") == "This phone number is already registered."


# Case 11: Two requests attempt to register the same employee simultaneously — only one can succeed
def test_case_11_concurrent_registrations():
    payload = {
        "fullName": "Concurrent User",
        "employeeId": "TEST-CONCUR",
        "email": "test_concur@arshith.com",
        "phone": "9812345011",
        "password": "Password@123",
        "confirmPassword": "Password@123",
    }

    results = []

    def send_register():
        # New client per thread to simulate concurrent requests
        c = TestClient(app)
        return c.post("/api/auth/register", json=payload)

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(send_register)
        f2 = executor.submit(send_register)
        results = [f1.result(), f2.result()]

    status_codes = [r.status_code for r in results]
    # Exactly one must succeed (201) and the other must be rejected (409)
    assert 201 in status_codes
    assert 409 in status_codes


# Case 12: Invalid or missing registration fields — appropriate validation errors appear
def test_case_12_invalid_or_missing_fields():
    # Missing email
    res1 = client.post(
        "/api/auth/register",
        json={
            "fullName": "Incomplete User",
            "employeeId": "TEST-002",
            "phone": "9812345012",
            "password": "Password@123",
        },
    )
    assert res1.status_code == 422

    # Invalid email format
    res2 = client.post(
        "/api/auth/register",
        json={
            "fullName": "Bad Email User",
            "employeeId": "TEST-002",
            "email": "not-an-email",
            "phone": "9812345012",
            "password": "Password@123",
        },
    )
    assert res2.status_code == 422

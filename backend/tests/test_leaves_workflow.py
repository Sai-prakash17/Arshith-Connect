import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.leave import Leave
from app.models.employee import Employee
from app.models.user import User

client = TestClient(app)

ADMIN_EMAIL = "admin@arshith.com"
ADMIN_PASSWORD = "AdminPassword@123"
EMPLOYEE_EMAIL = "employee@arshith.com"
EMPLOYEE_PASSWORD = "Employee@123"


@pytest.fixture(scope="module")
def admin_token():
    res = client.post(
        "/api/auth/admin-login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def employee_token():
    res = client.post(
        "/api/auth/login",
        json={"email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD},
    )
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(autouse=True)
def cleanup_test_leaves():
    db = SessionLocal()
    try:
        db.query(Leave).filter(
            Leave.leave_code != "LV-1543",
            Leave.reason.in_([
                "Family function",
                "Doctor appointment",
                "Annual vacation",
                "Test",
                "Personal family commitment",
                "Dentist consultation",
                "Personal emergency",
            ])
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()
    yield
    db = SessionLocal()
    try:
        db.query(Leave).filter(
            Leave.leave_code != "LV-1543",
            Leave.reason.in_([
                "Family function",
                "Doctor appointment",
                "Annual vacation",
                "Test",
                "Personal family commitment",
                "Dentist consultation",
                "Personal emergency",
            ])
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_existing_record_lv_1543_has_complete_fields(employee_token, admin_token):
    """Verify that existing record LV-1543 returns all required fields for table columns."""
    res = client.get("/api/leaves", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    leaves = res.json()
    lv1543 = next((l for l in leaves if l.get("request_id") == "LV-1543" or l.get("id") == "LV-1543"), None)
    assert lv1543 is not None
    # Verify all 8 table columns have data
    assert lv1543.get("request_id") == "LV-1543"
    assert lv1543.get("leave_type") == "Emergency Leave"
    assert lv1543.get("from_date") == "2026-10-20"
    assert lv1543.get("to_date") == "2026-10-20"
    assert lv1543.get("days") == 1
    assert lv1543.get("reason") == "personal reason"
    assert lv1543.get("applied_on") is not None
    assert lv1543.get("status") == "Approved"


def test_employee_submits_valid_casual_leave(employee_token, admin_token):
    """Employee submits Casual Leave (CL) and all fields are saved and returned."""
    start = (date.today() + timedelta(days=30)).isoformat()
    end = (date.today() + timedelta(days=31)).isoformat()

    payload = {
        "leaveType": "Casual Leave (CL)",
        "startDate": start,
        "endDate": end,
        "reason": "Family function",
    }
    res = client.post(
        "/api/leaves",
        json=payload,
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 201
    created = res.json()
    assert created["request_id"].startswith("LV-")
    assert created["leave_type"] == "Casual Leave"
    assert created["from_date"] == start
    assert created["to_date"] == end
    assert created["days"] == 2
    assert created["reason"] == "Family function"
    assert created["applied_on"] is not None
    assert created["status"] == "Pending"

    # Cleanup or test approval next
    leave_id = created["id"]

    # Admin approves
    approve_res = client.patch(
        f"/api/leaves/{leave_id}",
        json={"status": "Approved"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert approve_res.status_code == 200
    approved = approve_res.json()
    assert approved["status"] == "Approved"
    assert approved["approved_at"] is not None
    assert approved["approved_by"] is not None

    # Employee views in history
    hist_res = client.get("/api/leaves/me", headers={"Authorization": f"Bearer {employee_token}"})
    assert hist_res.status_code == 200
    my_leaves = hist_res.json()
    found = next((l for l in my_leaves if l["id"] == leave_id), None)
    assert found is not None
    assert found["status"] == "Approved"
    assert found["from_date"] == start
    assert found["to_date"] == end
    assert found["days"] == 2


def test_employee_submits_valid_sick_leave_and_admin_rejects(employee_token, admin_token):
    """Employee submits Sick Leave (SL) and admin rejects it."""
    start = (date.today() + timedelta(days=40)).isoformat()
    end = (date.today() + timedelta(days=40)).isoformat()

    payload = {
        "leave_type": "SL",
        "from_date": start,
        "to_date": end,
        "reason": "Doctor appointment",
    }
    res = client.post(
        "/api/leaves",
        json=payload,
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 201
    created = res.json()
    assert created["leave_type"] == "Sick Leave"
    assert created["days"] == 1

    # Admin rejects
    leave_id = created["id"]
    reject_res = client.patch(
        f"/api/leaves/{leave_id}",
        json={"status": "Rejected", "rejectionRemarks": "Staff shortage on this date"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert reject_res.status_code == 200
    rejected = reject_res.json()
    assert rejected["status"] == "Rejected"
    assert rejected["rejection_reason"] == "Staff shortage on this date"


def test_employee_submits_earned_leave(employee_token):
    """Employee submits Earned Leave (EL) with snake_case aliases."""
    start = (date.today() + timedelta(days=50)).isoformat()
    end = (date.today() + timedelta(days=51)).isoformat()

    payload = {
        "leave_type": "EL",
        "from_date": start,
        "to_date": end,
        "reason": "Annual vacation",
    }
    res = client.post(
        "/api/leaves",
        json=payload,
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 201
    created = res.json()
    assert created["leave_type"] == "Earned Leave"
    assert created["days"] == 2
    assert created["status"] == "Pending"


def test_invalid_date_range_rejected(employee_token):
    """Reject request where end date is earlier than start date."""
    res = client.post(
        "/api/leaves",
        json={
            "leaveType": "Casual Leave",
            "startDate": "2026-12-10",
            "endDate": "2026-12-05",
            "reason": "Invalid dates",
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 400
    assert "End date cannot be earlier than start date" in res.json()["detail"]


def test_invalid_leave_type_rejected(employee_token):
    """Reject unsupported leave type."""
    res = client.post(
        "/api/leaves",
        json={
            "leaveType": "FakeLeaveType123",
            "startDate": "2026-12-01",
            "endDate": "2026-12-02",
            "reason": "Test",
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 400
    assert "Invalid leave type" in res.json()["detail"]


def test_insufficient_leave_balance_rejected(employee_token):
    """Reject request when requested days exceed available balance."""
    res = client.post(
        "/api/leaves",
        json={
            "leaveType": "Sick Leave",
            "startDate": "2026-11-01",
            "endDate": "2026-11-20",  # 20 days exceeds max Sick Leave of 8 days
            "reason": "Extended illness",
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 400
    assert "Insufficient Sick Leave balance" in res.json()["detail"]


def test_leave_balances_endpoint(employee_token):
    """Employee balances endpoint returns live quota calculations."""
    res = client.get("/api/leaves/balances", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 200
    balances = res.json()
    assert "casualLeave" in balances
    assert "sickLeave" in balances
    assert "earnedLeave" in balances
    assert balances["casualLeave"]["total"] == 12
    assert balances["sickLeave"]["total"] == 8
    assert balances["earnedLeave"]["total"] == 15
    assert balances["casualLeave"]["available"] >= 0


def test_employee_cannot_approve_leave(employee_token):
    """Non-admin user cannot approve leave requests."""
    res = client.patch(
        "/api/leaves/LV-1543",
        json={"status": "Approved"},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 403


def test_repeated_approval_does_not_deduct_twice(admin_token, employee_token):
    """Verify repeated approvals do not duplicate leave deduction."""
    bal_res1 = client.get("/api/leaves/balances", headers={"Authorization": f"Bearer {employee_token}"})
    assert bal_res1.status_code == 200
    avail1 = bal_res1.json()["casualLeave"]["available"]

    # Calling approve again on an already approved leave
    res = client.patch(
        "/api/leaves/LV-1543",
        json={"status": "Approved"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200

    bal_res2 = client.get("/api/leaves/balances", headers={"Authorization": f"Bearer {employee_token}"})
    avail2 = bal_res2.json()["casualLeave"]["available"]
    assert avail1 == avail2


def test_employee_submits_hourly_leave_valid(employee_token):
    """Employee submits valid Hourly Leave and backend computes duration in hours."""
    target_date = (date.today() + timedelta(days=60)).isoformat()
    payload = {
        "leaveType": "Sick Leave (SL)",
        "durationType": "Hourly Leave",
        "leaveDate": target_date,
        "startTime": "14:00",
        "endTime": "16:30",
        "reason": "Dentist consultation",
    }
    res = client.post(
        "/api/leaves",
        json=payload,
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 201
    created = res.json()
    assert created["duration_type"] == "Hourly Leave"
    assert created["durationType"] == "Hourly Leave"
    assert created["hours_count"] == 2.5
    assert created["hours"] == 2.5
    assert created["start_time"] == "14:00"
    assert created["end_time"] == "16:30"
    assert "2.5" in created["duration_display"]
    assert created["from_date"] == target_date
    assert created["to_date"] == target_date


def test_hourly_leave_invalid_time_range_rejected(employee_token):
    """End time earlier than or equal to start time must be rejected."""
    target_date = (date.today() + timedelta(days=61)).isoformat()
    # End earlier than start
    res = client.post(
        "/api/leaves",
        json={
            "leaveType": "Emergency Leave",
            "durationType": "Hourly Leave",
            "leaveDate": target_date,
            "startTime": "15:00",
            "endTime": "13:00",
            "reason": "Personal emergency",
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 400
    assert "End Time must be later than Start Time." in res.json()["detail"]

    # End equal to start
    res_equal = client.post(
        "/api/leaves",
        json={
            "leaveType": "Emergency Leave",
            "durationType": "Hourly Leave",
            "leaveDate": target_date,
            "startTime": "11:00",
            "endTime": "11:00",
            "reason": "Personal emergency",
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res_equal.status_code == 400
    assert "End Time must be later than Start Time." in res_equal.json()["detail"]


def test_hourly_leave_missing_times_rejected(employee_token):
    """Reject hourly leave when start time or end time is missing."""
    target_date = (date.today() + timedelta(days=62)).isoformat()
    res = client.post(
        "/api/leaves",
        json={
            "leaveType": "Casual Leave (CL)",
            "durationType": "Hourly Leave",
            "leaveDate": target_date,
            "startTime": "10:00",
            "reason": "Doctor appointment",
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 400
    assert "Start Time and End Time are required for hourly leave." in res.json()["detail"]


def test_empty_leave_duration_rejected(employee_token):
    """Explicitly empty leave duration must be rejected."""
    target_date = (date.today() + timedelta(days=63)).isoformat()
    res = client.post(
        "/api/leaves",
        json={
            "leaveType": "Casual Leave",
            "durationType": "   ",
            "startDate": target_date,
            "endDate": target_date,
            "reason": "Family function",
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 400
    assert "Please select a leave duration." in res.json()["detail"]


def test_empty_reason_rejected(employee_token):
    """Blank reason must be rejected."""
    target_date = (date.today() + timedelta(days=64)).isoformat()
    res = client.post(
        "/api/leaves",
        json={
            "leaveType": "Sick Leave",
            "durationType": "Full-Day Leave",
            "startDate": target_date,
            "endDate": target_date,
            "reason": "   ",
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert res.status_code == 400
    assert "Please enter a reason for your leave." in res.json()["detail"]


def test_all_six_leave_types_accepted(employee_token):
    """All 6 required leave types are accepted by backend."""
    six_types = [
        "Casual Leave (CL)",
        "Sick Leave (SL)",
        "Earned Leave (EL)",
        "Emergency Leave",
        "Maternity / Paternity",
        "Compensatory Off",
    ]
    for idx, lt in enumerate(six_types):
        s = (date.today() + timedelta(days=70 + idx * 2)).isoformat()
        e = s
        res = client.post(
            "/api/leaves",
            json={
                "leaveType": lt,
                "durationType": "Full-Day Leave",
                "startDate": s,
                "endDate": e,
                "reason": "Doctor appointment",
            },
            headers={"Authorization": f"Bearer {employee_token}"},
        )
        assert res.status_code == 201, f"Failed for leave type {lt}: {res.json()}"
        data = res.json()
        assert data["duration_type"] == "Full-Day Leave"
        assert data["days"] == 1


def test_admin_approves_hourly_leave(employee_token, admin_token):
    """Admin successfully reviews and approves an hourly leave request."""
    target_date = (date.today() + timedelta(days=90)).isoformat()
    apply_res = client.post(
        "/api/leaves",
        json={
            "leaveType": "Emergency Leave",
            "durationType": "Hourly Leave",
            "leaveDate": target_date,
            "startTime": "09:00",
            "endTime": "11:00",
            "reason": "Personal emergency",
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert apply_res.status_code == 201
    leave_id = apply_res.json()["request_id"]

    approve_res = client.patch(
        f"/api/leaves/{leave_id}",
        json={"status": "Approved"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert approve_res.status_code == 200
    approved = approve_res.json()
    assert approved["status"] == "Approved"
    assert approved["duration_type"] == "Hourly Leave"
    assert approved["hours_count"] == 2.0


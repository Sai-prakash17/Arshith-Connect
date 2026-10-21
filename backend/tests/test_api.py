import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Verify health endpoint reports connected database."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


def test_admin_login_success():
    """Verify admin login with valid credentials."""
    response = client.post(
        "/api/auth/admin-login",
        json={"email": "admin@arshith.com", "password": "AdminPassword@123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "admin"
    assert data["user"]["email"] == "admin@arshith.com"


def test_employee_login_success():
    """Verify employee login with valid credentials."""
    response = client.post(
        "/api/auth/login",
        json={"email": "employee@arshith.com", "password": "Employee@123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "employee"


def test_login_invalid_password():
    """Verify rejected authentication for invalid credentials."""
    response = client.post(
        "/api/auth/login",
        json={"email": "employee@arshith.com", "password": "WrongPassword999"},
    )
    assert response.status_code == 401


def test_admin_only_protection():
    """Verify employees cannot access admin-only endpoints."""
    # 1. Login as employee
    emp_token = client.post(
        "/api/auth/login",
        json={"email": "employee@arshith.com", "password": "Employee@123"},
    ).json()["access_token"]

    # 2. Try to add an employee (admin only)
    response = client.post(
        "/api/employees",
        headers={"Authorization": f"Bearer {emp_token}"},
        json={
            "employeeId": "AFI-999",
            "name": "Intruder User",
            "email": "intruder@arshith.com",
            "department": "Operations",
        },
    )
    assert response.status_code == 403


def test_employee_lifecycle():
    """Verify adding, fetching, and listing employees."""
    admin_token = client.post(
        "/api/auth/admin-login",
        json={"email": "admin@arshith.com", "password": "AdminPassword@123"},
    ).json()["access_token"]

    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create employee
    test_emp_id = "AFI-777"
    test_email = "test777@arshith.com"

    # Delete if existing from previous run
    client.delete(f"/api/employees/{test_emp_id}", headers=headers)

    create_res = client.post(
        "/api/employees",
        headers=headers,
        json={
            "employeeId": test_emp_id,
            "name": "Jane Doe",
            "email": test_email,
            "department": "Engineering",
            "role": "Senior Developer",
            "phone": "9998887776",
        },
    )
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["employeeId"] == test_emp_id
    assert created_data["name"] == "Jane Doe"

    # Reject duplicate ID
    dup_res = client.post(
        "/api/employees",
        headers=headers,
        json={
            "employeeId": test_emp_id,
            "name": "Duplicate User",
            "email": "another@arshith.com",
        },
    )
    assert dup_res.status_code == 409

    # List employees includes newly created
    list_res = client.get("/api/employees", headers=headers)
    assert list_res.status_code == 200
    all_emps = list_res.json()
    assert any(e["employeeId"] == test_emp_id for e in all_emps)

    # Cleanup test employee so it does not pollute production/staging database
    client.delete(f"/api/employees/{test_emp_id}", headers=headers)


def test_attendance_flow():
    """Verify attendance check-in, check-out, and status."""
    from app.db.session import SessionLocal
    from app.models.attendance import Attendance
    from app.services.attendance_service import get_attendance_today
    today = get_attendance_today()

    # Ensure clean state for today before testing
    with SessionLocal() as db:
        db.query(Attendance).filter(Attendance.employee_id == "AFI-001", Attendance.date == today).delete()
        db.commit()

    emp_token = client.post(
        "/api/auth/login",
        json={"email": "employee@arshith.com", "password": "Employee@123"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {emp_token}"}

    # Valid JPEG image bytes
    import io
    from PIL import Image
    buf = io.BytesIO()
    img = Image.new("RGB", (20, 20), color=(11, 61, 43))
    img.save(buf, format="JPEG")
    test_jpeg = buf.getvalue()

    files = {"photo": ("selfie.jpg", test_jpeg, "image/jpeg")}
    form_data = {"workMode": "WFO", "latitude": "12.9104417", "longitude": "77.6442435", "accuracy": "10.5"}

    # Check in
    checkin_res = client.post(
        "/api/attendance/check-in",
        headers=headers,
        files=files,
        data=form_data,
    )
    assert checkin_res.status_code == 200
    checkin_data = checkin_res.json()
    assert checkin_data["success"] is True
    assert checkin_data["hasCheckInPhoto"] is True
    att_id = checkin_data["id"]

    # Check today status
    status_res = client.get("/api/attendance/today-status", headers=headers)
    assert status_res.status_code == 200
    today_status = status_res.json()
    assert today_status["isCheckedIn"] is True
    assert today_status["hasCheckInPhoto"] is True

    # Retrieve check-in photo securely
    photo_res = client.get(f"/api/attendance/{att_id}/photo/check-in", headers=headers)
    assert photo_res.status_code == 200
    assert photo_res.headers["content-type"] in ["image/png", "image/jpeg"]
    assert len(photo_res.content) > 0

    # Duplicate check-in rejected
    files2 = {"photo": ("selfie.jpg", test_jpeg, "image/jpeg")}
    dup_res = client.post(
        "/api/attendance/check-in",
        headers=headers,
        files=files2,
        data=form_data,
    )
    assert dup_res.status_code == 409

    # Check out
    checkout_res = client.post(
        "/api/attendance/check-out",
        headers=headers,
        json={},
    )
    assert checkout_res.status_code == 200
    assert checkout_res.json()["success"] is True
    assert checkout_res.json()["status"] == "Completed"

    # Subsequent check-in blocked by daily lock
    files3 = {"photo": ("selfie.jpg", test_jpeg, "image/jpeg")}
    lock_res = client.post(
        "/api/attendance/check-in",
        headers=headers,
        files=files3,
        data=form_data,
    )
    assert lock_res.status_code == 409

    # Subsequent check-out blocked by daily lock
    lock_out_res = client.post(
        "/api/attendance/check-out",
        headers=headers,
        json={},
    )
    assert lock_out_res.status_code == 409


def test_leave_application_and_approval():
    """Verify leave application and admin approval."""
    emp_token = client.post(
        "/api/auth/login",
        json={"email": "employee@arshith.com", "password": "Employee@123"},
    ).json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    admin_token = client.post(
        "/api/auth/admin-login",
        json={"email": "admin@arshith.com", "password": "AdminPassword@123"},
    ).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Employee applies for leave
    apply_res = client.post(
        "/api/leaves",
        headers=emp_headers,
        json={
            "leaveType": "Casual Leave",
            "startDate": "2026-11-01",
            "endDate": "2026-11-03",
            "reason": "Personal family commitment",
        },
    )
    assert apply_res.status_code == 201
    leave_data = apply_res.json()
    leave_id = leave_data["id"]
    assert leave_data["status"] == "Pending"

    # Admin approves leave
    approve_res = client.patch(
        f"/api/leaves/{leave_id}",
        headers=admin_headers,
        json={"status": "Approved"},
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "Approved"


def test_admin_dashboard_metrics():
    """Verify admin dashboard retrieves real calculated metrics."""
    admin_token = client.post(
        "/api/auth/admin-login",
        json={"email": "admin@arshith.com", "password": "AdminPassword@123"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/admin/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "stats" in data
    assert "totalPresent" in data["stats"]
    assert "wfo" in data["stats"]
    assert "wfh" in data["stats"]
    assert "late" in data["stats"]
    assert "pendingLeaves" in data["stats"]
    assert "thisMonthHolidays" in data["stats"]


def test_registration_approval_lifecycle_full():
    """Verify complete employee registration, pending state, admin approval, and subsequent login."""
    from app.db.session import SessionLocal
    from app.models.user import User
    from app.models.employee import Employee
    from app.models.registration_request import RegistrationRequest

    test_email = "newhire@arshith.com"
    test_emp_id = "AFI-888"

    # Clean up any leftover test data
    with SessionLocal() as db:
        db.query(RegistrationRequest).filter(RegistrationRequest.email == test_email).delete()
        emp = db.query(Employee).filter(Employee.email == test_email).first()
        if emp:
            db.delete(emp)
        user = db.query(User).filter(User.email == test_email).first()
        if user:
            db.delete(user)
        db.commit()

    # 1. Employee registers
    reg_res = client.post(
        "/api/auth/register",
        json={
            "fullName": "Alice Newhire",
            "employeeId": test_emp_id,
            "email": test_email,
            "phone": "9876500001",
            "password": "SecurePassword@123",
            "confirmPassword": "SecurePassword@123",
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["success"] is True
    assert reg_data["status"] == "PENDING"
    assert "access_token" not in reg_data

    # 2. Verify account is PENDING and inactive in DB
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == test_email).first()
        assert user is not None
        assert user.approval_status == "PENDING"
        assert user.is_active is False

    # 3. Attempt login before approval (must fail with 403 Forbidden)
    login_res = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": "SecurePassword@123"},
    )
    assert login_res.status_code == 403
    assert "pending Admin approval" in login_res.json()["detail"]

    # 4. Admin logs in
    admin_login = client.post(
        "/api/auth/admin-login",
        json={"email": "admin@arshith.com", "password": "AdminPassword@123"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 5. Admin lists pending requests
    list_res = client.get("/api/admin/employee-registrations?status=PENDING", headers=admin_headers)
    assert list_res.status_code == 200
    pending_list = list_res.json()
    req_item = next((r for r in pending_list if r["email"] == test_email), None)
    assert req_item is not None
    assert req_item["status"] == "Pending"

    # 6. Admin approves the registration
    approve_res = client.patch(
        f"/api/admin/employee-registrations/{req_item['id']}/approve",
        headers=admin_headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "Approved"

    # 7. Verify user and employee are now active in DB
    with SessionLocal() as db:
        approved_user = db.query(User).filter(User.email == test_email).first()
        assert approved_user.approval_status == "APPROVED"
        assert approved_user.is_active is True

    # 8. Employee can now log in successfully
    emp_login = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": "SecurePassword@123"},
    )
    assert emp_login.status_code == 200
    emp_data = emp_login.json()
    assert "access_token" in emp_data
    assert emp_data["role"] == "employee"

    # 9. Approved employee cannot access admin approval endpoint
    emp_token = emp_data["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    unauth_approve = client.patch(
        f"/api/admin/employee-registrations/{req_item['id']}/approve",
        headers=emp_headers,
    )
    assert unauth_approve.status_code == 403

    # 10. Repeated approval on already approved request returns 400
    repeat_res = client.patch(
        f"/api/admin/employee-registrations/{req_item['id']}/approve",
        headers=admin_headers,
    )
    assert repeat_res.status_code == 400

    # Cleanup test employee and user created during test
    with SessionLocal() as db:
        db.query(RegistrationRequest).filter(RegistrationRequest.email == test_email).delete()
        emp = db.query(Employee).filter(Employee.email == test_email).first()
        if emp:
            db.delete(emp)
        user = db.query(User).filter(User.email == test_email).first()
        if user:
            db.delete(user)
        db.commit()


def test_registration_rejection_lifecycle():
    """Verify rejecting employee registration blocks subsequent logins."""
    from app.db.session import SessionLocal
    from app.models.user import User
    from app.models.employee import Employee
    from app.models.registration_request import RegistrationRequest

    reject_email = "rejectedhire@arshith.com"
    reject_emp_id = "AFI-889"

    # Clean up test user
    with SessionLocal() as db:
        db.query(RegistrationRequest).filter(RegistrationRequest.email == reject_email).delete()
        emp = db.query(Employee).filter(Employee.email == reject_email).first()
        if emp:
            db.delete(emp)
        user = db.query(User).filter(User.email == reject_email).first()
        if user:
            db.delete(user)
        db.commit()

    # 1. Register employee
    client.post(
        "/api/auth/register",
        json={
            "fullName": "Bob Rejected",
            "employeeId": reject_emp_id,
            "email": reject_email,
            "password": "Password@123",
        },
    )

    # 2. Admin logs in and rejects request
    admin_token = client.post(
        "/api/auth/admin-login",
        json={"email": "admin@arshith.com", "password": "AdminPassword@123"},
    ).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    reject_res = client.patch(
        f"/api/admin/employee-registrations/{reject_emp_id}/reject",
        headers=admin_headers,
        json={"reason": "Incomplete documentation submitted"},
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "Rejected"

    # 3. Verify user in DB is REJECTED and inactive
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == reject_email).first()
        assert user.approval_status == "REJECTED"
        assert user.is_active is False

    # 4. Attempt login (must be blocked)
    login_res = client.post(
        "/api/auth/login",
        json={"email": reject_email, "password": "Password@123"},
    )
    assert login_res.status_code == 403
    assert "was not approved" in login_res.json()["detail"]

    # Cleanup test user and registration request created during test
    with SessionLocal() as db:
        db.query(RegistrationRequest).filter(RegistrationRequest.email == reject_email).delete()
        emp = db.query(Employee).filter(Employee.email == reject_email).first()
        if emp:
            db.delete(emp)
        user = db.query(User).filter(User.email == reject_email).first()
        if user:
            db.delete(user)
        db.commit()


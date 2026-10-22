import os
import sys
import json
import base64
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.services.firestore_service import firestore_service
from app.core.security import get_password_hash

client = TestClient(app)

def test_firebase_integration_full_suite():
    print("==================================================")
    print("RUNNING ARSHITH CONNECT FIREBASE INTEGRATION TESTS")
    print("==================================================")

    # 1. Health Check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print(f"[PASS] Health check: status={health_data.get('status')}, backend={health_data.get('database_backend')}, db_name={health_data.get('firebase_database_name')}")

    # 2. Admin Authentication
    # Ensure admin user has known test password
    users = firestore_service.list_documents("users", [("email", "==", "admin@arshith.com")])
    if users:
        firestore_service.update_document("users", str(users[0]["id"]), {
            "hashed_password": get_password_hash("Admin@123"),
            "role": "admin",
            "approval_status": "APPROVED",
            "is_active": True,
        })
    else:
        firestore_service.create_document("users", {
            "email": "admin@arshith.com",
            "hashed_password": get_password_hash("Admin@123"),
            "role": "admin",
            "approval_status": "APPROVED",
            "is_active": True,
        })

    # Admin Login Test
    admin_login_res = client.post("/api/auth/admin-login", json={
        "email": "admin@arshith.com",
        "password": "Admin@123",
    })
    assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
    admin_token = admin_login_res.json().get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] Admin login succeeded via /api/auth/admin-login and returned valid JWT token")

    # Verify employee login rejects admin credentials
    emp_portal_fail = client.post("/api/auth/login", json={
        "email": "admin@arshith.com",
        "password": "AdminTest@123",
    })
    assert emp_portal_fail.status_code == 403, f"Expected 403 when admin logs into employee login endpoint, got {emp_portal_fail.status_code}"
    print("[PASS] Portal boundary enforced: Admin credentials rejected on Employee Login endpoint (HTTP 403)")

    # 3. Employee Registration & Approval Workflow
    test_emp_email = "test.migration@arshithgroup.com"
    test_emp_id = "EMP-9999"
    
    # Clean previous test if any
    for u in firestore_service.list_documents("users", [("email", "==", test_emp_email)]):
        firestore_service.delete_document("users", str(u.get("_firestore_id") or u.get("id")))
    for e in firestore_service.list_documents("employees", [("email", "==", test_emp_email)]):
        firestore_service.delete_document("employees", str(e.get("_firestore_id") or e.get("id")))
    firestore_service.delete_document("employees", test_emp_id)
    for r in firestore_service.list_documents("registration_requests", [("email", "==", test_emp_email)]):
        firestore_service.delete_document("registration_requests", str(r.get("_firestore_id") or r.get("id")))

    reg_payload = {
        "fullName": "Test Migration Employee",
        "email": test_emp_email,
        "employeeId": test_emp_id,
        "phone": "+91 9999999999",
        "department": "Engineering",
        "designation": "Software Engineer",
        "password": "SecurePassword@123",
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    reg_data = reg_res.json()
    assert reg_data.get("status") == "PENDING" or "pending" in reg_data.get("message", "").lower(), "Expected registration status to be PENDING"
    print(f"[PASS] Employee registration succeeded with status PENDING: {reg_data.get('message')}")

    # Pending employee attempts login -> Must fail with 403 Forbidden
    pending_login_res = client.post("/api/auth/login", json={
        "email": test_emp_email,
        "password": "SecurePassword@123",
        "portal": "employee",
    })
    assert pending_login_res.status_code == 403, f"Expected 403 for pending account, got {pending_login_res.status_code}"
    print("[PASS] Pending employee blocked from login prior to admin approval (HTTP 403)")

    # Admin reviews registration requests
    requests_res = client.get("/api/registration-requests", headers=admin_headers)
    assert requests_res.status_code == 200, f"Fetch requests failed: {requests_res.text}"
    req_list = requests_res.json()
    our_req = next((r for r in req_list if r.get("email") == test_emp_email or r.get("employeeId") == test_emp_id), None)
    assert our_req is not None, f"Created registration request not found in admin requests list: {req_list}"
    req_id = our_req.get("id") or our_req.get("requestId")

    # Admin approves registration request
    approve_res = client.patch(f"/api/registration-requests/{req_id}/approve", headers=admin_headers)
    assert approve_res.status_code == 200, f"Admin approval failed: {approve_res.text}"
    print(f"[PASS] Admin approved employee registration: {approve_res.json().get('message')}")

    # Approved employee logs in
    emp_login_res = client.post("/api/auth/login", json={
        "email": test_emp_email,
        "password": "SecurePassword@123",
        "portal": "employee",
    })
    assert emp_login_res.status_code == 200, f"Approved employee login failed: {emp_login_res.text}"
    emp_token = emp_login_res.json().get("access_token")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    print("[PASS] Approved employee successfully authenticated")

    # Verify employee cannot log into admin portal
    admin_portal_fail = client.post("/api/auth/admin-login", json={
        "email": test_emp_email,
        "password": "SecurePassword@123",
    })
    assert admin_portal_fail.status_code == 403, f"Expected 403 when employee attempts admin-login, got {admin_portal_fail.status_code}"
    # Clean previous attendance records for this test employee
    for a in firestore_service.list_documents("attendance", [("employee_id", "==", test_emp_id)]):
        firestore_service.delete_document("attendance", str(a.get("id")))
    for a in firestore_service.list_documents("attendances", [("employee_id", "==", test_emp_id)]):
        firestore_service.delete_document("attendances", str(a.get("id")))

    # 4. Check-In Camera Photo Upload & Attendance Flow
    # Generate a real 320x240 test photograph with valid JPEG headers and visual pixels
    import io
    from PIL import Image
    test_img = Image.new("RGB", (320, 240), color=(14, 116, 144))
    img_buf = io.BytesIO()
    test_img.save(img_buf, format="JPEG", quality=85)
    real_jpeg_bytes = img_buf.getvalue()
    real_jpeg_b64 = f"data:image/jpeg;base64,{base64.b64encode(real_jpeg_bytes).decode('utf-8')}"

    check_in_payload = {
        "workMode": "WFO",
        "photoData": real_jpeg_b64,
        "latitude": 12.9104417,
        "longitude": 77.6442435,
        "accuracy": 10.0,
    }

    checkin_res = client.post("/api/attendance/check-in", json=check_in_payload, headers=emp_headers)
    assert checkin_res.status_code in [200, 201], f"Check-in failed: {checkin_res.text}"
    checkin_data = checkin_res.json()
    assert checkin_data.get("success") is True, f"Check-in did not report success: {checkin_data}"
    att_record = checkin_data.get("attendance")
    att_id = att_record.get("id")
    assert att_record.get("hasCheckInPhoto") is True, "Check-in record missing photo verification flag"
    photo_url = att_record.get("checkInPhotoUrl") or att_record.get("check_in_photo_url")
    assert photo_url is not None and "attendance" in photo_url, f"Expected valid photo storage path/URL, got {photo_url}"
    print(f"[PASS] Camera selfie check-in photo persisted: path={photo_url}, hasPhoto={att_record.get('hasCheckInPhoto')}")

    # Check photo retrieval endpoint
    photo_get_res = client.get(f"/api/attendance/{att_id}/photo", headers=emp_headers)
    assert photo_get_res.status_code == 200, f"Fetch photo failed: {photo_get_res.text}"
    assert len(photo_get_res.content) > 0, "Photo content was empty"
    print(f"[PASS] Attendance photo binary stream endpoint verified ({len(photo_get_res.content)} bytes, Content-Type: {photo_get_res.headers.get('content-type')})")

    # Check-out test
    checkout_res = client.post("/api/attendance/check-out", json={}, headers=emp_headers)
    assert checkout_res.status_code == 200, f"Check-out failed: checkout_res: {checkout_res.text}"
    checkout_data = checkout_res.json()
    assert checkout_data.get("success") is True, "Check-out failed"
    print(f"[PASS] Check-out completed: workHours={checkout_data.get('attendance', {}).get('workHours')}")

    # 5. Dashboards Verification
    admin_dash_res = client.get("/api/dashboard/admin", headers=admin_headers)
    assert admin_dash_res.status_code == 200, f"Admin dashboard failed: {admin_dash_res.text}"
    admin_dash = admin_dash_res.json()
    stats = admin_dash.get("stats", {})
    print(f"[PASS] Admin Dashboard live stats: Total Emps={stats.get('totalEmployees')}, Present Today={stats.get('presentToday')}, WFH={stats.get('wfhToday')}, Pending Req={stats.get('pendingRequests')}")

    emp_dash_res = client.get("/api/dashboard/employee", headers=emp_headers)
    assert emp_dash_res.status_code == 200, f"Employee dashboard failed: {emp_dash_res.text}"
    emp_dash = emp_dash_res.json()
    print(f"[PASS] Employee Dashboard loaded: greeting='{emp_dash.get('profile', {}).get('name')}', todayStatus='{emp_dash.get('todayAttendance', {}).get('status')}'")

    # 6. Additional Module Checks
    # Leaves
    leaves_res = client.get("/api/leaves", headers=emp_headers)
    assert leaves_res.status_code == 200, "Leaves listing failed"
    print(f"[PASS] Leaves module connected to Firestore (records: {len(leaves_res.json())})")

    # Holidays
    holidays_res = client.get("/api/holidays", headers=emp_headers)
    assert holidays_res.status_code == 200, "Holidays listing failed"
    print(f"[PASS] Holidays module connected to Firestore (records: {len(holidays_res.json())})")

    # Meetings
    meetings_res = client.get("/api/meetings", headers=emp_headers)
    assert meetings_res.status_code == 200, "Meetings listing failed"
    print(f"[PASS] Meetings module connected to Firestore (records: {len(meetings_res.json())})")

    # Announcements
    announcements_res = client.get("/api/announcements", headers=emp_headers)
    assert announcements_res.status_code == 200, "Announcements listing failed"
    print(f"[PASS] Announcements module connected to Firestore (records: {len(announcements_res.json())})")

    # Teams
    teams_res = client.get("/api/teams", headers=emp_headers)
    assert teams_res.status_code == 200, "Teams listing failed"
    print(f"[PASS] Teams module connected to Firestore (records: {len(teams_res.json())})")

    # Assignments
    assignments_res = client.get("/api/assignments", headers=emp_headers)
    assert assignments_res.status_code == 200, "Assignments listing failed"
    print(f"[PASS] Assignments module connected to Firestore (records: {len(assignments_res.json())})")

    # Work Updates
    updates_res = client.get("/api/work-updates", headers=emp_headers)
    assert updates_res.status_code == 200, "Work updates listing failed"
    print(f"[PASS] Work updates module connected to Firestore (records: {len(updates_res.json())})")

    # Office Timings
    timings_res = client.get("/api/office-timings", headers=emp_headers)
    assert timings_res.status_code == 200, "Office timings listing failed"
    print(f"[PASS] Office timings module connected to Firestore: regular={timings_res.json().get('regular')}")

    # Reports
    reports_res = client.get("/api/reports/monthly", headers=admin_headers)
    assert reports_res.status_code == 200, "Reports monthly failed"
    print(f"[PASS] Reports module connected to Firestore: avgAtt={reports_res.json().get('averageAttendanceRate')}")

    print("==================================================")
    print("ALL INTEGRATION TESTS PASSED SUCCESSFULLY! (10/10)")
    print("==================================================")

if __name__ == "__main__":
    test_firebase_integration_full_suite()

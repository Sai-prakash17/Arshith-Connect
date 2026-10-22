from datetime import date, datetime, timezone
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.core.config import settings
from app.db.session import get_db
from app.models.holiday import Holiday
from app.models.user import User
from app.schemas.holiday import HolidayCreate, HolidayUpdate, HolidayResponse
from app.dependencies.auth import get_current_user, get_current_admin
from app.services.firestore_service import FirestoreService

router = APIRouter(prefix="/holidays", tags=["Holidays"])


def format_holiday_response(h: Any) -> dict:
    if isinstance(h, dict):
        h_code = h.get("holiday_code") or h.get("id") or "HOL-001"
        return {
            "id": h_code,
            "holidayId": h.get("id", h_code),
            "name": h.get("name", "Holiday"),
            "date": str(h.get("date", "")),
            "description": h.get("description") or "Company observed holiday.",
            "type": h.get("type") or "National Holiday",
        }

    return {
        "id": h.holiday_code or f"HOL-{h.id:03d}",
        "holidayId": h.id,
        "name": h.name,
        "date": h.date.isoformat(),
        "description": h.description or "Company observed holiday.",
        "type": h.type or "National Holiday",
    }


@router.get("", response_model=List[dict])
def list_holidays(
    search: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List company holidays."""
    if settings.DATABASE_BACKEND == "firebase":
        holidays = FirestoreService.list_all("holidays")
        filtered = []
        for h in holidays:
            name = str(h.get("name", "")).lower()
            desc_str = str(h.get("description", "")).lower()
            d_str = str(h.get("date", ""))

            if search:
                s = search.strip().lower()
                if s not in name and s not in desc_str:
                    continue

            if year and year != "ALL":
                if not d_str.startswith(str(year).strip()):
                    continue

            filtered.append(format_holiday_response(h))

        filtered.sort(key=lambda x: str(x.get("date", "")))
        return filtered

    # PostgreSQL fallback
    query = db.query(Holiday)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(or_(Holiday.name.ilike(s), Holiday.description.ilike(s)))

    if year and year != "ALL":
        try:
            yr_int = int(year)
            query = query.filter(
                Holiday.date >= date(yr_int, 1, 1),
                Holiday.date <= date(yr_int, 12, 31),
            )
        except ValueError:
            pass

    holidays = query.order_by(asc(Holiday.date)).all()
    return [format_holiday_response(h) for h in holidays]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=dict)
def add_holiday(
    data: HolidayCreate,
    db: Session = Depends(get_db),
    admin_user=Depends(get_current_admin),
):
    """Add a new company holiday (Admin only)."""
    try:
        h_date = date.fromisoformat(data.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    code = f"HOL-{datetime.now().strftime('%Y%m%d%H%M%S')[-4:]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    if settings.DATABASE_BACKEND == "firebase":
        doc = {
            "id": code,
            "holiday_code": code,
            "name": data.name.strip(),
            "date": h_date.isoformat(),
            "description": data.description.strip() if data.description else "Company observed holiday.",
            "type": data.type or "National Holiday",
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        FirestoreService.save("holidays", code, doc)
        return format_holiday_response(doc)

    holiday = Holiday(
        holiday_code=code,
        name=data.name.strip(),
        date=h_date,
        description=data.description.strip() if data.description else "Company observed holiday.",
        type=data.type or "National Holiday",
    )
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return format_holiday_response(holiday)


@router.patch("/{holiday_id}", response_model=dict)
def update_holiday(
    holiday_id: str,
    data: HolidayUpdate,
    db: Session = Depends(get_db),
    admin_user=Depends(get_current_admin),
):
    """Update holiday details (Admin only)."""
    if settings.DATABASE_BACKEND == "firebase":
        h = FirestoreService.get_by_id("holidays", holiday_id)
        if not h:
            raise HTTPException(status_code=404, detail=f"Holiday '{holiday_id}' not found.")
        updates = {}
        if data.name:
            updates["name"] = data.name.strip()
        if data.date:
            try:
                updates["date"] = date.fromisoformat(data.date).isoformat()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")
        if data.description is not None:
            updates["description"] = data.description.strip()
        if data.type is not None:
            updates["type"] = data.type.strip()

        doc_key = h.get("holiday_code") or holiday_id
        FirestoreService.update("holidays", doc_key, updates)
        h.update(updates)
        return format_holiday_response(h)

    # PostgreSQL fallback
    holiday = (
        db.query(Holiday)
        .filter(
            (Holiday.holiday_code == holiday_id)
            | (Holiday.id == int(holiday_id) if holiday_id.isdigit() else False)
        )
        .first()
    )
    if not holiday:
        raise HTTPException(status_code=404, detail=f"Holiday '{holiday_id}' not found.")

    if data.name:
        holiday.name = data.name.strip()
    if data.date:
        try:
            holiday.date = date.fromisoformat(data.date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")
    if data.description is not None:
        holiday.description = data.description.strip()
    if data.type is not None:
        holiday.type = data.type.strip()

    db.commit()
    db.refresh(holiday)
    return format_holiday_response(holiday)


@router.delete("/{holiday_id}", status_code=status.HTTP_200_OK)
def delete_holiday(
    holiday_id: str,
    db: Session = Depends(get_db),
    admin_user=Depends(get_current_admin),
):
    """Remove a holiday from corporate calendar (Admin only)."""
    if settings.DATABASE_BACKEND == "firebase":
        h = FirestoreService.get_by_id("holidays", holiday_id)
        if not h:
            raise HTTPException(status_code=404, detail=f"Holiday '{holiday_id}' not found.")
        doc_key = h.get("holiday_code") or holiday_id
        FirestoreService.delete("holidays", doc_key)
        return {"success": True, "message": "Holiday removed successfully."}

    holiday = (
        db.query(Holiday)
        .filter(
            (Holiday.holiday_code == holiday_id)
            | (Holiday.id == int(holiday_id) if holiday_id.isdigit() else False)
        )
        .first()
    )
    if not holiday:
        raise HTTPException(status_code=404, detail=f"Holiday '{holiday_id}' not found.")

    db.delete(holiday)
    db.commit()
    return {"success": True, "message": "Holiday removed successfully."}

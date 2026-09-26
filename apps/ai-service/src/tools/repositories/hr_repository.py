from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import text

from src.tools.repositories.base import BaseRepository


class HrRepository(BaseRepository):
    async def get_employee(
        self,
        company_id: str,
        user_id: str | None = None,
        employee_id: str | None = None,
    ) -> dict[str, Any] | None:
        """Fetch employee details scoped by company and user_id or employee_id."""
        if not user_id and not employee_id:
            return None

        query = """
            SELECT
                e.id,
                e."companyId",
                e."userId",
                e."employeeNumber",
                e."firstName",
                e."lastName",
                e.email,
                e.phone,
                e."hireDate",
                e."contractType",
                e."workLocation",
                e."baseSalary",
                e.currency,
                e."annualLeaveBalance",
                e."sickLeaveBalance",
                e.status,
                d.name AS "departmentName",
                CONCAT(m."firstName", ' ', m."lastName") AS "managerName"
            FROM hr_employees e
            LEFT JOIN hr_departments d ON d.id = e."departmentId"
            LEFT JOIN hr_employees m ON m.id = e."managerId"
            WHERE e."companyId" = :cid
        """
        params: dict[str, Any] = {"cid": company_id}

        if user_id:
            query += ' AND e."userId" = :uid'
            params["uid"] = user_id
        elif employee_id:
            query += " AND e.id = :eid"
            params["eid"] = employee_id

        query += " LIMIT 1"

        res = await self._session.execute(text(query), params)
        row = res.mappings().first()
        return dict(row) if row else None

    async def get_my_attendance(
        self,
        company_id: str,
        user_id: str,
        limit: int = 7,
    ) -> dict[str, Any]:
        """Fetch today's attendance and recent records for the employee."""
        res_today = await self._session.execute(
            text("""
                SELECT
                    id, date, "checkIn", "checkOut", "workHours", "lateMinutes", status, "workMode"
                FROM hr_attendances
                WHERE "companyId" = :cid AND "userId" = :uid AND date = CURRENT_DATE
                LIMIT 1
            """),
            {"cid": company_id, "uid": user_id},
        )
        today_row = res_today.mappings().first()

        res_recent = await self._session.execute(
            text("""
                SELECT
                    id, date, "checkIn", "checkOut", "workHours", "lateMinutes", status, "workMode"
                FROM hr_attendances
                WHERE "companyId" = :cid AND "userId" = :uid
                ORDER BY date DESC
                LIMIT :limit
            """),
            {"cid": company_id, "uid": user_id, "limit": limit},
        )
        recent_rows = [dict(r) for r in res_recent.mappings().all()]

        return {
            "today": dict(today_row) if today_row else None,
            "recent": recent_rows,
        }

    async def get_leave_balance(
        self,
        company_id: str,
        employee_id: str,
        user_id: str | None = None,
    ) -> dict[str, Any] | None:
        """Fetch leave balance and count taken leave days for the current year."""
        res_emp = await self._session.execute(
            text("""
                SELECT
                    id,
                    "userId",
                    "annualLeaveBalance",
                    "sickLeaveBalance"
                FROM hr_employees
                WHERE "companyId" = :cid AND id = :eid
                LIMIT 1
            """),
            {"cid": company_id, "eid": employee_id},
        )
        emp_row = res_emp.mappings().first()
        if not emp_row:
            return None

        effective_uid = user_id or emp_row.get("userId") or ""

        # Count approved leaves in current year
        res_leaves = await self._session.execute(
            text("""
                SELECT
                    type::text AS leave_type,
                    COALESCE(SUM("totalDays"), 0) AS taken_days
                FROM hr_leave_requests
                WHERE "companyId" = :cid
                  AND ("employeeEmployeeLeavesId" = :eid OR ("userId" IS NOT NULL AND "userId" = :uid))
                  AND status = 'APPROVED'
                  AND EXTRACT(YEAR FROM "startDate") = EXTRACT(YEAR FROM CURRENT_DATE)
                GROUP BY type
            """),
            {"cid": company_id, "eid": employee_id, "uid": effective_uid},
        )
        taken_map = {row["leave_type"]: int(row["taken_days"]) for row in res_leaves.mappings().all()}

        annual_total = int(emp_row["annualLeaveBalance"] or 21)
        sick_total = int(emp_row["sickLeaveBalance"] or 15)
        annual_taken = taken_map.get("ANNUAL", 0)
        sick_taken = taken_map.get("SICK", 0)
        emergency_taken = taken_map.get("EMERGENCY", 0)

        return {
            "annual_balance": max(0, annual_total - annual_taken),
            "annual_total": annual_total,
            "annual_taken": annual_taken,
            "sick_balance": max(0, sick_total - sick_taken),
            "sick_total": sick_total,
            "sick_taken": sick_taken,
            "emergency_taken": emergency_taken,
        }

    async def create_leave_request(
        self,
        company_id: str,
        user_id: str,
        employee_id: str,
        leave_type: str,
        start_date: str,
        end_date: str,
        reason: str | None = None,
    ) -> dict[str, Any]:
        """Create a new leave request in hr_leave_requests."""
        d_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        d_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        total_days = max(1, (d_end - d_start).days + 1)
        req_id = str(uuid.uuid4())

        await self._session.execute(
            text("""
                INSERT INTO hr_leave_requests (
                    id, "companyId", "userId", "employeeEmployeeLeavesId",
                    type, "startDate", "endDate", "totalDays",
                    reason, status, "createdAt", "updatedAt"
                ) VALUES (
                    :id, :cid, :uid, :eid,
                    CAST(:type AS hr_leave_requests_type), :s_date, :e_date, :days,
                    :reason, CAST('PENDING' AS hr_leave_requests_status), NOW(), NOW()
                )
            """),
            {
                "id": req_id,
                "cid": company_id,
                "uid": user_id,
                "eid": employee_id,
                "type": leave_type.upper(),
                "s_date": d_start,
                "e_date": d_end,
                "days": total_days,
                "reason": reason or "",
            },
        )
        await self._session.commit()

        return {
            "request_id": req_id,
            "leave_type": leave_type.upper(),
            "start_date": start_date,
            "end_date": end_date,
            "total_days": total_days,
            "status": "PENDING",
        }

    async def create_permission_request(
        self,
        company_id: str,
        employee_id: str,
        date_str: str,
        start_time: str,
        end_time: str,
        reason: str,
        permission_type: str = "NON_DEDUCTIBLE",
    ) -> dict[str, Any]:
        """Create a new permission request in hr_permission_requests."""
        req_id = str(uuid.uuid4())
        perm_date = datetime.strptime(date_str, "%Y-%m-%d").date()

        t1 = datetime.strptime(start_time, "%H:%M")
        t2 = datetime.strptime(end_time, "%H:%M")
        diff_hours = max(0.5, round((t2 - t1).total_seconds() / 3600.0, 2))

        await self._session.execute(
            text("""
                INSERT INTO hr_permission_requests (
                    id, "companyId", "employeeId",
                    type, date, "startTime", "endTime",
                    "totalHours", reason, status, "createdAt", "updatedAt"
                ) VALUES (
                    :id, :cid, :eid,
                    CAST(:type AS "HrPermissionType"), :p_date, :s_time, :e_time,
                    :hours, :reason, CAST('PENDING' AS "HrPermissionStatus"), NOW(), NOW()
                )
            """),
            {
                "id": req_id,
                "cid": company_id,
                "eid": employee_id,
                "type": permission_type.upper(),
                "p_date": perm_date,
                "s_time": start_time,
                "e_time": end_time,
                "hours": Decimal(str(diff_hours)),
                "reason": reason,
            },
        )
        await self._session.commit()

        return {
            "request_id": req_id,
            "date": date_str,
            "start_time": start_time,
            "end_time": end_time,
            "total_hours": diff_hours,
            "status": "PENDING",
        }

    async def get_requests_status(
        self,
        company_id: str,
        employee_id: str,
        user_id: str | None = None,
        limit: int = 5,
    ) -> dict[str, Any]:
        """Fetch pending and recent leave/permission requests."""
        leaves = await self._session.execute(
            text("""
                SELECT
                    id, type::text AS type, "startDate", "endDate", "totalDays", status::text AS status, "createdAt"
                FROM hr_leave_requests
                WHERE "companyId" = :cid AND ("employeeEmployeeLeavesId" = :eid OR ("userId" IS NOT NULL AND "userId" = :uid))
                ORDER BY "createdAt" DESC
                LIMIT :limit
            """),
            {"cid": company_id, "eid": employee_id, "uid": user_id or "", "limit": limit},
        )
        permissions = await self._session.execute(
            text("""
                SELECT
                    id, type::text AS type, date, "startTime", "endTime", "totalHours", status::text AS status, "createdAt"
                FROM hr_permission_requests
                WHERE "companyId" = :cid AND "employeeId" = :eid
                ORDER BY "createdAt" DESC
                LIMIT :limit
            """),
            {"cid": company_id, "eid": employee_id, "limit": limit},
        )

        return {
            "leaves": [dict(r) for r in leaves.mappings().all()],
            "permissions": [dict(r) for r in permissions.mappings().all()],
        }

    async def get_payslip(
        self,
        company_id: str,
        user_id: str,
        month: int | None = None,
        year: int | None = None,
    ) -> dict[str, Any] | None:
        """Fetch employee payslip for a given month and year or the most recent one."""
        query = """
            SELECT
                id, month, year, "periodStart", "periodEnd",
                "baseSalary", "workingDays", "actualWorkDays",
                "totalAllowances", "totalDeductions", "overtimeHours",
                "overtimeAmount", bonuses, "socialInsurance", "taxAmount",
                "grossSalary", "netSalary", status::text AS status, "paidAt"
            FROM hr_payrolls
            WHERE "companyId" = :cid AND "userId" = :uid
        """
        params: dict[str, Any] = {"cid": company_id, "uid": user_id}

        if month and year:
            query += " AND month = :m AND year = :y"
            params["m"] = month
            params["y"] = year
        else:
            query += " ORDER BY year DESC, month DESC"

        query += " LIMIT 1"

        res = await self._session.execute(text(query), params)
        row = res.mappings().first()
        return dict(row) if row else None

    async def get_company_attendance_today(self, company_id: str) -> dict[str, Any]:
        """Get company-wide today's attendance summary (for managers)."""
        res = await self._session.execute(
            text("""
                SELECT
                    COUNT(*) AS total_records,
                    COUNT(*) FILTER (WHERE status = 'PRESENT') AS present_count,
                    COUNT(*) FILTER (WHERE status = 'LATE') AS late_count,
                    COUNT(*) FILTER (WHERE status = 'ABSENT') AS absent_count,
                    COUNT(*) FILTER (WHERE status = 'ON_LEAVE') AS leave_count
                FROM hr_attendances
                WHERE "companyId" = :cid AND date = CURRENT_DATE
            """),
            {"cid": company_id},
        )
        row = res.mappings().first()
        if not row:
            return {"date": str(date.today()), "total": 0, "present": 0, "late": 0, "absent": 0}

        return {
            "date": str(date.today()),
            "total_records": int(row["total_records"] or 0),
            "present": int(row["present_count"] or 0),
            "late": int(row["late_count"] or 0),
            "absent": int(row["absent_count"] or 0),
            "on_leave": int(row["leave_count"] or 0),
        }

    async def get_my_advances(
        self,
        company_id: str,
        user_id: str,
        employee_id: str | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Fetch employee advance requests."""
        query = """
            SELECT
                id, amount, reason, "repaymentType", "installmentsCount",
                "monthlyAmount", "remainingBalance", "isPaidOff", status,
                "createdAt"
            FROM hr_advance_requests
            WHERE "companyId" = :cid
              AND ("userId" = :uid OR ("employeeRelId" IS NOT NULL AND "employeeRelId" = :eid))
            ORDER BY "createdAt" DESC
            LIMIT :limit
        """
        res = await self._session.execute(
            text(query),
            {"cid": company_id, "uid": user_id, "eid": employee_id or "", "limit": limit},
        )
        return [dict(r) for r in res.mappings().all()]

    async def create_advance_request(
        self,
        company_id: str,
        user_id: str,
        employee_id: str,
        amount: float,
        reason: str,
        installments_count: int = 1,
    ) -> dict[str, Any]:
        """Create a new salary advance request."""
        req_id = str(uuid.uuid4())
        inst_count = max(1, int(installments_count or 1))
        monthly_amt = round(float(amount) / inst_count, 2)

        query = """
            INSERT INTO hr_advance_requests (
                id, "companyId", "userId", "employeeRelId",
                amount, reason, "repaymentType", "installmentsCount",
                "monthlyAmount", "remainingBalance", "isPaidOff", status,
                "createdAt", "updatedAt"
            ) VALUES (
                :id, :cid, :uid, :eid,
                :amount, :reason, 'SALARY_DEDUCTION', :inst_count,
                :monthly_amt, :amount, false, 'PENDING',
                NOW(), NOW()
            )
        """
        await self._session.execute(
            text(query),
            {
                "id": req_id,
                "cid": company_id,
                "uid": user_id,
                "eid": employee_id,
                "amount": Decimal(str(amount)),
                "reason": reason or "",
                "inst_count": inst_count,
                "monthly_amt": Decimal(str(monthly_amt)),
            },
        )
        await self._session.commit()
        return {
            "request_id": req_id,
            "amount": amount,
            "installments_count": inst_count,
            "monthly_amount": monthly_amt,
            "status": "PENDING",
        }

import csv
import io
import random
import re
import string
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set
import openpyxl


def clean_header_key(key: str) -> str:
    """Normalizes spreadsheet header keys to canonical names."""
    if not key:
        return ""
    k = str(key).strip().lower().replace(" ", "_").replace("-", "_")
    if k in ["student_name", "candidate_name", "full_name", "name"]:
        return "name"
    if k in ["email_address", "email_id", "email"]:
        return "email"
    if k in ["college_name", "university", "institute", "institution", "college"]:
        return "college"
    if k in ["roll", "roll_number", "rollno", "reg_no", "registration_number", "roll_no"]:
        return "roll_no"
    if k in ["pass", "pwd", "password"]:
        return "password"
    if k in ["group", "batch", "batch_name", "user_group", "candidate_group"]:
        return "candidate_group"
    return k


def generate_roll_prefix(name_or_college: Optional[str]) -> str:
    """Extracts a 3 to 4 character uppercase alphanumeric prefix."""
    if not name_or_college:
        return "UBI"
    # Extract uppercase words or initials
    words = re.findall(r"[a-zA-Z0-9]+", name_or_college.strip())
    if not words:
        return "UBI"
    if len(words) >= 2:
        if words[0].isupper() and len(words[0]) >= 2:
            return (words[0] + words[1][0]).upper()[:6]
        prefix = "".join(w[0] for w in words[:4]).upper()
        if len(prefix) < 3 and len(words[0]) >= 3:
            prefix = words[0][:3].upper()
        return prefix
    else:
        # Single word: take first 3-4 chars
        return words[0][:4].upper()


def generate_unique_roll_number(
    college: Optional[str] = None,
    group: Optional[str] = None,
    existing_rolls: Optional[Set[str]] = None
) -> str:
    """
    Generates unique roll number formatted as: PREFIX-YYYY-XXXX
    e.g. IITD-2026-4819 or UBI-2026-7281
    """
    if existing_rolls is None:
        existing_rolls = set()

    prefix = generate_roll_prefix(college or group)
    year = datetime.now(timezone.utc).year

    for _ in range(1000):
        # 4 digit random suffix
        random_num = random.randint(1000, 9999)
        candidate_roll = f"{prefix}-{year}-{random_num}"
        if candidate_roll not in existing_rolls:
            existing_rolls.add(candidate_roll)
            return candidate_roll

    # Fallback with extra random chars if collision occurs
    extra = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}-{year}-{extra}"


def generate_readable_password() -> str:
    """
    Generates a secure, human-friendly temporary password.
    Format: Word + Symbol + 4 digits (e.g. 'Pass#4921', 'Candidate@7814', 'Code#8392')
    """
    prefixes = ["Pass", "Code", "Test", "Candidate", "Exam", "User"]
    symbols = ["#", "@", "!"]
    prefix = random.choice(prefixes)
    symbol = random.choice(symbols)
    digits = random.randint(1000, 9999)
    return f"{prefix}{symbol}{digits}"


def parse_candidates_file(contents: bytes, filename: str) -> List[Dict[str, str]]:
    """
    Parses candidate records from either .csv or .xlsx spreadsheets.
    Returns normalized dictionaries with keys:
    - name
    - email
    - college (optional)
    - roll_no (optional)
    - password (optional)
    - candidate_group (optional)
    """
    fname = filename.lower().strip()
    records: List[Dict[str, str]] = []

    if fname.endswith(".xlsx") or fname.endswith(".xlsm") or fname.endswith(".xltx"):
        # Parse Excel with openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        sheet = wb.active
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            return []

        header_row = rows[0]
        header_map: Dict[int, str] = {}
        for col_idx, cell_val in enumerate(header_row):
            if cell_val is not None:
                header_map[col_idx] = clean_header_key(str(cell_val))

        for row in rows[1:]:
            if not row or all(v is None or str(v).strip() == "" for v in row):
                continue
            rec: Dict[str, str] = {}
            for col_idx, cell_val in enumerate(row):
                key = header_map.get(col_idx)
                if key and cell_val is not None:
                    rec[key] = str(cell_val).strip()
            if rec.get("email") or rec.get("name"):
                records.append(rec)

    else:
        # Default to CSV parsing with encoding fallbacks
        try:
            decoded = contents.decode("utf-8-sig")
        except UnicodeDecodeError:
            decoded = contents.decode("latin-1", errors="replace")

        reader = csv.reader(io.StringIO(decoded))
        all_rows = list(reader)
        if not all_rows:
            return []

        header_row = all_rows[0]
        header_map: Dict[int, str] = {}
        for col_idx, cell_val in enumerate(header_row):
            header_map[col_idx] = clean_header_key(cell_val)

        for row in all_rows[1:]:
            if not row or all(v.strip() == "" for v in row):
                continue
            rec: Dict[str, str] = {}
            for col_idx, cell_val in enumerate(row):
                key = header_map.get(col_idx)
                if key:
                    rec[key] = cell_val.strip()
            if rec.get("email") or rec.get("name"):
                records.append(rec)

    return records

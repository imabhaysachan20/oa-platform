import io
import openpyxl
import pytest

from backend.app.services.credential_service import (
    clean_header_key,
    generate_roll_prefix,
    generate_unique_roll_number,
    generate_readable_password,
    parse_candidates_file,
)


def test_clean_header_key():
    assert clean_header_key("Student Name") == "name"
    assert clean_header_key("Email Address") == "email"
    assert clean_header_key("College Name") == "college"
    assert clean_header_key("University") == "college"
    assert clean_header_key("Roll Number") == "roll_no"
    assert clean_header_key("User Group") == "candidate_group"
    assert clean_header_key("Batch") == "candidate_group"


def test_roll_prefix_and_generation():
    assert generate_roll_prefix("IIT Delhi") == "IITD"
    assert generate_roll_prefix("UsefulBI") == "USEF"
    assert generate_roll_prefix("Stanford University") == "STA"
    assert generate_roll_prefix(None) == "UBI"

    existing = set()
    r1 = generate_unique_roll_number("IIT Delhi", "Batch-A", existing)
    r2 = generate_unique_roll_number("IIT Delhi", "Batch-A", existing)
    assert r1 != r2
    assert "IITD-" in r1
    assert "IITD-" in r2


def test_readable_password_generation():
    for _ in range(20):
        pwd = generate_readable_password()
        assert any(sym in pwd for sym in ["#", "@", "!"])
        assert any(c.isdigit() for c in pwd)
        assert len(pwd) >= 8


def test_parse_csv_file():
    csv_data = "name,email,college\nAlice Wonderland,alice@example.com,Oxford University\nBob Builder,bob@example.com,MIT\n"
    records = parse_candidates_file(csv_data.encode("utf-8"), "students.csv")
    assert len(records) == 2
    assert records[0]["name"] == "Alice Wonderland"
    assert records[0]["email"] == "alice@example.com"
    assert records[0]["college"] == "Oxford University"


def test_parse_excel_xlsx_file():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Name", "Email Address", "College", "Batch"])
    ws.append(["Charlie Chaplin", "charlie@example.com", "London Film School", "2026 Batch"])
    ws.append(["David Copperfield", "david@example.com", "Magic Academy", "2026 Batch"])

    buf = io.BytesIO()
    wb.save(buf)
    excel_bytes = buf.getvalue()

    records = parse_candidates_file(excel_bytes, "candidates.xlsx")
    assert len(records) == 2
    assert records[0]["name"] == "Charlie Chaplin"
    assert records[0]["email"] == "charlie@example.com"
    assert records[0]["college"] == "London Film School"
    assert records[0]["candidate_group"] == "2026 Batch"

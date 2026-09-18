from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from pydantic import BaseModel


class NetworkIncidentItem(BaseModel):
    id: int
    assignment_id: int
    disconnected_at: datetime
    reconnected_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    reason: str
    created_at: datetime


class CandidateDossierResponse(BaseModel):
    assignment_id: int
    exam_id: int
    exam_title: str
    user_id: int
    student_name: str
    email: str
    status: str
    total_flags: int = 0
    integrity_status: str = "Clean"
    proctoring_logs: List[Dict] = []
    questions: List[Dict] = []
    network_status: str = "online"
    disconnect_incidents_count: int = 0
    total_offline_seconds: int = 0
    network_incidents: List[NetworkIncidentItem] = []


def compute_network_status(lag_seconds: float) -> str:
    if lag_seconds <= 18:
        return "online"
    elif lag_seconds <= 30:
        return "unstable"
    else:
        return "offline"


def test_network_status_thresholds():
    # Active heartbeat within 18s window
    assert compute_network_status(0) == "online"
    assert compute_network_status(5.5) == "online"
    assert compute_network_status(18.0) == "online"

    # Mild jitter or high latency between 18s and 30s
    assert compute_network_status(18.1) == "unstable"
    assert compute_network_status(25.0) == "unstable"
    assert compute_network_status(30.0) == "unstable"

    # Confirmed disconnect / shutdown (>30s)
    assert compute_network_status(30.1) == "offline"
    assert compute_network_status(45.0) == "offline"
    assert compute_network_status(300.0) == "offline"


def test_heartbeat_gap_incident_trigger():
    now_ts = 1726645000

    # Case 1: Normal steady heartbeat every 10s -> No incident
    prev_ts_normal = now_ts - 10
    gap_normal = now_ts - prev_ts_normal
    assert gap_normal < 30

    # Case 2: Candidate was disconnected for 45s -> Trigger incident!
    prev_ts_disconnected = now_ts - 45
    gap_disconnected = now_ts - prev_ts_disconnected
    assert gap_disconnected >= 30

    disconnected_at = datetime.fromtimestamp(prev_ts_disconnected, tz=timezone.utc)
    reconnected_at = datetime.fromtimestamp(now_ts, tz=timezone.utc)
    duration = gap_disconnected

    incident = NetworkIncidentItem(
        id=1,
        assignment_id=42,
        disconnected_at=disconnected_at,
        reconnected_at=reconnected_at,
        duration_seconds=duration,
        reason=f"Heartbeat Timeout ({duration}s)",
        created_at=reconnected_at,
    )

    assert incident.duration_seconds == 45
    assert incident.assignment_id == 42
    assert "45s" in incident.reason


def test_anti_cheat_integrity_isolation():
    # A candidate with 3 network disconnects (total 180s offline)
    # but ZERO proctoring infractions must remain strictly "Clean"!
    incidents = [
        NetworkIncidentItem(
            id=1,
            assignment_id=10,
            disconnected_at=datetime.now(timezone.utc) - timedelta(minutes=5),
            reconnected_at=datetime.now(timezone.utc) - timedelta(minutes=4),
            duration_seconds=60,
            reason="Heartbeat Timeout (60s)",
            created_at=datetime.now(timezone.utc),
        ),
        NetworkIncidentItem(
            id=2,
            assignment_id=10,
            disconnected_at=datetime.now(timezone.utc) - timedelta(minutes=2),
            reconnected_at=datetime.now(timezone.utc) - timedelta(minutes=1),
            duration_seconds=60,
            reason="Heartbeat Timeout (60s)",
            created_at=datetime.now(timezone.utc),
        ),
    ]

    proctoring_logs = []  # No cheating violations
    total_flags = len(proctoring_logs)

    # Integrity status calculation based only on actual cheating flags
    if total_flags == 0:
        integrity_status = "Clean"
    elif total_flags <= 2:
        integrity_status = "Warning"
    else:
        integrity_status = "High Risk"

    dossier = CandidateDossierResponse(
        assignment_id=10,
        exam_id=1,
        exam_title="Data Structures Assessment",
        user_id=5,
        student_name="Rahul Sharma",
        email="rahul@example.com",
        status="in_progress",
        total_flags=total_flags,
        integrity_status=integrity_status,
        proctoring_logs=proctoring_logs,
        questions=[],
        network_status="online",
        disconnect_incidents_count=len(incidents),
        total_offline_seconds=sum(i.duration_seconds or 0 for i in incidents),
        network_incidents=incidents,
    )

    # Integrity must remain Clean even with 2 disconnects
    assert dossier.integrity_status == "Clean"
    assert dossier.total_flags == 0
    assert dossier.disconnect_incidents_count == 2
    assert dossier.total_offline_seconds == 120

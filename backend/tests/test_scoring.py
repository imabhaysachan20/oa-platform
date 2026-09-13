import pytest


def calculate_question_score_formula(
    diff_weight: float,
    passed: int,
    total: int,
    time_taken_sec: float,
    allowed_time_sec: float
) -> tuple[float, float, float]:
    correctness = float(passed) / float(total) if total > 0 else 0.0
    ratio = 1.0 - (time_taken_sec / allowed_time_sec) if allowed_time_sec > 0 else 0.0
    time_bonus = max(0.0, min(0.2, ratio))
    q_score = diff_weight * correctness * (1.0 + time_bonus)
    return correctness, time_bonus, round(q_score, 2)


def test_scoring_perfect_quick_submission():
    correctness, time_bonus, score = calculate_question_score_formula(
        diff_weight=10.0,
        passed=4,
        total=4,
        time_taken_sec=0.0,
        allowed_time_sec=3600.0
    )
    assert correctness == 1.0
    assert time_bonus == 0.2
    assert score == 12.0


def test_scoring_half_correct():
    correctness, time_bonus, score = calculate_question_score_formula(
        diff_weight=20.0,
        passed=2,
        total=4,
        time_taken_sec=1800.0,
        allowed_time_sec=3600.0
    )
    assert correctness == 0.5
    assert time_bonus == 0.2
    assert score == 12.0


def test_scoring_last_second():
    correctness, time_bonus, score = calculate_question_score_formula(
        diff_weight=20.0,
        passed=4,
        total=4,
        time_taken_sec=3600.0,
        allowed_time_sec=3600.0
    )
    assert correctness == 1.0
    assert time_bonus == 0.0
    assert score == 20.0


def test_total_normalized_score():
    max_possible = (10.0 * 1.2) + (20.0 * 1.2) + (20.0 * 1.2)

    earned_q1 = 10.0 * 1.0 * 1.2  # 12.0
    earned_q2 = 20.0 * 1.0 * 1.2  # 24.0
    earned_q3 = 20.0 * 1.0 * 1.2  # 24.0
    total_earned = earned_q1 + earned_q2 + earned_q3

    normalized_total = (total_earned / max_possible) * 100.0
    assert normalized_total == 100.0

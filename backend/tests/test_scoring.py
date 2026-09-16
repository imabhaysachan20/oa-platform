import pytest
 
 
def calculate_question_score_formula(
    diff_weight: float,
    passed: int,
    total: int,
) -> tuple[float, float]:
    correctness = float(passed) / float(total) if total > 0 else 0.0
    q_score = round(diff_weight * correctness, 2)
    return correctness, q_score
 
 
def test_scoring_perfect_submission():
    correctness, score = calculate_question_score_formula(
        diff_weight=10.0,
        passed=4,
        total=4
    )
    assert correctness == 1.0
    assert score == 10.0
 
 
def test_scoring_half_correct_10_marks_4_testcases():
    # User requirement: 10 marks question, 4 test cases, 2 passed -> exactly 5.0 marks
    correctness, score = calculate_question_score_formula(
        diff_weight=10.0,
        passed=2,
        total=4
    )
    assert correctness == 0.5
    assert score == 5.0
 
 
def test_scoring_partial_correct_20_marks():
    # 20 marks question, 5 test cases, 3 passed -> 12.0 marks
    correctness, score = calculate_question_score_formula(
        diff_weight=20.0,
        passed=3,
        total=5
    )
    assert correctness == 0.6
    assert score == 12.0
 
 
def test_scoring_zero_passed():
    correctness, score = calculate_question_score_formula(
        diff_weight=15.0,
        passed=0,
        total=4
    )
    assert correctness == 0.0
    assert score == 0.0
 
 
def test_total_normalized_score():
    max_possible = 10.0 + 20.0 + 20.0  # 50.0
 
    earned_q1 = 5.0   # 2/4 on 10-mark
    earned_q2 = 20.0  # 4/4 on 20-mark
    earned_q3 = 10.0  # 2/4 on 20-mark
    total_earned = earned_q1 + earned_q2 + earned_q3  # 35.0
 
    normalized_total = round((total_earned / max_possible) * 100.0, 2)
    assert normalized_total == 70.0


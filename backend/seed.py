import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import AsyncSessionLocal, engine
from backend.app.core.security import get_password_hash
from backend.app.models.base import Base
from backend.app.models.user import User, UserRole
from backend.app.models.question import Question, TestCase, QuestionDifficulty
from backend.app.models.exam import Exam, ExamQuestionPool


SAMPLE_QUESTIONS = [
    # EASY QUESTIONS (4)
    {
        "title": "Two Sum Target",
        "description": "Given an array of integers `nums` and an integer `target`, return the 0-indexed positions of the two numbers such that they add up to `target`. Output the two indices separated by a space in ascending order.\n\nInput format: First line contains space-separated integers for nums. Second line contains target.",
        "difficulty": QuestionDifficulty.EASY,
        "time_limit_ms": 2000,
        "memory_limit_kb": 128000,
        "sample_input": "2 7 11 15\n9",
        "sample_output": "0 1",
        "test_cases": [
            {"input": "2 7 11 15\n9", "expected_output": "0 1", "is_hidden": False, "weight": 1.0},
            {"input": "3 2 4\n6", "expected_output": "1 2", "is_hidden": False, "weight": 1.0},
            {"input": "3 3\n6", "expected_output": "0 1", "is_hidden": True, "weight": 1.0},
            {"input": "1 5 8 10 14\n19", "expected_output": "1 4", "is_hidden": True, "weight": 1.0},
        ]
    },
    {
        "title": "Palindrome String Checker",
        "description": "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nPrint 'true' if it is a palindrome, or 'false' otherwise.",
        "difficulty": QuestionDifficulty.EASY,
        "time_limit_ms": 2000,
        "memory_limit_kb": 128000,
        "sample_input": "A man, a plan, a canal: Panama",
        "sample_output": "true",
        "test_cases": [
            {"input": "A man, a plan, a canal: Panama", "expected_output": "true", "is_hidden": False, "weight": 1.0},
            {"input": "race a car", "expected_output": "false", "is_hidden": False, "weight": 1.0},
            {"input": " ", "expected_output": "true", "is_hidden": True, "weight": 1.0},
            {"input": "0P", "expected_output": "false", "is_hidden": True, "weight": 1.0},
        ]
    },
    {
        "title": "Valid Parentheses",
        "description": "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if open brackets are closed by the same type of brackets and in the correct order.\n\nPrint 'true' or 'false'.",
        "difficulty": QuestionDifficulty.EASY,
        "time_limit_ms": 2000,
        "memory_limit_kb": 128000,
        "sample_input": "()[]{}",
        "sample_output": "true",
        "test_cases": [
            {"input": "()[]{}", "expected_output": "true", "is_hidden": False, "weight": 1.0},
            {"input": "(]", "expected_output": "false", "is_hidden": False, "weight": 1.0},
            {"input": "{[]}", "expected_output": "true", "is_hidden": True, "weight": 1.0},
            {"input": "([)]", "expected_output": "false", "is_hidden": True, "weight": 1.0},
        ]
    },
    {
        "title": "Fibonacci Number",
        "description": "The Fibonacci numbers, commonly denoted F(n) form a sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. That is:\nF(0) = 0, F(1) = 1\nF(n) = F(n - 1) + F(n - 2), for n > 1.\n\nGiven integer n, calculate F(n).",
        "difficulty": QuestionDifficulty.EASY,
        "time_limit_ms": 2000,
        "memory_limit_kb": 128000,
        "sample_input": "4",
        "sample_output": "3",
        "test_cases": [
            {"input": "2", "expected_output": "1", "is_hidden": False, "weight": 1.0},
            {"input": "4", "expected_output": "3", "is_hidden": False, "weight": 1.0},
            {"input": "7", "expected_output": "13", "is_hidden": True, "weight": 1.0},
            {"input": "10", "expected_output": "55", "is_hidden": True, "weight": 1.0},
        ]
    },

    # MEDIUM QUESTIONS (4)
    {
        "title": "Longest Substring Without Repeating Characters",
        "description": "Given a string `s`, find the length of the longest substring without repeating characters.\n\nInput format: A single line containing the string.\nOutput format: A single integer denoting length.",
        "difficulty": QuestionDifficulty.MEDIUM,
        "time_limit_ms": 2000,
        "memory_limit_kb": 128000,
        "sample_input": "abcabcbb",
        "sample_output": "3",
        "test_cases": [
            {"input": "abcabcbb", "expected_output": "3", "is_hidden": False, "weight": 1.0},
            {"input": "bbbbb", "expected_output": "1", "is_hidden": False, "weight": 1.0},
            {"input": "pwwkew", "expected_output": "3", "is_hidden": True, "weight": 1.0},
            {"input": "au", "expected_output": "2", "is_hidden": True, "weight": 1.0},
            {"input": "dvdf", "expected_output": "3", "is_hidden": True, "weight": 1.0},
        ]
    },
    {
        "title": "Maximum Subarray Sum (Kadane's)",
        "description": "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nInput format: Space-separated integers on a single line.",
        "difficulty": QuestionDifficulty.MEDIUM,
        "time_limit_ms": 2000,
        "memory_limit_kb": 128000,
        "sample_input": "-2 1 -3 4 -1 2 1 -5 4",
        "sample_output": "6",
        "test_cases": [
            {"input": "-2 1 -3 4 -1 2 1 -5 4", "expected_output": "6", "is_hidden": False, "weight": 1.0},
            {"input": "1", "expected_output": "1", "is_hidden": False, "weight": 1.0},
            {"input": "5 4 -1 7 8", "expected_output": "23", "is_hidden": True, "weight": 1.0},
            {"input": "-5 -2 -8 -1", "expected_output": "-1", "is_hidden": True, "weight": 1.0},
        ]
    },
    {
        "title": "Coin Change Minimum",
        "description": "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.\n\nInput format: Line 1 has space-separated coin values. Line 2 has target amount.",
        "difficulty": QuestionDifficulty.MEDIUM,
        "time_limit_ms": 2000,
        "memory_limit_kb": 128000,
        "sample_input": "1 2 5\n11",
        "sample_output": "3",
        "test_cases": [
            {"input": "1 2 5\n11", "expected_output": "3", "is_hidden": False, "weight": 1.0},
            {"input": "2\n3", "expected_output": "-1", "is_hidden": False, "weight": 1.0},
            {"input": "1\n0", "expected_output": "0", "is_hidden": True, "weight": 1.0},
            {"input": "186 419 83 408\n6249", "expected_output": "20", "is_hidden": True, "weight": 1.0},
        ]
    },
    {
        "title": "Merge Intervals",
        "description": "Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.\n\nInput: First line integer N. Next N lines each contain start and end separated by space.\nOutput: Merged intervals sorted by start time, each interval on a line separated by space.",
        "difficulty": QuestionDifficulty.MEDIUM,
        "time_limit_ms": 2000,
        "memory_limit_kb": 128000,
        "sample_input": "4\n1 3\n2 6\n8 10\n15 18",
        "sample_output": "1 6\n8 10\n15 18",
        "test_cases": [
            {"input": "4\n1 3\n2 6\n8 10\n15 18", "expected_output": "1 6\n8 10\n15 18", "is_hidden": False, "weight": 1.0},
            {"input": "2\n1 4\n4 5", "expected_output": "1 5", "is_hidden": False, "weight": 1.0},
            {"input": "3\n1 4\n0 4\n2 3", "expected_output": "0 4", "is_hidden": True, "weight": 1.0},
            {"input": "2\n1 4\n2 3", "expected_output": "1 4", "is_hidden": True, "weight": 1.0},
        ]
    },

    # HARD QUESTIONS (2)
    {
        "title": "Trapping Rain Water",
        "description": "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\nInput: Space-separated non-negative integers.\nOutput: Single integer representing total trapped water.",
        "difficulty": QuestionDifficulty.HARD,
        "time_limit_ms": 2000,
        "memory_limit_kb": 128000,
        "sample_input": "0 1 0 2 1 0 1 3 2 1 2 1",
        "sample_output": "6",
        "test_cases": [
            {"input": "0 1 0 2 1 0 1 3 2 1 2 1", "expected_output": "6", "is_hidden": False, "weight": 1.0},
            {"input": "4 2 0 3 2 5", "expected_output": "9", "is_hidden": False, "weight": 1.0},
            {"input": "3 0 2 0 4", "expected_output": "7", "is_hidden": True, "weight": 1.0},
        ]
    },
    {
        "title": "Median of Two Sorted Arrays",
        "description": "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.\n\nInput: Line 1 contains space separated elements of nums1. Line 2 contains space separated elements of nums2.\nOutput: The median printed to 1 decimal place (e.g. 2.0 or 2.5).",
        "difficulty": QuestionDifficulty.HARD,
        "time_limit_ms": 2000,
        "memory_limit_kb": 128000,
        "sample_input": "1 3\n2",
        "sample_output": "2.0",
        "test_cases": [
            {"input": "1 3\n2", "expected_output": "2.0", "is_hidden": False, "weight": 1.0},
            {"input": "1 2\n3 4", "expected_output": "2.5", "is_hidden": False, "weight": 1.0},
            {"input": "0 0\n0 0", "expected_output": "0.0", "is_hidden": True, "weight": 1.0},
        ]
    }
]


async def seed_database():
    print("Connecting to database and creating tables if not present...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Admin User
        admin_email = "admin@usefulbi.com"
        admin = (await db.execute(select(User).where(User.email == admin_email))).scalar_one_or_none()
        if not admin:
            admin = User(
                name="UBI Administrator",
                email=admin_email,
                roll_no="ADMIN001",
                password_hash=get_password_hash("Admin@12345"),
                role=UserRole.ADMIN
            )
            db.add(admin)
            print(f"Created admin user: {admin_email} / Admin@12345")

        # 2. Sample Students
        students = [
            ("Alex Chen", "student1@usefulbi.com", "UBI2026001", "Student@12345"),
            ("Priya Sharma", "student2@usefulbi.com", "UBI2026002", "Student@12345"),
            ("Michael Brown", "student3@usefulbi.com", "UBI2026003", "Student@12345"),
        ]
        for name, email, roll_no, password in students:
            std = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
            if not std:
                std = User(
                    name=name,
                    email=email,
                    roll_no=roll_no,
                    password_hash=get_password_hash(password),
                    role=UserRole.STUDENT
                )
                db.add(std)
                print(f"Created student user: {email} / {password}")

        await db.flush()

        # 3. Questions and Test Cases
        created_question_objects = []
        for q_data in SAMPLE_QUESTIONS:
            existing_q = (await db.execute(
                select(Question).where(Question.title == q_data["title"])
            )).scalar_one_or_none()

            if not existing_q:
                q = Question(
                    title=q_data["title"],
                    description=q_data["description"],
                    difficulty=q_data["difficulty"],
                    time_limit_ms=q_data["time_limit_ms"],
                    memory_limit_kb=q_data["memory_limit_kb"],
                    sample_input=q_data["sample_input"],
                    sample_output=q_data["sample_output"],
                    input_format=q_data.get("input_format"),
                )
                db.add(q)
                await db.flush()

                for tc_data in q_data["test_cases"]:
                    tc = TestCase(
                        question_id=q.id,
                        input=tc_data["input"],
                        expected_output=tc_data["expected_output"],
                        is_hidden=tc_data["is_hidden"],
                        weight=tc_data["weight"]
                    )
                    db.add(tc)
                created_question_objects.append(q)
            else:
                created_question_objects.append(existing_q)

        await db.flush()
        print(f"Verified/Created {len(created_question_objects)} questions in bank.")

        # 4. Exam and Question Pool
        exam_title = "UsefulBI Engineering Assessment 2026"
        exam = (await db.execute(select(Exam).where(Exam.title == exam_title))).scalar_one_or_none()
        if not exam:
            exam = Exam(
                title=exam_title,
                duration_minutes=60,
                easy_weight=10.0,
                medium_weight=20.0,
                hard_weight=30.0,
                is_published=True
            )
            db.add(exam)
            await db.flush()
            print(f"Created exam: {exam_title} (ID: {exam.id})")

            for q in created_question_objects:
                pool_entry = ExamQuestionPool(
                    exam_id=exam.id,
                    question_id=q.id,
                    difficulty=q.difficulty
                )
                db.add(pool_entry)
            print(f"Populated exam question pool with {len(created_question_objects)} questions.")

        await db.commit()
        print("Database seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())

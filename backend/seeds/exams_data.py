"""
Preconfigured exam definitions with quotas and pools.
"""

EXAMS_DATA = [
    {
        "title": "UsefulBI Campus Placement 2026 - CS Fundamentals & Coding",
        "duration_minutes": 90,
        "easy_count": 1,
        "easy_weight": 10.0,
        "medium_count": 2,
        "medium_weight": 25.0,
        "hard_count": 0,
        "hard_weight": 0.0,
        "mcq_count": 20,
        "mcq_weight": 2.0,
        "is_published": True,
        "target_groups": ["batch-2026", "campus-drive"],
        "pool_selector": {
            "easy_slice": (0, 10),
            "medium_slice": (0, 15),
            "hard_slice": (0, 0),
            "mcq_slice": (0, 45)
        }
    },
    {
        "title": "Senior Software Engineer Assessment - Advanced Algorithms",
        "duration_minutes": 120,
        "easy_count": 0,
        "easy_weight": 0.0,
        "medium_count": 2,
        "medium_weight": 30.0,
        "hard_count": 1,
        "hard_weight": 40.0,
        "mcq_count": 10,
        "mcq_weight": 2.0,
        "is_published": True,
        "target_groups": ["experienced-devs", "senior-swe"],
        "pool_selector": {
            "easy_slice": (0, 0),
            "medium_slice": (10, 25),
            "hard_slice": (0, 12),
            "mcq_slice": (40, 75)
        }
    },
    {
        "title": "Core CS Engineering Qualifier (OS, DBMS, CN & Data Structures)",
        "duration_minutes": 60,
        "easy_count": 1,
        "easy_weight": 15.0,
        "medium_count": 1,
        "medium_weight": 25.0,
        "hard_count": 0,
        "hard_weight": 0.0,
        "mcq_count": 30,
        "mcq_weight": 2.0,
        "is_published": True,
        "target_groups": ["cse-core", "qualifier-2026"],
        "pool_selector": {
            "easy_slice": (10, 20),
            "medium_slice": (20, 30),
            "hard_slice": (0, 0),
            "mcq_slice": (0, 70)
        }
    },
    {
        "title": "Fullstack & Systems Developer Coding Sprint",
        "duration_minutes": 75,
        "easy_count": 2,
        "easy_weight": 15.0,
        "medium_count": 1,
        "medium_weight": 30.0,
        "hard_count": 0,
        "hard_weight": 0.0,
        "mcq_count": 10,
        "mcq_weight": 2.0,
        "is_published": True,
        "target_groups": ["fullstack", "interns-2026"],
        "pool_selector": {
            "easy_slice": (5, 18),
            "medium_slice": (15, 28),
            "hard_slice": (0, 0),
            "mcq_slice": (70, 105)
        }
    },
    {
        "title": "Competitive Programming Olympiad - Hard Edition",
        "duration_minutes": 120,
        "easy_count": 1,
        "easy_weight": 10.0,
        "medium_count": 1,
        "medium_weight": 30.0,
        "hard_count": 2,
        "hard_weight": 50.0,
        "mcq_count": 0,
        "mcq_weight": 0.0,
        "is_published": True,
        "target_groups": ["olympiad", "icpc-track"],
        "pool_selector": {
            "easy_slice": (15, 28),
            "medium_slice": (25, 40),
            "hard_slice": (5, 20),
            "mcq_slice": (0, 0)
        }
    },
    {
        "title": "Junior Software Engineer Rapid Screening",
        "duration_minutes": 45,
        "easy_count": 2,
        "easy_weight": 20.0,
        "medium_count": 0,
        "medium_weight": 0.0,
        "hard_count": 0,
        "hard_weight": 0.0,
        "mcq_count": 15,
        "mcq_weight": 2.0,
        "is_published": True,
        "target_groups": ["entry-level", "screening"],
        "pool_selector": {
            "easy_slice": (12, 27),
            "medium_slice": (0, 0),
            "hard_slice": (0, 0),
            "mcq_slice": (100, 140)
        }
    }
]

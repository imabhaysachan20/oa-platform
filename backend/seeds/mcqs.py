"""
Aggregator for all 150 CS fundamental MCQs:
- 40 Computer Networks (CN)
- 40 Operating Systems (OS)
- 40 Database Management Systems (DBMS)
- 30 Object Oriented Programming (OOPs)
Total: 150 questions
"""

from backend.seeds.mcq_cn import MCQ_CN_QUESTIONS
from backend.seeds.mcq_os import MCQ_OS_QUESTIONS
from backend.seeds.mcq_dbms import MCQ_DBMS_QUESTIONS
from backend.seeds.mcq_oops import MCQ_OOPS_QUESTIONS

ALL_MCQS = MCQ_CN_QUESTIONS + MCQ_OS_QUESTIONS + MCQ_DBMS_QUESTIONS + MCQ_OOPS_QUESTIONS

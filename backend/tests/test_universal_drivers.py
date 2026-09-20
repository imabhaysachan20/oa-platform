import sys
import subprocess
import pytest

from backend.app.services.universal_driver_service import (
    generate_all_templates,
    generate_starter_code,
    generate_universal_driver,
)
from backend.app.services.question_templates import wrap_code_with_driver


def test_template_generator_all_languages():
    params = [
        {"name": "nums", "type": "int[]"},
        {"name": "target", "type": "int"}
    ]
    res = generate_all_templates("findPair", params, "int[]")
    assert "findPair(nums: int[], target: int) -> int[]" == res["function_signature"]
    assert "def findPair(self, nums: List[int], target: int) -> List[int]:" in res["starter"]["python"]
    assert "function findPair(nums, target)" in res["starter"]["javascript"]
    assert "vector<int> findPair(vector<int>& nums, int target)" in res["starter"]["cpp"]
    assert "public int[] findPair(int[] nums, int target)" in res["starter"]["java"]


def test_listnode_and_treenode_starters():
    list_res = generate_all_templates("reverseList", [{"name": "head", "type": "ListNode"}], "ListNode")
    assert "Optional[ListNode]" in list_res["starter"]["python"]
    assert "ListNode* reverseList(ListNode* head)" in list_res["starter"]["cpp"]
    assert "public ListNode reverseList(ListNode head)" in list_res["starter"]["java"]

    tree_res = generate_all_templates("maxDepth", [{"name": "root", "type": "TreeNode"}], "int")
    assert "Optional[TreeNode]" in tree_res["starter"]["python"]
    assert "TreeNode* root" in tree_res["starter"]["cpp"]
    assert "TreeNode root" in tree_res["starter"]["java"]


def test_python_universal_driver_execution_primitives():
    student_code = '''class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        return sorted(s) == sorted(t)
'''
    params = [{"name": "s", "type": "string"}, {"name": "t", "type": "string"}]
    wrapped = wrap_code_with_driver(
        title="Valid Anagram Custom",
        code=student_code,
        language="python",
        function_name="isAnagram",
        parameters=params,
        return_type="bool"
    )

    # Test true case
    res1 = subprocess.run(
        [sys.executable, "-c", wrapped],
        input='"anagram"\\n"nagaram"',
        capture_output=True,
        text=True
    )
    assert res1.returncode == 0, f"Error: {res1.stderr}"
    assert res1.stdout.strip() == "true"

    # Test false case
    res2 = subprocess.run(
        [sys.executable, "-c", wrapped],
        input='"rat"\\n"car"',
        capture_output=True,
        text=True
    )
    assert res2.returncode == 0, f"Error: {res2.stderr}"
    assert res2.stdout.strip() == "false"


def test_python_universal_driver_2d_matrix():
    student_code = '''class Solution:
    def countNegatives(self, grid: list[list[int]]) -> int:
        return sum(1 for row in grid for x in row if x < 0)
'''
    params = [{"name": "grid", "type": "int[][]"}]
    wrapped = wrap_code_with_driver(
        title="Count Negatives in Matrix",
        code=student_code,
        language="python",
        function_name="countNegatives",
        parameters=params,
        return_type="int"
    )

    res = subprocess.run(
        [sys.executable, "-c", wrapped],
        input='[[4,3,2,-1],[3,2,1,-1],[1,1,-1,-2],[-1,-1,-2,-3]]',
        capture_output=True,
        text=True
    )
    assert res.returncode == 0, f"Error: {res.stderr}"
    assert res.stdout.strip() == "8"


def test_python_universal_driver_linked_list():
    student_code = '''class Solution:
    def reverseList(self, head):
        prev = None
        curr = head
        while curr:
            nxt = curr.next
            curr.next = prev
            prev = curr
            curr = nxt
        return prev
'''
    params = [{"name": "head", "type": "ListNode"}]
    wrapped = wrap_code_with_driver(
        title="Reverse Linked List",
        code=student_code,
        language="python",
        function_name="reverseList",
        parameters=params,
        return_type="ListNode"
    )

    res = subprocess.run(
        [sys.executable, "-c", wrapped],
        input='[1, 2, 3, 4, 5]',
        capture_output=True,
        text=True
    )
    assert res.returncode == 0, f"Error: {res.stderr}"
    assert res.stdout.strip() == "[5, 4, 3, 2, 1]"


def test_python_universal_driver_in_place_void():
    student_code = '''class Solution:
    def reverseString(self, s: list[str]) -> None:
        s.reverse()
'''
    params = [{"name": "s", "type": "string[]"}]
    wrapped = wrap_code_with_driver(
        title="Reverse String In Place",
        code=student_code,
        language="python",
        function_name="reverseString",
        parameters=params,
        return_type="void"
    )

    res = subprocess.run(
        [sys.executable, "-c", wrapped],
        input='["h","e","l","l","o"]',
        capture_output=True,
        text=True
    )
    assert res.returncode == 0, f"Error: {res.stderr}"
    assert res.stdout.strip() == '["o", "l", "l", "e", "h"]'

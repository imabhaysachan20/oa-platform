import sys
import subprocess
import pytest

from backend.app.services.question_templates import (
    QUESTION_TEMPLATES,
    get_question_starter_templates,
    get_question_signature,
    wrap_code_with_driver,
)


def test_all_10_seeded_questions_have_templates():
    expected_titles = [
        "Two Sum Target",
        "Palindrome String Checker",
        "Valid Parentheses",
        "Fibonacci Number",
        "Longest Substring Without Repeating Characters",
        "Maximum Subarray Sum (Kadane's)",
        "Coin Change Minimum",
        "Merge Intervals",
        "Trapping Rain Water",
        "Median of Two Sorted Arrays",
    ]
    for title in expected_titles:
        assert title in QUESTION_TEMPLATES, f"Missing template for {title}"
        starter = get_question_starter_templates(title)
        assert "python" in starter
        assert "javascript" in starter
        assert "cpp" in starter
        assert "java" in starter
        assert get_question_signature(title) is not None


def test_backward_compatibility_custom_main():
    custom_py = '''import sys
def main():
    print("hello from custom main")
if __name__ == "__main__":
    main()
'''
    wrapped = wrap_code_with_driver("Two Sum Target", custom_py, "python")
    assert wrapped == custom_py, "Custom __main__ should not be wrapped with driver"

    custom_cpp = '''#include <iostream>
int main() {
    std::cout << "custom";
    return 0;
}
'''
    wrapped_cpp = wrap_code_with_driver("Two Sum Target", custom_cpp, "cpp")
    assert wrapped_cpp == custom_cpp


def test_python_two_sum_execution():
    student_solution = '''class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, n in enumerate(nums):
            diff = target - n
            if diff in seen:
                return [seen[diff], i]
            seen[n] = i
        return []
'''
    wrapped = wrap_code_with_driver("Two Sum Target", student_solution, "python")
    # Sample input: "2 7 11 15\n9" -> expected "0 1"
    res = subprocess.run(
        [sys.executable, "-c", wrapped],
        input="2 7 11 15\n9",
        capture_output=True,
        text=True
    )
    assert res.returncode == 0, f"Error: {res.stderr}"
    assert res.stdout.strip() == "0 1"


def test_python_palindrome_execution():
    student_solution = '''class Solution:
    def isPalindrome(self, s: str) -> bool:
        filtered = [c.lower() for c in s if c.isalnum()]
        return filtered == filtered[::-1]
'''
    wrapped = wrap_code_with_driver("Palindrome String Checker", student_solution, "python")
    res = subprocess.run(
        [sys.executable, "-c", wrapped],
        input="race a car",
        capture_output=True,
        text=True
    )
    assert res.returncode == 0, f"Error: {res.stderr}"
    assert res.stdout.strip() == "false"

    res_true = subprocess.run(
        [sys.executable, "-c", wrapped],
        input="A man, a plan, a canal: Panama",
        capture_output=True,
        text=True
    )
    assert res_true.returncode == 0, f"Error: {res_true.stderr}"
    assert res_true.stdout.strip() == "true"


def test_python_valid_parentheses_execution():
    student_solution = '''class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        pairs = {')': '(', '}': '{', ']': '['}
        for char in s:
            if char in pairs.values():
                stack.append(char)
            elif char in pairs:
                if not stack or stack[-1] != pairs[char]:
                    return False
                stack.pop()
        return len(stack) == 0
'''
    wrapped = wrap_code_with_driver("Valid Parentheses", student_solution, "python")
    res = subprocess.run(
        [sys.executable, "-c", wrapped],
        input="()[]{}",
        capture_output=True,
        text=True
    )
    assert res.returncode == 0, f"Error: {res.stderr}"
    assert res.stdout.strip() == "true"


def test_python_max_subarray_execution():
    student_solution = '''class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        cur = max_sum = nums[0]
        for x in nums[1:]:
            cur = max(x, cur + x)
            max_sum = max(max_sum, cur)
        return max_sum
'''
    wrapped = wrap_code_with_driver("Maximum Subarray Sum", student_solution, "python")
    res = subprocess.run(
        [sys.executable, "-c", wrapped],
        input="-2 1 -3 4 -1 2 1 -5 4",
        capture_output=True,
        text=True
    )
    assert res.returncode == 0, f"Error: {res.stderr}"
    assert res.stdout.strip() == "6"


def test_cpp_palindrome_wrapping():
    cpp_solution = '''#include <iostream>
#include <string>

using namespace std;

class Solution {
public:
    bool isPalindrome(string s) {
        return true;
    }
};
'''
    wrapped = wrap_code_with_driver("Palindrome String Checker", cpp_solution, "cpp")
    assert "class Solution" in wrapped
    assert "int main()" in wrapped
    assert "sol.isPalindrome" in wrapped


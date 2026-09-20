import json
import math
import re
from typing import Optional, Any, Tuple


def normalize_output(text: Optional[str]) -> str:
    """Strip carriage returns and trailing whitespaces on each line."""
    if not text:
        return ""
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").split("\n")]
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines)


def _try_parse_json(text: str) -> Tuple[Any, bool]:
    """
    Attempts to parse text as JSON or Python literal structure.
    Handles differences like:
    - true/false vs True/False
    - null vs None
    - single quotes vs double quotes
    """
    s = text.strip()
    if not s:
        return None, False

    # 1. Direct JSON parse
    try:
        return json.loads(s), True
    except Exception:
        pass

    # 2. Python literal normalize (True -> true, False -> false, None -> null)
    s_mod = re.sub(r'\bTrue\b', 'true', s)
    s_mod = re.sub(r'\bFalse\b', 'false', s_mod)
    s_mod = re.sub(r'\bNone\b', 'null', s_mod)

    # If it looks like a list or object with single quotes, normalize them to double quotes
    if (s_mod.startswith('[') and s_mod.endswith(']')) or (s_mod.startswith('{') and s_mod.endswith('}')):
        s_mod = re.sub(r"'([^']*)'", r'"\1"', s_mod)

    try:
        return json.loads(s_mod), True
    except Exception:
        pass

    return None, False


def _json_values_match(a: Any, b: Any) -> bool:
    """
    Recursively compares parsed JSON objects:
    - Lists match element by element
    - Dicts match key by key
    - Floats/ints match within numerical tolerance
    - Booleans and strings match strictly
    """
    if type(a) != type(b):
        # Allow int vs float comparison (e.g. 1 == 1.0)
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return math.isclose(float(a), float(b), rel_tol=1e-5, abs_tol=1e-5)
        return False

    if isinstance(a, list):
        if len(a) != len(b):
            return False
        return all(_json_values_match(x, y) for x, y in zip(a, b))

    if isinstance(a, dict):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(_json_values_match(a[k], b[k]) for k in a)

    if isinstance(a, float):
        return math.isclose(a, b, rel_tol=1e-5, abs_tol=1e-5)

    return a == b


def compare_outputs(actual_raw: Optional[str], expected_raw: Optional[str]) -> bool:
    """
    Determines if actual execution output matches expected output across all supported return types:
    - Primitives (int, float, string, bool)
    - Collections (int[], float[], string[], int[][], string[][])
    - Data structures (ListNode, TreeNode)
    - In-place modifications (void)
    
    Tolerates:
    - Spacing around commas and brackets: [1,2] vs [1, 2]
    - Outer string quotes: "olleh" vs olleh
    - Boolean casing: true vs True
    - Float representation: 3.0 vs 3, 3.140 vs 3.14
    - Multiple whitespace / newline variations
    """
    if actual_raw is None or expected_raw is None:
        return (actual_raw or "").strip() == (expected_raw or "").strip()

    act = actual_raw.strip().replace("\r\n", "\n")
    exp = expected_raw.strip().replace("\r\n", "\n")

    # 1. Exact string match (after trimming)
    if act == exp:
        return True

    # 2. JSON / Collection Semantic Match (handles [1,2] == [1, 2], [[1,2]] == [[1, 2]], etc.)
    act_obj, act_is_json = _try_parse_json(act)
    exp_obj, exp_is_json = _try_parse_json(exp)
    if act_is_json and exp_is_json:
        if _json_values_match(act_obj, exp_obj):
            return True

    # 3. Boolean normalization (case-insensitive: "true" == "True")
    if act.lower() in ["true", "false"] and exp.lower() in ["true", "false"]:
        return act.lower() == exp.lower()

    # 4. Enclosed String Quotes: e.g. actual is olleh, expected is "olleh" (or vice versa)
    act_unquoted = act.strip('"\'')
    exp_unquoted = exp.strip('"\'')
    if act_unquoted == exp_unquoted:
        return True

    # 5. Floating point numerical comparison: e.g. 3.000 vs 3.0 vs 3
    try:
        f_act = float(act)
        f_exp = float(exp)
        if math.isclose(f_act, f_exp, rel_tol=1e-5, abs_tol=1e-5):
            return True
    except (ValueError, TypeError):
        pass

    # 6. Punctuation whitespace normalization: e.g. [ 1 , 2 ] vs [1,2]
    norm_punc_act = re.sub(r'\s*([,\[\]\{\}:])\s*', r'\1', act)
    norm_punc_exp = re.sub(r'\s*([,\[\]\{\}:])\s*', r'\1', exp)
    if norm_punc_act == norm_punc_exp:
        return True

    # 7. Whitespace-separated token matching (multi-line or space-separated lists)
    act_lines = [l.rstrip() for l in act.split("\n") if l.rstrip()]
    exp_lines = [l.rstrip() for l in exp.split("\n") if l.rstrip()]
    if len(act_lines) == len(exp_lines) and len(act_lines) > 0:
        if all(a.split() == e.split() for a, e in zip(act_lines, exp_lines)):
            return True

    return False

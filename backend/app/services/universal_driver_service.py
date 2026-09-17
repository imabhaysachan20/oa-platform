"""
Universal LeetCode-style signature and driver generation engine.
Supports automatic code generation, parsing, execution wrapping, and serialization
across Python, JavaScript, C++, and Java for all common data structures:
- Primitives: int, float, string, bool
- Collections: 1D arrays (int[], string[], float[]), 2D arrays (int[][], string[][])
- Data structures: ListNode (singly-linked list), TreeNode (binary tree)
- In-place modifications: void return type
"""

import json
import re
from typing import List, Dict, Any, Optional, Tuple


SUPPORTED_TYPES = [
    "int",
    "float",
    "string",
    "bool",
    "int[]",
    "float[]",
    "string[]",
    "int[][]",
    "string[][]",
    "ListNode",
    "TreeNode",
    "void",
]


def normalize_type_name(raw_type: str) -> str:
    """Normalizes various type spellings to our canonical type strings."""
    t = raw_type.strip().lower()
    if t in ["int", "integer", "number"]:
        return "int"
    if t in ["float", "double", "decimal"]:
        return "float"
    if t in ["string", "str", "char*"]:
        return "string"
    if t in ["bool", "boolean"]:
        return "bool"
    if t in ["int[]", "list[int]", "vector<int>", "integer[]", "array[int]"]:
        return "int[]"
    if t in ["float[]", "double[]", "list[float]", "vector<double>"]:
        return "float[]"
    if t in ["string[]", "str[]", "list[str]", "list[string]", "vector<string>"]:
        return "string[]"
    if t in ["int[][]", "list[list[int]]", "vector<vector<int>>", "matrix"]:
        return "int[][]"
    if t in ["string[][]", "list[list[str]]", "vector<vector<string>>"]:
        return "string[][]"
    if t in ["listnode", "listnode*", "linkedlist", "node"]:
        return "ListNode"
    if t in ["treenode", "treenode*", "binarytree"]:
        return "TreeNode"
    if t in ["void", "none", "null"]:
        return "void"
    return raw_type.strip()


def get_python_type_hint(t: str) -> str:
    norm = normalize_type_name(t)
    if norm == "int":
        return "int"
    if norm == "float":
        return "float"
    if norm == "string":
        return "str"
    if norm == "bool":
        return "bool"
    if norm == "int[]":
        return "List[int]"
    if norm == "float[]":
        return "List[float]"
    if norm == "string[]":
        return "List[str]"
    if norm == "int[][]":
        return "List[List[int]]"
    if norm == "string[][]":
        return "List[List[str]]"
    if norm == "ListNode":
        return "Optional[ListNode]"
    if norm == "TreeNode":
        return "Optional[TreeNode]"
    if norm == "void":
        return "None"
    return "Any"


def get_cpp_type_hint(t: str, is_param: bool = False) -> str:
    norm = normalize_type_name(t)
    if norm == "int":
        return "int"
    if norm == "float":
        return "double"
    if norm == "string":
        return "string&" if is_param else "string"
    if norm == "bool":
        return "bool"
    if norm == "int[]":
        return "vector<int>&" if is_param else "vector<int>"
    if norm == "float[]":
        return "vector<double>&" if is_param else "vector<double>"
    if norm == "string[]":
        return "vector<string>&" if is_param else "vector<string>"
    if norm == "int[][]":
        return "vector<vector<int>>&" if is_param else "vector<vector<int>>"
    if norm == "string[][]":
        return "vector<vector<string>>&" if is_param else "vector<vector<string>>"
    if norm == "ListNode":
        return "ListNode*"
    if norm == "TreeNode":
        return "TreeNode*"
    if norm == "void":
        return "void"
    return "auto"


def get_java_type_hint(t: str) -> str:
    norm = normalize_type_name(t)
    if norm == "int":
        return "int"
    if norm == "float":
        return "double"
    if norm == "string":
        return "String"
    if norm == "bool":
        return "boolean"
    if norm == "int[]":
        return "int[]"
    if norm == "float[]":
        return "double[]"
    if norm == "string[]":
        return "String[]"
    if norm == "int[][]":
        return "int[][]"
    if norm == "string[][]":
        return "String[][]"
    if norm == "ListNode":
        return "ListNode"
    if norm == "TreeNode":
        return "TreeNode"
    if norm == "void":
        return "void"
    return "Object"


def get_js_doc_type(t: str) -> str:
    norm = normalize_type_name(t)
    if norm in ["int", "float"]:
        return "number"
    if norm == "string":
        return "string"
    if norm == "bool":
        return "boolean"
    if norm in ["int[]", "float[]"]:
        return "number[]"
    if norm == "string[]":
        return "string[]"
    if norm in ["int[][]", "string[][]"]:
        return "any[][]"
    if norm == "ListNode":
        return "ListNode"
    if norm == "TreeNode":
        return "TreeNode"
    if norm == "void":
        return "void"
    return "any"


# ==============================================================================
# STARTER CODE GENERATION
# ==============================================================================

def generate_starter_code(
    function_name: str,
    parameters: List[Dict[str, Any]],
    return_type: str,
    language: str
) -> str:
    fn = function_name.strip() or "solve"
    ret = return_type.strip() or "void"
    has_list_node = any(normalize_type_name(p.get("type", "")) == "ListNode" for p in parameters) or normalize_type_name(ret) == "ListNode"
    has_tree_node = any(normalize_type_name(p.get("type", "")) == "TreeNode" for p in parameters) or normalize_type_name(ret) == "TreeNode"

    lang = language.lower().strip()

    if lang in ["python", "python3", "py"]:
        parts = ["from typing import List, Optional, Dict, Any\n"]
        if has_list_node:
            parts.append(
                "# Definition for singly-linked list.\n"
                "# class ListNode:\n"
                "#     def __init__(self, val=0, next=None):\n"
                "#         self.val = val\n"
                "#         self.next = next\n"
            )
        if has_tree_node:
            parts.append(
                "# Definition for a binary tree node.\n"
                "# class TreeNode:\n"
                "#     def __init__(self, val=0, left=None, right=None):\n"
                "#         self.val = val\n"
                "#         self.left = left\n"
                "#         self.right = right\n"
            )

        param_str = ", ".join(
            f"{p.get('name', 'arg')}: {get_python_type_hint(p.get('type', ''))}"
            for p in parameters
        )
        if param_str:
            param_str = f", {param_str}"

        ret_hint = get_python_type_hint(ret)
        parts.append(
            f"class Solution:\n"
            f"    def {fn}(self{param_str}) -> {ret_hint}:\n"
            f"        # Write your code here\n"
            f"        pass\n"
        )
        return "\n".join(parts)

    elif lang in ["javascript", "js", "node", "nodejs"]:
        doc_lines = ["/**"]
        for p in parameters:
            p_name = p.get("name", "arg")
            doc_lines.append(f" * @param {{{get_js_doc_type(p.get('type', ''))}}} {p_name}")
        doc_lines.append(f" * @return {{{get_js_doc_type(ret)}}}")
        doc_lines.append(" */")

        param_names = ", ".join(p.get("name", "arg") for p in parameters)
        header = "\n".join(doc_lines)
        return (
            f"{header}\n"
            f"function {fn}({param_names}) {{\n"
            f"    // Write your code here\n"
            f"    \n"
            f"}}\n"
        )

    elif lang in ["cpp", "c++"]:
        headers = [
            "#include <iostream>",
            "#include <vector>",
            "#include <string>",
            "#include <algorithm>",
            "#include <unordered_map>",
            "#include <queue>",
            "\nusing namespace std;\n",
        ]
        if has_list_node:
            headers.append(
                "// Definition for singly-linked list.\n"
                "// struct ListNode {\n"
                "//     int val;\n"
                "//     ListNode *next;\n"
                "//     ListNode(int x) : val(x), next(NULL) {}\n"
                "// };\n"
            )
        if has_tree_node:
            headers.append(
                "// Definition for a binary tree node.\n"
                "// struct TreeNode {\n"
                "//     int val;\n"
                "//     TreeNode *left;\n"
                "//     TreeNode *right;\n"
                "//     TreeNode(int x) : val(x), left(NULL), right(NULL) {}\n"
                "// };\n"
            )

        param_str = ", ".join(
            f"{get_cpp_type_hint(p.get('type', ''), is_param=True)} {p.get('name', 'arg')}"
            for p in parameters
        )
        ret_cpp = get_cpp_type_hint(ret, is_param=False)

        headers.append(
            f"class Solution {{\n"
            f"public:\n"
            f"    {ret_cpp} {fn}({param_str}) {{\n"
            f"        // Write your code here\n"
            f"        \n"
            f"    }}\n"
            f"}};\n"
        )
        return "\n".join(headers)

    elif lang in ["java"]:
        param_str = ", ".join(
            f"{get_java_type_hint(p.get('type', ''))} {p.get('name', 'arg')}"
            for p in parameters
        )
        ret_java = get_java_type_hint(ret)
        ret_stub = ""
        if ret_java == "int":
            ret_stub = "return 0;"
        elif ret_java == "boolean":
            ret_stub = "return false;"
        elif ret_java == "double":
            ret_stub = "return 0.0;"
        elif ret_java == "String":
            ret_stub = 'return "";'
        elif "[]" in ret_java:
            base = ret_java.replace("[]", "")
            ret_stub = f"return new {base}[0];"
        elif ret_java != "void":
            ret_stub = "return null;"

        return (
            "import java.util.*;\n\n"
            "class Solution {\n"
            f"    public {ret_java} {fn}({param_str}) {{\n"
            "        // Write your code here\n"
            f"        {ret_stub}\n"
            "    }\n"
            "}\n"
        )

    return ""


def generate_all_templates(
    function_name: str,
    parameters: List[Dict[str, Any]],
    return_type: str
) -> Dict[str, Any]:
    """Generates starter code for all 4 supported languages and a formatted signature."""
    param_str = ", ".join(
        f"{p.get('name', 'arg')}: {p.get('type', 'any')}"
        for p in parameters
    )
    sig = f"{function_name}({param_str}) -> {return_type}"

    return {
        "function_signature": sig,
        "starter": {
            "python": generate_starter_code(function_name, parameters, return_type, "python"),
            "javascript": generate_starter_code(function_name, parameters, return_type, "javascript"),
            "cpp": generate_starter_code(function_name, parameters, return_type, "cpp"),
            "java": generate_starter_code(function_name, parameters, return_type, "java"),
        }
    }


# ==============================================================================
# UNIVERSAL DRIVER GENERATION
# ==============================================================================

def generate_universal_python_driver(
    function_name: str,
    parameters: List[Dict[str, Any]],
    return_type: str
) -> str:
    """
    Generates a Python driver that deserializes stdin inputs (JSON or whitespace),
    invokes the candidate's Solution.<function_name>, and serializes the result.
    """
    param_types = [normalize_type_name(p.get("type", "")) for p in parameters]
    norm_ret = normalize_type_name(return_type)
    num_params = len(parameters)

    return f'''
# ==============================================================================
# UNIVERSAL TEST HARNESS (Auto-injected by UBIcode)
# ==============================================================================
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def _build_list_node(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    curr = head
    for v in arr[1:]:
        curr.next = ListNode(v)
        curr = curr.next
    return head

def _serialize_list_node(head):
    res = []
    curr = head
    visited = set()
    while curr and id(curr) not in visited and len(res) < 10000:
        visited.add(id(curr))
        res.append(curr.val)
        curr = curr.next
    return res

def _build_tree_node(arr):
    if not arr or arr[0] is None:
        return None
    from collections import deque
    root = TreeNode(arr[0])
    q = deque([root])
    i = 1
    while q and i < len(arr):
        node = q.popleft()
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            q.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            q.append(node.right)
        i += 1
    return root

def _serialize_tree_node(root):
    if not root:
        return []
    from collections import deque
    res = []
    q = deque([root])
    while q:
        node = q.popleft()
        if node:
            res.append(node.val)
            q.append(node.left)
            q.append(node.right)
        else:
            res.append(None)
    while res and res[-1] is None:
        res.pop()
    return res

def _parse_input_arg(raw_line, expected_type):
    import json
    raw = raw_line.strip()
    if not raw:
        if "[]" in expected_type or expected_type in ["ListNode", "TreeNode"]:
            return []
        if expected_type == "int":
            return 0
        if expected_type == "bool":
            return False
        return ""

    # Attempt JSON parse first
    try:
        val = json.loads(raw)
    except Exception:
        # Fallback to whitespace separated tokens
        tokens = raw.split()
        if expected_type == "int[]":
            val = [int(x) for x in tokens]
        elif expected_type == "float[]":
            val = [float(x) for x in tokens]
        elif expected_type == "string[]":
            val = tokens
        elif expected_type == "int":
            val = int(tokens[0])
        elif expected_type == "float":
            val = float(tokens[0])
        elif expected_type == "bool":
            val = raw.lower() in ["true", "1", "t", "yes"]
        else:
            val = raw

    if expected_type == "ListNode":
        if isinstance(val, list):
            return _build_list_node(val)
        elif isinstance(val, (int, float, str)):
            return _build_list_node([val])
    elif expected_type == "TreeNode":
        if isinstance(val, list):
            return _build_tree_node(val)
    elif expected_type == "int" and not isinstance(val, int):
        try:
            val = int(val)
        except Exception:
            pass
    elif expected_type == "bool" and not isinstance(val, bool):
        val = bool(val)

    return val

if __name__ == "__main__":
    import sys, json
    raw_all = sys.stdin.read()
    # Normalize literal backslash-n if present
    raw_all = raw_all.replace(chr(92) + "n", chr(10))
    lines = [l.strip() for l in raw_all.splitlines() if l.strip()]

    param_types = {json.dumps(param_types)}
    parsed_args = []

    # If single line contains whitespace tokens for multiple params
    if len(lines) < len(param_types) and len(lines) == 1 and len(param_types) > 1:
        # Check if single line has space separated values
        tokens = lines[0].split()
        if len(tokens) >= len(param_types):
            for i, p_type in enumerate(param_types):
                parsed_args.append(_parse_input_arg(tokens[i], p_type))
    else:
        for i, p_type in enumerate(param_types):
            line_val = lines[i] if i < len(lines) else ""
            parsed_args.append(_parse_input_arg(line_val, p_type))

    sol = Solution()
    func = getattr(sol, {json.dumps(function_name)})
    res = func(*parsed_args)

    norm_ret = {json.dumps(norm_ret)}
    # If void return, print the first modified argument (in-place modification pattern)
    if norm_ret == "void":
        res = parsed_args[0] if parsed_args else None

    if isinstance(res, ListNode):
        res = _serialize_list_node(res)
    elif isinstance(res, TreeNode):
        res = _serialize_tree_node(res)

    if isinstance(res, bool):
        print("true" if res else "false")
    elif isinstance(res, (list, tuple, dict)):
        print(json.dumps(res, separators=(',', ':')))
    elif res is None:
        print("null")
    else:
        print(res)
'''


def generate_universal_javascript_driver(
    function_name: str,
    parameters: List[Dict[str, Any]],
    return_type: str
) -> str:
    """Generates Node.js test harness for the question."""
    param_types = [normalize_type_name(p.get("type", "")) for p in parameters]
    norm_ret = normalize_type_name(return_type)

    return f'''
// ==============================================================================
// UNIVERSAL TEST HARNESS (Auto-injected by UBIcode)
// ==============================================================================
function ListNode(val, next) {{
    this.val = (val === undefined ? 0 : val);
    this.next = (next === undefined ? null : next);
}}

function TreeNode(val, left, right) {{
    this.val = (val === undefined ? 0 : val);
    this.left = (left === undefined ? null : left);
    this.right = (right === undefined ? null : right);
}}

function _buildListNode(arr) {{
    if (!arr || arr.length === 0) return null;
    let head = new ListNode(arr[0]);
    let curr = head;
    for (let i = 1; i < arr.length; i++) {{
        curr.next = new ListNode(arr[i]);
        curr = curr.next;
    }}
    return head;
}}

function _serializeListNode(head) {{
    const res = [];
    let curr = head;
    let count = 0;
    while (curr && count < 10000) {{
        res.push(curr.val);
        curr = curr.next;
        count++;
    }}
    return res;
}}

(function() {{
    const fs = require('fs');
    const input = fs.readFileSync(0, 'utf-8');
    const lines = input.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);

    const paramTypes = {json.dumps(param_types)};
    const parsedArgs = [];

    for (let i = 0; i < paramTypes.length; i++) {{
        const raw = lines[i] || "";
        const pType = paramTypes[i];
        let val;
        try {{
            val = JSON.parse(raw);
        }} catch (e) {{
            if (pType === "int[]" || pType === "float[]") {{
                val = raw.split(/\\s+/).map(Number);
            }} else if (pType === "int" || pType === "float") {{
                val = Number(raw);
            }} else if (pType === "bool") {{
                val = raw.toLowerCase() === "true";
            }} else {{
                val = raw;
            }}
        }}

        if (pType === "ListNode" && Array.isArray(val)) {{
            val = _buildListNode(val);
        }}
        parsedArgs.push(val);
    }}

    let sol;
    let fn;
    if (typeof {function_name} === 'function') {{
        fn = {function_name};
    }} else if (typeof Solution === 'function') {{
        sol = new Solution();
        fn = sol.{function_name} ? sol.{function_name}.bind(sol) : null;
    }}

    if (!fn && typeof Solution !== 'undefined') {{
        sol = new Solution();
        fn = sol.{function_name} ? sol.{function_name}.bind(sol) : null;
    }}

    if (!fn) {{
        console.error("Function '{function_name}' not found.");
        process.exit(1);
    }}

    let res = fn(...parsedArgs);
    const normRet = {json.dumps(norm_ret)};
    if (normRet === "void") {{
        res = parsedArgs[0];
    }}

    if (res && typeof res === 'object' && 'next' in res && 'val' in res) {{
        res = _serializeListNode(res);
    }}

    if (typeof res === 'boolean') {{
        console.log(res ? "true" : "false");
    }} else if (typeof res === 'object') {{
        console.log(JSON.stringify(res));
    }} else {{
        console.log(res);
    }}
}})();
'''


def generate_universal_cpp_driver(
    function_name: str,
    parameters: List[Dict[str, Any]],
    return_type: str
) -> str:
    """Generates C++ test harness with JSON-like line parsing for the question."""
    norm_ret = normalize_type_name(return_type)

    read_stmts = []
    call_args = []

    for idx, p in enumerate(parameters):
        p_name = f"arg{idx}"
        p_type = normalize_type_name(p.get("type", ""))
        call_args.append(p_name)

        if p_type == "int":
            read_stmts.append(f"    int {p_name}; if (!(cin >> {p_name})) {p_name} = 0;")
        elif p_type == "float":
            read_stmts.append(f"    double {p_name}; if (!(cin >> {p_name})) {p_name} = 0.0;")
        elif p_type == "string":
            read_stmts.append(f"    string {p_name}; getline(cin >> ws, {p_name});")
        elif p_type == "bool":
            read_stmts.append(f'''    string s_{idx}; cin >> s_{idx};
    bool {p_name} = (s_{idx} == "true" || s_{idx} == "1");''')
        elif p_type in ["int[]", "float[]"]:
            read_stmts.append(f'''    string line_{idx};
    getline(cin >> ws, line_{idx});
    vector<int> {p_name} = _parse_int_vector(line_{idx});''')
        elif p_type == "string[]":
            read_stmts.append(f'''    string line_{idx};
    getline(cin >> ws, line_{idx});
    vector<string> {p_name} = _parse_string_vector(line_{idx});''')
        elif p_type == "int[][]":
            read_stmts.append(f'''    string line_{idx};
    getline(cin >> ws, line_{idx});
    vector<vector<int>> {p_name} = _parse_2d_int_vector(line_{idx});''')
        elif p_type == "ListNode":
            read_stmts.append(f'''    string line_{idx};
    getline(cin >> ws, line_{idx});
    ListNode* {p_name} = _build_list_node(_parse_int_vector(line_{idx}));''')
        elif p_type == "TreeNode":
            read_stmts.append(f'''    string line_{idx};
    getline(cin >> ws, line_{idx});
    TreeNode* {p_name} = _build_tree_node(line_{idx});''')
        else:
            read_stmts.append(f"    string {p_name}; getline(cin >> ws, {p_name});")

    args_joined = ", ".join(call_args)
    reads_block = "\n".join(read_stmts)

    res_block = ""
    if norm_ret == "void":
        first_arg = call_args[0] if call_args else ""
        res_block = f'''
    sol.{function_name}({args_joined});
    _print_result({first_arg});
'''
    else:
        res_block = f'''
    auto res = sol.{function_name}({args_joined});
    _print_result(res);
'''

    return f'''
// ==============================================================================
// UNIVERSAL C++ TEST HARNESS (Auto-injected by UBIcode)
// ==============================================================================
#include <iostream>
#include <sstream>
#include <vector>
#include <string>
#include <algorithm>
#include <queue>
#include <cctype>

using namespace std;

struct ListNode {{
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {{}}
    ListNode(int x) : val(x), next(nullptr) {{}}
    ListNode(int x, ListNode *next) : val(x), next(next) {{}}
}};

struct TreeNode {{
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {{}}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {{}}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {{}}
}};

static vector<int> _parse_int_vector(const string& s) {{
    vector<int> res;
    string clean;
    for (char c : s) {{
        if (c == '[' || c == ']' || c == ',') clean += ' ';
        else clean += c;
    }}
    stringstream ss(clean);
    int val;
    while (ss >> val) res.push_back(val);
    return res;
}}

static vector<string> _parse_string_vector(const string& s) {{
    vector<string> res;
    stringstream ss(s);
    string token;
    while (ss >> token) {{
        string clean;
        for (char c : token) {{
            if (c != '[' && c != ']' && c != ',' && c != '"' && c != '\\'') clean += c;
        }}
        if (!clean.empty()) res.push_back(clean);
    }}
    return res;
}}

static vector<vector<int>> _parse_2d_int_vector(const string& s) {{
    vector<vector<int>> res;
    size_t i = 0;
    while (i < s.size()) {{
        if (s[i] == '[') {{
            size_t j = s.find(']', i);
            if (j != string::npos) {{
                string sub = s.substr(i, j - i + 1);
                auto vec = _parse_int_vector(sub);
                if (!vec.empty() || sub.find("[]") != string::npos) res.push_back(vec);
                i = j + 1;
                continue;
            }}
        }}
        i++;
    }}
    return res;
}}

static ListNode* _build_list_node(const vector<int>& arr) {{
    if (arr.empty()) return nullptr;
    ListNode* head = new ListNode(arr[0]);
    ListNode* curr = head;
    for (size_t i = 1; i < arr.size(); ++i) {{
        curr->next = new ListNode(arr[i]);
        curr = curr->next;
    }}
    return head;
}}

static TreeNode* _build_tree_node(const string& s) {{
    auto vec = _parse_int_vector(s);
    if (vec.empty()) return nullptr;
    TreeNode* root = new TreeNode(vec[0]);
    queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < vec.size()) {{
        TreeNode* curr = q.front();
        q.pop();
        if (i < vec.size()) {{
            curr->left = new TreeNode(vec[i++]);
            q.push(curr->left);
        }}
        if (i < vec.size()) {{
            curr->right = new TreeNode(vec[i++]);
            q.push(curr->right);
        }}
    }}
    return root;
}}

template<typename T>
static void _print_result(const T& val) {{
    cout << val << endl;
}}

static void _print_result(bool val) {{
    cout << (val ? "true" : "false") << endl;
}}

static void _print_result(const vector<int>& vec) {{
    cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {{
        cout << vec[i] << (i + 1 < vec.size() ? "," : "");
    }}
    cout << "]" << endl;
}}

static void _print_result(const vector<string>& vec) {{
    cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {{
        cout << "\\"" << vec[i] << "\\"" << (i + 1 < vec.size() ? "," : "");
    }}
    cout << "]" << endl;
}}

static void _print_result(const vector<vector<int>>& mat) {{
    cout << "[";
    for (size_t i = 0; i < mat.size(); ++i) {{
        cout << "[";
        for (size_t j = 0; j < mat[i].size(); ++j) {{
            cout << mat[i][j] << (j + 1 < mat[i].size() ? "," : "");
        }}
        cout << "]" << (i + 1 < mat.size() ? "," : "");
    }}
    cout << "]" << endl;
}}

static void _print_result(ListNode* head) {{
    vector<int> res;
    ListNode* curr = head;
    while (curr && res.size() < 10000) {{
        res.push_back(curr->val);
        curr = curr->next;
    }}
    _print_result(res);
}}

int main() {{
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

{reads_block}

    Solution sol;
{res_block}

    return 0;
}}
'''


def generate_universal_java_driver(
    function_name: str,
    parameters: List[Dict[str, Any]],
    return_type: str
) -> str:
    """Generates Java test harness with automatic stream parsing."""
    norm_ret = normalize_type_name(return_type)

    read_stmts = []
    call_args = []

    for idx, p in enumerate(parameters):
        p_name = f"arg{idx}"
        p_type = normalize_type_name(p.get("type", ""))
        call_args.append(p_name)

        if p_type == "int":
            read_stmts.append(f"        int {p_name} = sc.hasNextInt() ? sc.nextInt() : 0;")
        elif p_type == "float":
            read_stmts.append(f"        double {p_name} = sc.hasNextDouble() ? sc.nextDouble() : 0.0;")
        elif p_type == "string":
            read_stmts.append(f"        String {p_name} = sc.hasNext() ? sc.next() : \"\";")
        elif p_type == "bool":
            read_stmts.append(f"        boolean {p_name} = sc.hasNextBoolean() ? sc.nextBoolean() : false;")
        elif p_type in ["int[]", "float[]"]:
            read_stmts.append(f"        int[] {p_name} = _parseIntArray(sc.hasNextLine() ? sc.nextLine() : \"\");")
        else:
            read_stmts.append(f"        String {p_name} = sc.hasNextLine() ? sc.nextLine() : \"\";")

    args_joined = ", ".join(call_args)
    reads_block = "\n".join(read_stmts)

    res_block = ""
    if norm_ret == "void":
        first_arg = call_args[0] if call_args else ""
        res_block = f'''
        sol.{function_name}({args_joined});
        _printResult({first_arg});
'''
    else:
        res_block = f'''
        Object res = sol.{function_name}({args_joined});
        _printResult(res);
'''

    return f'''
// ==============================================================================
// UNIVERSAL JAVA TEST HARNESS (Auto-injected by UBIcode)
// ==============================================================================
class ListNode {{
    int val;
    ListNode next;
    ListNode() {{}}
    ListNode(int val) {{ this.val = val; }}
    ListNode(int val, ListNode next) {{ this.val = val; this.next = next; }}
}}

class TreeNode {{
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {{}}
    TreeNode(int val) {{ this.val = val; }}
    TreeNode(int val, TreeNode left, TreeNode right) {{
        this.val = val;
        this.left = left;
        this.right = right;
    }}
}}

public class Main {{
    private static int[] _parseIntArray(String s) {{
        String clean = s.replaceAll("[\\[\\],]", " ").trim();
        if (clean.isEmpty()) return new int[0];
        String[] tokens = clean.split("\\\\s+");
        int[] arr = new int[tokens.length];
        for (int i = 0; i < tokens.length; i++) {{
            arr[i] = Integer.parseInt(tokens[i]);
        }}
        return arr;
    }}

    private static void _printResult(Object res) {{
        if (res == null) {{
            System.out.println("null");
        }} else if (res instanceof int[]) {{
            System.out.println(Arrays.toString((int[]) res).replaceAll(" ", ""));
        }} else if (res instanceof Object[]) {{
            System.out.println(Arrays.deepToString((Object[]) res).replaceAll(" ", ""));
        }} else {{
            System.out.println(res);
        }}
    }}

    public static void main(String[] args) {{
        java.util.Scanner sc = new java.util.Scanner(System.in);
{reads_block}

        Solution sol = new Solution();
{res_block}
    }}
}}
'''


def generate_universal_driver(
    function_name: str,
    parameters: List[Dict[str, Any]],
    return_type: str,
    language: str
) -> str:
    """Generates the universal driver script for the given language."""
    lang = language.lower().strip()
    if lang in ["python", "python3", "py"]:
        return generate_universal_python_driver(function_name, parameters, return_type)
    elif lang in ["javascript", "js", "node", "nodejs"]:
        return generate_universal_javascript_driver(function_name, parameters, return_type)
    elif lang in ["cpp", "c++"]:
        return generate_universal_cpp_driver(function_name, parameters, return_type)
    elif lang in ["java"]:
        return generate_universal_java_driver(function_name, parameters, return_type)
    return ""

import re
from typing import Dict, Any, Optional, List

# Question registry with starter templates and hidden execution drivers for LeetCode style solving
QUESTION_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "Two Sum Target": {
        "function_name": "twoSum",
        "description_signature": "twoSum(nums: List[int], target: int) -> List[int]",
        "starter": {
            "python": '''from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Write your code here
        pass
''',
            "javascript": '''/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    // Write your code here
    
}
''',
            "cpp": '''#include <iostream>
#include <vector>
#include <unordered_map>

using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your code here
        
    }
};
''',
            "java": '''import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
        return new int[]{};
    }
}
'''
        },
        "drivers": {
            "python": '''
if __name__ == "__main__":
    import sys
    raw = sys.stdin.read().split()
    if raw:
        target = int(raw[-1])
        nums = [int(x) for x in raw[:-1]]
        sol = Solution()
        res = sol.twoSum(nums, target)
        if isinstance(res, (list, tuple)):
            print(" ".join(map(str, sorted(res))))
        else:
            print(res)
''',
            "javascript": '''
(function() {
    const fs = require('fs');
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).filter(Boolean);
    if (tokens.length > 0) {
        const target = parseInt(tokens[tokens.length - 1], 10);
        const nums = tokens.slice(0, -1).map(x => parseInt(x, 10));
        const fn = (typeof twoSum === 'function') ? twoSum : (new Solution()).twoSum;
        const res = fn(nums, target);
        if (Array.isArray(res)) {
            console.log(res.slice().sort((a, b) => a - b).join(" "));
        } else {
            console.log(res);
        }
    }
})();
''',
            "cpp": '''
int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    vector<int> nums;
    int val;
    while (cin >> val) {
        nums.push_back(val);
    }
    if (!nums.empty()) {
        int target = nums.back();
        nums.pop_back();
        Solution sol;
        vector<int> res = sol.twoSum(nums, target);
        if (res.size() == 2 && res[0] > res[1]) swap(res[0], res[1]);
        for (size_t i = 0; i < res.size(); ++i) {
            cout << res[i] << (i + 1 < res.size() ? " " : "");
        }
        cout << "\\n";
    }
    return 0;
}
''',
            "java": '''
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<Integer> list = new ArrayList<>();
        while (sc.hasNextInt()) {
            list.add(sc.nextInt());
        }
        if (!list.isEmpty()) {
            int target = list.remove(list.size() - 1);
            int[] nums = new int[list.size()];
            for (int i = 0; i < list.size(); i++) nums[i] = list.get(i);
            Solution sol = new Solution();
            int[] res = sol.twoSum(nums, target);
            if (res != null) {
                Arrays.sort(res);
                for (int i = 0; i < res.length; i++) {
                    System.out.print(res[i] + (i + 1 < res.length ? " " : ""));
                }
                System.out.println();
            }
        }
    }
}
'''
        }
    },

    "Palindrome String Checker": {
        "function_name": "isPalindrome",
        "description_signature": "isPalindrome(s: str) -> bool",
        "starter": {
            "python": '''class Solution:
    def isPalindrome(self, s: str) -> bool:
        # Write your code here
        pass
''',
            "javascript": '''/**
 * @param {string} s
 * @return {boolean}
 */
function isPalindrome(s) {
    // Write your code here
    
}
''',
            "cpp": '''#include <iostream>
#include <string>
#include <cctype>

using namespace std;

class Solution {
public:
    bool isPalindrome(string s) {
        // Write your code here
        
    }
};
''',
            "java": '''import java.util.*;

class Solution {
    public boolean isPalindrome(String s) {
        // Write your code here
        return false;
    }
}
'''
        },
        "drivers": {
            "python": '''
if __name__ == "__main__":
    import sys
    content = sys.stdin.read().rstrip("\\r\\n")
    sol = Solution()
    res = sol.isPalindrome(content)
    print("true" if res else "false")
''',
            "javascript": '''
(function() {
    const fs = require('fs');
    const content = fs.readFileSync(0, 'utf-8').replace(/[\\r\\n]+$/, '');
    const fn = (typeof isPalindrome === 'function') ? isPalindrome : (new Solution()).isPalindrome;
    const res = fn(content);
    console.log(res ? "true" : "false");
})();
''',
            "cpp": '''
int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    string content, line;
    while (getline(cin, line)) {
        if (!content.empty()) content += "\\n";
        content += line;
    }
    Solution sol;
    bool res = sol.isPalindrome(content);
    cout << (res ? "true" : "false") << "\\n";
    return 0;
}
''',
            "java": '''
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        StringBuilder sb = new StringBuilder();
        while (sc.hasNextLine()) {
            if (sb.length() > 0) sb.append("\\n");
            sb.append(sc.nextLine());
        }
        Solution sol = new Solution();
        boolean res = sol.isPalindrome(sb.toString());
        System.out.println(res ? "true" : "false");
    }
}
'''
        }
    },

    "Valid Parentheses": {
        "function_name": "isValid",
        "description_signature": "isValid(s: str) -> bool",
        "starter": {
            "python": '''class Solution:
    def isValid(self, s: str) -> bool:
        # Write your code here
        pass
''',
            "javascript": '''/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
    // Write your code here
    
}
''',
            "cpp": '''#include <iostream>
#include <string>
#include <stack>

using namespace std;

class Solution {
public:
    bool isValid(string s) {
        // Write your code here
        
    }
};
''',
            "java": '''import java.util.*;

class Solution {
    public boolean isValid(String s) {
        // Write your code here
        return false;
    }
}
'''
        },
        "drivers": {
            "python": '''
if __name__ == "__main__":
    import sys
    content = sys.stdin.read().strip()
    sol = Solution()
    res = sol.isValid(content)
    print("true" if res else "false")
''',
            "javascript": '''
(function() {
    const fs = require('fs');
    const content = fs.readFileSync(0, 'utf-8').trim();
    const fn = (typeof isValid === 'function') ? isValid : (new Solution()).isValid;
    const res = fn(content);
    console.log(res ? "true" : "false");
})();
''',
            "cpp": '''
int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    string s;
    if (cin >> s) {
        Solution sol;
        cout << (sol.isValid(s) ? "true" : "false") << "\\n";
    }
    return 0;
}
''',
            "java": '''
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNext()) {
            String s = sc.next();
            Solution sol = new Solution();
            System.out.println(sol.isValid(s) ? "true" : "false");
        }
    }
}
'''
        }
    },

    "Fibonacci Number": {
        "function_name": "fib",
        "description_signature": "fib(n: int) -> int",
        "starter": {
            "python": '''class Solution:
    def fib(self, n: int) -> int:
        # Write your code here
        pass
''',
            "javascript": '''/**
 * @param {number} n
 * @return {number}
 */
function fib(n) {
    // Write your code here
    
}
''',
            "cpp": '''#include <iostream>

using namespace std;

class Solution {
public:
    int fib(int n) {
        // Write your code here
        
    }
};
''',
            "java": '''class Solution {
    public int fib(int n) {
        // Write your code here
        return 0;
    }
}
'''
        },
        "drivers": {
            "python": '''
if __name__ == "__main__":
    import sys
    raw = sys.stdin.read().strip()
    if raw:
        n = int(raw)
        sol = Solution()
        print(sol.fib(n))
''',
            "javascript": '''
(function() {
    const fs = require('fs');
    const raw = fs.readFileSync(0, 'utf-8').trim();
    if (raw) {
        const n = parseInt(raw, 10);
        const fn = (typeof fib === 'function') ? fib : (new Solution()).fib;
        console.log(fn(n));
    }
})();
''',
            "cpp": '''
int main() {
    int n;
    if (cin >> n) {
        Solution sol;
        cout << sol.fib(n) << "\\n";
    }
    return 0;
}
''',
            "java": '''
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            Solution sol = new Solution();
            System.out.println(sol.fib(n));
        }
    }
}
'''
        }
    },

    "Longest Substring Without Repeating Characters": {
        "function_name": "lengthOfLongestSubstring",
        "description_signature": "lengthOfLongestSubstring(s: str) -> int",
        "starter": {
            "python": '''class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        # Write your code here
        pass
''',
            "javascript": '''/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
    // Write your code here
    
}
''',
            "cpp": '''#include <iostream>
#include <string>
#include <unordered_map>
#include <algorithm>

using namespace std;

class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Write your code here
        
    }
};
''',
            "java": '''import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Write your code here
        return 0;
    }
}
'''
        },
        "drivers": {
            "python": '''
if __name__ == "__main__":
    import sys
    s = sys.stdin.read().rstrip("\\r\\n")
    sol = Solution()
    print(sol.lengthOfLongestSubstring(s))
''',
            "javascript": '''
(function() {
    const fs = require('fs');
    const s = fs.readFileSync(0, 'utf-8').replace(/[\\r\\n]+$/, '');
    const fn = (typeof lengthOfLongestSubstring === 'function') ? lengthOfLongestSubstring : (new Solution()).lengthOfLongestSubstring;
    console.log(fn(s));
})();
''',
            "cpp": '''
int main() {
    string s;
    getline(cin, s);
    Solution sol;
    cout << sol.lengthOfLongestSubstring(s) << "\\n";
    return 0;
}
''',
            "java": '''
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine() : "";
        Solution sol = new Solution();
        System.out.println(sol.lengthOfLongestSubstring(s));
    }
}
'''
        }
    },

    "Maximum Subarray Sum (Kadane's)": {
        "function_name": "maxSubArray",
        "description_signature": "maxSubArray(nums: List[int]) -> int",
        "starter": {
            "python": '''from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        # Write your code here
        pass
''',
            "javascript": '''/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
    // Write your code here
    
}
''',
            "cpp": '''#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Write your code here
        
    }
};
''',
            "java": '''class Solution {
    public int maxSubArray(int[] nums) {
        // Write your code here
        return 0;
    }
}
'''
        },
        "drivers": {
            "python": '''
if __name__ == "__main__":
    import sys
    raw = sys.stdin.read().split()
    if raw:
        nums = [int(x) for x in raw]
        sol = Solution()
        print(sol.maxSubArray(nums))
''',
            "javascript": '''
(function() {
    const fs = require('fs');
    const raw = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).filter(Boolean);
    if (raw.length > 0) {
        const nums = raw.map(x => parseInt(x, 10));
        const fn = (typeof maxSubArray === 'function') ? maxSubArray : (new Solution()).maxSubArray;
        console.log(fn(nums));
    }
})();
''',
            "cpp": '''
int main() {
    vector<int> nums;
    int val;
    while (cin >> val) {
        nums.push_back(val);
    }
    if (!nums.empty()) {
        Solution sol;
        cout << sol.maxSubArray(nums) << "\\n";
    }
    return 0;
}
''',
            "java": '''
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<Integer> list = new ArrayList<>();
        while (sc.hasNextInt()) list.add(sc.nextInt());
        if (!list.isEmpty()) {
            int[] nums = new int[list.size()];
            for (int i = 0; i < list.size(); i++) nums[i] = list.get(i);
            Solution sol = new Solution();
            System.out.println(sol.maxSubArray(nums));
        }
    }
}
'''
        }
    },

    "Coin Change Minimum": {
        "function_name": "coinChange",
        "description_signature": "coinChange(coins: List[int], amount: int) -> int",
        "starter": {
            "python": '''from typing import List

class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        # Write your code here
        pass
''',
            "javascript": '''/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
function coinChange(coins, amount) {
    // Write your code here
    
}
''',
            "cpp": '''#include <iostream>
#include <vector>
#include <algorithm>
#include <sstream>

using namespace std;

class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        // Write your code here
        
    }
};
''',
            "java": '''import java.util.*;

class Solution {
    public int coinChange(int[] coins, int amount) {
        // Write your code here
        return -1;
    }
}
'''
        },
        "drivers": {
            "python": '''
if __name__ == "__main__":
    import sys
    lines = sys.stdin.read().splitlines()
    if lines:
        if len(lines) >= 2:
            coins = [int(x) for x in lines[0].split()]
            amount = int(lines[1].strip())
        else:
            tokens = lines[0].split()
            coins = [int(x) for x in tokens[:-1]]
            amount = int(tokens[-1])
        sol = Solution()
        print(sol.coinChange(coins, amount))
''',
            "javascript": '''
(function() {
    const fs = require('fs');
    const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n').filter(Boolean);
    if (lines.length > 0) {
        let coins, amount;
        if (lines.length >= 2) {
            coins = lines[0].trim().split(/\\s+/).map(x => parseInt(x, 10));
            amount = parseInt(lines[1].trim(), 10);
        } else {
            const tokens = lines[0].trim().split(/\\s+/);
            coins = tokens.slice(0, -1).map(x => parseInt(x, 10));
            amount = parseInt(tokens[tokens.length - 1], 10);
        }
        const fn = (typeof coinChange === 'function') ? coinChange : (new Solution()).coinChange;
        console.log(fn(coins, amount));
    }
})();
''',
            "cpp": '''
int main() {
    string line1, line2;
    if (getline(cin, line1)) {
        vector<int> tokens;
        stringstream ss(line1);
        int val;
        while (ss >> val) tokens.push_back(val);
        int amount = 0;
        vector<int> coins;
        if (getline(cin, line2) && !line2.empty()) {
            coins = tokens;
            amount = stoi(line2);
        } else if (!tokens.empty()) {
            amount = tokens.back();
            tokens.pop_back();
            coins = tokens;
        }
        Solution sol;
        cout << sol.coinChange(coins, amount) << "\\n";
    }
    return 0;
}
''',
            "java": '''
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String line1 = sc.nextLine().trim();
            Scanner sc1 = new Scanner(line1);
            List<Integer> tokens = new ArrayList<>();
            while (sc1.hasNextInt()) tokens.add(sc1.nextInt());
            int amount = 0;
            List<Integer> coinsList = new ArrayList<>();
            if (sc.hasNextInt()) {
                amount = sc.nextInt();
                coinsList = tokens;
            } else if (!tokens.isEmpty()) {
                amount = tokens.remove(tokens.size() - 1);
                coinsList = tokens;
            }
            int[] coins = new int[coinsList.size()];
            for (int i = 0; i < coinsList.size(); i++) coins[i] = coinsList.get(i);
            Solution sol = new Solution();
            System.out.println(sol.coinChange(coins, amount));
        }
    }
}
'''
        }
    },

    "Merge Intervals": {
        "function_name": "merge",
        "description_signature": "merge(intervals: List[List[int]]) -> List[List[int]]",
        "starter": {
            "python": '''from typing import List

class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        # Write your code here
        pass
''',
            "javascript": '''/**
 * @param {number[][]} intervals
 * @return {number[][]}
 */
function merge(intervals) {
    // Write your code here
    
}
''',
            "cpp": '''#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        // Write your code here
        
    }
};
''',
            "java": '''import java.util.*;

class Solution {
    public int[][] merge(int[][] intervals) {
        // Write your code here
        return new int[][]{};
    }
}
'''
        },
        "drivers": {
            "python": '''
if __name__ == "__main__":
    import sys
    raw = sys.stdin.read().split()
    if raw:
        tokens = [int(x) for x in raw]
        # First token can be count N, or pairs directly
        if len(tokens) % 2 == 1:
            tokens = tokens[1:]
        intervals = [[tokens[i], tokens[i+1]] for i in range(0, len(tokens), 2)]
        sol = Solution()
        res = sol.merge(intervals)
        for interval in res:
            print(f"{interval[0]} {interval[1]}")
''',
            "javascript": '''
(function() {
    const fs = require('fs');
    const raw = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).filter(Boolean);
    if (raw.length > 0) {
        let tokens = raw.map(x => parseInt(x, 10));
        if (tokens.length % 2 === 1) tokens = tokens.slice(1);
        const intervals = [];
        for (let i = 0; i < tokens.length; i += 2) {
            intervals.push([tokens[i], tokens[i+1]]);
        }
        const fn = (typeof merge === 'function') ? merge : (new Solution()).merge;
        const res = fn(intervals);
        if (Array.isArray(res)) {
            for (const item of res) {
                console.log(`${item[0]} ${item[1]}`);
            }
        }
    }
})();
''',
            "cpp": '''
int main() {
    int val;
    vector<int> tokens;
    while (cin >> val) tokens.push_back(val);
    if (!tokens.empty()) {
        int startIdx = (tokens.size() % 2 == 1) ? 1 : 0;
        vector<vector<int>> intervals;
        for (size_t i = startIdx; i < tokens.size(); i += 2) {
            intervals.push_back({tokens[i], tokens[i+1]});
        }
        Solution sol;
        vector<vector<int>> res = sol.merge(intervals);
        for (const auto& item : res) {
            cout << item[0] << " " << item[1] << "\\n";
        }
    }
    return 0;
}
''',
            "java": '''
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<Integer> tokens = new ArrayList<>();
        while (sc.hasNextInt()) tokens.add(sc.nextInt());
        if (!tokens.isEmpty()) {
            int startIdx = (tokens.size() % 2 == 1) ? 1 : 0;
            int count = (tokens.size() - startIdx) / 2;
            int[][] intervals = new int[count][2];
            for (int i = 0; i < count; i++) {
                intervals[i][0] = tokens.get(startIdx + i * 2);
                intervals[i][1] = tokens.get(startIdx + i * 2 + 1);
            }
            Solution sol = new Solution();
            int[][] res = sol.merge(intervals);
            for (int[] item : res) {
                System.out.println(item[0] + " " + item[1]);
            }
        }
    }
}
'''
        }
    },

    "Trapping Rain Water": {
        "function_name": "trap",
        "description_signature": "trap(height: List[int]) -> int",
        "starter": {
            "python": '''from typing import List

class Solution:
    def trap(self, height: List[int]) -> int:
        # Write your code here
        pass
''',
            "javascript": '''/**
 * @param {number[]} height
 * @return {number}
 */
function trap(height) {
    // Write your code here
    
}
''',
            "cpp": '''#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    int trap(vector<int>& height) {
        // Write your code here
        
    }
};
''',
            "java": '''class Solution {
    public int trap(int[] height) {
        // Write your code here
        return 0;
    }
}
'''
        },
        "drivers": {
            "python": '''
if __name__ == "__main__":
    import sys
    raw = sys.stdin.read().split()
    if raw:
        height = [int(x) for x in raw]
        sol = Solution()
        print(sol.trap(height))
''',
            "javascript": '''
(function() {
    const fs = require('fs');
    const raw = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).filter(Boolean);
    if (raw.length > 0) {
        const height = raw.map(x => parseInt(x, 10));
        const fn = (typeof trap === 'function') ? trap : (new Solution()).trap;
        console.log(fn(height));
    }
})();
''',
            "cpp": '''
int main() {
    vector<int> height;
    int val;
    while (cin >> val) height.push_back(val);
    if (!height.empty()) {
        Solution sol;
        cout << sol.trap(height) << "\\n";
    }
    return 0;
}
''',
            "java": '''
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<Integer> list = new ArrayList<>();
        while (sc.hasNextInt()) list.add(sc.nextInt());
        if (!list.isEmpty()) {
            int[] height = new int[list.size()];
            for (int i = 0; i < list.size(); i++) height[i] = list.get(i);
            Solution sol = new Solution();
            System.out.println(sol.trap(height));
        }
    }
}
'''
        }
    },

    "Median of Two Sorted Arrays": {
        "function_name": "findMedianSortedArrays",
        "description_signature": "findMedianSortedArrays(nums1: List[int], nums2: List[int]) -> float",
        "starter": {
            "python": '''from typing import List

class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        # Write your code here
        pass
''',
            "javascript": '''/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number}
 */
function findMedianSortedArrays(nums1, nums2) {
    // Write your code here
    
}
''',
            "cpp": '''#include <iostream>
#include <vector>
#include <iomanip>
#include <sstream>

using namespace std;

class Solution {
public:
    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
        // Write your code here
        
    }
};
''',
            "java": '''class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        // Write your code here
        return 0.0;
    }
}
'''
        },
        "drivers": {
            "python": '''
if __name__ == "__main__":
    import sys
    lines = [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]
    nums1 = [int(x) for x in lines[0].split()] if len(lines) >= 1 else []
    nums2 = [int(x) for x in lines[1].split()] if len(lines) >= 2 else []
    sol = Solution()
    res = sol.findMedianSortedArrays(nums1, nums2)
    print(f"{res:.1f}")
''',
            "javascript": '''
(function() {
    const fs = require('fs');
    const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n').map(l => l.trim()).filter(Boolean);
    const nums1 = lines.length >= 1 ? lines[0].split(/\\s+/).map(x => parseInt(x, 10)) : [];
    const nums2 = lines.length >= 2 ? lines[1].split(/\\s+/).map(x => parseInt(x, 10)) : [];
    const fn = (typeof findMedianSortedArrays === 'function') ? findMedianSortedArrays : (new Solution()).findMedianSortedArrays;
    const res = fn(nums1, nums2);
    console.log(Number(res).toFixed(1));
})();
''',
            "cpp": '''
int main() {
    string line1, line2;
    vector<int> nums1, nums2;
    if (getline(cin, line1)) {
        stringstream ss(line1);
        int v;
        while (ss >> v) nums1.push_back(v);
    }
    if (getline(cin, line2)) {
        stringstream ss(line2);
        int v;
        while (ss >> v) nums2.push_back(v);
    }
    Solution sol;
    double res = sol.findMedianSortedArrays(nums1, nums2);
    cout << fixed << setprecision(1) << res << "\\n";
    return 0;
}
''',
            "java": '''
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<Integer> list1 = new ArrayList<>();
        List<Integer> list2 = new ArrayList<>();
        if (sc.hasNextLine()) {
            String l1 = sc.nextLine().trim();
            if (!l1.isEmpty()) {
                for (String s : l1.split("\\\\s+")) list1.add(Integer.parseInt(s));
            }
        }
        if (sc.hasNextLine()) {
            String l2 = sc.nextLine().trim();
            if (!l2.isEmpty()) {
                for (String s : l2.split("\\\\s+")) list2.add(Integer.parseInt(s));
            }
        }
        int[] nums1 = new int[list1.size()];
        for (int i = 0; i < list1.size(); i++) nums1[i] = list1.get(i);
        int[] nums2 = new int[list2.size()];
        for (int i = 0; i < list2.size(); i++) nums2[i] = list2.get(i);
        Solution sol = new Solution();
        double res = sol.findMedianSortedArrays(nums1, nums2);
        System.out.printf(Locale.US, "%.1f%n", res);
    }
}
'''
        }
    }
}

# Generic fallback starter templates for unknown or user-created questions
GENERIC_STARTER: Dict[str, str] = {
    "python": '''class Solution:
    def solve(self, *args):
        # Write your code here
        pass
''',
    "javascript": '''/**
 * Write your solution function here
 */
function solve(...args) {
    // Write your code here
}
''',
    "cpp": '''#include <iostream>
#include <vector>
#include <string>

using namespace std;

class Solution {
public:
    void solve() {
        // Write your code here
    }
};
''',
    "java": '''import java.util.*;

class Solution {
    public void solve() {
        // Write your code here
    }
}
'''
}


from backend.app.services.universal_driver_service import (
    generate_all_templates,
    generate_universal_driver,
)


def get_question_starter_templates(title: str, question: Optional[Any] = None) -> Dict[str, str]:
    """
    Returns starter code templates for all supported languages for a question.
    Prioritizes question.starter_code if set in database or generated from signature.
    """
    if question is not None:
        if getattr(question, "starter_code", None):
            return question.starter_code
        fn = getattr(question, "function_name", None)
        params = getattr(question, "parameters", None)
        ret = getattr(question, "return_type", "void")
        if fn and params is not None:
            return generate_all_templates(fn, params, ret)["starter"]

    clean_title = title.strip()
    if clean_title in QUESTION_TEMPLATES:
        return QUESTION_TEMPLATES[clean_title]["starter"]

    # Fuzzy match by title prefix if exact match not found
    for q_title, q_data in QUESTION_TEMPLATES.items():
        if q_title.lower() in clean_title.lower() or clean_title.lower() in q_title.lower():
            return q_data["starter"]

    return GENERIC_STARTER


def get_question_signature(title: str, question: Optional[Any] = None) -> Optional[str]:
    """Returns the question signature string, prioritizing question model if present."""
    if question is not None:
        sig = getattr(question, "function_signature", None)
        if sig:
            return sig
        fn = getattr(question, "function_name", None)
        params = getattr(question, "parameters", None)
        ret = getattr(question, "return_type", "void")
        if fn and params is not None:
            return generate_all_templates(fn, params, ret)["function_signature"]

    clean_title = title.strip()
    if clean_title in QUESTION_TEMPLATES:
        return QUESTION_TEMPLATES[clean_title].get("description_signature")
    for q_title, q_data in QUESTION_TEMPLATES.items():
        if q_title.lower() in clean_title.lower() or clean_title.lower() in q_title.lower():
            return q_data.get("description_signature")
    return None


def wrap_code_with_driver(
    title: str,
    code: str,
    language: str,
    question: Optional[Any] = None,
    function_name: Optional[str] = None,
    parameters: Optional[List[Dict[str, Any]]] = None,
    return_type: Optional[str] = None,
    driver_code: Optional[Dict[str, str]] = None,
) -> str:
    """
    Merges student code with the hidden test driver script before sending to Judge0.
    1. If candidate wrote standalone entry point (main/__main__), returns code as-is.
    2. If question has custom driver_code in database or parameter, injects that driver.
    3. If question has function_name & parameters, generates universal driver.
    4. Falls back to legacy QUESTION_TEMPLATES or raw code.
    """
    lang_clean = language.lower().strip()
    clean_title = title.strip()

    # 1. Check if student explicitly wrote a standalone main entry point
    if lang_clean in ["python", "python3", "py"]:
        if '__name__ == "__main__"' in code or "__name__ == '__main__'" in code:
            return code
    elif lang_clean in ["javascript", "js", "node"]:
        if "fs.readFileSync" in code and "console.log" in code:
            return code
    elif lang_clean in ["cpp", "c++"]:
        if "int main(" in code or "int main ()" in code:
            return code
    elif lang_clean in ["java"]:
        if "public static void main" in code:
            return code

    # 2. Check for custom driver_code override
    driver_map = driver_code
    if not driver_map and question is not None:
        driver_map = getattr(question, "driver_code", None)

    if driver_map and isinstance(driver_map, dict):
        custom_driver = driver_map.get(lang_clean) or driver_map.get(language)
        if custom_driver:
            if lang_clean in ["python", "python3", "py"]:
                py_headers = "from __future__ import annotations\nfrom typing import List, Dict, Tuple, Optional, Any, Set\n\n"
                return f"{py_headers}{code}\n\n{custom_driver}"
            elif lang_clean in ["cpp", "c++"]:
                cpp_headers = "#include <iostream>\n#include <sstream>\n#include <iomanip>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <climits>\n#include <cmath>\n#include <stack>\n#include <queue>\n#include <unordered_map>\n#include <unordered_set>\n"
                return f"{cpp_headers}{code}\n\n{custom_driver}"
            else:
                return f"{code}\n\n{custom_driver}"

    # 3. Check for dynamic LeetCode signature engine
    fn = function_name
    params = parameters
    ret = return_type
    if question is not None:
        if not fn:
            fn = getattr(question, "function_name", None)
        if params is None:
            params = getattr(question, "parameters", None)
        if not ret:
            ret = getattr(question, "return_type", "void")

    if fn and params is not None:
        univ_driver = generate_universal_driver(fn, params, ret or "void", lang_clean)
        if univ_driver:
            if lang_clean in ["python", "python3", "py"]:
                py_headers = "from __future__ import annotations\nfrom typing import List, Dict, Tuple, Optional, Any, Set\n\n"
                return f"{py_headers}{code}\n\n{univ_driver}"
            elif lang_clean in ["cpp", "c++"]:
                cpp_headers = "#include <iostream>\n#include <sstream>\n#include <iomanip>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <climits>\n#include <cmath>\n#include <stack>\n#include <queue>\n#include <unordered_map>\n#include <unordered_set>\n"
                return f"{cpp_headers}{code}\n\n{univ_driver}"
            else:
                return f"{code}\n\n{univ_driver}"

    # 4. Fallback to legacy static QUESTION_TEMPLATES
    matched_q = None
    if clean_title in QUESTION_TEMPLATES:
        matched_q = QUESTION_TEMPLATES[clean_title]
    else:
        for q_title, q_data in QUESTION_TEMPLATES.items():
            if q_title.lower() in clean_title.lower() or clean_title.lower() in q_title.lower():
                matched_q = q_data
                break

    if not matched_q or "drivers" not in matched_q:
        return code

    if lang_clean in ["python", "python3", "py"]:
        driver = matched_q["drivers"].get("python", "")
        py_headers = "from __future__ import annotations\nfrom typing import List, Dict, Tuple, Optional, Any, Set\n\n"
        return f"{py_headers}{code}\n\n{driver}"

    elif lang_clean in ["javascript", "js", "node"]:
        driver = matched_q["drivers"].get("javascript", "")
        return f"{code}\n\n{driver}"

    elif lang_clean in ["cpp", "c++"]:
        driver = matched_q["drivers"].get("cpp", "")
        cpp_driver_headers = "#include <iostream>\n#include <sstream>\n#include <iomanip>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <climits>\n#include <cmath>\n#include <stack>\n#include <queue>\n#include <unordered_map>\n#include <unordered_set>\n"
        return f"{cpp_driver_headers}\n{code}\n\n{driver}"

    elif lang_clean in ["java"]:
        driver = matched_q["drivers"].get("java", "")
        return f"{code}\n\n{driver}"

    return code

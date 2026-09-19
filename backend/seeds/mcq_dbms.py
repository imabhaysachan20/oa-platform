"""
40 DBMS MCQs across Easy, Medium, and Hard difficulties.
All timed between 7s and 13s, with mix of single and multi-select.
"""

from backend.app.models.question import QuestionDifficulty

MCQ_DBMS_QUESTIONS = [
    # EASY (15 questions, 7-8s)
    {
        "title": "DBMS: ACID Acronym Meaning",
        "description": "What do the letters in the database acronym ACID stand for?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Atomicity, Consistency, Isolation, Durability", "is_correct": True},
            {"text": "Accuracy, Concurrency, Integrity, Durability", "is_correct": False},
            {"text": "Atomicity, Coherence, Indexing, Distribution", "is_correct": False},
            {"text": "Access, Security, Isolation, Data", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Primary Key Constraints",
        "description": "Which two constraints are inherently enforced on any column defined as a Primary Key?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "UNIQUE constraint", "is_correct": True},
            {"text": "NOT NULL constraint", "is_correct": True},
            {"text": "AUTO_INCREMENT constraint", "is_correct": False},
            {"text": "CHECK constraint", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: SQL Commands Classification (DDL)",
        "description": "Which of the following SQL commands belong to the Data Definition Language (DDL)?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "CREATE", "is_correct": True},
            {"text": "ALTER", "is_correct": True},
            {"text": "DROP", "is_correct": True},
            {"text": "INSERT", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Foreign Key Purpose",
        "description": "What relational database concept is primarily maintained by a Foreign Key?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Domain integrity", "is_correct": False},
            {"text": "Referential integrity", "is_correct": True},
            {"text": "Query response caching", "is_correct": False},
            {"text": "Physical storage encryption", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Aggregate Functions in SQL",
        "description": "Which of the following are standard SQL aggregate functions?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "COUNT()", "is_correct": True},
            {"text": "SUM()", "is_correct": True},
            {"text": "AVG()", "is_correct": True},
            {"text": "SUBSTRING()", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: HAVING vs WHERE Clause",
        "description": "What is the key difference between the SQL `WHERE` and `HAVING` clauses?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": False,
        "options": [
            {"text": "`WHERE` filters grouped rows after aggregation, while `HAVING` filters individual rows before grouping", "is_correct": False},
            {"text": "`WHERE` filters individual rows before aggregation, while `HAVING` filters aggregated group results", "is_correct": True},
            {"text": "`HAVING` can only be used with sorting statements", "is_correct": False},
            {"text": "`WHERE` is only used in DDL statements", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: First Normal Form (1NF)",
        "description": "What is the fundamental requirement for a relational table to satisfy First Normal Form (1NF)?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": False,
        "options": [
            {"text": "Every column must contain only atomic (indivisible) values and no repeating groups", "is_correct": True},
            {"text": "Every non-prime attribute must depend entirely on the primary key", "is_correct": False},
            {"text": "All transitive dependencies must be eliminated", "is_correct": False},
            {"text": "The table must have an index on all foreign keys", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: DML Commands",
        "description": "Which of the following SQL statements belong to Data Manipulation Language (DML)?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "INSERT", "is_correct": True},
            {"text": "UPDATE", "is_correct": True},
            {"text": "DELETE", "is_correct": True},
            {"text": "TRUNCATE", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: DELETE vs TRUNCATE",
        "description": "How does `TRUNCATE TABLE` differ from `DELETE FROM table`?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": False,
        "options": [
            {"text": "`TRUNCATE` is a DDL operation that deallocates data pages and cannot be filtered with a WHERE clause", "is_correct": True},
            {"text": "`DELETE` is faster because it does not write to the transaction log", "is_correct": False},
            {"text": "`TRUNCATE` fires all row-level DELETE triggers", "is_correct": False},
            {"text": "`TRUNCATE` preserves the identity/auto-increment sequence values", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Candidate Key Definition",
        "description": "What is a Candidate Key in relational database schema design?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Any column that contains numerical values", "is_correct": False},
            {"text": "A minimal superkey that uniquely identifies a tuple in a relation", "is_correct": True},
            {"text": "A key generated solely by the database engine for caching", "is_correct": False},
            {"text": "A key referencing an external table", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Relational Algebra Selection Operator",
        "description": "Which Greek letter is standardly used to denote the Selection operator in relational algebra?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "$\\Pi$ (Pi)", "is_correct": False},
            {"text": "$\\sigma$ (Sigma)", "is_correct": True},
            {"text": "$\\rho$ (Rho)", "is_correct": False},
            {"text": "$\\bowtie$ (Bowtie)", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Relational Algebra Projection Operator",
        "description": "Which relational algebra operator is used to select specific columns (attributes) from a relation?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Selection ($\\sigma$)", "is_correct": False},
            {"text": "Projection ($\\Pi$)", "is_correct": True},
            {"text": "Rename ($\\rho$)", "is_correct": False},
            {"text": "Cartesian Product ($\\times$)", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Database Schema vs Instance",
        "description": "What is the distinction between a database Schema and a database Instance?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": False,
        "options": [
            {"text": "Schema is the overall logical design/structure, while Instance is the actual data populated at a specific moment in time", "is_correct": True},
            {"text": "Schema changes on every SQL INSERT statement", "is_correct": False},
            {"text": "Instance is defined in SQL DDL scripts, while Schema is stored in RAM", "is_correct": False},
            {"text": "There is no difference; they are interchangeable synonyms", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: SQL NULL Value Behaviour",
        "description": "In standard SQL, what is the result of evaluating the boolean expression `NULL = NULL`?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "TRUE", "is_correct": False},
            {"text": "FALSE", "is_correct": False},
            {"text": "UNKNOWN (NULL)", "is_correct": True},
            {"text": "Syntax Error", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Transaction COMMIT Command",
        "description": "What does issuing a `COMMIT` statement in an active database transaction accomplish?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Permanently writes all transaction modifications to the database and ends the transaction", "is_correct": True},
            {"text": "Rolls back all changes made during the current session", "is_correct": False},
            {"text": "Deletes the table schema", "is_correct": False},
            {"text": "Temporarily locks all read requests from other clients", "is_correct": False},
        ]
    },

    # MEDIUM (15 questions, 9-10s)
    {
        "title": "DBMS: Second Normal Form (2NF)",
        "description": "A relation is in 2NF if and only if it is in 1NF and satisfies which condition?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "No non-prime attribute is partially dependent on any candidate key", "is_correct": True},
            {"text": "No non-prime attribute is transitively dependent on any candidate key", "is_correct": False},
            {"text": "For every functional dependency $X \\rightarrow Y$, $X$ is a superkey", "is_correct": False},
            {"text": "All multivalued dependencies are eliminated", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Third Normal Form (3NF) vs BCNF",
        "description": "What condition must hold for every non-trivial functional dependency $X \\rightarrow Y$ in Boyce-Codd Normal Form (BCNF)?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "$Y$ must be a prime attribute", "is_correct": False},
            {"text": "$X$ must be a superkey", "is_correct": True},
            {"text": "$X$ must be a single column", "is_correct": False},
            {"text": "$Y$ must not contain null values", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: ANSI SQL Isolation Levels",
        "description": "Which of the following are official ANSI SQL transaction isolation levels?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "Read Uncommitted", "is_correct": True},
            {"text": "Read Committed", "is_correct": True},
            {"text": "Repeatable Read", "is_correct": True},
            {"text": "Serializable", "is_correct": True},
        ]
    },
    {
        "title": "DBMS: Read Phenomena - Dirty Read",
        "description": "What is a 'Dirty Read' in database concurrency control?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "A transaction reads uncommitted changes written by another concurrent transaction that is later rolled back", "is_correct": True},
            {"text": "A transaction re-reads a row and finds that values have changed because of a committed update", "is_correct": False},
            {"text": "A transaction executes a range query and encounters newly inserted rows satisfying the predicate", "is_correct": False},
            {"text": "Reading data corrupted by physical disk bit rot", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Clustered vs Non-Clustered Index",
        "description": "Which statements accurately describe a Clustered Index in an RDBMS?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "It determines the physical storage order of the rows in the table", "is_correct": True},
            {"text": "A table can have at most ONE clustered index", "is_correct": True},
            {"text": "The leaf nodes of a clustered index contain the actual data pages", "is_correct": True},
            {"text": "A table can possess up to 256 clustered indexes", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: B+ Tree Characteristics",
        "description": "Why are B+ Trees predominantly preferred over standard B-Trees for database indexing?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "Leaf nodes are linked in a sequential doubly-linked list, providing superior range scan performance", "is_correct": True},
            {"text": "Internal nodes store only keys and pointers, allowing higher fan-out and shallower tree depth", "is_correct": True},
            {"text": "All search queries traverse the same height to reach a leaf, guaranteeing predictable $O(\\log n)$ access", "is_correct": True},
            {"text": "B+ Trees require zero disk I/O operations", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: SQL JOIN Types",
        "description": "Which SQL JOIN returns all records from the left table, along with matching records from the right table, filling with NULL where no match exists?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "INNER JOIN", "is_correct": False},
            {"text": "LEFT OUTER JOIN", "is_correct": True},
            {"text": "RIGHT OUTER JOIN", "is_correct": False},
            {"text": "CROSS JOIN", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Write-Ahead Logging (WAL) Protocol",
        "description": "What fundamental rule does the Write-Ahead Logging (WAL) protocol mandate?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Log records must be flushed to stable non-volatile storage before the corresponding data page is written to disk", "is_correct": True},
            {"text": "Data pages must be written to disk before logging the update", "is_correct": False},
            {"text": "All transactions must be committed before writing any logs", "is_correct": False},
            {"text": "Log files must never be archived or truncated", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Two-Phase Locking (2PL) Phases",
        "description": "What are the two distinct phases in the classic Two-Phase Locking (2PL) protocol?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Growing Phase (locks acquired, none released) and Shrinking Phase (locks released, none acquired)", "is_correct": True},
            {"text": "Read Phase and Write Phase", "is_correct": False},
            {"text": "Commit Phase and Abort Phase", "is_correct": False},
            {"text": "Paging Phase and Swapping Phase", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Conflict Serializability Testing",
        "description": "How is a database schedule tested for Conflict Serializability?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "By constructing a Precedence (Serialization) Graph and verifying that it is acyclic", "is_correct": True},
            {"text": "By counting the total number of commit operations", "is_correct": False},
            {"text": "By checking if all transactions accessed identical tables", "is_correct": False},
            {"text": "By verifying that the database memory buffer never exceeded 80%", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Cascading Rollback Prevention",
        "description": "Which type of schedule ensures that NO cascading rollbacks can ever occur?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Cascadeless Schedule (where transactions only read values committed by prior transactions)", "is_correct": True},
            {"text": "Non-serializable Schedule", "is_correct": False},
            {"text": "Dirty Read Schedule", "is_correct": False},
            {"text": "View Equivalent Schedule", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: SQL Correlated Subquery",
        "description": "What defines a 'correlated subquery' in SQL?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "A subquery that references one or more columns from the enclosing outer query, executing once per outer row", "is_correct": True},
            {"text": "A subquery that executes independently once before the outer query runs", "is_correct": False},
            {"text": "A subquery that contains a UNION operator", "is_correct": False},
            {"text": "A subquery that only returns boolean scalar values", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: CAP Theorem Dimensions",
        "description": "According to Eric Brewer's CAP theorem, which three guarantees can a distributed data store trade off?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": True,
        "options": [
            {"text": "Consistency", "is_correct": True},
            {"text": "Availability", "is_correct": True},
            {"text": "Partition Tolerance", "is_correct": True},
            {"text": "Performance", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: SQL Window Functions",
        "description": "Which of the following are recognized SQL Window Functions?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "ROW_NUMBER() OVER (...)", "is_correct": True},
            {"text": "RANK() OVER (...)", "is_correct": True},
            {"text": "DENSE_RANK() OVER (...)", "is_correct": True},
            {"text": "LEAD() and LAG() OVER (...)", "is_correct": True},
        ]
    },
    {
        "title": "DBMS: Checkpoint Operation in Recovery",
        "description": "What is the primary benefit of periodic Checkpointing in database recovery management?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "Reduces recovery time by eliminating the need to scan the transaction log from the very beginning", "is_correct": True},
            {"text": "Deletes all historical backup archives", "is_correct": False},
            {"text": "Prevents deadlocks in 2PL concurrency schedules", "is_correct": False},
            {"text": "Rebuilds all secondary non-clustered indexes", "is_correct": False},
        ]
    },

    # HARD (10 questions, 11-13s)
    {
        "title": "DBMS: MVCC (Multi-Version Concurrency Control)",
        "description": "How does MVCC (used in PostgreSQL, MySQL InnoDB) achieve high concurrent throughput between readers and writers?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 13,
        "is_multi_select": True,
        "options": [
            {"text": "Readers do not block writers, and writers do not block readers", "is_correct": True},
            {"text": "Each update creates a new physical tuple version with transaction timestamps/IDs (`xmin`, `xmax`)", "is_correct": True},
            {"text": "Readers view a consistent snapshot of data corresponding to their transaction start or statement start", "is_correct": True},
            {"text": "It completely replaces the need for write-ahead logging (WAL)", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: ARIES Recovery Algorithm Phases",
        "description": "What are the three canonical phases executed during database crash recovery under the ARIES algorithm?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "Analysis, Redo, Undo", "is_correct": True},
            {"text": "Scan, Parse, Execute", "is_correct": False},
            {"text": "Lock, Log, Commit", "is_correct": False},
            {"text": "Detect, Prevent, Recover", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Phantom Read vs Non-Repeatable Read",
        "description": "What is the key theoretical distinction between a Phantom Read and a Non-Repeatable Read?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "Non-Repeatable Read occurs when existing rows are modified/deleted; Phantom Read occurs when new rows matching a search condition are inserted", "is_correct": True},
            {"text": "Phantom Read can only occur under Serializable isolation", "is_correct": False},
            {"text": "Non-Repeatable read involves uncommitted transactions, whereas Phantom Read involves committed transactions", "is_correct": False},
            {"text": "They are synonymous terms describing the same transaction anomaly", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Relational Query Optimization - Selection Pushdown",
        "description": "What algebraic transformation is performed by 'Selection Pushdown' (Pushing Selections Down the Tree) in a relational query optimizer?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "Applies selection predicates as early as possible before costly Cartesian products and Joins, reducing intermediate result sizes", "is_correct": True},
            {"text": "Defers filtering until all data has been transmitted across the network", "is_correct": False},
            {"text": "Converts all inner joins into cross joins", "is_correct": False},
            {"text": "Transforms hash joins into nested loop joins", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Thomas Write Rule",
        "description": "In Timestamp Ordering concurrency control, what does the Thomas Write Rule specify when transaction $T$ attempts to write data item $X$ with $TS(T) < W\\text{-timestamp}(X)$?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 13,
        "is_multi_select": False,
        "options": [
            {"text": "Ignore the write operation and continue (the write is obsolete and overridden by a newer transaction)", "is_correct": True},
            {"text": "Abort and restart transaction $T$ immediately", "is_correct": False},
            {"text": "Wait until $W\\text{-timestamp}(X)$ decreases", "is_correct": False},
            {"text": "Acquire an exclusive lock on the entire relation", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Lossless Join Decomposition Condition",
        "description": "A decomposition of relation $R$ into relations $R_1$ and $R_2$ with functional dependency set $F$ is guaranteed Lossless if and only if:",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": True,
        "options": [
            {"text": "$(R_1 \\cap R_2) \\rightarrow R_1 \\in F^+$", "is_correct": True},
            {"text": "$(R_1 \\cap R_2) \\rightarrow R_2 \\in F^+$", "is_correct": True},
            {"text": "$R_1 \\cap R_2 = \\emptyset$", "is_correct": False},
            {"text": "$R_1 \\cup R_2 \\neq R$", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Sharding Key Selection Pitfalls",
        "description": "What critical distributed database problems can arise from choosing a poorly distributed sharding key (e.g., monotonically increasing timestamp)?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 13,
        "is_multi_select": True,
        "options": [
            {"text": "Hotspotting: all incoming write traffic concentrates on a single shard node", "is_correct": True},
            {"text": "Cross-shard join and distributed transaction overhead when queries span multiple nodes", "is_correct": True},
            {"text": "Unbalanced data disk utilization across the cluster", "is_correct": True},
            {"text": "Violating First Normal Form (1NF)", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Write Amplification in LSM-Trees",
        "description": "In Log-Structured Merge (LSM) Trees (e.g., RocksDB, Cassandra), what is Write Amplification?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "The ratio of total bytes written to underlying storage compared to bytes written by user applications, caused by background SSTable compactions", "is_correct": True},
            {"text": "Amplifying write throughput by caching writes in CPU L1 registers", "is_correct": False},
            {"text": "Duplicating logs across 10 distinct cloud availability zones", "is_correct": False},
            {"text": "Increasing read latency exponentially due to lock contention", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: Hash Join vs Merge Join",
        "description": "Under what conditions does a relational query optimizer select a Merge Join over a Hash Join?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "When both inputs are already sorted on the join key (or index-ordered) and memory is constrained", "is_correct": True},
            {"text": "When the join condition involves non-equi predicates like `<` or `>`", "is_correct": False},
            {"text": "When the right table has zero rows", "is_correct": False},
            {"text": "When hash tables can fit comfortably entirely in L1 cache", "is_correct": False},
        ]
    },
    {
        "title": "DBMS: PostgreSQL VACUUM Purpose",
        "description": "In PostgreSQL MVCC implementation, why is periodic `VACUUM` execution essential?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": True,
        "options": [
            {"text": "Reclaims disk space occupied by dead tuple versions created by UPDATEs and DELETEs", "is_correct": True},
            {"text": "Prevents Transaction ID (XID) wraparound failure by freezing older tuple transaction IDs", "is_correct": True},
            {"text": "Updates planner statistics used by the cost-based query optimizer", "is_correct": True},
            {"text": "Encrypts table tablespaces with AES-256", "is_correct": False},
        ]
    }
]

"""
40 Operating Systems MCQs across Easy, Medium, and Hard difficulties.
All timed between 7s and 13s, with mix of single and multi-select.
"""

from backend.app.models.question import QuestionDifficulty

MCQ_OS_QUESTIONS = [
    # EASY (15 questions, 7-8s)
    {
        "title": "OS: Process vs Thread Resource Sharing",
        "description": "What resource is inherently shared between multiple threads within the same process?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Stack memory", "is_correct": False},
            {"text": "CPU Registers", "is_correct": False},
            {"text": "Heap memory and code segment", "is_correct": True},
            {"text": "Thread Control Block (TCB)", "is_correct": False},
        ]
    },
    {
        "title": "OS: Core Functions of Operating System",
        "description": "Which of the following are primary responsibilities of an Operating System kernel?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "Memory management", "is_correct": True},
            {"text": "Process scheduling", "is_correct": True},
            {"text": "File system access control", "is_correct": True},
            {"text": "Compiling source code to assembly", "is_correct": False},
        ]
    },
    {
        "title": "OS: Process States",
        "description": "Which of the following represent standard states in the classic 5-state process lifecycle?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "New / Ready", "is_correct": True},
            {"text": "Running", "is_correct": True},
            {"text": "Waiting / Blocked", "is_correct": True},
            {"text": "Recompiled", "is_correct": False},
        ]
    },
    {
        "title": "OS: CPU Scheduling - Preemptive vs Non-Preemptive",
        "description": "Which CPU scheduling algorithm allocates the CPU to the process with the shortest burst time without interrupting it once started?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": False,
        "options": [
            {"text": "Round Robin", "is_correct": False},
            {"text": "Non-preemptive Shortest Job First (SJF)", "is_correct": True},
            {"text": "Shortest Remaining Time First (SRTF)", "is_correct": False},
            {"text": "Multilevel Queue Scheduling", "is_correct": False},
        ]
    },
    {
        "title": "OS: Round Robin Parameter",
        "description": "Which key parameter governs the execution time allotted to each process in Round Robin scheduling?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Burst multiplier", "is_correct": False},
            {"text": "Time Quantum (Time Slice)", "is_correct": True},
            {"text": "Page offset", "is_correct": False},
            {"text": "Aging factor", "is_correct": False},
        ]
    },
    {
        "title": "OS: Virtual Memory Purpose",
        "description": "What is the primary benefit of Virtual Memory in modern operating systems?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": False,
        "options": [
            {"text": "To increase the physical clock speed of the CPU", "is_correct": False},
            {"text": "To allow programs larger than physical RAM to execute seamlessly", "is_correct": True},
            {"text": "To eliminate the need for secondary storage devices", "is_correct": False},
            {"text": "To permanently prevent deadlocks in multi-threaded code", "is_correct": False},
        ]
    },
    {
        "title": "OS: Kernel vs User Mode",
        "description": "What hardware mechanism is used by modern processors to distinguish between user mode and kernel mode?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Mode Bit", "is_correct": True},
            {"text": "Page Fault Handler", "is_correct": False},
            {"text": "Dirty Bit", "is_correct": False},
            {"text": "Base Register", "is_correct": False},
        ]
    },
    {
        "title": "OS: Deadlock Coffman Conditions",
        "description": "How many Coffman conditions must simultaneously hold for a deadlock to occur?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "2", "is_correct": False},
            {"text": "3", "is_correct": False},
            {"text": "4", "is_correct": True},
            {"text": "5", "is_correct": False},
        ]
    },
    {
        "title": "OS: Semaphore Operations",
        "description": "What are the two atomic operations traditionally defined on a counting semaphore?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "push() and pop()", "is_correct": False},
            {"text": "wait() [P] and signal() [V]", "is_correct": True},
            {"text": "lock() and yield()", "is_correct": False},
            {"text": "fork() and exec()", "is_correct": False},
        ]
    },
    {
        "title": "OS: PCB (Process Control Block) Contents",
        "description": "Which of the following pieces of metadata are stored inside a Process Control Block (PCB)?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "Process ID (PID) and Process State", "is_correct": True},
            {"text": "Program Counter (PC) and CPU registers", "is_correct": True},
            {"text": "List of open file descriptors", "is_correct": True},
            {"text": "User's browser cache history", "is_correct": False},
        ]
    },
    {
        "title": "OS: System Calls Examples",
        "description": "Which of the following functions are standard Unix system calls for process management?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "fork()", "is_correct": True},
            {"text": "exec()", "is_correct": True},
            {"text": "wait()", "is_correct": True},
            {"text": "printf()", "is_correct": False},
        ]
    },
    {
        "title": "OS: Thrashing Definition",
        "description": "What is 'thrashing' in the context of operating systems?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": False,
        "options": [
            {"text": "High CPU utilization caused by rapid mathematical computation", "is_correct": False},
            {"text": "The state where an OS spends more time swapping pages than executing instructions", "is_correct": True},
            {"text": "A hardware failure of the mechanical hard disk drive head", "is_correct": False},
            {"text": "Excessive packet collisions on a local Ethernet bus", "is_correct": False},
        ]
    },
    {
        "title": "OS: Belady's Anomaly",
        "description": "Which page replacement algorithm is susceptible to Belady's Anomaly (where increasing page frames increases page faults)?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Least Recently Used (LRU)", "is_correct": False},
            {"text": "First-In, First-Out (FIFO)", "is_correct": True},
            {"text": "Optimal Page Replacement (OPT)", "is_correct": False},
            {"text": "Least Frequently Used (LFU)", "is_correct": False},
        ]
    },
    {
        "title": "OS: Zombie Process",
        "description": "What is a 'zombie process' in a Unix-like operating system?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": False,
        "options": [
            {"text": "A process that has consumed 100% of memory and cannot be killed", "is_correct": False},
            {"text": "A process that has completed execution but its parent has not yet read its exit status via wait()", "is_correct": True},
            {"text": "A background daemon process with no terminal attached", "is_correct": False},
            {"text": "A process running under elevated root privileges without permission", "is_correct": False},
        ]
    },
    {
        "title": "OS: Spooling Purpose",
        "description": "What does the term SPOOLing stand for and facilitate?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": False,
        "options": [
            {"text": "Simultaneous Peripheral Operations On-Line, buffering I/O jobs like printing", "is_correct": True},
            {"text": "Sequential Process Organization Online, sorting ready queues", "is_correct": False},
            {"text": "Single Processor Operation Loop, saving register context", "is_correct": False},
            {"text": "Shared Page Overlay Operating Link, managing virtual memory", "is_correct": False},
        ]
    },

    # MEDIUM (15 questions, 9-10s)
    {
        "title": "OS: Critical Section Problem Requirements",
        "description": "Which three conditions MUST any valid solution to the Critical Section problem satisfy?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "Mutual Exclusion", "is_correct": True},
            {"text": "Progress", "is_correct": True},
            {"text": "Bounded Waiting", "is_correct": True},
            {"text": "Preemptive Execution", "is_correct": False},
        ]
    },
    {
        "title": "OS: Banker's Algorithm Purpose",
        "description": "What is the primary role of Dijkstra's Banker's Algorithm in an Operating System?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Deadlock Detection and Recovery after deadlock occurs", "is_correct": False},
            {"text": "Deadlock Avoidance by ensuring resource allocation stays in a safe state", "is_correct": True},
            {"text": "Memory allocation using buddy system fragmentation", "is_correct": False},
            {"text": "Fair-share CPU cycle distribution across user groups", "is_correct": False},
        ]
    },
    {
        "title": "OS: Internal vs External Fragmentation",
        "description": "Which memory management scheme causes Internal Fragmentation but completely avoids External Fragmentation?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Pure Paging with fixed-size page frames", "is_correct": True},
            {"text": "Pure Segmentation with variable-sized segments", "is_correct": False},
            {"text": "Dynamic Contiguous Memory Allocation", "is_correct": False},
            {"text": "Buddy memory allocation without compaction", "is_correct": False},
        ]
    },
    {
        "title": "OS: TLB (Translation Lookaside Buffer)",
        "description": "What is the hardware function and purpose of a TLB?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "An L1 data cache storing frequently accessed heap variables", "is_correct": False},
            {"text": "An associative hardware cache storing recent virtual-to-physical address translations", "is_correct": True},
            {"text": "A hardware interrupt vector table", "is_correct": False},
            {"text": "A buffer holding disk sector sectors awaiting writeback", "is_correct": False},
        ]
    },
    {
        "title": "OS: Inode Contents in Unix",
        "description": "Which of the following attributes are stored directly inside a Unix file Inode?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "File permissions (mode) and owner ID", "is_correct": True},
            {"text": "File size and timestamps (ctime, mtime, atime)", "is_correct": True},
            {"text": "Direct and indirect pointers to disk data blocks", "is_correct": True},
            {"text": "The file name itself", "is_correct": False},
        ]
    },
    {
        "title": "OS: RAID Levels Comparison",
        "description": "Which RAID levels provide fault tolerance against single disk failures via parity calculations?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "RAID 5", "is_correct": True},
            {"text": "RAID 6", "is_correct": True},
            {"text": "RAID 0", "is_correct": False},
            {"text": "RAID 3", "is_correct": True},
        ]
    },
    {
        "title": "OS: Disk Scheduling Algorithms",
        "description": "In the SCAN (Elevator) disk scheduling algorithm, how does the disk arm service pending I/O requests?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "Services requests closest to the current head position regardless of direction", "is_correct": False},
            {"text": "Moves in one direction servicing all requests until it hits the end, then reverses direction", "is_correct": True},
            {"text": "Jumps immediately to cylinder 0 after each single track read", "is_correct": False},
            {"text": "Randomly chooses requests based on rotational latency", "is_correct": False},
        ]
    },
    {
        "title": "OS: Peterson's Algorithm Limitations",
        "description": "Why does Peterson's classic two-process mutual exclusion algorithm fail on modern out-of-order superscalar CPUs without memory barriers?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "Processors and compilers reorder independent read and write operations", "is_correct": True},
            {"text": "Modern CPUs cannot execute atomic arithmetic instructions", "is_correct": False},
            {"text": "The integer data type cannot represent binary states", "is_correct": False},
            {"text": "Peterson's algorithm consumes too much L3 cache memory", "is_correct": False},
        ]
    },
    {
        "title": "OS: Multi-level Feedback Queue (MLFQ)",
        "description": "What is the primary design objective achieved by a Multi-level Feedback Queue CPU scheduler?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Favors short, interactive I/O-bound jobs while preventing starvation of CPU-bound jobs via aging", "is_correct": True},
            {"text": "Ensures that all processes have exactly identical turnaround times", "is_correct": False},
            {"text": "Guarantees 100% hard real-time deadline compliance", "is_correct": False},
            {"text": "Eliminates all context switching overhead entirely", "is_correct": False},
        ]
    },
    {
        "title": "OS: Inter-Process Communication (IPC)",
        "description": "Which of the following are recognized Inter-Process Communication (IPC) mechanisms in POSIX systems?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "Shared Memory (shmget / mmap)", "is_correct": True},
            {"text": "Pipes and Named FIFOs", "is_correct": True},
            {"text": "Message Queues", "is_correct": True},
            {"text": "CPU Branch Predictor Registers", "is_correct": False},
        ]
    },
    {
        "title": "OS: Copy-on-Write (CoW)",
        "description": "How does Copy-on-Write optimize the execution of the `fork()` system call in modern operating systems?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "By duplicating all physical pages into swap space before starting the child process", "is_correct": False},
            {"text": "Parent and child initially share the same physical pages; a duplicate page is created only when either process writes to it", "is_correct": True},
            {"text": "By executing the child process directly within the kernel address space", "is_correct": False},
            {"text": "By compressing all write operations into an archive file", "is_correct": False},
        ]
    },
    {
        "title": "OS: Page Fault Sequence",
        "description": "What happens when a CPU generates an address reference to a page whose valid/invalid bit is set to 0 (invalid)?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "The program crashes immediately with a kernel panic", "is_correct": False},
            {"text": "A page fault trap is generated, causing the OS to fetch the page from swap/backing store into RAM", "is_correct": True},
            {"text": "The CPU ignores the instruction and continues execution", "is_correct": False},
            {"text": "The entire TLB is flushed and the system reboots", "is_correct": False},
        ]
    },
    {
        "title": "OS: Orphan Process Handling",
        "description": "When a parent process terminates before its child process, who becomes the new parent of the orphan process in Linux?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "The child is immediately terminated by the kernel", "is_correct": False},
            {"text": "The `init` process (or systemd / subreaper, PID 1)", "is_correct": True},
            {"text": "The user's default login shell", "is_correct": False},
            {"text": "The swap manager daemon", "is_correct": False},
        ]
    },
    {
        "title": "OS: Priority Inversion Solution",
        "description": "What well-known protocol solves the Priority Inversion problem in real-time operating systems?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Priority Inheritance Protocol", "is_correct": True},
            {"text": "First-Come First-Served arbitration", "is_correct": False},
            {"text": "Banker's Resource Vector relaxation", "is_correct": False},
            {"text": "Peterson's Busy-Wait Spinlock", "is_correct": False},
        ]
    },
    {
        "title": "OS: Direct Memory Access (DMA)",
        "description": "What is the principal advantage of utilizing DMA for high-speed I/O devices (e.g., NICs, NVMe drives)?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Allows I/O devices to transfer data directly to/from main memory without CPU intervention", "is_correct": True},
            {"text": "Doubles the clock frequency of the system bus", "is_correct": False},
            {"text": "Eliminates all hardware interrupts completely", "is_correct": False},
            {"text": "Replaces the requirement for physical RAM", "is_correct": False},
        ]
    },

    # HARD (10 questions, 11-13s)
    {
        "title": "OS: Inverted Page Table Overhead",
        "description": "While an Inverted Page Table drastically reduces memory required to store page tables, what is its primary drawback?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "It cannot support virtual addresses larger than 16 bits", "is_correct": False},
            {"text": "Searching the table on a TLB miss takes linear time unless accelerated by a hash anchor table", "is_correct": True},
            {"text": "It requires physical RAM to be contiguous", "is_correct": False},
            {"text": "It prevents processes from using shared memory segments", "is_correct": False},
        ]
    },
    {
        "title": "OS: Linux CFS (Completely Fair Scheduler)",
        "description": "Which data structure and metric are utilized by the Linux Completely Fair Scheduler (CFS) to select the next task to run?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "Binary Max-Heap sorted by remaining quantum", "is_correct": False},
            {"text": "Time-ordered Red-Black Tree sorted by `vruntime` (virtual runtime)", "is_correct": True},
            {"text": "Hash map indexed by process priority", "is_correct": False},
            {"text": "Doubly linked list ordered by static niceness value", "is_correct": False},
        ]
    },
    {
        "title": "OS: Memory Barrier (Fence) Semantics",
        "description": "What guarantee is provided by an explicit memory barrier (`mfence` / acquire-release fence) instruction in multi-core systems?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 13,
        "is_multi_select": True,
        "options": [
            {"text": "Enforces that memory operations before the fence are globally visible before operations after the fence", "is_correct": True},
            {"text": "Prevents CPU hardware and compiler reordering of loads and stores across the fence", "is_correct": True},
            {"text": "Flushes the CPU pipeline and write buffers as required by the architecture", "is_correct": True},
            {"text": "Permanently locks the shared L3 cache to a single CPU core", "is_correct": False},
        ]
    },
    {
        "title": "OS: Two-Phase Locking (2PL) vs Strict 2PL",
        "description": "In concurrency control, what distinction does Strict Two-Phase Locking (Strict 2PL) make compared to basic 2PL?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "It holds all exclusive (write) locks until the transaction commits or aborts, preventing cascading aborts", "is_correct": True},
            {"text": "It never acquires shared read locks", "is_correct": False},
            {"text": "It allows unlocking before all locks have been acquired", "is_correct": False},
            {"text": "It requires zero CPU cycles for deadlock detection", "is_correct": False},
        ]
    },
    {
        "title": "OS: Meltdown and Spectre CPU Vulnerabilities",
        "description": "What architectural CPU optimization feature was exploited by the Meltdown and Spectre side-channel attacks to leak kernel memory to user space?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 13,
        "is_multi_select": False,
        "options": [
            {"text": "Speculative execution and branch prediction with microarchitectural CPU cache side-channels", "is_correct": True},
            {"text": "Hardware page table hashing collisions", "is_correct": False},
            {"text": "Buffer overflow in the interrupt descriptor table (IDT)", "is_correct": False},
            {"text": "Direct Memory Access bus contention", "is_correct": False},
        ]
    },
    {
        "title": "OS: Linux Namespaces vs Cgroups",
        "description": "In containerization technology (e.g., Docker, runc), how do Linux Namespaces differ from Control Groups (cgroups)?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 13,
        "is_multi_select": True,
        "options": [
            {"text": "Namespaces isolate what a process can SEE (PID, mount, network, IPC, UTS)", "is_correct": True},
            {"text": "Cgroups limit and throttle what a process can USE (CPU, memory, disk I/O, network bandwidth)", "is_correct": True},
            {"text": "Both are built upon full hardware hypervisor virtualization", "is_correct": False},
            {"text": "Namespaces can only be invoked by non-root users", "is_correct": False},
        ]
    },
    {
        "title": "OS: Working Set Model for Thrashing Prevention",
        "description": "In Denning's Working Set Model for virtual memory management, how is the working set $W(t, \\Delta)$ defined?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "The total number of page frames available in physical RAM", "is_correct": False},
            {"text": "The set of pages referenced by the process during the most recent time window $\\Delta$", "is_correct": True},
            {"text": "The entire virtual address space of all active processes combined", "is_correct": False},
            {"text": "The dirty pages waiting in swap space", "is_correct": False},
        ]
    },
    {
        "title": "OS: Epoll vs Select / Poll Scalability",
        "description": "Why does Linux `epoll` scale to tens of thousands of concurrent network connections ($O(1)$) where `select()` degrades ($O(n)$)?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": True,
        "options": [
            {"text": "`epoll` uses an in-kernel ready list populated by device callbacks rather than linear file descriptor scans", "is_correct": True},
            {"text": "`epoll_wait` only returns the subset of file descriptors that are actually ready for I/O", "is_correct": True},
            {"text": "`select` requires copying the entire descriptor set back and forth between user and kernel space on every call", "is_correct": True},
            {"text": "`epoll` disables all TCP checksum calculations", "is_correct": False},
        ]
    },
    {
        "title": "OS: Translation Lookaside Buffer (TLB) Shootdown",
        "description": "What is a 'TLB shootdown' in symmetric multiprocessing (SMP) operating systems?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 13,
        "is_multi_select": False,
        "options": [
            {"text": "A hardware overheat shutoff of the CPU memory management unit", "is_correct": False},
            {"text": "The process where one CPU core sends inter-processor interrupts (IPI) to flush stale TLB entries on other cores after modifying a shared page table", "is_correct": True},
            {"text": "Permanent eviction of pages from the swap partition", "is_correct": False},
            {"text": "Overwriting kernel text segment during live patching", "is_correct": False},
        ]
    },
    {
        "title": "OS: RCU (Read-Copy-Update) Synchronization",
        "description": "What is the primary characteristic that makes Read-Copy-Update (RCU) highly performant in the Linux kernel?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "Readers access shared data without acquiring locks or executing expensive atomic operations while writers defer reclamation until a grace period passes", "is_correct": True},
            {"text": "It completely replaces the need for write operations by predicting outcomes", "is_correct": False},
            {"text": "It forces single-threaded execution on all critical sections", "is_correct": False},
            {"text": "It writes all modified memory directly to non-volatile RAM", "is_correct": False},
        ]
    }
]

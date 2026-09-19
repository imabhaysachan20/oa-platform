"""
40 Computer Networks MCQs across Easy, Medium, and Hard difficulties.
All timed between 7s and 13s, with mix of single and multi-select.
"""

from backend.app.models.question import QuestionDifficulty

MCQ_CN_QUESTIONS = [
    # EASY (15 questions, 7-8s)
    {
        "title": "CN: OSI Model Layer Count",
        "description": "How many layers are present in the standard ISO-OSI reference model?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "5", "is_correct": False},
            {"text": "7", "is_correct": True},
            {"text": "4", "is_correct": False},
            {"text": "6", "is_correct": False},
        ]
    },
    {
        "title": "CN: HTTP Default Port",
        "description": "What is the standard default port number used by unencrypted HTTP?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "21", "is_correct": False},
            {"text": "443", "is_correct": False},
            {"text": "80", "is_correct": True},
            {"text": "8080", "is_correct": False},
        ]
    },
    {
        "title": "CN: HTTPS Default Port",
        "description": "Which port is used by default for secure web traffic over HTTPS?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "80", "is_correct": False},
            {"text": "443", "is_correct": True},
            {"text": "22", "is_correct": False},
            {"text": "8443", "is_correct": False},
        ]
    },
    {
        "title": "CN: IPv4 Address Size",
        "description": "What is the size of an IPv4 address?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "16 bits", "is_correct": False},
            {"text": "32 bits", "is_correct": True},
            {"text": "64 bits", "is_correct": False},
            {"text": "128 bits", "is_correct": False},
        ]
    },
    {
        "title": "CN: IPv6 Address Size",
        "description": "What is the length of an IPv6 address?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "32 bits", "is_correct": False},
            {"text": "64 bits", "is_correct": False},
            {"text": "128 bits", "is_correct": True},
            {"text": "256 bits", "is_correct": False},
        ]
    },
    {
        "title": "CN: Transport Layer Protocols",
        "description": "Which of the following protocols operate at the Transport Layer of the OSI model?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "TCP", "is_correct": True},
            {"text": "UDP", "is_correct": True},
            {"text": "IP", "is_correct": False},
            {"text": "HTTP", "is_correct": False},
        ]
    },
    {
        "title": "CN: MAC Address Size",
        "description": "What is the standard length of an Ethernet MAC physical address?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "32 bits", "is_correct": False},
            {"text": "48 bits", "is_correct": True},
            {"text": "64 bits", "is_correct": False},
            {"text": "128 bits", "is_correct": False},
        ]
    },
    {
        "title": "CN: DNS Purpose",
        "description": "What primary function does the Domain Name System (DNS) provide?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": False,
        "options": [
            {"text": "Assigning IP addresses to hosts dynamically", "is_correct": False},
            {"text": "Translating human-readable domain names into IP addresses", "is_correct": True},
            {"text": "Routing packets across Autonomous Systems", "is_correct": False},
            {"text": "Encrypting web application payload", "is_correct": False},
        ]
    },
    {
        "title": "CN: Ping Command Protocol",
        "description": "Which protocol is utilized by the network utility tool `ping` to test connectivity?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "IGMP", "is_correct": False},
            {"text": "ARP", "is_correct": False},
            {"text": "ICMP", "is_correct": True},
            {"text": "DHCP", "is_correct": False},
        ]
    },
    {
        "title": "CN: Private IP Address Ranges",
        "description": "Which of the following IP address blocks are designated as private IPv4 address spaces by RFC 1918?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "10.0.0.0/8", "is_correct": True},
            {"text": "192.168.0.0/16", "is_correct": True},
            {"text": "172.16.0.0/12", "is_correct": True},
            {"text": "8.8.8.0/24", "is_correct": False},
        ]
    },
    {
        "title": "CN: Loopback Address",
        "description": "What is the standard IPv4 loopback address?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "0.0.0.0", "is_correct": False},
            {"text": "255.255.255.255", "is_correct": False},
            {"text": "127.0.0.1", "is_correct": True},
            {"text": "192.168.1.1", "is_correct": False},
        ]
    },
    {
        "title": "CN: Full Duplex Communication",
        "description": "Which communication mode allows transmission in both directions simultaneously?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Simplex", "is_correct": False},
            {"text": "Half Duplex", "is_correct": False},
            {"text": "Full Duplex", "is_correct": True},
            {"text": "Multiplex", "is_correct": False},
        ]
    },
    {
        "title": "CN: Network Topologies",
        "description": "Which of the following are recognized physical network topologies?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "Star", "is_correct": True},
            {"text": "Mesh", "is_correct": True},
            {"text": "Ring", "is_correct": True},
            {"text": "Diagonal", "is_correct": False},
        ]
    },
    {
        "title": "CN: Hub vs Switch Layer",
        "description": "At which layer of the OSI reference model does a standard network switch operate?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Physical Layer (Layer 1)", "is_correct": False},
            {"text": "Data Link Layer (Layer 2)", "is_correct": True},
            {"text": "Network Layer (Layer 3)", "is_correct": False},
            {"text": "Transport Layer (Layer 4)", "is_correct": False},
        ]
    },
    {
        "title": "CN: SSH Default Port",
        "description": "What standard TCP port does the Secure Shell (SSH) protocol use?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "21", "is_correct": False},
            {"text": "22", "is_correct": True},
            {"text": "23", "is_correct": False},
            {"text": "25", "is_correct": False},
        ]
    },

    # MEDIUM (15 questions, 9-10s)
    {
        "title": "CN: TCP Three-Way Handshake",
        "description": "What is the correct sequence of packet flags exchanged during a normal TCP connection establishment?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "SYN -> ACK -> SYN-ACK", "is_correct": False},
            {"text": "SYN -> SYN-ACK -> ACK", "is_correct": True},
            {"text": "ACK -> SYN -> ACK", "is_correct": False},
            {"text": "SYN -> RST -> ACK", "is_correct": False},
        ]
    },
    {
        "title": "CN: Connectionless Protocols",
        "description": "Which of the following protocols are connectionless at their respective layers?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "UDP", "is_correct": True},
            {"text": "IP", "is_correct": True},
            {"text": "TCP", "is_correct": False},
            {"text": "DNS (over default transport)", "is_correct": True},
        ]
    },
    {
        "title": "CN: Address Resolution Protocol (ARP)",
        "description": "What mapping does the Address Resolution Protocol (ARP) perform?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Domain name to IP address", "is_correct": False},
            {"text": "IP address to MAC address", "is_correct": True},
            {"text": "MAC address to IP address", "is_correct": False},
            {"text": "Port number to Application name", "is_correct": False},
        ]
    },
    {
        "title": "CN: Subnetting /26 Host Count",
        "description": "How many usable host IP addresses are available in an IPv4 subnet with a `/26` prefix?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "64", "is_correct": False},
            {"text": "62", "is_correct": True},
            {"text": "30", "is_correct": False},
            {"text": "126", "is_correct": False},
        ]
    },
    {
        "title": "CN: TCP Flow vs Congestion Control",
        "description": "Which mechanisms are specifically used by TCP for congestion control?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "Slow Start", "is_correct": True},
            {"text": "Fast Retransmit", "is_correct": True},
            {"text": "Congestion Avoidance", "is_correct": True},
            {"text": "Stop-and-Wait credit exchange", "is_correct": False},
        ]
    },
    {
        "title": "CN: HTTP Status Code 301 vs 302",
        "description": "What is the meaning of the HTTP status code `301 Moved Permanently`?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "The requested resource has been temporarily relocated", "is_correct": False},
            {"text": "The requested resource has been permanently assigned a new URI", "is_correct": True},
            {"text": "The request lacked valid authentication credentials", "is_correct": False},
            {"text": "The server encountered an unrecoverable internal error", "is_correct": False},
        ]
    },
    {
        "title": "CN: CSMA/CD Operation",
        "description": "In CSMA/CD, what action does a station take immediately upon detecting a collision?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "Continues transmitting the remaining frame", "is_correct": False},
            {"text": "Transmits a jam signal and aborts frame transmission", "is_correct": True},
            {"text": "Reboots the network interface card", "is_correct": False},
            {"text": "Sends an ARP request to find the colliding node", "is_correct": False},
        ]
    },
    {
        "title": "CN: Routing Protocols Types",
        "description": "Which of the following routing protocols are categorized as Interior Gateway Protocols (IGP)?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "OSPF (Open Shortest Path First)", "is_correct": True},
            {"text": "RIP (Routing Information Protocol)", "is_correct": True},
            {"text": "BGP (Border Gateway Protocol)", "is_correct": False},
            {"text": "IS-IS", "is_correct": True},
        ]
    },
    {
        "title": "CN: TCP Header Minimum Size",
        "description": "What is the minimum header size of a TCP segment without any optional fields?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "16 bytes", "is_correct": False},
            {"text": "20 bytes", "is_correct": True},
            {"text": "32 bytes", "is_correct": False},
            {"text": "8 bytes", "is_correct": False},
        ]
    },
    {
        "title": "CN: UDP Header Size",
        "description": "What is the fixed total size of a UDP header?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "4 bytes", "is_correct": False},
            {"text": "8 bytes", "is_correct": True},
            {"text": "16 bytes", "is_correct": False},
            {"text": "20 bytes", "is_correct": False},
        ]
    },
    {
        "title": "CN: DHCP DORA Process",
        "description": "What is the correct 4-step sequence executed by DHCP to lease an IP address?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Discover, Offer, Request, Acknowledge", "is_correct": True},
            {"text": "Declare, Obtain, Renew, Accept", "is_correct": False},
            {"text": "Discover, Obtain, Request, Announce", "is_correct": False},
            {"text": "Deliver, Offer, Receive, Acknowledge", "is_correct": False},
        ]
    },
    {
        "title": "CN: Sliding Window Selective Repeat",
        "description": "In a Selective Repeat ARQ protocol using an $m$-bit sequence number, what is the maximum allowable window size $W$?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "$2^m$", "is_correct": False},
            {"text": "$2^{m-1}$", "is_correct": True},
            {"text": "$2^m - 1$", "is_correct": False},
            {"text": "$m^2$", "is_correct": False},
        ]
    },
    {
        "title": "CN: NAT Flavors",
        "description": "Which of the following are standard implementations or forms of Network Address Translation (NAT)?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "Static NAT", "is_correct": True},
            {"text": "Dynamic NAT", "is_correct": True},
            {"text": "PAT (Port Address Translation / NAT Overload)", "is_correct": True},
            {"text": "Recursive NAT", "is_correct": False},
        ]
    },
    {
        "title": "CN: Distance Vector Count to Infinity",
        "description": "Which techniques help mitigate the 'count-to-infinity' problem in distance vector routing protocols?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "Split Horizon", "is_correct": True},
            {"text": "Poison Reverse", "is_correct": True},
            {"text": "Hold-down Timers", "is_correct": True},
            {"text": "Sliding Window Buffer Expansion", "is_correct": False},
        ]
    },
    {
        "title": "CN: HTTP/2 Core Features",
        "description": "Which of the following features were introduced in the HTTP/2 specification?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "Multiplexing over a single TCP connection", "is_correct": True},
            {"text": "Header compression via HPACK", "is_correct": True},
            {"text": "Server Push", "is_correct": True},
            {"text": "Mandatory UDP transport", "is_correct": False},
        ]
    },

    # HARD (10 questions, 11-13s)
    {
        "title": "CN: BGP Path Vector Routing",
        "description": "Why does the Border Gateway Protocol (BGP) use a path vector mechanism rather than simple link-state or distance-vector?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "To support broadcast flooding across local networks", "is_correct": False},
            {"text": "To prevent routing loops across autonomous systems by inspecting the AS-PATH attribute", "is_correct": True},
            {"text": "To eliminate the need for TCP transport", "is_correct": False},
            {"text": "To enforce symmetrical routing paths across peering links", "is_correct": False},
        ]
    },
    {
        "title": "CN: TCP TIME_WAIT State Purpose",
        "description": "What are the key reasons why a TCP endpoint remains in the `TIME_WAIT` state for `2 * MSL` (Maximum Segment Lifetime)?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 13,
        "is_multi_select": True,
        "options": [
            {"text": "To allow delayed duplicate segments from the old connection to expire in the network", "is_correct": True},
            {"text": "To ensure the remote peer received the final ACK closing the connection", "is_correct": True},
            {"text": "To renegotiate the Maximum Transmission Unit (MTU)", "is_correct": False},
            {"text": "To convert the TCP connection into a UDP stream", "is_correct": False},
        ]
    },
    {
        "title": "CN: Nagle Algorithm and Delayed ACK Interaction",
        "description": "What undesirable network phenomenon can occur when Nagle's algorithm interacts with TCP Delayed Acknowledgments?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "SYN flood denial of service", "is_correct": False},
            {"text": "Temporary latency spikes (deadlocks of 200-500ms) waiting for delayed ACKs", "is_correct": True},
            {"text": "Immediate buffer overflow on intermediate switches", "is_correct": False},
            {"text": "Premature termination of the half-open connection", "is_correct": False},
        ]
    },
    {
        "title": "CN: TLS 1.3 Handshake Improvement",
        "description": "Which major latency enhancement distinguishes TLS 1.3 from TLS 1.2 during session resumption?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "0-RTT (Zero Round Trip Time) early data transmission", "is_correct": True},
            {"text": "Deprecation of Diffie-Hellman key exchanges", "is_correct": False},
            {"text": "Switching to plaintext headers without certificates", "is_correct": False},
            {"text": "Triple-handshake verification step", "is_correct": False},
        ]
    },
    {
        "title": "CN: Link-State Dijkstra Complexity",
        "description": "In an OSPF network with $V$ routers and $E$ links, what is the asymptotic runtime of Dijkstra's algorithm implemented with a binary min-heap?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 11,
        "is_multi_select": False,
        "options": [
            {"text": "$O(V^3)$", "is_correct": False},
            {"text": "$O((V + E) \\log V)$", "is_correct": True},
            {"text": "$O(V \\cdot E)$", "is_correct": False},
            {"text": "$O(E \\log E + V^2)$", "is_correct": False},
        ]
    },
    {
        "title": "CN: Fast Retransmit Trigger Condition",
        "description": "In TCP Reno/Tahoe, what specific event directly triggers a Fast Retransmit without waiting for the retransmission timer (RTO) to fire?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 11,
        "is_multi_select": False,
        "options": [
            {"text": "Reception of an ICMP Host Unreachable message", "is_correct": False},
            {"text": "Reception of 3 duplicate ACKs (4 total identical ACKs)", "is_correct": True},
            {"text": "A drop in advertised receiver window to 0", "is_correct": False},
            {"text": "Expiry of the persistence timer", "is_correct": False},
        ]
    },
    {
        "title": "CN: Anycast Addressing Characteristics",
        "description": "Which statements are TRUE regarding IPv6 Anycast addressing?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 13,
        "is_multi_select": True,
        "options": [
            {"text": "Packets sent to an anycast address are routed to the topologically nearest interface assigned that address", "is_correct": True},
            {"text": "Anycast addresses are syntactically indistinguishable from global unicast addresses", "is_correct": True},
            {"text": "An anycast address cannot be used as the source address of an IPv6 packet", "is_correct": True},
            {"text": "Anycast completely replaces multicast across all IPv6 subnets", "is_correct": False},
        ]
    },
    {
        "title": "CN: Silly Window Syndrome",
        "description": "What collaborative algorithms are implemented on TCP sender and receiver sides to prevent the Silly Window Syndrome?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": True,
        "options": [
            {"text": "Nagle's Algorithm at the sender", "is_correct": True},
            {"text": "Clark's Solution at the receiver", "is_correct": True},
            {"text": "Delayed Acknowledgments at the receiver", "is_correct": True},
            {"text": "Bellman-Ford relaxation at the transport layer", "is_correct": False},
        ]
    },
    {
        "title": "CN: QUIC Protocol Architecture",
        "description": "Which architectural advantages are provided by HTTP/3 using the QUIC protocol compared to HTTP/2 over TCP?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": True,
        "options": [
            {"text": "Eliminates Head-of-Line (HoL) blocking across distinct streams", "is_correct": True},
            {"text": "Built on top of UDP with integrated TLS 1.3 encryption", "is_correct": True},
            {"text": "Connection migration resilient to client IP address changes (e.g., WiFi to 4G)", "is_correct": True},
            {"text": "Eliminates all packet acknowledgments to maximize throughput", "is_correct": False},
        ]
    },
    {
        "title": "CN: MTU and Path MTU Discovery",
        "description": "How does Path MTU Discovery (PMTUD) discover the maximum packet size supported along an end-to-end path?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "By querying all intermediary DNS root servers", "is_correct": False},
            {"text": "By setting the Don't Fragment (DF) bit in IP headers and listening for ICMP 'Fragmentation Needed' responses", "is_correct": True},
            {"text": "By transmitting raw Ethernet frames without IP headers", "is_correct": False},
            {"text": "By inspecting the TTL field of incoming TCP SYN packets", "is_correct": False},
        ]
    }
]

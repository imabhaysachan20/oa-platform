"""
30 Object Oriented Programming & Design MCQs across Easy, Medium, and Hard difficulties.
All timed between 7s and 13s, with mix of single and multi-select.
"""

from backend.app.models.question import QuestionDifficulty

MCQ_OOPS_QUESTIONS = [
    # EASY (10 questions, 7-8s)
    {
        "title": "OOP: Four Pillars of OOP",
        "description": "Which of the following represent the foundational Four Pillars of Object-Oriented Programming?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "Encapsulation", "is_correct": True},
            {"text": "Abstraction", "is_correct": True},
            {"text": "Inheritance", "is_correct": True},
            {"text": "Polymorphism", "is_correct": True},
        ]
    },
    {
        "title": "OOP: Encapsulation Definition",
        "description": "What is the primary objective of Encapsulation in OOP?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Bundling data and methods operating on that data together while restricting direct access to internal state", "is_correct": True},
            {"text": "Allowing a class to inherit methods from multiple base classes", "is_correct": False},
            {"text": "Converting high-level code directly to machine language", "is_correct": False},
            {"text": "Executing multiple threads in parallel on separate CPU cores", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Compile-time vs Runtime Polymorphism",
        "description": "Which of the following is an example of Compile-Time (Static) Polymorphism?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Method Overriding with dynamic dispatch", "is_correct": False},
            {"text": "Method Overloading", "is_correct": True},
            {"text": "Virtual Method Table resolution", "is_correct": False},
            {"text": "Interface implementation", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Constructor Characteristics",
        "description": "Which of the following statements about Constructors in OOP languages (like Java and C++) are TRUE?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "A constructor has the exact same name as the class", "is_correct": True},
            {"text": "A constructor has no explicit return type (not even void)", "is_correct": True},
            {"text": "Constructors can be overloaded with different parameter lists", "is_correct": True},
            {"text": "Constructors can be declared as static methods", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Access Specifiers - Private Modifier",
        "description": "What is the scope of visibility for a class member declared with the `private` access modifier?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Accessible only within the same class definition", "is_correct": True},
            {"text": "Accessible anywhere within the same package/namespace", "is_correct": False},
            {"text": "Accessible in subclasses across any package", "is_correct": False},
            {"text": "Globally accessible by any external program", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Abstract Class Instantiation",
        "description": "Can an Abstract Class be instantiated directly using the `new` keyword?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "Yes, if it has a default constructor", "is_correct": False},
            {"text": "No, abstract classes cannot be directly instantiated", "is_correct": True},
            {"text": "Yes, but only within the same namespace", "is_correct": False},
            {"text": "Yes, by casting it to an Object type", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Method Overriding Rules",
        "description": "In runtime polymorphism (method overriding), what must be true regarding the overridden method in the derived class?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": True,
        "options": [
            {"text": "Must have the exact same method name", "is_correct": True},
            {"text": "Must have identical parameter list (types and order)", "is_correct": True},
            {"text": "Must have the same or covariant return type", "is_correct": True},
            {"text": "Must have more restrictive access privileges than the base class method", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Shallow Copy vs Deep Copy",
        "description": "What is the key difference between a Shallow Copy and a Deep Copy of an object?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": False,
        "options": [
            {"text": "Shallow copy copies references to heap objects; Deep copy allocates new memory and duplicates referenced objects recursively", "is_correct": True},
            {"text": "Shallow copy creates objects on the stack; Deep copy creates objects on the hard drive", "is_correct": False},
            {"text": "Shallow copy is thread-safe; Deep copy is never thread-safe", "is_correct": False},
            {"text": "Deep copy only works for primitive types like int and float", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Multiple Inheritance in Java",
        "description": "Why does Java disallow multiple inheritance with classes while allowing multiple inheritance with interfaces?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 8,
        "is_multi_select": False,
        "options": [
            {"text": "To prevent the ambiguity of the Diamond Problem in state and method resolution", "is_correct": True},
            {"text": "Because interfaces consume no memory at runtime", "is_correct": False},
            {"text": "Because Java compiler cannot parse multiple class names", "is_correct": False},
            {"text": "To enforce single-threaded execution", "is_correct": False},
        ]
    },
    {
        "title": "OOP: 'this' Keyword Meaning",
        "description": "What does the `this` (or `self` in Python) keyword represent inside an instance method?",
        "difficulty": QuestionDifficulty.EASY,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 7,
        "is_multi_select": False,
        "options": [
            {"text": "A reference to the current object instance whose method is being invoked", "is_correct": True},
            {"text": "A pointer to the parent base class", "is_correct": False},
            {"text": "A reference to the static class definition in method area", "is_correct": False},
            {"text": "The memory address of the operating system kernel", "is_correct": False},
        ]
    },

    # MEDIUM (12 questions, 9-10s)
    {
        "title": "OOP: SOLID Principles Names",
        "description": "Which of the following correspond to the letters in the SOLID software design acronym?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "Single Responsibility Principle", "is_correct": True},
            {"text": "Open/Closed Principle", "is_correct": True},
            {"text": "Liskov Substitution Principle", "is_correct": True},
            {"text": "Interface Segregation Principle", "is_correct": True},
        ]
    },
    {
        "title": "OOP: Liskov Substitution Principle (LSP)",
        "description": "What is the core mandate of the Liskov Substitution Principle (LSP)?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "Objects of a derived class must be substitutable for objects of the base class without altering program correctness", "is_correct": True},
            {"text": "Every class must have only one reason to change", "is_correct": False},
            {"text": "Clients should not be forced to depend upon interfaces they do not use", "is_correct": False},
            {"text": "High-level modules should depend directly on concrete low-level implementations", "is_correct": False},
        ]
    },
    {
        "title": "OOP: VTable and Dynamic Dispatch Mechanism",
        "description": "How do C++ compilers implement dynamic (late) binding for classes containing virtual functions?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "Using a Virtual Method Table (vtable) and an in-object virtual table pointer (vptr)", "is_correct": True},
            {"text": "By recompiling the function during every execution loop", "is_correct": False},
            {"text": "By converting all objects into associative hash maps at runtime", "is_correct": False},
            {"text": "Via operating system kernel signal interrupts", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Singleton Design Pattern Thread Safety",
        "description": "In the Double-Checked Locking implementation of the Singleton pattern in Java, why is the instance variable declared as `volatile`?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "To prevent instruction reordering during object instantiation that could expose a partially constructed object to another thread", "is_correct": True},
            {"text": "To serialize the object to disk on application shutdown", "is_correct": False},
            {"text": "To allow garbage collection of the singleton instance", "is_correct": False},
            {"text": "To make the singleton constructor public", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Creational Design Patterns",
        "description": "Which of the following are categorized as Gang-of-Four (GoF) Creational Design Patterns?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "Factory Method", "is_correct": True},
            {"text": "Builder", "is_correct": True},
            {"text": "Singleton", "is_correct": True},
            {"text": "Observer", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Structural Design Patterns",
        "description": "Which of the following are categorized as Structural Design Patterns?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "Adapter", "is_correct": True},
            {"text": "Decorator", "is_correct": True},
            {"text": "Composite", "is_correct": True},
            {"text": "Strategy", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Behavioral Design Patterns",
        "description": "Which design pattern defines a one-to-many dependency between objects such that when one object changes state, all its dependents are notified automatically?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Observer Pattern", "is_correct": True},
            {"text": "Decorator Pattern", "is_correct": False},
            {"text": "Facade Pattern", "is_correct": False},
            {"text": "Prototype Pattern", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Virtual Destructor Requirement",
        "description": "Why should a base class destructor always be declared `virtual` if it has virtual methods in C++?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": False,
        "options": [
            {"text": "To ensure that deleting a derived object via a base pointer calls the derived class destructor, preventing memory leaks", "is_correct": True},
            {"text": "To prevent the class from being instantiated", "is_correct": False},
            {"text": "To allow constructors to return error codes", "is_correct": False},
            {"text": "To automatically serialize members into JSON", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Composition over Inheritance Principle",
        "description": "Why is 'Favor object composition over class inheritance' a widely recommended design guideline?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 10,
        "is_multi_select": True,
        "options": [
            {"text": "Composition offers loose coupling and allows dynamic behavior modification at runtime", "is_correct": True},
            {"text": "Inheritance breaks encapsulation by exposing base class internal details to derived classes (fragile base class problem)", "is_correct": True},
            {"text": "Composition avoids deep, brittle inheritance hierarchies", "is_correct": True},
            {"text": "Inheritance requires more CPU registers than composition", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Strategy Pattern Intent",
        "description": "What is the primary intent of the Strategy Design Pattern?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Define a family of algorithms, encapsulate each one, and make them interchangeable at runtime", "is_correct": True},
            {"text": "Ensure only one instance of a class exists throughout the application", "is_correct": False},
            {"text": "Convert the interface of a class into another interface clients expect", "is_correct": False},
            {"text": "Attach additional responsibilities to an object dynamically", "is_correct": False},
        ]
    },
    {
        "title": "OOP: C++ Smart Pointers",
        "description": "Which C++ smart pointer enforces exclusive, non-copyable ownership of a dynamically allocated heap resource?",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "`std::unique_ptr`", "is_correct": True},
            {"text": "`std::shared_ptr`", "is_correct": False},
            {"text": "`std::weak_ptr`", "is_correct": False},
            {"text": "`std::auto_ptr`", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Open/Closed Principle (OCP)",
        "description": "According to the Open/Closed Principle, software entities should be:",
        "difficulty": QuestionDifficulty.MEDIUM,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 9,
        "is_multi_select": False,
        "options": [
            {"text": "Open for extension, but closed for modification", "is_correct": True},
            {"text": "Open for source code distribution, closed for external forks", "is_correct": False},
            {"text": "Open for reading, closed for multi-threaded writing", "is_correct": False},
            {"text": "Open for network requests, closed for local file access", "is_correct": False},
        ]
    },

    # HARD (8 questions, 11-13s)
    {
        "title": "OOP: Diamond Problem Virtual Inheritance Solution",
        "description": "In C++, how does `virtual` inheritance resolve the Diamond Problem when class D inherits from classes B and C, which both inherit from class A?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "It ensures only a single shared instance of base class A subobject exists in the derived class D instance", "is_correct": True},
            {"text": "It deletes base class A at compile-time", "is_correct": False},
            {"text": "It forces class D to be declared as an interface", "is_correct": False},
            {"text": "It converts all method calls in A into recursive macros", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Dependency Inversion Principle (DIP)",
        "description": "What are the two core tenets of the Dependency Inversion Principle (DIP)?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 13,
        "is_multi_select": True,
        "options": [
            {"text": "High-level modules should not depend on low-level modules; both should depend on abstractions", "is_correct": True},
            {"text": "Abstractions should not depend on details; details should depend on abstractions", "is_correct": True},
            {"text": "All classes must invert their constructor arguments", "is_correct": False},
            {"text": "Interfaces must inherit from concrete classes", "is_correct": False},
        ]
    },
    {
        "title": "OOP: C++ Rvalue References and Move Semantics",
        "description": "What primary performance problem do C++11 Move Semantics and Rvalue References (`&&`) solve?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "Eliminates expensive deep copying of temporary objects by transferring resource ownership (pointers) directly", "is_correct": True},
            {"text": "Replaces all CPU pointer arithmetic with hardware associative lookups", "is_correct": False},
            {"text": "Eliminates the need for operating system page tables", "is_correct": False},
            {"text": "Prevents stack overflow exceptions in recursive algorithms", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Circular Reference in Shared Pointers",
        "description": "How is the memory leak caused by circular references between two `std::shared_ptr` instances resolved in modern C++?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 11,
        "is_multi_select": False,
        "options": [
            {"text": "By breaking the cycle using a non-owning `std::weak_ptr` for one of the reference directions", "is_correct": True},
            {"text": "By calling `delete` explicitly on the base pointer", "is_correct": False},
            {"text": "By declaring both shared pointers as `volatile`", "is_correct": False},
            {"text": "By disabling the application's destructor pipeline", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Generational Garbage Collection Hypothesis",
        "description": "What empirical observation forms the fundamental premise of Generational Garbage Collectors (e.g., in the JVM)?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "The Weak Generational Hypothesis: Most allocated objects have very short lifespans and die shortly after creation", "is_correct": True},
            {"text": "All heap memory objects live until application termination", "is_correct": False},
            {"text": "Static variables consume 90% of all RAM allocations", "is_correct": False},
            {"text": "Primitive values require manual destructor invocation", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Abstract Factory vs Factory Method",
        "description": "What distinguishes the Abstract Factory pattern from the Factory Method pattern?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "Abstract Factory provides an interface for creating families of related or dependent objects without specifying concrete classes, whereas Factory Method relies on inheritance to instantiate a single product", "is_correct": True},
            {"text": "Factory Method can only create singletons", "is_correct": False},
            {"text": "Abstract Factory does not support polymorphism", "is_correct": False},
            {"text": "Factory Method is exclusively used in database connection pooling", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Decorator vs Adapter Pattern",
        "description": "What is the key architectural difference between the Decorator pattern and the Adapter pattern?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "Decorator extends an object's responsibilities without altering its interface; Adapter converts an existing interface into a different interface expected by the client", "is_correct": True},
            {"text": "Decorator changes the class interface, while Adapter keeps it identical", "is_correct": False},
            {"text": "Adapter is a creational pattern, while Decorator is behavioral", "is_correct": False},
            {"text": "Decorator can only be applied to abstract base classes", "is_correct": False},
        ]
    },
    {
        "title": "OOP: Covariant Return Types in Overriding",
        "description": "In object-oriented type systems (like C++ and Java), what is a 'Covariant Return Type' in method overriding?",
        "difficulty": QuestionDifficulty.HARD,
        "question_type": "mcq",
        "mcq_time_limit_seconds": 12,
        "is_multi_select": False,
        "options": [
            {"text": "The overriding method in the derived class can return a subtype of the return type declared in the base class method", "is_correct": True},
            {"text": "The method must return `void` if the base method returns an object", "is_correct": False},
            {"text": "The method return type can be completely unrelated to the base class return type", "is_correct": False},
            {"text": "The method must return an integer error code", "is_correct": False},
        ]
    }
]

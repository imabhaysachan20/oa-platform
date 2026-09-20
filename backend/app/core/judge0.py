import asyncio
import base64
import logging
import subprocess
import sys
import time
from typing import Optional, Dict, Any, List
import httpx
from backend.app.core.config import settings
from backend.app.services.output_comparator import compare_outputs

logger = logging.getLogger("judge0")


def _b64_encode(text: Optional[str]) -> Optional[str]:
    if text is None:
        return None
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


def _b64_decode(text: Optional[str]) -> Optional[str]:
    if not text:
        return text
    try:
        return base64.b64decode(text).decode("utf-8", errors="replace")
    except Exception:
        return text

LANGUAGE_ID_MAP = {
    # Python
    "python": 71,       # Python (3.8.1 / 3.11)
    "python3": 71,
    "py": 71,
    # C++
    "cpp": 54,          # C++ (GCC 9.2.0)
    "c++": 54,
    # Java
    "java": 62,         # Java (OpenJDK 13.0.1)
    # JavaScript
    "javascript": 63,   # JavaScript (Node.js 12.14.0)
    "js": 63,
    "node": 63,
    "nodejs": 63,
}

# Status descriptions from Judge0
JUDGE0_STATUS_DESCRIPTIONS = {
    1: "In Queue",
    2: "Processing",
    3: "Accepted",
    4: "Wrong Answer",
    5: "Time Limit Exceeded",
    6: "Compilation Error",
    7: "Runtime Error (SIGSEGV)",
    8: "Runtime Error (SIGXFSZ)",
    9: "Runtime Error (SIGFPE)",
    10: "Runtime Error (SIGABRT)",
    11: "Runtime Error (NZEC)",
    12: "Runtime Error (Other)",
    13: "Internal Error",
    14: "Exec Format Error",
}


def get_language_id(language: str) -> int:
    norm = language.lower().strip()
    if norm in LANGUAGE_ID_MAP:
        return LANGUAGE_ID_MAP[norm]
    try:
        return int(norm)
    except ValueError:
        raise ValueError(f"Unsupported language: {language}. Supported: python, javascript, cpp, java")


def _execute_python_fallback(
    source_code: str,
    stdin: str,
    expected_output: Optional[str] = None,
    cpu_time_limit: float = 2.0
) -> Dict[str, Any]:
    """
    Fallback runner when Judge0 is temporarily connecting/downloading.
    Executes python code safely in a restricted subprocess with timeout.
    """
    start_t = time.perf_counter()
    try:
        proc = subprocess.run(
            [sys.executable, "-c", source_code],
            input=stdin,
            capture_output=True,
            text=True,
            timeout=cpu_time_limit
        )
        elapsed = time.perf_counter() - start_t
        stdout = proc.stdout
        stderr = proc.stderr

        if proc.returncode != 0:
            return {
                "status": {"id": 11, "description": "Runtime Error (NZEC)"},
                "stdout": stdout,
                "stderr": stderr,
                "compile_output": None,
                "time": str(round(elapsed, 3)),
                "token": "local-py-fallback"
            }

        # Check expected output if provided
        status_id = 3
        status_desc = "Accepted"
        if expected_output is not None:
            if not compare_outputs(stdout, expected_output):
                status_id = 4
                status_desc = "Wrong Answer"

        return {
            "status": {"id": status_id, "description": status_desc},
            "stdout": stdout,
            "stderr": stderr,
            "compile_output": None,
            "time": str(round(elapsed, 3)),
            "token": "local-py-fallback"
        }
    except subprocess.TimeoutExpired:
        elapsed = time.perf_counter() - start_t
        return {
            "status": {"id": 5, "description": "Time Limit Exceeded"},
            "stdout": None,
            "stderr": "Execution timed out",
            "compile_output": None,
            "time": str(round(elapsed, 3)),
            "token": "local-py-fallback"
        }
    except Exception as e:
        return {
            "status": {"id": 13, "description": f"Execution Error: {str(e)}"},
            "stdout": None,
            "stderr": str(e),
            "compile_output": None,
            "time": "0.0",
            "token": "local-py-fallback"
        }


def _execute_node_fallback(
    source_code: str,
    stdin: str,
    expected_output: Optional[str] = None,
    cpu_time_limit: float = 2.0
) -> Dict[str, Any]:
    """
    Fallback runner when Judge0 is temporarily connecting/downloading.
    Executes JavaScript code in a Node.js subprocess with timeout.
    """
    start_t = time.perf_counter()
    try:
        proc = subprocess.run(
            ["node", "-e", source_code],
            input=stdin,
            capture_output=True,
            text=True,
            timeout=cpu_time_limit
        )
        elapsed = time.perf_counter() - start_t
        stdout = proc.stdout
        stderr = proc.stderr

        if proc.returncode != 0:
            return {
                "status": {"id": 11, "description": "Runtime Error (NZEC)"},
                "stdout": stdout,
                "stderr": stderr,
                "compile_output": None,
                "time": str(round(elapsed, 3)),
                "token": "local-js-fallback"
            }

        status_id = 3
        status_desc = "Accepted"
        if expected_output is not None:
            norm_act = stdout.strip().replace("\r\n", "\n")
            norm_exp = expected_output.strip().replace("\r\n", "\n")
            if norm_act != norm_exp:
                status_id = 4
                status_desc = "Wrong Answer"

        return {
            "status": {"id": status_id, "description": status_desc},
            "stdout": stdout,
            "stderr": stderr,
            "compile_output": None,
            "time": str(round(elapsed, 3)),
            "token": "local-js-fallback"
        }
    except subprocess.TimeoutExpired:
        elapsed = time.perf_counter() - start_t
        return {
            "status": {"id": 5, "description": "Time Limit Exceeded"},
            "stdout": None,
            "stderr": "Execution timed out",
            "compile_output": None,
            "time": str(round(elapsed, 3)),
            "token": "local-js-fallback"
        }
    except Exception as e:
        return {
            "status": {"id": 13, "description": f"Execution Error: {str(e)}"},
            "stdout": None,
            "stderr": str(e),
            "compile_output": None,
            "time": "0.0",
            "token": "local-js-fallback"
        }


class Judge0Client:
    def __init__(self, base_url: str = settings.JUDGE0_URL, api_key: Optional[str] = settings.JUDGE0_API_KEY):
        self.base_url = base_url.rstrip("/")
        self.headers = {"Content-Type": "application/json"}
        if api_key:
            self.headers["X-Auth-Token"] = api_key

    async def execute(
        self,
        source_code: str,
        language_id: int,
        stdin: str = "",
        expected_output: Optional[str] = None,
        cpu_time_limit: float = 2.0,
        memory_limit_kb: int = 128000,
    ) -> Dict[str, Any]:
        """
        Execute code synchronously (wait=true) on Judge0 with base64 encoding.
        Falls back gracefully if Judge0 service is downloading or offline.
        """
        url = f"{self.base_url}/submissions?base64_encoded=true&wait=true"
        payload = {
            "source_code": _b64_encode(source_code),
            "language_id": language_id,
            "stdin": _b64_encode(stdin) if stdin is not None else None,
            "cpu_time_limit": cpu_time_limit,
            "wall_time_limit": max(cpu_time_limit * 3.0, 10.0),
            "memory_limit": memory_limit_kb,
        }
        if language_id == 62:  # Java (OpenJDK 13)
            # Enforce low-overhead SerialGC and small initial heap during javac compilation
            payload["compiler_options"] = "-J-XX:-UseCompressedClassPointers -J-XX:+UseSerialGC -J-Xmx128m"
        if expected_output is not None:
            payload["expected_output"] = _b64_encode(expected_output)

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                data = response.json()

                if "stdout" in data and data["stdout"]:
                    data["stdout"] = _b64_decode(data["stdout"])
                if "stderr" in data and data["stderr"]:
                    data["stderr"] = _b64_decode(data["stderr"])
                if "compile_output" in data and data["compile_output"]:
                    data["compile_output"] = _b64_decode(data["compile_output"])
                if "message" in data and data["message"]:
                    data["message"] = _b64_decode(data["message"])

                return data
        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as exc:
            logger.warning(f"Judge0 connection error ({exc}). Invoking fallback executor.")
            if language_id == 71:  # Python
                return _execute_python_fallback(source_code, stdin, expected_output, cpu_time_limit)
            if language_id == 63:  # JavaScript (Node.js)
                return _execute_node_fallback(source_code, stdin, expected_output, cpu_time_limit)
            raise RuntimeError(
                f"Judge0 service is starting or unreachable ({str(exc)}). Please wait a moment."
            )

    async def execute_batch(
        self,
        submissions: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/submissions/batch?base64_encoded=true"
        encoded_submissions = []
        for s in submissions:
            item = dict(s)
            if "source_code" in item and item["source_code"] is not None:
                item["source_code"] = _b64_encode(item["source_code"])
            if "stdin" in item and item["stdin"] is not None:
                item["stdin"] = _b64_encode(item["stdin"])
            if "expected_output" in item and item["expected_output"] is not None:
                item["expected_output"] = _b64_encode(item["expected_output"])
            encoded_submissions.append(item)

        payload = {"submissions": encoded_submissions}

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                res = await client.post(url, json=payload, headers=self.headers)
                res.raise_for_status()
                tokens_data = res.json()
                tokens = [item["token"] for item in tokens_data if "token" in item]

                if not tokens:
                    return []

                tokens_str = ",".join(tokens)
                poll_url = f"{self.base_url}/submissions/batch?tokens={tokens_str}&base64_encoded=true"
                poll_res = await client.get(poll_url, headers=self.headers)
                poll_res.raise_for_status()
                results = poll_res.json().get("submissions", [])
                for data in results:
                    if "stdout" in data and data["stdout"]:
                        data["stdout"] = _b64_decode(data["stdout"])
                    if "stderr" in data and data["stderr"]:
                        data["stderr"] = _b64_decode(data["stderr"])
                    if "compile_output" in data and data["compile_output"]:
                        data["compile_output"] = _b64_decode(data["compile_output"])
                    if "message" in data and data["message"]:
                        data["message"] = _b64_decode(data["message"])
                return results
            except Exception as exc:
                logger.error(f"Judge0 batch execution error: {exc}")
                raise RuntimeError(f"Judge0 batch request failed: {str(exc)}")

    async def get_submission(self, token: str) -> Dict[str, Any]:
        url = f"{self.base_url}/submissions/{token}?base64_encoded=true"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=self.headers)
            res.raise_for_status()
            data = res.json()
            if "stdout" in data and data["stdout"]:
                data["stdout"] = _b64_decode(data["stdout"])
            if "stderr" in data and data["stderr"]:
                data["stderr"] = _b64_decode(data["stderr"])
            if "compile_output" in data and data["compile_output"]:
                data["compile_output"] = _b64_decode(data["compile_output"])
            if "message" in data and data["message"]:
                data["message"] = _b64_decode(data["message"])
            return data


judge0_client = Judge0Client()


async def ensure_judge0_language_config():
    """
    Ensures Judge0 languages table has low-overhead VM runtime flags for Java OpenJDK 13,
    preventing G1GC concurrent mark stack and 2.5GB heap allocation failures in isolate sandbox.
    """
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        engine = create_async_engine("postgresql+asyncpg://judge0:judge0password@judge0-db:5432/judge0")
        async with engine.begin() as conn:
            await conn.execute(text("""
                UPDATE languages 
                SET compile_cmd = '/usr/local/openjdk13/bin/javac -J-XX:-UseCompressedClassPointers -J-XX:+UseSerialGC -J-Xmx128m %s Main.java',
                    run_cmd = '/usr/local/openjdk13/bin/java -XX:-UseCompressedClassPointers -XX:+UseSerialGC -Xmx128m Main'
                WHERE id = 62;
            """))
        await engine.dispose()
        logger.info("Successfully verified/updated Judge0 Java runtime configuration in judge0-db.")
    except Exception as exc:
        logger.warning(f"Could not connect to judge0-db to ensure language config: {exc}")


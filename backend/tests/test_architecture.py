"""Guards the dependency rule: the core must not import infrastructure"""

from __future__ import annotations

import ast
from pathlib import Path

FORBIDDEN_IN_CORE = {
    "fastapi",
    "starlette",
    "anthropic",
    "httpx",
    "uvicorn",
    "slowapi",
}

CORE_DIR = Path(__file__).parent.parent / "app" / "core"


def _imported_roots(path: Path) -> set[str]:
    """Collect the top-level package name of every import in a module"""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    roots: set[str] = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                roots.add(alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom) and node.module:
            roots.add(node.module.split(".")[0])

    return roots


def test_core_directory_exists() -> None:
    assert CORE_DIR.is_dir(), f"Expected core package at {CORE_DIR}"


def test_core_has_no_infrastructure_imports() -> None:
    violations: list[str] = []

    for path in sorted(CORE_DIR.rglob("*.py")):
        forbidden = _imported_roots(path) & FORBIDDEN_IN_CORE
        if forbidden:
            violations.append(f"{path.name}: {', '.join(sorted(forbidden))}")

    assert not violations, "Core imports infrastructure: " + "; ".join(violations)


def test_core_does_not_import_adapters() -> None:
    outward_prefixes = ("app.adapters", "app.api")
    violations: list[str] = []

    for path in sorted(CORE_DIR.rglob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.startswith(outward_prefixes):
                        violations.append(f"{path.name}: {alias.name}")
            elif (
                isinstance(node, ast.ImportFrom)
                and node.module
                and node.module.startswith(outward_prefixes)
            ):
                violations.append(f"{path.name}: {node.module}")

    assert not violations, "Core imports outward: " + "; ".join(violations)

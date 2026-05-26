#!/usr/bin/env python3
"""List the project structure while ignoring miscellaneous and configuration files/folders."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable

IGNORED_DIRS = {
    "node_modules",
    ".git",
    ".vscode",
    ".expo",
    "__pycache__",
}

IGNORED_FILES = {
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "app.json",
    "tsconfig.json",
    "eslint.config.js",
    ".eslintrc.js",
    ".eslintrc.json",
    ".eslintrc",
    ".gitignore",
    ".gitattributes",
    "README.md",
    "README",
    ".prettierrc",
    "babel.config.js",
    "metro.config.js",
    "expo-env.d.ts",
    "app.config.js",
    "app.config.ts",
    "Dockerfile",
    "README.txt",
}

def should_ignore(path: Path, root: Path) -> bool:
    relative = path.relative_to(root)
    for part in relative.parts:
        if part.startswith("."):
            return True
        if part in IGNORED_DIRS:
            return True
    if path.is_file() and path.name in IGNORED_FILES:
        return True
    return False


def list_tree(root: Path) -> Iterable[str]:
    root = root.resolve()
    entries = [p for p in sorted(root.iterdir()) if not should_ignore(p, root)]
    for index, path in enumerate(entries):
        is_last = index == len(entries) - 1
        prefix = "└── " if is_last else "├── "
        yield f"{prefix}{path.name}"
        if path.is_dir():
            yield from list_subtree(path, prefix_prefix="    " if is_last else "│   ", root=root)


def list_subtree(directory: Path, prefix_prefix: str, root: Path) -> Iterable[str]:
    entries = [p for p in sorted(directory.iterdir()) if not should_ignore(p, root)]
    for index, path in enumerate(entries):
        is_last = index == len(entries) - 1
        branch = "└── " if is_last else "├── "
        yield f"{prefix_prefix}{branch}{path.name}"
        if path.is_dir():
            new_prefix = prefix_prefix + ("    " if is_last else "│   ")
            yield from list_subtree(path, prefix_prefix=new_prefix, root=root)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="List project structure without miscellaneous/config files.")
    parser.add_argument(
        "root",
        nargs="?",
        default=".",
        help="Root path to list (default: current directory).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    root = Path(args.root).resolve()

    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Error: Cannot list structure for '{root}'. Path does not exist or is not a directory.")

    print(root.name)
    for line in list_tree(root):
        print(line)


if __name__ == "__main__":
    main()

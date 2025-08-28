#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path

# Make project root importable so `accounts` and other local apps can be
# imported as top-level packages (matches how code imports them).
ROOT = Path(__file__).resolve().parent
APPS_DIR = ROOT / 'apps'
# Prefer apps/ on sys.path so local apps can be imported as top-level packages
if str(APPS_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_DIR))
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rapex_main.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

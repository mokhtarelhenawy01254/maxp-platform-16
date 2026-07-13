from __future__ import annotations

import asyncio

from maxp_mcp_skills.server import serve


def main() -> None:
    asyncio.run(serve())


if __name__ == "__main__":
    main()

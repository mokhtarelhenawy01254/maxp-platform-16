from __future__ import annotations

import asyncio
import contextlib
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import structlog
from mcp.server.fastmcp import FastMCP
from watchfiles import awatch

from maxp_mcp_skills.skill_resource import (
    InvalidSkillSlugError,
    SkillNotFoundError,
    load_skill_markdown,
)
from maxp_mcp_skills.skills_index import SkillsIndex, scan_skills_dir

logger = structlog.get_logger(__name__)


DEFAULT_PORT = 7101
DEFAULT_HOST = "0.0.0.0"


def _default_skills_dir() -> Path:
    env_override = os.environ.get("SKILLS_DIR")
    if env_override:
        return Path(env_override).resolve()
    return (Path(__file__).resolve().parents[4] / "ai-service" / "skills").resolve()


def _server_port() -> int:
    raw = os.environ.get("SKILLS_MCP_PORT")
    if not raw:
        return DEFAULT_PORT
    try:
        return int(raw)
    except ValueError:
        logger.warning("invalid SKILLS_MCP_PORT, falling back to default", value=raw)
        return DEFAULT_PORT


def _server_host() -> str:
    return os.environ.get("SKILLS_MCP_HOST") or DEFAULT_HOST


class SkillsServer:
    def __init__(self, skills_dir: Path) -> None:
        self.skills_dir = skills_dir.resolve()
        self.index: SkillsIndex = SkillsIndex(skills=[])
        self._stop_event: asyncio.Event = asyncio.Event()
        self._ready_event: asyncio.Event = asyncio.Event()
        self._watcher_task: asyncio.Task[None] | None = None
        self._log = logger.bind(component="skills_server", skills_dir=str(self.skills_dir))

    async def refresh(self) -> None:
        self.index = await scan_skills_dir(self.skills_dir)
        self._log.debug("index refreshed", count=len(self.index.skills))

    async def start_watcher(self, ready_timeout: float = 5.0) -> None:
        await self.refresh()
        if self._watcher_task is not None:
            return
        self._stop_event = asyncio.Event()
        self._ready_event = asyncio.Event()
        self._watcher_task = asyncio.create_task(self._watch_loop())
        try:
            await asyncio.wait_for(self._ready_event.wait(), timeout=ready_timeout)
        except TimeoutError:
            self._log.warning("watcher did not signal ready in time", timeout=ready_timeout)
        self._log.info("watcher started")

    async def stop_watcher(self) -> None:
        if self._watcher_task is None:
            return
        self._stop_event.set()
        with contextlib.suppress(asyncio.CancelledError):
            await self._watcher_task
        self._watcher_task = None
        self._log.info("watcher stopped")

    async def _watch_loop(self) -> None:
        if not self.skills_dir.exists():
            self._log.warning("skills dir missing at watcher start, polling for creation")
            while not self._stop_event.is_set():
                with contextlib.suppress(TimeoutError):
                    await asyncio.wait_for(self._stop_event.wait(), timeout=1.0)
                if self.skills_dir.exists():
                    await self.refresh()
                    break
            if self._stop_event.is_set():
                self._ready_event.set()
                return
        try:
            async for changes in awatch(
                str(self.skills_dir),
                stop_event=self._stop_event,
                recursive=True,
                debounce=300,
                step=50,
                rust_timeout=200,
                yield_on_timeout=True,
            ):
                if not self._ready_event.is_set():
                    self._ready_event.set()
                if changes:
                    await self.refresh()
        except Exception as exc:
            self._log.error("watcher crashed", error=str(exc))
            self._ready_event.set()
            raise
        finally:
            self._ready_event.set()


def create_server(
    skills_dir: Path | None = None,
    *,
    host: str | None = None,
    port: int | None = None,
) -> tuple[FastMCP, SkillsServer]:
    resolved_dir = (skills_dir or _default_skills_dir()).resolve()
    skills_state = SkillsServer(resolved_dir)

    @asynccontextmanager
    async def lifespan(_app: FastMCP) -> AsyncIterator[SkillsServer]:
        await skills_state.start_watcher()
        try:
            yield skills_state
        finally:
            await skills_state.stop_watcher()

    mcp = FastMCP(
        name="maxp-skills",
        instructions="MaxP skills catalog. Read skill://index.json to discover available skills.",
        host=host or _server_host(),
        port=port or _server_port(),
        streamable_http_path="/mcp",
        lifespan=lifespan,
    )

    @mcp.resource(
        "skill://index.json",
        name="skills-index",
        title="MaxP Skills Index",
        description="JSON index of every MaxP skill available to the agent.",
        mime_type="application/json",
    )
    async def get_skills_index() -> str:
        if not skills_state.index.skills:
            await skills_state.refresh()
        return skills_state.index.to_json()

    @mcp.resource(
        "skill://{slug}/SKILL.md",
        name="skill-markdown",
        title="MaxP Skill Body",
        description="Markdown body of a single MaxP skill, identified by its slug.",
        mime_type="text/markdown",
    )
    async def get_skill_markdown(slug: str) -> str:
        try:
            return await load_skill_markdown(skills_state.skills_dir, slug)
        except SkillNotFoundError as exc:
            raise ValueError(str(exc)) from exc
        except InvalidSkillSlugError as exc:
            raise ValueError(str(exc)) from exc

    return mcp, skills_state


async def serve(skills_dir: Path | None = None) -> None:
    mcp, state = create_server(skills_dir)
    logger.info(
        "starting skills-mcp",
        host=mcp.settings.host,
        port=mcp.settings.port,
        path=mcp.settings.streamable_http_path,
        skills_dir=str(state.skills_dir),
    )
    await mcp.run_streamable_http_async()


__all__ = [
    "DEFAULT_HOST",
    "DEFAULT_PORT",
    "SkillsServer",
    "create_server",
    "serve",
]

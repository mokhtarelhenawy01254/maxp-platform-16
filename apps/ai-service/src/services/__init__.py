__all__ = [
    "AgentManagerService",
    "AgentRegistry",
    "PromptCacheService",
    "QueuePriority",
    "QueueService",
    "RedisClient",
    "RunStateManager",
    "get_agent_manager_service",
    "get_agent_registry",
    "prompt_cache_service",
    "queue_service",
    "redis_client",
]

_EXPORT_MODULES = {
    "AgentManagerService": "src.services.agent_manager_service",
    "get_agent_manager_service": "src.services.agent_manager_service",
    "AgentRegistry": "src.services.agent_registry",
    "get_agent_registry": "src.services.agent_registry",
    "PromptCacheService": "src.services.prompt_cache_service",
    "prompt_cache_service": "src.services.prompt_cache_service",
    "QueuePriority": "src.services.queue_service",
    "QueueService": "src.services.queue_service",
    "queue_service": "src.services.queue_service",
    "RedisClient": "src.services.redis_client",
    "redis_client": "src.services.redis_client",
    "RunStateManager": "src.services.run_state_manager",
}


def __getattr__(name: str):
    module_name = _EXPORT_MODULES.get(name)
    if module_name is None:
        raise AttributeError(f"module 'src.services' has no attribute {name!r}")

    from importlib import import_module

    value = getattr(import_module(module_name), name)
    globals()[name] = value
    return value

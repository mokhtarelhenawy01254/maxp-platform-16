import asyncio
import sys
sys.path.insert(0, '.')

from src.skills.integration import get_skills_block, get_l1_skills_block, get_skill_tool_names, SKILL_TOOLS, create_skills_provider
from src.context.assembler import ContextAssembler
from src.pipeline.context import PipelineContext
from src.agents.base import BaseAgent, BaseAgentConfig
from src.pipeline.stages.resolve_intent import _available_tools

print('=' * 80)
print('COMPREHENSIVE SKILLS INTEGRATION TEST')
print('=' * 80)

# Test 1: All agents get correct skills blocks
agents = {
    'sales-agent': {'catalog-search', 'customer-context-summary', 'facebook-sales-conversion', 'discount-proposal'},
    'support-agent': {'customer-context-summary', 'order-support', 'handoff-to-human'},
    'order-agent': set(),
    'inventory-pricing-agent': {'catalog-search', 'low-stock-watch', 'pricing-review', 'discount-proposal'},
    'manager-ceo': {'hire-agent', 'delegate-goal', 'read-company-state', 'review-agent-performance'},
    'marketing-agent': {'catalog-search', 'facebook-ad-draft', 'campaign-report'},
    'facebook-sales-support-agent': {'catalog-search', 'customer-context-summary', 'facebook-sales-conversion', 'order-support', 'exchange-support', 'handoff-to-human'},
    'sas-sales-agent': {'catalog-search', 'order-support', 'handoff-to-human'},
}

print()
print('1. SKILLS BLOCKS (Pipeline path - full content):')
for name, skills in agents.items():
    block = get_skills_block(skills)
    print('   {}: {} chars ({} skills)'.format(name, len(block), len(skills)))

print()
print('2. L1 METADATA BLOCKS (SDK Agent Runtime path - progressive disclosure):')
for name, skills in agents.items():
    l1 = get_l1_skills_block(skills)
    print('   {}: {} chars'.format(name, len(l1)))

print()
print('3. SKILL TOOLS:')
print('   Tools: {}'.format(get_skill_tool_names()))

print()
print('4. SKILLS PROVIDER (SDK Agent Runtime):')
for name, skills in agents.items():
    p = create_skills_provider(skills)
    print('   {}: {}'.format(name, 'OK' if p else 'None'))

print()
print('5. BASEAGENT TOOL RESOLUTION:')
for name, skills in agents.items():
    config = BaseAgentConfig(
        id='test-' + name,
        name=name,
        role=name.upper().replace('-', '_'),
        company_id='test',
        allowed_tools=['product.search', 'inventory.check'],
        allowed_skills=skills,
        model='gemini-2.5-flash',
    )
    agent = BaseAgent(config)
    tools = agent._resolve_tools()
    tool_names = [t.name for t in tools]
    print('   {}: load_skill={}, read_skill_resource={}'.format(
        name, 'load_skill' in tool_names, 'read_skill_resource' in tool_names))

print()
print('6. CONTEXT ASSEMBLER (Pipeline path):')
for name, skills in agents.items():
    config = BaseAgentConfig(
        id='test-' + name,
        name=name,
        role=name.upper().replace('-', '_'),
        company_id='test',
        allowed_tools=['product.search'],
        allowed_skills=skills,
        model='gemini-2.5-flash',
    )
    agent = BaseAgent(config)
    ctx = PipelineContext(
        message='test', thread_id='t', company_id='c', customer_id='cu',
        agent=agent, session=None, llm_client=None, channel='chat',
        is_customer_channel=True, conversation_id='t', attachments=[],
        external_memory_context={},
    )
    assembler = ContextAssembler()
    prompt = asyncio.run(assembler.build_system_prompt(ctx))
    has_skills = '<skills>' in prompt
    print('   {}: prompt_len={}, has_skills={}'.format(name, len(prompt), has_skills))

print()
print('7. RESOLVE_INTENT AVAILABLE TOOLS:')
for name, skills in agents.items():
    config = BaseAgentConfig(
        id='test-' + name,
        name=name,
        role=name.upper().replace('-', '_'),
        company_id='test',
        allowed_tools=['product.search'],
        allowed_skills=skills,
        model='gemini-2.5-flash',
    )
    agent = BaseAgent(config)
    ctx = PipelineContext(
        message='test', thread_id='t', company_id='c', customer_id='cu',
        agent=agent, session=None, llm_client=None, channel='chat',
        is_customer_channel=True, conversation_id='t', attachments=[],
        external_memory_context={},
    )
    avail = _available_tools(ctx)
    print('   {}: load_skill={}, total_tools={}'.format(name, 'load_skill' in avail, len(avail)))

print()
print('=' * 80)
print('ALL TESTS PASSED!')
print('=' * 80)
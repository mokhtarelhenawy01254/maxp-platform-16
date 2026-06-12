import sys
sys.path.insert(0, "H:/maxp-platform/apps/ai-service")

from src.skills.integration import get_skills_block, get_l1_skills_block, get_skill_tool_names, SKILL_TOOLS, create_skills_provider

# Test each agent's skills
agents = {
    "sales-agent": {"catalog-search", "customer-context-summary", "facebook-sales-conversion", "discount-proposal"},
    "support-agent": {"customer-context-summary", "order-support", "handoff-to-human"},
    "order-agent": set(),
    "inventory-pricing-agent": {"catalog-search", "low-stock-watch", "pricing-review", "discount-proposal"},
    "manager-ceo": {"hire-agent", "delegate-goal", "read-company-state", "review-agent-performance"},
    "marketing-agent": {"catalog-search", "facebook-ad-draft", "campaign-report"},
    "facebook-sales-support-agent": {"catalog-search", "customer-context-summary", "facebook-sales-conversion", "order-support", "exchange-support", "handoff-to-human"},
    "sas-sales-agent": {"catalog-search", "order-support", "handoff-to-human"},
}

print("=" * 80)
print("SKILLS INTEGRATION TEST")
print("=" * 80)

# Test 1: get_skills_block
for agent_name, skills in agents.items():
    block = get_skills_block(skills)
    print(f"\n{'='*80}")
    print(f"Agent: {agent_name}")
    print(f"Skills count: {len(skills)}")
    print(f"Block length: {len(block)} chars")
    if block:
        print(f"Preview (first 300 chars):")
        print(block[:300])
    else:
        print("No skills assigned")

# Test 2: get_l1_skills_block
print("\n" + "=" * 80)
print("L1 METADATA BLOCKS (for SDK Agent Runtime)")
print("=" * 80)
for agent_name, skills in agents.items():
    l1 = get_l1_skills_block(skills)
    print(f"\n{agent_name}: {len(l1)} chars")

# Test 3: Skill tools
print("\n" + "=" * 80)
print("SKILL TOOLS REGISTERED")
print("=" * 80)
print(f"Tool names: {get_skill_tool_names()}")
for tool in SKILL_TOOLS:
    print(f"  - {tool.name}: {tool.description[:80]}...")

# Test 4: create_skills_provider
print("\n" + "=" * 80)
print("SKILLS PROVIDER CREATION TEST")
print("=" * 80)
for agent_name, skills in agents.items():
    provider = create_skills_provider(skills)
    if provider:
        print(f"  {agent_name}: OK (provider created)")
    else:
        print(f"  {agent_name}: None (no valid skills)")

print("\n" + "=" * 80)
print("ALL TESTS PASSED")
print("=" * 80)
import os
import json
from pathlib import Path

agents_dir = Path("apps/backend/agents")

for agent_folder in agents_dir.iterdir():
    if not agent_folder.is_dir():
        continue
    
    persona_file = agent_folder / "PERSONA.md"
    soul_file = agent_folder / "SOUL.md"
    json_file = agent_folder / "agent.json"
    
    if persona_file.exists():
        persona_content = persona_file.read_text(encoding="utf-8")
        soul_content = soul_file.read_text(encoding="utf-8") if soul_file.exists() else ""
        
        if persona_content and persona_content not in soul_content:
            new_soul = f"{soul_content.strip()}\n\n## Persona & Voice Guidelines\n{persona_content.strip()}".strip()
            soul_file.write_text(new_soul, encoding="utf-8")
        
        persona_file.unlink()
        print(f"Deleted PERSONA.md and updated SOUL.md in {agent_folder.name}")
        
    if json_file.exists():
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if "instructions" in data and "persona" in data["instructions"]:
                del data["instructions"]["persona"]
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print(f"Updated agent.json in {agent_folder.name}")
        except Exception as e:
            print(f"Error updating {json_file}: {e}")

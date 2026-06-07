import os
import re

def fix_ai_agent_imports(root_dir, old_relative_pattern, new_relative_pattern):
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith('.js'):
                filepath = os.path.join(dirpath, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    pattern = r"require\(['\"]([^'\"]+)['\"]\)"
                    
                    def replace_func(match):
                        import_path = match.group(1)
                        
                        # If the import points to aiAgent but is not already pointing to legacy-ai-agent
                        if 'aiAgent' in import_path and 'legacy-ai-agent' not in import_path:
                            # Check if it's a relative path
                            if import_path.startswith('.'):
                                # We need to redirect it to legacy-ai-agent/aiAgent
                                # E.g., '../aiAgent/...' -> '../../legacy-ai-agent/aiAgent/...'
                                
                                # Find the laest slash to identify the depth
                                parts = import_path.split('/')
                                # If it's '../aiAgent/something'
                                if 'aiAgent' in parts:
                                    idx = parts.index('aiAgent')
                                    # The parts before aiAgent are the 'ups'
                                    ups = parts[:idx]
                                    # The parts after are the internal paths
                                    internals = parts[idx+1:]
                                    
                                    # To get to legacy-ai-agent from wherever we are:
                                    # 1. Go up to apps/backend (same as before)
                                    # 2. Go into legacy-ai-agent/aiAgent
                                    
                                    # Current logic: replace 'aiAgent' with 'legacy-ai-agent/aiAgent'
                                    # And if it was '../aiAgent', it becomes '../legacy-ai-agent/aiAgent'
                                    # BUT, if the file was in services/rag, '../aiAgent' pointed to services/aiAgent.
                                    # Now it should be '../../legacy-ai-agent/aiAgent'
                                    
                                    # Let's just do a simple replacement of 'aiAgent' -> 'legacy-ai-agent/aiAgent'
                                    # and then adjust the 'ups' if necessary.
                                    
                                    # If it was '../aiAgent', it should now be '../../legacy-ai-agent/aiAgent'
                                    # because legacy-ai-agent is at the root of apps/backend.
                                    
                                    new_path = import_path.replace('aiAgent', 'legacy-ai-agent/aiAgent')
                                    
                                    # If it's a relative path that pointed to services/aiAgent, 
                                    # it needs one more '..' to reach apps/backend before going into legacy-ai-agent
                                    if '..' in new_path:
                                        # This is a heuristic: if it's relative and points to the AI agent, 
                                        # it likely needs to go up one more level.
                                        new_path = '../' + new_path
                                        
                                    return f"require('{new_path}')"
                        
                        return match.group(0)

                    new_content = re.sub(pattern, replace_func, content)
                    
                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed: {filepath}")
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")

if __name__ == '__main__':
    root = r'H:\maxp-platform\apps\backend'
    fix_ai_agent_imports(root, None, None)

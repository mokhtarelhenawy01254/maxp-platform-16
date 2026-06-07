import os

root_dir = r'H:\maxp-platform\apps\backend\legacy-ai-agent'
target_file = r'H:\maxp-platform\apps\backend\services\sharedDatabase.js'

def get_relative_path(start_path, end_path):
    start_dir = os.path.dirname(start_path)
    end_dir = os.path.dirname(end_path)
    
    # Find common prefix
    start_parts = start_dir.split(os.sep)
    end_parts = end_dir.split(os.sep)
    
    i = 0
    while i < len(start_parts) and i < len(end_parts) and start_parts[i] == end_parts[i]:
        i += 1
    
    # Go up from start_dir to the common prefix
    ups = ['..' for _ in range(len(start_parts) - i)]
    
    # Go down from common prefix to end_dir
    downs = end_parts[i:]
    
    rel_path = os.path.join(*ups, *downs) if ups or downs else '.'
    return rel_path

for dirpath, _, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith('.js'):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if 'sharedDatabase' in content:
                    # Find all require paths containing sharedDatabase
                    import re
                    pattern = r"require\(['\"]([^'\"]*sharedDatabase[^'\"]*)['\"]\)"
                    matches = re.findall(pattern, content)
                    
                    new_content = content
                    for match in matches:
                        # We only care about relative paths
                        if match.startswith('.'):
                            rel_path = get_relative_path(filepath, target_file)
                            # Ensure it ends with the filename if it doesn't
                            if not rel_path.endswith('sharedDatabase'):
                                rel_path = os.path.join(rel_path, 'sharedDatabase')
                            
                            new_content = new_content.replace(match, rel_path)
                    
                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed sharedDatabase in: {filepath}")
            except Exception as e:
                print(f"Error processing {filepath}: {e}")

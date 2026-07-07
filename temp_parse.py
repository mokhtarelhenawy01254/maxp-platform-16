import re, json, sys
with open(sys.argv[1]) as f:
    for line in f:
        if 'Full result' in line:
            m = re.search(r'{.*', line)
            if m:
                d = json.loads(m.group())
                msg = d['choices'][0]['message']
                imgs = msg.get('images')
                print('value:', repr(imgs))
                print('type:', type(imgs).__name__)
                if imgs:
                    if isinstance(imgs, list):
                        print('first:', json.dumps(imgs[0])[:500])
                else:
                    # check all non-null keys
                    non_null = {k: v for k, v in msg.items() if v is not None and k != 'reasoning_details'}
                    print('non-null keys:', list(non_null.keys()))
                    for k, v in non_null.items():
                        sv = str(v)
                        print(f'  {k}: {sv[:200]}')
                break

#!/usr/bin/env python3
import sys
import json
import requests

def check_image(image_path, api_user, api_secret):
    try:
        with open(image_path, 'rb') as f:
            response = requests.post(
                'https://api.sightengine.com/1.0/check.json',
                files={'media': f},
                data={
                    'models': 'nudity-2.0,violence,offensive',
                    'api_user': api_user,
                    'api_secret': api_secret
                },
                timeout=10
            )
        result = response.json()

        nudity   = result.get('nudity', {})
        violence = result.get('violence', {}).get('prob', 0)
        offensive = result.get('offensive', {}).get('prob', 0)

        if nudity.get('sexual_activity', 0) > 0.5 or nudity.get('sexual_display', 0) > 0.5:
            print(json.dumps({'safe': False, 'reason': 'conteúdo sexual detectado'}))
            return
        if nudity.get('erotica', 0) > 0.7:
            print(json.dumps({'safe': False, 'reason': 'conteúdo sexual detectado'}))
            return
        if violence > 0.7:
            print(json.dumps({'safe': False, 'reason': 'conteúdo violento detectado'}))
            return
        if offensive > 0.7:
            print(json.dumps({'safe': False, 'reason': 'conteúdo ofensivo detectado'}))
            return

        print(json.dumps({'safe': True, 'reason': ''}))

    except Exception:
        print(json.dumps({'safe': True, 'reason': ''}))

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(json.dumps({'safe': True, 'reason': ''}))
        sys.exit(0)
    check_image(sys.argv[1], sys.argv[2], sys.argv[3])

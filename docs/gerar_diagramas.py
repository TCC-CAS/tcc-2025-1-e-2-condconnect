"""
Lê os 4 arquivos .puml, renderiza via API do plantuml.com e salva
duas imagens combinadas lado a lado — sem precisar baixar nada além
de Pillow (pip install Pillow).

Execute na pasta docs/:
    python gerar_diagramas.py
"""

import zlib
import urllib.request
import io
import os

# ── tenta importar Pillow; instrui se faltar ────────────────────────────────
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow não está instalado. Execute:\n  pip install Pillow\ne rode o script novamente.")
    raise SystemExit(1)


# ── Codificação PlantUML (deflate + base64 customizado) ─────────────────────

def _encode6(b: int) -> str:
    if b < 10:  return chr(48 + b)
    b -= 10
    if b < 26:  return chr(65 + b)
    b -= 26
    if b < 26:  return chr(97 + b)
    b -= 26
    return '-' if b == 0 else '_'


def _append3(b1: int, b2: int, b3: int) -> str:
    c1 =  b1 >> 2
    c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
    c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
    c4 =  b3 & 0x3F
    return _encode6(c1) + _encode6(c2) + _encode6(c3) + _encode6(c4)


def plantuml_encode(text: str) -> str:
    data = zlib.compress(text.encode('utf-8'))
    out, i = '', 0
    while i < len(data):
        b1 = data[i]
        b2 = data[i + 1] if i + 1 < len(data) else 0
        b3 = data[i + 2] if i + 2 < len(data) else 0
        chunk = _append3(b1, b2, b3)
        if i + 2 >= len(data):
            chunk = chunk[: 2 + (1 if i + 1 < len(data) else 0)]
        out += chunk
        i += 3
    return out


# ── Download do PNG via API ──────────────────────────────────────────────────

def render_puml(puml_text: str) -> Image.Image:
    encoded = plantuml_encode(puml_text)
    url = f'https://www.plantuml.com/plantuml/png/{encoded}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Python/urllib'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return Image.open(io.BytesIO(resp.read())).convert('RGB')


# ── Leitura dos .puml ────────────────────────────────────────────────────────

BASE = os.path.dirname(os.path.abspath(__file__))

def read(filename: str) -> str:
    with open(os.path.join(BASE, filename), encoding='utf-8') as f:
        return f.read()


# ── Combinar lado a lado com faixa de título ─────────────────────────────────

PADDING  = 50
MARGIN   = 30
TITLE_H  = 50
TITLE_BG = (27, 79, 138)
TITLE_FG = (255, 255, 255)
BG       = (255, 255, 255)


def _add_title(img: Image.Image, text: str) -> Image.Image:
    w, h = img.size
    out  = Image.new('RGB', (w, h + TITLE_H), BG)
    draw = ImageDraw.Draw(out)
    draw.rectangle([0, 0, w, TITLE_H], fill=TITLE_BG)
    try:
        font = ImageFont.truetype("arial.ttf", 22)
    except OSError:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((w - tw) // 2, (TITLE_H - th) // 2), text, fill=TITLE_FG, font=font)
    out.paste(img, (0, TITLE_H))
    return out


def combine(left: Image.Image, right: Image.Image, out_path: str) -> None:
    # iguala alturas
    th = max(left.height, right.height)
    def fit(img):
        r = th / img.height
        return img.resize((int(img.width * r), th), Image.LANCZOS)
    left, right = fit(left), fit(right)

    W = MARGIN + left.width + PADDING + right.width + MARGIN
    H = MARGIN + th + MARGIN
    canvas = Image.new('RGB', (W, H), BG)
    canvas.paste(left,  (MARGIN, MARGIN))
    canvas.paste(right, (MARGIN + left.width + PADDING, MARGIN))
    canvas.save(out_path, dpi=(300, 300))
    print(f'  Salvo → {out_path}')


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    files = {
        'morador':       'uc_morador.puml',
        'comprador':     'uc_comprador.puml',
        'vendedor':      'uc_vendedor.puml',
        'administrador': 'uc_administrador.puml',
    }
    labels = {
        'morador':       'Casos de Uso — Morador',
        'comprador':     'Casos de Uso — Comprador (papel do Morador)',
        'vendedor':      'Casos de Uso — Vendedor (papel do Morador)',
        'administrador': 'Casos de Uso — Administrador',
    }

    imgs = {}
    for key, fname in files.items():
        print(f'Renderizando {fname}...')
        raw  = render_puml(read(fname))
        imgs[key] = _add_title(raw, labels[key])

    print('\nCombinando imagens...')

    combine(
        imgs['morador'], imgs['comprador'],
        os.path.join(BASE, 'uc_morador_comprador.png')
    )
    combine(
        imgs['vendedor'], imgs['administrador'],
        os.path.join(BASE, 'uc_vendedor_administrador.png')
    )

    print('\nPronto! Arquivos gerados na pasta docs/')

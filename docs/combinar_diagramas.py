"""
Combina os 4 diagramas de casos de uso em 2 imagens:
  - imagem1: Morador + Comprador (lado a lado)
  - imagem2: Vendedor + Administrador (lado a lado)

Como usar:
  1. Acesse https://www.plantuml.com/plantuml/uml/
  2. Cole cada .puml e baixe o PNG com o nome:
       uc_morador.png
       uc_comprador.png
       uc_vendedor.png
       uc_administrador.png
  3. Coloque os 4 PNGs na mesma pasta deste script
  4. Execute:  python combinar_diagramas.py
  5. Os arquivos gerados serão:
       uc_morador_comprador.png
       uc_vendedor_administrador.png

Instale Pillow se necessário:  pip install Pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

PADDING   = 40   # espaço entre os dois diagramas
BORDER    = 20   # margem externa
BG_COLOR  = (255, 255, 255)
LABEL_H   = 48   # altura da faixa de título
LABEL_BG  = (27, 79, 138)   # azul escuro
LABEL_FG  = (255, 255, 255)


def add_label(img: Image.Image, text: str) -> Image.Image:
    """Adiciona uma faixa de título colorida no topo da imagem."""
    w, h = img.size
    new = Image.new("RGB", (w, h + LABEL_H), BG_COLOR)
    # faixa azul
    draw = ImageDraw.Draw(new)
    draw.rectangle([0, 0, w, LABEL_H], fill=LABEL_BG)
    # texto centralizado
    try:
        font = ImageFont.truetype("arial.ttf", 22)
    except OSError:
        font = ImageFont.load_default()
    bbox  = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((w - tw) // 2, (LABEL_H - th) // 2), text, fill=LABEL_FG, font=font)
    new.paste(img, (0, LABEL_H))
    return new


def combine_side_by_side(left: Image.Image, right: Image.Image,
                          output_path: str) -> None:
    """Junta duas imagens lado a lado com mesma altura."""
    # iguala altura — proporcional
    target_h = max(left.height, right.height)
    def resize_to_height(img, h):
        ratio = h / img.height
        return img.resize((int(img.width * ratio), h), Image.LANCZOS)

    left  = resize_to_height(left,  target_h)
    right = resize_to_height(right, target_h)

    total_w = left.width + PADDING + right.width + BORDER * 2
    total_h = target_h + BORDER * 2

    canvas = Image.new("RGB", (total_w, total_h), BG_COLOR)
    canvas.paste(left,  (BORDER, BORDER))
    canvas.paste(right, (BORDER + left.width + PADDING, BORDER))
    canvas.save(output_path, dpi=(300, 300))
    print(f"Salvo: {output_path}")


def load(filename: str) -> Image.Image:
    path = os.path.join(os.path.dirname(__file__), filename)
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"\nArquivo não encontrado: {path}\n"
            "Baixe o PNG do plantuml.com e coloque nesta pasta."
        )
    return Image.open(path).convert("RGB")


if __name__ == "__main__":
    base = os.path.dirname(__file__)

    # ── Imagem 1: Morador + Comprador ────────────────────────────────────────
    morador   = add_label(load("uc_morador.png"),   "Casos de Uso — Morador")
    comprador = add_label(load("uc_comprador.png"), "Casos de Uso — Comprador")
    combine_side_by_side(
        morador, comprador,
        os.path.join(base, "uc_morador_comprador.png")
    )

    # ── Imagem 2: Vendedor + Administrador ───────────────────────────────────
    vendedor = add_label(load("uc_vendedor.png"),       "Casos de Uso — Vendedor")
    admin    = add_label(load("uc_administrador.png"),  "Casos de Uso — Administrador")
    combine_side_by_side(
        vendedor, admin,
        os.path.join(base, "uc_vendedor_administrador.png")
    )

    print("\nPronto! Arquivos gerados na pasta docs/")

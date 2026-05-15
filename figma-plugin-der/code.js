// ══════════════════════════════════════════════════════════════
//  Plugin Figma — DER CondConnect
//  Gera o Diagrama Entidade-Relacionamento completo do sistema
// ══════════════════════════════════════════════════════════════

const DARK   = { r: 0.176, g: 0.216, b: 0.282 }; // #2d3748
const GRAY   = { r: 0.333, g: 0.333, b: 0.333 }; // #555
const WHITE  = { r: 1,     g: 1,     b: 1     };
const BLACK  = { r: 0.102, g: 0.125, b: 0.173 }; // #1a202c
const GRAY2  = { r: 0.2,   g: 0.2,   b: 0.2   };
const LGRAY  = { r: 0.972, g: 0.980, b: 0.988 }; // #f8fafc
const BORDER = { r: 0.784, g: 0.835, b: 0.878 }; // #cbd5e0

(async () => {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  // ── Frame principal ────────────────────────────────────────
  const frame = figma.createFrame();
  frame.name  = "DER — CondConnect";
  frame.resize(1420, 760);
  frame.fills = [{ type: "SOLID", color: WHITE }];
  frame.clipsContent = false;

  // ── Helpers ────────────────────────────────────────────────

  function append(node) { frame.appendChild(node); return node; }

  // Texto centralizado em (cx, cy)
  function txt(cx, cy, str, size, bold, color) {
    const t = figma.createText();
    t.fontName   = { family: "Inter", style: bold ? "Bold" : "Regular" };
    t.fontSize   = size;
    t.characters = str;
    t.fills      = [{ type: "SOLID", color: color || BLACK }];
    t.x = cx - t.width  / 2;
    t.y = cy - t.height / 2;
    return append(t);
  }

  // Texto alinhado à esquerda com ponto de origem (x, cy)
  function txtL(x, cy, str, size, bold, color) {
    const t = figma.createText();
    t.fontName   = { family: "Inter", style: bold ? "Bold" : "Regular" };
    t.fontSize   = size;
    t.characters = str;
    t.fills      = [{ type: "SOLID", color: color || BLACK }];
    t.x = x;
    t.y = cy - t.height / 2;
    return append(t);
  }

  // Retângulo
  function rect(x, y, w, h, fill, stroke, sw) {
    const r = figma.createRectangle();
    r.x = x; r.y = y;
    r.resize(w, h);
    r.fills   = fill   ? [{ type: "SOLID", color: fill }]   : [];
    r.strokes = stroke ? [{ type: "SOLID", color: stroke }] : [];
    r.strokeWeight = sw || 2;
    return append(r);
  }

  // Elipse
  function ell(cx, cy, rx, ry, fill, stroke) {
    const e = figma.createEllipse();
    e.x = cx - rx; e.y = cy - ry;
    e.resize(rx * 2, ry * 2);
    e.fills   = fill   ? [{ type: "SOLID", color: fill }]   : [];
    e.strokes = stroke ? [{ type: "SOLID", color: stroke }] : [];
    e.strokeWeight = 1.2;
    return append(e);
  }

  // Losango (relacionamento)
  function diamond(cx, cy, hw, hh, fill, stroke) {
    const v = figma.createVector();
    v.vectorPaths = [{
      windingRule: "NONZERO",
      data: `M ${cx} ${cy - hh} L ${cx + hw} ${cy} L ${cx} ${cy + hh} L ${cx - hw} ${cy} Z`
    }];
    v.fills   = [{ type: "SOLID", color: fill || WHITE }];
    v.strokes = stroke ? [{ type: "SOLID", color: stroke }] : [];
    v.strokeWeight = 2;
    return append(v);
  }

  // Linha de atributo (fina, cinza)
  function attrLine(x1, y1, x2, y2) {
    const v = figma.createVector();
    v.vectorPaths = [{ windingRule: "NONZERO", data: `M ${x1} ${y1} L ${x2} ${y2}` }];
    v.fills       = [];
    v.strokes     = [{ type: "SOLID", color: GRAY }];
    v.strokeWeight = 1.2;
    return append(v);
  }

  // Linha de relacionamento (grossa, escura)
  function relLine(x1, y1, x2, y2) {
    const v = figma.createVector();
    v.vectorPaths = [{ windingRule: "NONZERO", data: `M ${x1} ${y1} L ${x2} ${y2}` }];
    v.fills       = [];
    v.strokes     = [{ type: "SOLID", color: DARK }];
    v.strokeWeight = 1.4;
    return append(v);
  }

  // Entidade: retângulo com nome
  function entity(cx, cy, w, h, name) {
    rect(cx - w / 2, cy - h / 2, w, h, WHITE, DARK, 2);
    txt(cx, cy, name, 12, true, BLACK);
  }

  // Atributo: elipse com label + linha conectora
  function attr(ex, ey, lx, ly, label, pk) {
    attrLine(ex, ey, lx, ly);
    const rx = Math.max(label.length * 3.2 + 4, 16);
    if (pk) {
      ell(lx, ly, rx, 14, DARK, DARK);
      txt(lx, ly, label, 10, false, WHITE);
    } else {
      ell(lx, ly, rx, 13, WHITE, GRAY);
      txt(lx, ly, label, 10, false, BLACK);
    }
  }

  // Rótulo de cardinalidade
  function card(x, y, label) {
    txtL(x, y, label, 10, true, GRAY2);
  }

  // ════════════════════════════════════════════════════════════
  //  TÍTULO
  // ════════════════════════════════════════════════════════════
  txt(710, 22, "Diagrama Entidade-Relacionamento (DER) — CondConnect", 13, true, BLACK);

  // ════════════════════════════════════════════════════════════
  //  ENTIDADE: Produto   cx=210 cy=295
  // ════════════════════════════════════════════════════════════
  entity(210, 295, 124, 36, "Produto");

  attr(210, 277, 210, 180, "id_produto", true);
  attr(185, 278, 107, 185, "titulo",          false);
  attr(160, 285,  44, 228, "descricao",       false);
  attr(148, 295,  24, 295, "categoria",       false);
  attr(155, 308,  42, 352, "preco",           false);
  attr(175, 313, 105, 390, "condicao",        false);
  attr(210, 313, 210, 400, "status",          false);
  attr(240, 277, 316, 184, "data_publicacao", false);

  // ════════════════════════════════════════════════════════════
  //  RELACIONAMENTO: vende   cx=470 cy=295
  // ════════════════════════════════════════════════════════════
  relLine(272, 295, 426, 295);
  card(310, 287, "(1,n)");
  diamond(470, 295, 44, 22, WHITE, DARK);
  txt(470, 295, "vende", 11, false, BLACK);

  // ════════════════════════════════════════════════════════════
  //  ENTIDADE: Usuario   cx=700 cy=295
  // ════════════════════════════════════════════════════════════
  relLine(514, 295, 638, 295);
  card(564, 287, "(1,n)");
  entity(700, 295, 124, 36, "Usuario");

  attr(700, 277, 700, 180, "id_usuario",  true);
  attr(722, 278, 800, 192, "nome",        false);
  attr(762, 285, 882, 228, "email",       false);
  attr(762, 295, 904, 295, "senha",       false);
  attr(756, 307, 882, 358, "foto_url",    false);
  attr(736, 313, 814, 396, "papel",       false);
  attr(700, 313, 700, 408, "pix_key",     false);
  attr(668, 312, 594, 390, "rating",      false);
  attr(648, 277, 553, 190, "data_criacao",false);

  // ════════════════════════════════════════════════════════════
  //  RELACIONAMENTO: favorita   cx=960 cy=170
  // ════════════════════════════════════════════════════════════
  relLine(762, 282, 914, 170);
  card(862, 210, "(1,n)");
  relLine(272, 283, 914, 170);
  card(590, 220, "(1,n)");
  diamond(960, 170, 46, 22, WHITE, DARK);
  txt(960, 170, "favorita", 11, false, BLACK);

  // ════════════════════════════════════════════════════════════
  //  ENTIDADE: Favorito   cx=1150 cy=170
  // ════════════════════════════════════════════════════════════
  relLine(1006, 170, 1088, 170);
  card(1034, 162, "(1,n)");
  entity(1150, 170, 124, 36, "Favorito");

  attr(1150, 152, 1150,  95, "id",         true);
  attr(1212, 162, 1312, 128, "data_adicao", false);

  // ════════════════════════════════════════════════════════════
  //  RELACIONAMENTO: notifica   cx=960 cy=435
  // ════════════════════════════════════════════════════════════
  relLine(762, 305, 914, 435);
  card(854, 360, "(1,n)");
  diamond(960, 435, 46, 22, WHITE, DARK);
  txt(960, 435, "notifica", 11, false, BLACK);

  // ════════════════════════════════════════════════════════════
  //  ENTIDADE: Notificacao   cx=1150 cy=435
  // ════════════════════════════════════════════════════════════
  relLine(1006, 435, 1082, 435);
  card(1030, 427, "(1,n)");
  entity(1150, 435, 136, 36, "Notificacao");

  attr(1150, 417, 1150, 359, "id",         true);
  attr(1218, 424, 1328, 391, "titulo",     false);
  attr(1218, 435, 1334, 435, "mensagem",   false);
  attr(1218, 447, 1322, 478, "lida",       false);
  attr(1188, 453, 1242, 522, "data_envio", false);

  // ════════════════════════════════════════════════════════════
  //  RELACIONAMENTO: possui   cx=165 cy=445
  // ════════════════════════════════════════════════════════════
  relLine(170, 313, 165, 423);
  card(145, 375, "(1,n)");
  diamond(165, 445, 44, 22, WHITE, DARK);
  txt(165, 445, "possui", 11, false, BLACK);

  // ════════════════════════════════════════════════════════════
  //  ENTIDADE: Imagem_Produto   cx=115 cy=605
  // ════════════════════════════════════════════════════════════
  relLine(165, 467, 130, 587);
  card(120, 530, "(1,n)");
  entity(115, 605, 148, 36, "Imagem_Produto");

  attr( 70, 600,  22, 544, "id",          true);
  attr( 80, 623,  42, 678, "url_imagem",  false);
  attr(150, 623, 168, 678, "principal",   false);

  // ════════════════════════════════════════════════════════════
  //  RELACIONAMENTO: negocia   cx=360 cy=445
  // ════════════════════════════════════════════════════════════
  relLine(230, 310, 330, 430);
  card(262, 375, "(1,n)");
  relLine(650, 308, 404, 445);
  card(520, 375, "(1,n)");
  diamond(360, 445, 44, 22, WHITE, DARK);
  txt(360, 445, "negocia", 11, false, BLACK);

  // ════════════════════════════════════════════════════════════
  //  ENTIDADE: Proposta   cx=335 cy=605
  // ════════════════════════════════════════════════════════════
  relLine(360, 467, 345, 587);
  card(325, 530, "(1,n)");
  entity(335, 605, 124, 36, "Proposta");

  attr(285, 597, 242, 541, "id",            true);
  attr(290, 623, 243, 678, "valor",         false);
  attr(335, 623, 335, 678, "quantidade",    false);
  attr(370, 623, 406, 678, "status",        false);
  attr(388, 597, 443, 541, "data_proposta", false);

  // ════════════════════════════════════════════════════════════
  //  RELACIONAMENTO: adiciona (carrinho)   cx=555 cy=445
  // ════════════════════════════════════════════════════════════
  relLine(260, 298, 511, 443);
  card(370, 360, "(1,n)");
  relLine(642, 305, 599, 445);
  card(604, 370, "(1,n)");
  diamond(555, 445, 44, 22, WHITE, DARK);
  txt(555, 441, "adiciona", 10, false, BLACK);
  txt(555, 453, "carrinho",  9, false, { r: 0.33, g: 0.33, b: 0.33 });

  // ════════════════════════════════════════════════════════════
  //  ENTIDADE: Itens_Carrinho   cx=555 cy=605
  // ════════════════════════════════════════════════════════════
  relLine(555, 467, 555, 587);
  card(560, 530, "(1,n)");
  entity(555, 605, 148, 36, "Itens_Carrinho");

  attr(490, 597, 452, 541, "id",               true);
  attr(555, 623, 555, 679, "preco_negociado",   false);

  // ════════════════════════════════════════════════════════════
  //  RELACIONAMENTO: realiza   cx=740 cy=445
  // ════════════════════════════════════════════════════════════
  relLine(700, 313, 740, 423);
  card(695, 370, "(1,n)");
  relLine(262, 292, 696, 443);
  card(456, 345, "(1,n)");
  diamond(740, 445, 44, 22, WHITE, DARK);
  txt(740, 445, "realiza", 11, false, BLACK);

  // ════════════════════════════════════════════════════════════
  //  ENTIDADE: Pedido   cx=740 cy=605
  // ════════════════════════════════════════════════════════════
  relLine(740, 467, 740, 587);
  card(745, 530, "(1,n)");
  entity(740, 605, 124, 36, "Pedido");

  attr(686, 597, 642, 541, "id",          true);
  attr(700, 623, 655, 678, "status",      false);
  attr(740, 623, 740, 679, "data_pedido", false);
  attr(780, 623, 820, 678, "valor",       false);

  // ════════════════════════════════════════════════════════════
  //  RELACIONAMENTO: avalia   cx=930 cy=445
  // ════════════════════════════════════════════════════════════
  relLine(756, 310, 886, 445);
  card(836, 375, "(1,n)");
  relLine(262, 290, 886, 443);
  card(560, 310, "(1,n)");
  diamond(930, 445, 44, 22, WHITE, DARK);
  txt(930, 445, "avalia", 11, false, BLACK);

  // ════════════════════════════════════════════════════════════
  //  ENTIDADE: Avaliacao   cx=940 cy=605
  // ════════════════════════════════════════════════════════════
  relLine(930, 467, 938, 587);
  card(942, 530, "(1,n)");
  entity(940, 605, 124, 36, "Avaliacao");

  attr(886, 597, 840, 541, "id",             true);
  attr(900, 623, 858, 678, "nota",           false);
  attr(940, 623, 940, 679, "comentario",     false);
  attr(990, 613,1058, 662, "data_avaliacao", false);

  // ════════════════════════════════════════════════════════════
  //  LEGENDA
  // ════════════════════════════════════════════════════════════
  rect(1136, 548, 272, 175, LGRAY, BORDER, 1);
  txt(1272, 566, "Legenda", 10, true, { r: 0.267, g: 0.267, b: 0.267 });

  // — Entidade
  rect(1150, 573, 30, 16, WHITE, DARK, 2);
  txtL(1192, 581, "— Entidade", 10, false, GRAY2);

  // — Relacionamento
  diamond(1165, 611, 13, 12, WHITE, DARK);
  txtL(1192, 611, "— Relacionamento", 10, false, GRAY2);

  // — Atributo Chave
  ell(1165, 638, 17, 10, DARK, DARK);
  txtL(1192, 638, "— Atributo Chave (PK)", 10, false, GRAY2);

  // — Atributo Regular
  ell(1165, 662, 17, 10, WHITE, GRAY);
  txtL(1192, 662, "— Atributo Regular", 10, false, GRAY2);

  // — Cardinalidades
  txtL(1152, 685, "(1,n)  — Um para Muitos", 10, false, DARK);
  txtL(1152, 705, "(1,1)  — Um para Um",     10, false, DARK);

  // ── Finalizar ──────────────────────────────────────────────
  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
  figma.closePlugin("✅ DER CondConnect gerado com sucesso!");
})().catch(err => figma.closePlugin("❌ Erro: " + err.message));

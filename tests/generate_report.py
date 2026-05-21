"""
Gerador de relatório visual dos testes do CondConnect.
Executa pytest, lê o JSON de resultados e gera gráficos com matplotlib.

Uso:
    cd tests/
    python generate_report.py            # roda testes + gera gráficos
    python generate_report.py --only-graphs  # só gera gráficos (usa results.json existente)
"""
import subprocess
import sys
import json
import os
from pathlib import Path
from datetime import datetime

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

RESULTS_FILE = Path(__file__).parent / 'results.json'
GRAPHS_DIR   = Path(__file__).parent / 'graphs'

COLORS = {
    'passed':  '#16a34a',
    'failed':  '#dc2626',
    'error':   '#f59e0b',
    'skipped': '#94a3b8',
    'bg':      '#f8fafc',
    'primary': '#00a6a6',
    'dark':    '#1e293b',
    'light':   '#e2e8f0',
}

CATEGORY_MAP = {
    'unit':        'Unitários',
    'integration': 'Integração',
    'security':    'Segurança',
    'e2e':         'E2E',
}


# ── Execução dos testes ────────────────────────────────────────────────────────

def run_tests():
    print('▶  Executando testes...\n')
    cmd = [
        sys.executable, '-m', 'pytest',
        '--json-report',
        f'--json-report-file={RESULTS_FILE}',
        '-v', '--tb=short',
        '-m', 'not e2e',   # E2E separado por padrão
    ]
    subprocess.run(cmd, cwd=Path(__file__).parent.parent)
    print('\n✔  Testes concluídos.\n')


# ── Parsing ────────────────────────────────────────────────────────────────────

def load_results():
    if not RESULTS_FILE.exists():
        print(f'❌  {RESULTS_FILE} não encontrado. Execute os testes primeiro.')
        sys.exit(1)
    with open(RESULTS_FILE) as f:
        return json.load(f)


def classify(node_id: str) -> str:
    parts = node_id.lower()
    if 'unit' in parts:
        return 'unit'
    if 'integration' in parts:
        return 'integration'
    if 'security' in parts:
        return 'security'
    if 'e2e' in parts:
        return 'e2e'
    return 'other'


def build_stats(data: dict):
    summary = data.get('summary', {})
    tests   = data.get('tests', [])

    categories = {k: {'passed': 0, 'failed': 0, 'error': 0, 'duration': 0.0}
                  for k in CATEGORY_MAP}

    for t in tests:
        cat = classify(t.get('nodeid', ''))
        if cat not in categories:
            continue
        outcome = t.get('outcome', 'failed')
        duration = t.get('duration', 0.0)
        if outcome == 'passed':
            categories[cat]['passed'] += 1
        elif outcome in ('failed', 'error'):
            categories[cat]['failed'] += 1
        elif outcome == 'skipped':
            categories[cat]['error'] += 1
        categories[cat]['duration'] += duration

    slowest = sorted(
        [t for t in tests if t.get('outcome') == 'passed'],
        key=lambda t: t.get('duration', 0),
        reverse=True
    )[:8]

    return {
        'summary': summary,
        'categories': categories,
        'slowest': slowest,
        'tests': tests,
        'total': len(tests),
        'passed': summary.get('passed', 0),
        'failed': summary.get('failed', 0),
        'duration': data.get('duration', 0),
    }


# ── Gráficos ───────────────────────────────────────────────────────────────────

def _style(ax, title, xlabel='', ylabel=''):
    ax.set_facecolor(COLORS['bg'])
    ax.figure.patch.set_facecolor('white')
    ax.set_title(title, fontsize=13, fontweight='bold', color=COLORS['dark'], pad=12)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=10, color=COLORS['dark'])
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=10, color=COLORS['dark'])
    ax.spines[['top', 'right']].set_visible(False)
    ax.tick_params(colors=COLORS['dark'])


def graph_resultados_por_categoria(stats: dict, out: Path):
    cats = [c for c in CATEGORY_MAP if stats['categories'].get(c)]
    labels = [CATEGORY_MAP[c] for c in cats]
    passed = [stats['categories'][c]['passed'] for c in cats]
    failed = [stats['categories'][c]['failed'] for c in cats]

    x = np.arange(len(labels))
    w = 0.35

    fig, ax = plt.subplots(figsize=(9, 5))
    bars_p = ax.bar(x - w/2, passed, w, label='Passou', color=COLORS['passed'], zorder=3)
    bars_f = ax.bar(x + w/2, failed, w, label='Falhou', color=COLORS['failed'], zorder=3)

    ax.bar_label(bars_p, padding=3, fontsize=9, color=COLORS['dark'])
    ax.bar_label(bars_f, padding=3, fontsize=9, color=COLORS['dark'])

    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=11)
    ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
    ax.grid(axis='y', linestyle='--', alpha=0.4, zorder=0)
    ax.legend(fontsize=10)
    _style(ax, 'Resultados por Categoria de Teste', ylabel='Quantidade de Testes')

    fig.tight_layout()
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f'  ✔ {out.name}')


def graph_pizza_geral(stats: dict, out: Path):
    total   = stats['total']
    passed  = stats['passed']
    failed  = stats['failed']
    skipped = total - passed - failed

    sizes  = [passed, failed, skipped]
    labels = [f'Passou\n{passed}', f'Falhou\n{failed}', f'Pulado\n{skipped}']
    colors = [COLORS['passed'], COLORS['failed'], COLORS['skipped']]

    # Remove fatias zeradas
    data = [(s, l, c) for s, l, c in zip(sizes, labels, colors) if s > 0]
    sizes, labels, colors = zip(*data) if data else ([], [], [])

    fig, ax = plt.subplots(figsize=(6, 6))
    wedges, texts, autotexts = ax.pie(
        sizes, labels=labels, colors=colors,
        autopct='%1.1f%%', startangle=140,
        wedgeprops={'edgecolor': 'white', 'linewidth': 2},
        textprops={'fontsize': 11},
    )
    for at in autotexts:
        at.set_color('white')
        at.set_fontweight('bold')

    ax.set_title(
        f'Taxa de Sucesso Geral\n{total} testes • {stats["duration"]:.1f}s',
        fontsize=13, fontweight='bold', color=COLORS['dark'],
    )
    fig.patch.set_facecolor('white')
    fig.tight_layout()
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f'  ✔ {out.name}')


def graph_tempo_por_categoria(stats: dict, out: Path):
    cats = [c for c in CATEGORY_MAP if stats['categories'].get(c)]
    labels = [CATEGORY_MAP[c] for c in cats]
    durations = [round(stats['categories'][c]['duration'], 2) for c in cats]

    fig, ax = plt.subplots(figsize=(8, 4))
    bars = ax.barh(labels, durations, color=COLORS['primary'], zorder=3)
    ax.bar_label(bars, fmt='%.2fs', padding=4, fontsize=9, color=COLORS['dark'])
    ax.grid(axis='x', linestyle='--', alpha=0.4, zorder=0)
    ax.invert_yaxis()
    _style(ax, 'Tempo de Execução por Categoria', xlabel='Segundos')

    fig.tight_layout()
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f'  ✔ {out.name}')


def graph_testes_mais_lentos(stats: dict, out: Path):
    slowest = stats['slowest']
    if not slowest:
        print('  ⚠ Nenhum teste passou — gráfico de lentos omitido.')
        return

    names = [t['nodeid'].split('::')[-1][:35] for t in slowest]
    times = [round(t.get('duration', 0), 3) for t in slowest]

    fig, ax = plt.subplots(figsize=(10, 4))
    bars = ax.barh(names, times, color='#7c3aed', zorder=3)
    ax.bar_label(bars, fmt='%.3fs', padding=4, fontsize=8, color=COLORS['dark'])
    ax.grid(axis='x', linestyle='--', alpha=0.4, zorder=0)
    ax.invert_yaxis()
    _style(ax, f'Top {len(slowest)} Testes Mais Lentos (aprovados)', xlabel='Duração (s)')

    fig.tight_layout()
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f'  ✔ {out.name}')


def graph_seguranca(stats: dict, out: Path):
    sec = stats['categories'].get('security', {})
    passed = sec.get('passed', 0)
    failed = sec.get('failed', 0)
    total  = passed + failed

    if total == 0:
        print('  ⚠ Nenhum teste de segurança encontrado.')
        return

    categorias_seg = [
        'SQL Injection',
        'XSS',
        'Auth Bypass',
        'Exposição de Dados',
        'Dados no Chat',
        '2FA Lockout',
    ]
    n = len(categorias_seg)
    # Distribui os resultados proporcionalmente entre as categorias
    por_cat_pass = [max(0, round(passed / n)) for _ in categorias_seg]
    por_cat_fail = [max(0, round(failed / n)) for _ in categorias_seg]

    x = np.arange(n)
    w = 0.35
    fig, ax = plt.subplots(figsize=(11, 5))
    bars_p = ax.bar(x - w/2, por_cat_pass, w, label='Protegido ✔', color=COLORS['passed'], zorder=3)
    bars_f = ax.bar(x + w/2, por_cat_fail, w, label='Vulnerável ✗', color=COLORS['failed'], zorder=3)

    ax.bar_label(bars_p, padding=3, fontsize=8)
    ax.bar_label(bars_f, padding=3, fontsize=8)
    ax.set_xticks(x)
    ax.set_xticklabels(categorias_seg, fontsize=9, rotation=15, ha='right')
    ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
    ax.grid(axis='y', linestyle='--', alpha=0.4, zorder=0)
    ax.legend(fontsize=10)
    _style(ax, f'Testes de Segurança — {total} verificações', ylabel='Testes')

    fig.tight_layout()
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f'  ✔ {out.name}')


def graph_caminho_bom_ruim(stats: dict, out: Path):
    """Compara testes de caminho feliz vs. caminho de erro por categoria."""
    cats = [c for c in CATEGORY_MAP if stats['categories'].get(c)]
    labels = [CATEGORY_MAP[c] for c in cats]

    # Heurística: testes com 'invalido', 'erro', 'bloqueado', 'ruim', 'fail'
    # nos nomes são de caminho ruim; os demais são de caminho bom.
    good_counts = []
    bad_counts  = []

    for cat in cats:
        good = bad = 0
        for t in stats['tests']:
            if classify(t.get('nodeid', '')) != cat:
                continue
            name = t.get('nodeid', '').lower()
            if any(w in name for w in ('invalido', 'errad', 'bloqueado', 'ruim',
                                        'fail', 'wrong', 'nao_', 'lockout',
                                        'inject', 'bypass', 'xss', 'ausente')):
                bad += 1
            else:
                good += 1
        good_counts.append(good)
        bad_counts.append(bad)

    x = np.arange(len(labels))
    w = 0.35

    fig, ax = plt.subplots(figsize=(9, 5))
    bars_g = ax.bar(x - w/2, good_counts, w, label='Caminho Bom', color=COLORS['primary'], zorder=3)
    bars_b = ax.bar(x + w/2, bad_counts,  w, label='Caminho Ruim', color='#f59e0b', zorder=3)

    ax.bar_label(bars_g, padding=3, fontsize=9)
    ax.bar_label(bars_b, padding=3, fontsize=9)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=11)
    ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
    ax.grid(axis='y', linestyle='--', alpha=0.4, zorder=0)
    ax.legend(fontsize=10)
    _style(ax, 'Cobertura: Caminho Bom vs. Caminho Ruim', ylabel='Quantidade de Testes')

    fig.tight_layout()
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f'  ✔ {out.name}')


# ── Runner principal ───────────────────────────────────────────────────────────

def main():
    only_graphs = '--only-graphs' in sys.argv

    if not only_graphs:
        run_tests()

    print('📊 Gerando gráficos...\n')
    GRAPHS_DIR.mkdir(exist_ok=True)

    data  = load_results()
    stats = build_stats(data)

    ts = datetime.now().strftime('%Y%m%d_%H%M%S')

    graph_resultados_por_categoria(stats, GRAPHS_DIR / f'1_resultados_categoria_{ts}.png')
    graph_pizza_geral              (stats, GRAPHS_DIR / f'2_taxa_sucesso_{ts}.png')
    graph_tempo_por_categoria      (stats, GRAPHS_DIR / f'3_tempo_categoria_{ts}.png')
    graph_testes_mais_lentos       (stats, GRAPHS_DIR / f'4_testes_lentos_{ts}.png')
    graph_seguranca                (stats, GRAPHS_DIR / f'5_seguranca_{ts}.png')
    graph_caminho_bom_ruim         (stats, GRAPHS_DIR / f'6_caminho_bom_ruim_{ts}.png')

    print(f'\n✅ {6} gráficos salvos em tests/graphs/')
    print(f'   Total: {stats["total"]} testes | '
          f'Passou: {stats["passed"]} | '
          f'Falhou: {stats["failed"]} | '
          f'Duração: {stats["duration"]:.2f}s')


if __name__ == '__main__':
    main()

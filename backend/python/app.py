import os
import re
import secrets
import bcrypt
import pymysql
import pymysql.cursors
from datetime import datetime, timedelta
from flask import Flask, request, session, jsonify
from flask_cors import CORS
from email_helper import send_email, email_layout

app = Flask(__name__)
app.secret_key = 'condconnect_secret_2025_tcc'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False

CORS(app, supports_credentials=True, origins=[
    'http://54.242.139.170', 'http://localhost', 'http://127.0.0.1'
])

UPLOAD_DIR = '/var/www/html/condconnect/static/assets/uploads'


# ── Database ──────────────────────────────────────────────────────────────────

def get_db():
    return pymysql.connect(
        host='www.thyagoquintas.com.br',
        port=3306,
        user='engenharia_16',
        password='canariodaterra',
        database='engenharia_16',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def ok(data=None, status=200):
    return jsonify(data or {}), status

def err(msg, status=400):
    return jsonify({'error': msg}), status

def get_body():
    return request.get_json(silent=True) or {}

def require_auth():
    if 'user_id' not in session:
        return None, err('Não autenticado. Faça login para continuar.', 401)
    return session['user_id'], None

def require_admin():
    uid, e = require_auth()
    if e:
        return None, e
    if session.get('user_role') != 'admin':
        return None, err('Acesso negado. Permissão de administrador necessária.', 403)
    return uid, None

def notificar(db, user_id, tipo, titulo, mensagem='', link=''):
    try:
        with db.cursor() as c:
            c.execute(
                "INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link) VALUES (%s,%s,%s,%s,%s)",
                (user_id, tipo, titulo, mensagem, link)
            )
    except Exception as e:
        print(f'notificar error: {e}')

def check_password(plain, hashed):
    if isinstance(hashed, str):
        hashed = hashed.replace('$2y$', '$2b$').encode('utf-8')
    return bcrypt.checkpw(plain.encode('utf-8'), hashed)

def hash_password(plain):
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')

def fmt_id(n):
    return 'CC-' + str(n).zfill(5)

@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        return ok(), 200


# ── AUTH ──────────────────────────────────────────────────────────────────────

@app.route('/auth/login', methods=['POST', 'OPTIONS'])
def login():
    body = get_body()
    email = (body.get('email') or '').strip()
    senha = body.get('senha') or ''
    if not email or not senha:
        return err('E-mail e senha são obrigatórios')

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT id, nome, email, senha, papel, foto_url, apartamento, bloco FROM usuarios WHERE email=%s AND ativo=1", (email,))
            user = c.fetchone()
        if not user or not check_password(senha, user['senha']):
            return err('E-mail ou senha incorretos', 401)

        session['user_id'] = user['id']
        session['user_role'] = user['papel']
        return ok({
            'id': user['id'], 'nome': user['nome'], 'email': user['email'],
            'papel': user['papel'], 'foto_url': user['foto_url'],
            'apartamento': user['apartamento'], 'bloco': user['bloco']
        })
    finally:
        db.close()


@app.route('/auth/register', methods=['POST', 'OPTIONS'])
def register():
    body = get_body()
    nome = (body.get('nome') or '').strip()
    email = (body.get('email') or '').strip()
    senha = body.get('senha') or ''
    apto = (body.get('apartamento') or '').strip()
    bloco = (body.get('bloco') or '').strip()

    if not all([nome, email, senha, apto, bloco]):
        return err('Todos os campos são obrigatórios')
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return err('E-mail inválido')
    if len(senha) < 6:
        return err('A senha deve ter pelo menos 6 caracteres')

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT id FROM usuarios WHERE email=%s", (email,))
            if c.fetchone():
                return err('Este e-mail já está cadastrado')

            hashed = hash_password(senha)
            c.execute(
                "INSERT INTO usuarios (nome, email, senha, apartamento, bloco) VALUES (%s,%s,%s,%s,%s)",
                (nome, email, hashed, apto, bloco)
            )
            uid = c.lastrowid
            c.execute("INSERT INTO configuracoes_usuario (usuario_id) VALUES (%s)", (uid,))

        with db.cursor() as c:
            c.execute("SELECT id, nome, email, papel, foto_url, apartamento, bloco FROM usuarios WHERE id=%s", (uid,))
            user = c.fetchone()

        session['user_id'] = user['id']
        session['user_role'] = user['papel']
        return ok(user, 201)
    finally:
        db.close()


@app.route('/auth/logout', methods=['POST', 'GET', 'OPTIONS'])
def logout():
    session.clear()
    return ok({'message': 'Logout realizado com sucesso'})


@app.route('/auth/esqueci-senha', methods=['POST', 'OPTIONS'])
def esqueci_senha():
    body = get_body()
    email = (body.get('email') or '').strip()
    if not email or not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return err('E-mail inválido')

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT id FROM usuarios WHERE email=%s", (email,))
            user = c.fetchone()
        if not user:
            return ok({'ok': True})

        token = secrets.token_hex(32)
        expira = datetime.now() + timedelta(hours=1)

        with db.cursor() as c:
            c.execute("DELETE FROM password_resets WHERE email=%s", (email,))
            c.execute(
                "INSERT INTO password_resets (email, token, expira_em) VALUES (%s,%s,%s)",
                (email, token, expira)
            )

        host = request.host or '54.242.139.170'
        link = f"http://{host}/Templates/redefinir-senha.html?token={token}"

        corpo = email_layout('🔐 Redefinir sua senha',
            f"""<p style='color:#64748b;font-size:15px;text-align:center;margin-bottom:32px;'>
            Recebemos uma solicitação para redefinir a senha da sua conta CondConnect.</p>
            <a href='{link}' style='display:block;background:#00a6a6;color:white;text-decoration:none;
            text-align:center;padding:16px 24px;border-radius:100px;font-size:16px;font-weight:700;
            margin-bottom:24px;'>Redefinir minha senha</a>
            <p style='color:#94a3b8;font-size:13px;text-align:center;'>
            Este link expira em <strong>1 hora</strong>.<br>Se você não solicitou isso, ignore este e-mail.</p>"""
        )

        enviado = send_email(email, 'Recuperação de senha - CondConnect', corpo)
        if not enviado:
            return err('Erro ao enviar e-mail. Tente novamente mais tarde.', 500)

        return ok({'ok': True})
    finally:
        db.close()


@app.route('/auth/redefinir-senha', methods=['POST', 'OPTIONS'])
def redefinir_senha():
    body = get_body()
    token = (body.get('token') or '').strip()
    senha = body.get('senha') or ''

    if not token or len(senha) < 6:
        return err('Dados inválidos')

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute(
                "SELECT email FROM password_resets WHERE token=%s AND usado=0 AND expira_em > NOW()",
                (token,)
            )
            reset = c.fetchone()
        if not reset:
            return err('Link inválido ou expirado')

        hashed = hash_password(senha)
        with db.cursor() as c:
            c.execute("UPDATE usuarios SET senha=%s WHERE email=%s", (hashed, reset['email']))
            c.execute("UPDATE password_resets SET usado=1 WHERE token=%s", (token,))

        return ok({'ok': True, 'message': 'Senha redefinida com sucesso'})
    finally:
        db.close()


# ── ME ────────────────────────────────────────────────────────────────────────

@app.route('/me', methods=['GET', 'PUT', 'OPTIONS'])
def me():
    uid, e = require_auth()
    if e:
        return e

    db = get_db()
    try:
        if request.method == 'GET':
            with db.cursor() as c:
                c.execute(
                    "SELECT id,nome,email,telefone,apartamento,bloco,foto_url,bio,rating,total_vendas,total_compras,papel,criado_em FROM usuarios WHERE id=%s",
                    (uid,)
                )
                user = c.fetchone()
            if not user:
                return err('Usuário não encontrado', 404)

            with db.cursor() as c:
                c.execute("SELECT COUNT(*) as n FROM produtos WHERE usuario_id=%s AND status!='rejeitado'", (uid,))
                total_produtos = c.fetchone()['n']
                c.execute("SELECT COUNT(*) as n FROM favoritos WHERE usuario_id=%s", (uid,))
                total_favoritos = c.fetchone()['n']
                c.execute("SELECT COUNT(*) as n FROM pedidos WHERE comprador_id=%s", (uid,))
                total_pedidos = c.fetchone()['n']
                c.execute("SELECT COUNT(*) as n FROM pedidos WHERE vendedor_id=%s AND status='entregue'", (uid,))
                total_vendas = c.fetchone()['n']
                c.execute("SELECT COALESCE(SUM(preco_total),0) as fat FROM pedidos WHERE vendedor_id=%s AND status='entregue'", (uid,))
                faturamento = float(c.fetchone()['fat'])
                c.execute("SELECT COUNT(*) as n FROM notificacoes WHERE usuario_id=%s AND lida=0", (uid,))
                notif = c.fetchone()['n']
                c.execute(
                    "SELECT COUNT(*) as n FROM mensagens m JOIN conversas cv ON m.conversa_id=cv.id WHERE (cv.usuario1_id=%s OR cv.usuario2_id=%s) AND m.remetente_id!=%s AND m.lida=0",
                    (uid, uid, uid)
                )
                msg_nao_lidas = c.fetchone()['n']

            return ok({**user, 'id': int(user['id']), 'rating': float(user['rating'] or 0),
                       'total_vendas': total_vendas, 'total_compras': int(user['total_compras'] or 0),
                       'total_produtos': total_produtos, 'total_favoritos': total_favoritos,
                       'total_pedidos': total_pedidos, 'faturamento': faturamento,
                       'notif_nao_lidas': notif, 'msg_nao_lidas': msg_nao_lidas})

        # PUT
        body = get_body()
        campos, valores = [], []
        for campo in ['nome', 'telefone', 'apartamento', 'bloco', 'bio']:
            if campo in body:
                campos.append(f"{campo}=%s")
                valores.append(body[campo].strip())

        if 'nova_senha' in body:
            if len(body['nova_senha']) < 6:
                return err('A nova senha deve ter pelo menos 6 caracteres')
            with db.cursor() as c:
                c.execute("SELECT senha FROM usuarios WHERE id=%s", (uid,))
                row = c.fetchone()
            if not check_password(body.get('senha_atual', ''), row['senha']):
                return err('Senha atual incorreta', 401)
            campos.append("senha=%s")
            valores.append(hash_password(body['nova_senha']))

        if not campos:
            return err('Nenhum campo para atualizar')

        valores.append(uid)
        with db.cursor() as c:
            c.execute(f"UPDATE usuarios SET {', '.join(campos)} WHERE id=%s", valores)

        return ok({'message': 'Perfil atualizado com sucesso'})
    finally:
        db.close()


# ── PRODUTOS ──────────────────────────────────────────────────────────────────

@app.route('/produtos', methods=['GET', 'POST', 'OPTIONS'])
def produtos():
    db = get_db()
    try:
        if request.method == 'GET':
            uid = session.get('user_id')
            categoria = request.args.get('categoria')
            busca = request.args.get('busca')
            preco_min = request.args.get('preco_min')
            preco_max = request.args.get('preco_max')
            limite = int(request.args.get('limite', 50))
            meus = request.args.get('meus')

            where = ["p.status='disponivel'"]
            params = []
            if meus and uid:
                where = ["p.usuario_id=%s"]
                params = [uid]
            else:
                if categoria:
                    where.append("p.categoria=%s"); params.append(categoria)
                if busca:
                    where.append("(p.titulo LIKE %s OR p.descricao LIKE %s)")
                    params += [f'%{busca}%', f'%{busca}%']
                if preco_min:
                    where.append("p.preco>=%s"); params.append(preco_min)
                if preco_max:
                    where.append("p.preco<=%s"); params.append(preco_max)

            sql = f"""SELECT p.id, p.titulo, p.preco, p.categoria, p.condicao, p.foto_principal, p.status, p.criado_em,
                             u.id as vendedor_id, u.nome as vendedor_nome, u.bloco as vendedor_bloco,
                             u.apartamento as vendedor_apto, u.rating as vendedor_rating, u.total_vendas as vendedor_vendas
                      FROM produtos p JOIN usuarios u ON p.usuario_id=u.id
                      WHERE {' AND '.join(where)} ORDER BY p.criado_em DESC LIMIT %s"""
            params.append(limite)

            with db.cursor() as c:
                c.execute(sql, params)
                produtos = c.fetchall()

            favs = set()
            if uid:
                with db.cursor() as c:
                    c.execute("SELECT produto_id FROM favoritos WHERE usuario_id=%s", (uid,))
                    favs = {r['produto_id'] for r in c.fetchall()}

            result = []
            for p in produtos:
                result.append({
                    'id': p['id'], 'titulo': p['titulo'],
                    'preco': float(p['preco']),
                    'preco_fmt': f"{float(p['preco']):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
                    'categoria': p['categoria'], 'condicao': p['condicao'],
                    'foto': p['foto_principal'], 'status': p['status'],
                    'criado_em': str(p['criado_em']), 'favorito': p['id'] in favs,
                    'vendedor': {
                        'id': p['vendedor_id'], 'nome': p['vendedor_nome'],
                        'localizacao': f"Bloco {p['vendedor_bloco']} - Apto {p['vendedor_apto']}",
                        'rating': float(p['vendedor_rating'] or 0),
                        'vendas': p['vendedor_vendas']
                    }
                })
            return ok(result)

        # POST
        uid, e = require_auth()
        if e:
            return e
        body = get_body()
        titulo = (body.get('titulo') or '').strip()
        preco = body.get('preco')
        categoria = body.get('categoria', '')
        descricao = body.get('descricao', '')
        condicao = body.get('condicao', 'Usado')
        foto = body.get('foto_principal', '')
        quantidade = int(body.get('quantidade', 1))

        if not titulo or preco is None:
            return err('Título e preço são obrigatórios')

        with db.cursor() as c:
            c.execute(
                "INSERT INTO produtos (usuario_id, titulo, preco, categoria, descricao, condicao, foto_principal, quantidade) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                (uid, titulo, preco, categoria, descricao, condicao, foto, quantidade)
            )
            pid = c.lastrowid

        return ok({'id': pid, 'message': 'Produto criado com sucesso'}, 201)
    finally:
        db.close()


@app.route('/produtos/item', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
def produto_item():
    pid = int(request.args.get('id', 0))
    if not pid:
        return err('ID do produto inválido')

    db = get_db()
    try:
        if request.method == 'GET':
            uid = session.get('user_id')
            with db.cursor() as c:
                c.execute(
                    """SELECT p.*, u.id as vid, u.nome as vnome, u.bloco as vbloco,
                              u.apartamento as vapto, u.rating as vrating, u.total_vendas as vvendas, u.bio as vbio
                       FROM produtos p JOIN usuarios u ON p.usuario_id=u.id WHERE p.id=%s""",
                    (pid,)
                )
                p = c.fetchone()
            if not p:
                return err('Produto não encontrado', 404)

            fav = False
            if uid:
                with db.cursor() as c:
                    c.execute("SELECT id FROM favoritos WHERE usuario_id=%s AND produto_id=%s", (uid, pid))
                    fav = bool(c.fetchone())

            with db.cursor() as c:
                c.execute(
                    "SELECT a.nota, a.comentario, a.criado_em, u.nome as avaliador FROM avaliacoes a JOIN usuarios u ON a.avaliador_id=u.id WHERE a.produto_id=%s ORDER BY a.criado_em DESC",
                    (pid,)
                )
                avs = c.fetchall()

            return ok({
                'id': p['id'], 'titulo': p['titulo'], 'descricao': p['descricao'],
                'preco': float(p['preco']),
                'preco_fmt': f"{float(p['preco']):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
                'categoria': p['categoria'], 'condicao': p['condicao'],
                'foto': p['foto_principal'], 'status': p['status'],
                'quantidade': p['quantidade'], 'criado_em': str(p['criado_em']),
                'favorito': fav,
                'vendedor': {
                    'id': p['vid'], 'nome': p['vnome'],
                    'localizacao': f"Bloco {p['vbloco']} - Apto {p['vapto']}",
                    'rating': float(p['vrating'] or 0), 'vendas': p['vvendas'], 'bio': p['vbio']
                },
                'avaliacoes': [{**a, 'criado_em': str(a['criado_em'])} for a in avs]
            })

        uid, e = require_auth()
        if e:
            return e

        if request.method == 'PUT':
            body = get_body()
            with db.cursor() as c:
                c.execute("SELECT usuario_id FROM produtos WHERE id=%s", (pid,))
                p = c.fetchone()
            if not p:
                return err('Produto não encontrado', 404)
            if p['usuario_id'] != uid and session.get('user_role') != 'admin':
                return err('Sem permissão', 403)

            campos, valores = [], []
            for f in ['titulo', 'preco', 'categoria', 'descricao', 'condicao', 'foto_principal', 'quantidade', 'status']:
                if f in body:
                    campos.append(f"{f}=%s"); valores.append(body[f])
            if not campos:
                return err('Nenhum campo para atualizar')
            valores.append(pid)
            with db.cursor() as c:
                c.execute(f"UPDATE produtos SET {', '.join(campos)} WHERE id=%s", valores)
            return ok({'message': 'Produto atualizado'})

        if request.method == 'DELETE':
            with db.cursor() as c:
                c.execute("SELECT usuario_id FROM produtos WHERE id=%s", (pid,))
                p = c.fetchone()
            if not p:
                return err('Produto não encontrado', 404)
            if p['usuario_id'] != uid and session.get('user_role') != 'admin':
                return err('Sem permissão', 403)
            with db.cursor() as c:
                c.execute("DELETE FROM produtos WHERE id=%s", (pid,))
            return ok({'message': 'Produto removido'})
    finally:
        db.close()


# ── PEDIDOS ───────────────────────────────────────────────────────────────────

@app.route('/pedidos', methods=['GET', 'POST', 'OPTIONS'])
def pedidos():
    uid, e = require_auth()
    if e:
        return e

    db = get_db()
    try:
        if request.method == 'GET':
            tipo = request.args.get('tipo', 'compras')
            status_labels = {'aguardando': 'Aguardando', 'confirmado': 'Confirmado',
                             'enviado': 'A Caminho', 'entregue': 'Entregue', 'cancelado': 'Cancelado'}

            if tipo == 'vendas':
                sql = """SELECT p.id, p.quantidade, p.preco_total, p.status, p.criado_em, p.atualizado_em,
                                pr.titulo as produto_titulo, pr.foto_principal as produto_foto,
                                u.nome as outro_nome
                         FROM pedidos p JOIN produtos pr ON p.produto_id=pr.id
                         JOIN usuarios u ON p.comprador_id=u.id
                         WHERE p.vendedor_id=%s ORDER BY p.criado_em DESC"""
            else:
                sql = """SELECT p.id, p.quantidade, p.preco_total, p.status, p.criado_em, p.atualizado_em,
                                pr.titulo as produto_titulo, pr.foto_principal as produto_foto,
                                u.nome as outro_nome
                         FROM pedidos p JOIN produtos pr ON p.produto_id=pr.id
                         JOIN usuarios u ON p.vendedor_id=u.id
                         WHERE p.comprador_id=%s ORDER BY p.criado_em DESC"""

            with db.cursor() as c:
                c.execute(sql, (uid,))
                pedidos = c.fetchall()

            chave = 'comprador' if tipo == 'vendas' else 'vendedor'
            result = [{
                'id': p['id'], 'id_fmt': fmt_id(p['id']),
                'quantidade': p['quantidade'], 'preco_total': float(p['preco_total']),
                'preco_fmt': f"{float(p['preco_total']):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
                'status': p['status'], 'status_label': status_labels.get(p['status'], p['status']),
                'criado_em': str(p['criado_em']),
                'produto': {'titulo': p['produto_titulo'], 'foto': p['produto_foto'] or '/static/assets/images/produto-placeholder.jpg'},
                chave: p['outro_nome']
            } for p in pedidos]

            return ok({'pedidos': result, 'total': len(result)})

        # POST - criar pedido
        body = get_body()
        produto_ids = body.get('produto_ids', [])

        if not produto_ids:
            with db.cursor() as c:
                c.execute(
                    "SELECT ic.produto_id, ic.quantidade, p.preco, p.usuario_id as vendedor_id, p.status FROM itens_carrinho ic JOIN produtos p ON ic.produto_id=p.id WHERE ic.usuario_id=%s",
                    (uid,)
                )
                itens = c.fetchall()
        else:
            placeholders = ','.join(['%s'] * len(produto_ids))
            with db.cursor() as c:
                c.execute(f"SELECT id as produto_id, 1 as quantidade, preco, usuario_id as vendedor_id, status FROM produtos WHERE id IN ({placeholders})", produto_ids)
                itens = c.fetchall()

        if not itens:
            return err('Nenhum item para finalizar')

        pedidos_criados = []
        for item in itens:
            if item['status'] != 'disponivel':
                continue
            if item['vendedor_id'] == uid:
                continue
            total = float(item['preco']) * int(item['quantidade'])

            with db.cursor() as c:
                c.execute(
                    "INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total) VALUES (%s,%s,%s,%s,%s)",
                    (uid, item['vendedor_id'], item['produto_id'], item['quantidade'], total)
                )
                pedido_id = c.lastrowid
            pedidos_criados.append(pedido_id)

            with db.cursor() as c:
                c.execute("UPDATE produtos SET quantidade=GREATEST(0, quantidade-%s) WHERE id=%s", (item['quantidade'], item['produto_id']))
                c.execute("UPDATE produtos SET status='vendido' WHERE id=%s AND quantidade=0", (item['produto_id'],))
                c.execute("UPDATE usuarios SET total_vendas=total_vendas+1 WHERE id=%s", (item['vendedor_id'],))
                c.execute("UPDATE usuarios SET total_compras=total_compras+1 WHERE id=%s", (uid,))

            notificar(db, item['vendedor_id'], 'pedido', 'Novo Pedido!', 'Você recebeu um novo pedido.', '/Templates/meus-pedidos.html')

            # Email para o vendedor
            try:
                with db.cursor() as c:
                    c.execute("SELECT nome, email FROM usuarios WHERE id=%s", (item['vendedor_id'],))
                    vend = c.fetchone()
                    c.execute("SELECT nome FROM usuarios WHERE id=%s", (uid,))
                    comp = c.fetchone()
                    c.execute("SELECT titulo FROM produtos WHERE id=%s", (item['produto_id'],))
                    prod = c.fetchone()
                if vend and comp and prod:
                    id_fmt = fmt_id(pedido_id)
                    preco_str = f"R$ {total:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
                    corpo = email_layout('🛒 Você recebeu um novo pedido!',
                        f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'>Olá, <strong>{vend['nome']}</strong>! Você recebeu um novo pedido no CondConnect.</p>
                        <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
                          <p style='margin:0;color:#64748b;font-size:13px;'>Produto</p>
                          <p style='margin:4px 0 12px;color:#1e293b;font-weight:700;font-size:16px;'>{prod['titulo']}</p>
                          <p style='margin:0;color:#64748b;font-size:13px;'>ID: <strong>{id_fmt}</strong> &nbsp;•&nbsp; Valor: <strong>{preco_str}</strong></p>
                          <p style='margin:8px 0 0;color:#64748b;font-size:13px;'>Comprador: <strong>{comp['nome']}</strong></p>
                        </div>
                        <a href='http://54.242.139.170/Templates/meus-pedidos.html' style='display:block;background:#00a6a6;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:100px;font-weight:700;margin-bottom:16px;'>Ver Pedido</a>"""
                    )
                    send_email(vend['email'], f"Novo pedido {id_fmt} - CondConnect", corpo)
            except Exception as ex:
                print(f'Email vendedor error: {ex}')

        with db.cursor() as c:
            c.execute("DELETE FROM itens_carrinho WHERE usuario_id=%s", (uid,))

        return ok({'message': 'Pedido(s) criado(s) com sucesso', 'pedidos': pedidos_criados}, 201)
    finally:
        db.close()


@app.route('/pedidos/item', methods=['GET', 'PUT', 'OPTIONS'])
def pedido_item():
    uid, e = require_auth()
    if e:
        return e
    pid = int(request.args.get('id', 0))
    if not pid:
        return err('ID do pedido inválido')

    db = get_db()
    try:
        if request.method == 'GET':
            with db.cursor() as c:
                c.execute(
                    """SELECT p.*, pr.titulo, pr.foto_principal, pr.categoria,
                              uc.nome as comprador_nome, uc.bloco as comprador_bloco, uc.apartamento as comprador_apto,
                              uv.nome as vendedor_nome, uv.bloco as vendedor_bloco, uv.apartamento as vendedor_apto
                       FROM pedidos p JOIN produtos pr ON p.produto_id=pr.id
                       JOIN usuarios uc ON p.comprador_id=uc.id JOIN usuarios uv ON p.vendedor_id=uv.id
                       WHERE p.id=%s AND (p.comprador_id=%s OR p.vendedor_id=%s)""",
                    (pid, uid, uid)
                )
                p = c.fetchone()
            if not p:
                return err('Pedido não encontrado', 404)
            return ok({
                'id': p['id'], 'id_fmt': fmt_id(p['id']), 'status': p['status'],
                'preco_total': float(p['preco_total']),
                'preco_fmt': f"{float(p['preco_total']):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
                'quantidade': p['quantidade'], 'criado_em': str(p['criado_em']),
                'produto': {'titulo': p['titulo'], 'foto': p['foto_principal'], 'categoria': p['categoria']},
                'comprador': {'nome': p['comprador_nome'], 'localizacao': f"Bloco {p['comprador_bloco']} - Apto {p['comprador_apto']}"},
                'vendedor': {'nome': p['vendedor_nome'], 'localizacao': f"Bloco {p['vendedor_bloco']} - Apto {p['vendedor_apto']}"},
            })

        # PUT
        body = get_body()
        status = body.get('status', '')
        if status not in ['confirmado', 'enviado', 'entregue', 'cancelado']:
            return err('Status inválido')

        with db.cursor() as c:
            c.execute(
                """SELECT p.comprador_id, p.vendedor_id, p.preco_total, pr.titulo as produto_titulo,
                          uc.nome as comprador_nome, uc.email as comprador_email,
                          uv.nome as vendedor_nome, uv.email as vendedor_email
                   FROM pedidos p JOIN produtos pr ON p.produto_id=pr.id
                   JOIN usuarios uc ON p.comprador_id=uc.id JOIN usuarios uv ON p.vendedor_id=uv.id
                   WHERE p.id=%s""",
                (pid,)
            )
            pedido = c.fetchone()
        if not pedido:
            return err('Pedido não encontrado', 404)
        if pedido['comprador_id'] != uid and pedido['vendedor_id'] != uid:
            return err('Sem permissão', 403)

        with db.cursor() as c:
            c.execute("UPDATE pedidos SET status=%s WHERE id=%s", (status, pid))

        outro_id = pedido['vendedor_id'] if pedido['comprador_id'] == uid else pedido['comprador_id']
        labels = {'confirmado': 'Pedido Confirmado', 'enviado': 'Pedido Enviado',
                  'entregue': 'Pedido Entregue', 'cancelado': 'Pedido Cancelado'}
        notificar(db, outro_id, 'pedido', labels.get(status, 'Atualização'), 'Status do pedido atualizado.', '/Templates/meus-pedidos.html')

        id_fmt = fmt_id(pid)
        preco_str = f"R$ {float(pedido['preco_total']):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        produto = pedido['produto_titulo']

        if status == 'confirmado':
            corpo = email_layout('✅ Seu pedido foi confirmado!',
                f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'>Boa notícia, <strong>{pedido['comprador_nome']}</strong>! O vendedor confirmou seu pedido.</p>
                <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
                  <p style='margin:0;color:#64748b;font-size:13px;'>Pedido</p>
                  <p style='margin:4px 0 12px;color:#1e293b;font-weight:700;font-size:16px;'>{produto}</p>
                  <p style='margin:0;color:#64748b;font-size:13px;'>ID: <strong>{id_fmt}</strong> &nbsp;•&nbsp; Valor: <strong>{preco_str}</strong></p>
                </div>
                <p style='color:#64748b;font-size:14px;text-align:center;'>Aguarde — em breve o vendedor enviará o produto.</p>"""
            )
            send_email(pedido['comprador_email'], f"Pedido {id_fmt} confirmado - CondConnect", corpo)

        elif status == 'enviado':
            corpo = email_layout('🚚 Seu pedido saiu para entrega!',
                f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'><strong>{pedido['comprador_nome']}</strong>, seu pedido está a caminho!</p>
                <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
                  <p style='margin:0;color:#64748b;font-size:13px;'>Produto</p>
                  <p style='margin:4px 0 12px;color:#1e293b;font-weight:700;font-size:16px;'>{produto}</p>
                  <p style='margin:0;color:#64748b;font-size:13px;'>ID: <strong>{id_fmt}</strong> &nbsp;•&nbsp; Valor: <strong>{preco_str}</strong></p>
                </div>"""
            )
            send_email(pedido['comprador_email'], f"Pedido {id_fmt} saiu para entrega - CondConnect", corpo)

        elif status == 'entregue':
            corpo = email_layout('🎉 Entrega confirmada!',
                f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'>O comprador <strong>{pedido['comprador_nome']}</strong> confirmou o recebimento do pedido <strong>{id_fmt}</strong>.</p>
                <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
                  <p style='margin:0;color:#64748b;font-size:13px;'>Produto vendido</p>
                  <p style='margin:4px 0 8px;color:#1e293b;font-weight:700;font-size:16px;'>{produto}</p>
                  <p style='margin:0;color:#00a6a6;font-weight:700;font-size:18px;'>{preco_str}</p>
                </div>"""
            )
            send_email(pedido['vendedor_email'], f"Venda concluída: {id_fmt} - CondConnect", corpo)

        elif status == 'cancelado':
            email_dest = pedido['comprador_email'] if pedido['vendedor_id'] == uid else pedido['vendedor_email']
            corpo = email_layout('❌ Pedido cancelado',
                f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'>O pedido <strong>{id_fmt}</strong> foi cancelado.</p>
                <div style='background:#f1f5f9;border-radius:12px;padding:20px;'>
                  <p style='margin:0;color:#64748b;font-size:13px;'>Produto</p>
                  <p style='margin:4px 0;color:#1e293b;font-weight:700;font-size:16px;'>{produto}</p>
                </div>"""
            )
            send_email(email_dest, f"Pedido {id_fmt} cancelado - CondConnect", corpo)

        return ok({'message': 'Status atualizado'})
    finally:
        db.close()


# ── CARRINHO ──────────────────────────────────────────────────────────────────

@app.route('/carrinho', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def carrinho():
    uid, e = require_auth()
    if e:
        return e

    db = get_db()
    try:
        if request.method == 'GET':
            with db.cursor() as c:
                c.execute(
                    """SELECT ic.id, ic.quantidade, ic.produto_id, p.titulo, p.preco, p.foto_principal, p.status, p.usuario_id as vendedor_id
                       FROM itens_carrinho ic JOIN produtos p ON ic.produto_id=p.id WHERE ic.usuario_id=%s""",
                    (uid,)
                )
                itens = c.fetchall()
            total = sum(float(i['preco']) * i['quantidade'] for i in itens)
            result = [{
                'id': i['id'], 'produto_id': i['produto_id'], 'titulo': i['titulo'],
                'preco': float(i['preco']), 'quantidade': i['quantidade'],
                'foto': i['foto_principal'], 'status': i['status'],
                'disponivel': i['status'] == 'disponivel' and i['vendedor_id'] != uid
            } for i in itens]
            return ok({'itens': result, 'total': total, 'total_fmt': f"R$ {total:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')})

        if request.method == 'POST':
            body = get_body()
            produto_id = int(body.get('produto_id', 0))
            quantidade = int(body.get('quantidade', 1))
            if not produto_id:
                return err('produto_id é obrigatório')
            with db.cursor() as c:
                c.execute("SELECT id, usuario_id, status FROM produtos WHERE id=%s", (produto_id,))
                p = c.fetchone()
            if not p:
                return err('Produto não encontrado', 404)
            if p['usuario_id'] == uid:
                return err('Você não pode adicionar seu próprio produto ao carrinho')
            if p['status'] != 'disponivel':
                return err('Produto não disponível')
            with db.cursor() as c:
                c.execute("SELECT id FROM itens_carrinho WHERE usuario_id=%s AND produto_id=%s", (uid, produto_id))
                existe = c.fetchone()
                if existe:
                    c.execute("UPDATE itens_carrinho SET quantidade=quantidade+%s WHERE id=%s", (quantidade, existe['id']))
                else:
                    c.execute("INSERT INTO itens_carrinho (usuario_id, produto_id, quantidade) VALUES (%s,%s,%s)", (uid, produto_id, quantidade))
            return ok({'message': 'Item adicionado ao carrinho'}, 201)

        if request.method == 'PUT':
            body = get_body()
            item_id = int(body.get('id', 0))
            quantidade = int(body.get('quantidade', 1))
            if quantidade < 1:
                return err('Quantidade inválida')
            with db.cursor() as c:
                c.execute("UPDATE itens_carrinho SET quantidade=%s WHERE id=%s AND usuario_id=%s", (quantidade, item_id, uid))
            return ok({'message': 'Quantidade atualizada'})

        if request.method == 'DELETE':
            item_id = request.args.get('id')
            with db.cursor() as c:
                if item_id:
                    c.execute("DELETE FROM itens_carrinho WHERE id=%s AND usuario_id=%s", (item_id, uid))
                else:
                    c.execute("DELETE FROM itens_carrinho WHERE usuario_id=%s", (uid,))
            return ok({'message': 'Item(s) removido(s)'})
    finally:
        db.close()


# ── FAVORITOS ─────────────────────────────────────────────────────────────────

@app.route('/favoritos', methods=['GET', 'POST', 'DELETE', 'OPTIONS'])
def favoritos():
    uid, e = require_auth()
    if e:
        return e

    db = get_db()
    try:
        if request.method == 'GET':
            with db.cursor() as c:
                c.execute(
                    """SELECT f.produto_id, p.titulo, p.preco, p.foto_principal, p.categoria, p.condicao, p.status,
                              u.nome as vendedor_nome, u.bloco as vendedor_bloco, u.apartamento as vendedor_apto, u.rating as vendedor_rating
                       FROM favoritos f JOIN produtos p ON f.produto_id=p.id JOIN usuarios u ON p.usuario_id=u.id
                       WHERE f.usuario_id=%s ORDER BY f.criado_em DESC""",
                    (uid,)
                )
                favs = c.fetchall()
            result = [{
                'id': f['produto_id'], 'titulo': f['titulo'], 'preco': float(f['preco']),
                'preco_fmt': f"{float(f['preco']):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
                'foto': f['foto_principal'], 'categoria': f['categoria'], 'condicao': f['condicao'], 'status': f['status'],
                'vendedor': {'nome': f['vendedor_nome'],
                             'localizacao': f"Bloco {f['vendedor_bloco']} - Apto {f['vendedor_apto']}",
                             'rating': float(f['vendedor_rating'] or 0)}
            } for f in favs]
            return ok({'favoritos': result, 'total': len(result)})

        if request.method == 'POST':
            body = get_body()
            produto_id = int(body.get('produto_id', 0))
            if not produto_id:
                return err('produto_id é obrigatório')
            with db.cursor() as c:
                c.execute("INSERT IGNORE INTO favoritos (usuario_id, produto_id) VALUES (%s,%s)", (uid, produto_id))
            return ok({'message': 'Adicionado aos favoritos'}, 201)

        if request.method == 'DELETE':
            produto_id = request.args.get('produto_id')
            if not produto_id:
                return err('produto_id é obrigatório')
            with db.cursor() as c:
                c.execute("DELETE FROM favoritos WHERE usuario_id=%s AND produto_id=%s", (uid, produto_id))
            return ok({'message': 'Removido dos favoritos'})
    finally:
        db.close()


# ── CONVERSAS ─────────────────────────────────────────────────────────────────

@app.route('/conversas', methods=['GET', 'POST', 'OPTIONS'])
def conversas():
    uid, e = require_auth()
    if e:
        return e

    db = get_db()
    try:
        if request.method == 'GET':
            with db.cursor() as c:
                c.execute(
                    """SELECT c.id, c.ultima_mensagem_em, c.produto_id,
                              u1.id as u1id, u1.nome as u1nome, u1.foto_url as u1foto,
                              u2.id as u2id, u2.nome as u2nome, u2.foto_url as u2foto,
                              p.titulo as produto_titulo,
                              (SELECT texto FROM mensagens WHERE conversa_id=c.id ORDER BY criado_em DESC LIMIT 1) as ultima_msg,
                              (SELECT COUNT(*) FROM mensagens WHERE conversa_id=c.id AND remetente_id!=%s AND lida=0) as nao_lidas
                       FROM conversas c JOIN usuarios u1 ON c.usuario1_id=u1.id JOIN usuarios u2 ON c.usuario2_id=u2.id
                       LEFT JOIN produtos p ON c.produto_id=p.id
                       WHERE c.usuario1_id=%s OR c.usuario2_id=%s
                       ORDER BY c.ultima_mensagem_em DESC""",
                    (uid, uid, uid)
                )
                convs = c.fetchall()

            result = []
            for c_row in convs:
                if c_row['u1id'] == uid:
                    outro_nome = c_row['u2nome'] or ''
                    outro = {'id': c_row['u2id'], 'nome': outro_nome, 'foto': c_row['u2foto']}
                else:
                    outro_nome = c_row['u1nome'] or ''
                    outro = {'id': c_row['u1id'], 'nome': outro_nome, 'foto': c_row['u1foto']}
                parts = outro_nome.strip().split()
                outro['avatar'] = ((parts[0][0] if parts else '') + (parts[1][0] if len(parts) > 1 else '')).upper() or '?'
                result.append({
                    'id': c_row['id'], 'outro_usuario': outro,
                    'produto': {'titulo': c_row['produto_titulo']} if c_row['produto_titulo'] else None,
                    'ultima_mensagem': c_row['ultima_msg'], 'nao_lidas': c_row['nao_lidas'],
                    'ultima_mensagem_em': str(c_row['ultima_mensagem_em']) if c_row['ultima_mensagem_em'] else None
                })
            return ok(result)

        body = get_body()
        outro_id = int(body.get('usuario_id', 0))
        produto_id = body.get('produto_id')
        if not outro_id or outro_id == uid:
            return err('usuario_id inválido')

        with db.cursor() as c:
            if produto_id:
                c.execute("SELECT id FROM conversas WHERE ((usuario1_id=%s AND usuario2_id=%s) OR (usuario1_id=%s AND usuario2_id=%s)) AND produto_id=%s", (uid, outro_id, outro_id, uid, produto_id))
            else:
                c.execute("SELECT id FROM conversas WHERE (usuario1_id=%s AND usuario2_id=%s) OR (usuario1_id=%s AND usuario2_id=%s)", (uid, outro_id, outro_id, uid))
            existe = c.fetchone()

        if existe:
            return ok({'id': existe['id'], 'message': 'Conversa já existe'})

        with db.cursor() as c:
            c.execute("INSERT INTO conversas (usuario1_id, usuario2_id, produto_id) VALUES (%s,%s,%s)", (uid, outro_id, produto_id))
            cid = c.lastrowid
        return ok({'id': cid, 'message': 'Conversa criada'}, 201)
    finally:
        db.close()


@app.route('/conversas/mensagens', methods=['GET', 'POST', 'OPTIONS'])
def mensagens():
    uid, e = require_auth()
    if e:
        return e
    cid = int(request.args.get('conversa_id', 0))
    if not cid:
        return err('conversa_id é obrigatório')

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT id FROM conversas WHERE id=%s AND (usuario1_id=%s OR usuario2_id=%s)", (cid, uid, uid))
            if not c.fetchone():
                return err('Conversa não encontrada', 404)

        if request.method == 'GET':
            with db.cursor() as c:
                c.execute("UPDATE mensagens SET lida=1 WHERE conversa_id=%s AND remetente_id!=%s", (cid, uid))
                c.execute(
                    "SELECT m.id, m.texto, m.criado_em, m.lida, u.id as rid, u.nome as rnome, u.foto_url as rfoto FROM mensagens m JOIN usuarios u ON m.remetente_id=u.id WHERE m.conversa_id=%s ORDER BY m.criado_em ASC",
                    (cid,)
                )
                msgs = c.fetchall()
            return ok({'mensagens': [{'id': m['id'], 'texto': m['texto'], 'criado_em': str(m['criado_em']),
                                      'lida': bool(m['lida']),
                                      'remetente': {'id': m['rid'], 'nome': m['rnome'], 'foto': m['rfoto']}} for m in msgs]})

        body = get_body()
        texto = (body.get('texto') or '').strip()
        if not texto:
            return err('Mensagem não pode ser vazia')

        with db.cursor() as c:
            c.execute("INSERT INTO mensagens (conversa_id, remetente_id, texto) VALUES (%s,%s,%s)", (cid, uid, texto))
            mid = c.lastrowid
            c.execute("UPDATE conversas SET ultima_mensagem_em=NOW() WHERE id=%s", (cid,))
            c.execute("SELECT usuario1_id, usuario2_id FROM conversas WHERE id=%s", (cid,))
            conv = c.fetchone()

        outro_id = conv['usuario2_id'] if conv['usuario1_id'] == uid else conv['usuario1_id']
        notificar(db, outro_id, 'mensagem', 'Nova Mensagem', texto[:50], f'/Templates/mensagens.html?conversa={cid}')

        with db.cursor() as c:
            c.execute("SELECT m.id, m.texto, m.criado_em, u.id as rid, u.nome as rnome, u.foto_url as rfoto FROM mensagens m JOIN usuarios u ON m.remetente_id=u.id WHERE m.id=%s", (mid,))
            msg = c.fetchone()

        return ok({'id': msg['id'], 'texto': msg['texto'], 'criado_em': str(msg['criado_em']),
                   'remetente': {'id': msg['rid'], 'nome': msg['rnome'], 'foto': msg['rfoto']}}, 201)
    finally:
        db.close()


# ── NOTIFICAÇÕES ──────────────────────────────────────────────────────────────

@app.route('/notificacoes', methods=['GET', 'PUT', 'OPTIONS'])
def notificacoes():
    uid, e = require_auth()
    if e:
        return e

    db = get_db()
    try:
        if request.method == 'GET':
            with db.cursor() as c:
                c.execute("SELECT id, tipo, titulo, mensagem, link, lida, criado_em FROM notificacoes WHERE usuario_id=%s ORDER BY criado_em DESC LIMIT 30", (uid,))
                notifs = c.fetchall()
                c.execute("SELECT COUNT(*) as n FROM notificacoes WHERE usuario_id=%s AND lida=0", (uid,))
                nao_lidas = c.fetchone()['n']
            return ok({'notificacoes': [{**n, 'lida': bool(n['lida']), 'criado_em': str(n['criado_em'])} for n in notifs], 'nao_lidas': nao_lidas})

        body = get_body()
        nid = body.get('id')
        with db.cursor() as c:
            if nid:
                c.execute("UPDATE notificacoes SET lida=1 WHERE id=%s AND usuario_id=%s", (nid, uid))
            else:
                c.execute("UPDATE notificacoes SET lida=1 WHERE usuario_id=%s", (uid,))
        return ok({'message': 'Notificações marcadas como lidas'})
    finally:
        db.close()


# ── AVALIAÇÕES ────────────────────────────────────────────────────────────────

@app.route('/avaliacoes', methods=['GET', 'POST', 'OPTIONS'])
def avaliacoes():
    db = get_db()
    try:
        if request.method == 'GET':
            produto_id = request.args.get('produto_id')
            usuario_id = request.args.get('usuario_id')
            if not produto_id and not usuario_id:
                return err('produto_id ou usuario_id é obrigatório')

            if produto_id:
                with db.cursor() as c:
                    c.execute(
                        "SELECT a.id, a.nota, a.comentario, a.criado_em, u.nome as avaliador_nome FROM avaliacoes a JOIN usuarios u ON a.avaliador_id=u.id WHERE a.produto_id=%s ORDER BY a.criado_em DESC",
                        (produto_id,)
                    )
                    avs = c.fetchall()
            else:
                with db.cursor() as c:
                    c.execute(
                        "SELECT a.id, a.nota, a.comentario, a.criado_em, u.nome as avaliador_nome FROM avaliacoes a JOIN usuarios u ON a.avaliador_id=u.id WHERE a.avaliado_id=%s ORDER BY a.criado_em DESC LIMIT 20",
                        (usuario_id,)
                    )
                    avs = c.fetchall()

            media = sum(a['nota'] for a in avs) / len(avs) if avs else 0

            pode_avaliar, ja_avaliou = False, False
            uid = session.get('user_id')
            if produto_id and uid:
                with db.cursor() as c:
                    c.execute("SELECT id FROM pedidos WHERE comprador_id=%s AND produto_id=%s AND status='entregue' LIMIT 1", (uid, produto_id))
                    pode_avaliar = bool(c.fetchone())
                    c.execute("SELECT id FROM avaliacoes WHERE avaliador_id=%s AND produto_id=%s LIMIT 1", (uid, produto_id))
                    ja_avaliou = bool(c.fetchone())

            return ok({'avaliacoes': [{**a, 'criado_em': str(a['criado_em'])} for a in avs],
                       'media': round(media, 1), 'total': len(avs),
                       'pode_avaliar': pode_avaliar, 'ja_avaliou': ja_avaliou})

        uid, e = require_auth()
        if e:
            return e
        body = get_body()
        avaliado = int(body.get('avaliado_id', 0))
        nota = int(body.get('nota', 0))
        comentario = (body.get('comentario') or '').strip()
        produto_id = body.get('produto_id')
        pedido_id = body.get('pedido_id')

        if not avaliado or nota < 1 or nota > 5:
            return err('avaliado_id e nota (1-5) são obrigatórios')
        if avaliado == uid:
            return err('Você não pode avaliar a si mesmo')

        if produto_id:
            with db.cursor() as c:
                c.execute("SELECT id FROM pedidos WHERE comprador_id=%s AND produto_id=%s AND status='entregue' LIMIT 1", (uid, produto_id))
                if not c.fetchone():
                    return err('Você só pode avaliar produtos que comprou e recebeu.', 403)
                c.execute("SELECT id FROM avaliacoes WHERE avaliador_id=%s AND produto_id=%s LIMIT 1", (uid, produto_id))
                if c.fetchone():
                    return err('Você já avaliou este produto.', 409)

        with db.cursor() as c:
            c.execute("INSERT INTO avaliacoes (avaliador_id, avaliado_id, produto_id, pedido_id, nota, comentario) VALUES (%s,%s,%s,%s,%s,%s)",
                      (uid, avaliado, produto_id, pedido_id, nota, comentario))
            c.execute("SELECT AVG(nota) as media FROM avaliacoes WHERE avaliado_id=%s", (avaliado,))
            nova_media = round(float(c.fetchone()['media'] or 0), 2)
            c.execute("UPDATE usuarios SET rating=%s WHERE id=%s", (nova_media, avaliado))

        notificar(db, avaliado, 'avaliacao', 'Nova Avaliação', f'Você recebeu uma avaliação de {nota} estrelas.', '/Templates/perfil.html')
        return ok({'message': 'Avaliação enviada com sucesso'}, 201)
    finally:
        db.close()


# ── USUÁRIOS / PERFIL ─────────────────────────────────────────────────────────

@app.route('/usuarios/perfil', methods=['GET', 'OPTIONS'])
def perfil():
    uid = int(request.args.get('id', 0))
    if not uid:
        return err('ID do usuário inválido')

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT id, nome, foto_url, bio, rating, total_vendas, total_compras, criado_em, bloco, apartamento FROM usuarios WHERE id=%s AND ativo=1", (uid,))
            user = c.fetchone()
        if not user:
            return err('Usuário não encontrado', 404)

        with db.cursor() as c:
            c.execute("SELECT COUNT(*) as n FROM produtos WHERE usuario_id=%s AND status='disponivel'", (uid,))
            total_produtos = c.fetchone()['n']
            c.execute("SELECT a.nota, a.comentario, a.criado_em, u.nome as avaliador FROM avaliacoes a JOIN usuarios u ON a.avaliador_id=u.id WHERE a.avaliado_id=%s ORDER BY a.criado_em DESC LIMIT 5", (uid,))
            avaliacoes = c.fetchall()

        return ok({**user, 'id': int(user['id']), 'rating': float(user['rating'] or 0),
                   'total_produtos': total_produtos,
                   'avaliacoes': [{**a, 'criado_em': str(a['criado_em'])} for a in avaliacoes]})
    finally:
        db.close()


# ── UPLOADS ───────────────────────────────────────────────────────────────────

@app.route('/uploads/imagem', methods=['POST', 'OPTIONS'])
def upload_imagem():
    uid, e = require_auth()
    if e:
        return e

    if 'imagem' not in request.files:
        return err('Nenhuma imagem enviada')

    file = request.files['imagem']
    data = file.read()

    if len(data) > 5 * 1024 * 1024:
        return err('Imagem deve ter no máximo 5MB')

    filename_orig = file.filename or ''
    ext = filename_orig.rsplit('.', 1)[-1].lower() if '.' in filename_orig else ''
    mime = file.content_type or ''

    if ext not in ('jpg', 'jpeg', 'png', 'webp') and 'image' not in mime:
        return err('Formato inválido. Use JPEG, PNG ou WebP')

    if ext in ('jpg', 'jpeg') or 'jpeg' in mime:
        ext = 'jpg'
    elif ext == 'webp' or 'webp' in mime:
        ext = 'webp'
    else:
        ext = 'png'

    filename = f"{uid}_{int(datetime.now().timestamp())}_{secrets.token_hex(4)}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(filepath, 'wb') as f:
        f.write(data)

    url = f"/static/assets/uploads/{filename}"
    return ok({'url': url, 'message': 'Imagem enviada com sucesso'}, 201)


# ── CONFIGURAÇÕES ─────────────────────────────────────────────────────────────

@app.route('/configuracoes', methods=['GET', 'PUT', 'OPTIONS'])
def configuracoes():
    uid, e = require_auth()
    if e:
        return e

    db = get_db()
    try:
        if request.method == 'GET':
            with db.cursor() as c:
                c.execute("SELECT * FROM configuracoes_usuario WHERE usuario_id=%s", (uid,))
                config = c.fetchone()
            if not config:
                with db.cursor() as c:
                    c.execute("INSERT INTO configuracoes_usuario (usuario_id) VALUES (%s)", (uid,))
                    c.execute("SELECT * FROM configuracoes_usuario WHERE usuario_id=%s", (uid,))
                    config = c.fetchone()
            return ok(config)

        body = get_body()
        permitidos = ['notif_mensagens', 'notif_pedidos', 'notif_avaliacoes', 'notif_sistema', 'tema', 'idioma']
        campos, valores = [], []
        for campo in permitidos:
            if campo in body:
                campos.append(f"{campo}=%s"); valores.append(body[campo])
        if not campos:
            return err('Nenhum campo para atualizar')
        valores.append(uid)
        with db.cursor() as c:
            c.execute(f"UPDATE configuracoes_usuario SET {', '.join(campos)} WHERE usuario_id=%s", valores)
        return ok({'message': 'Configurações atualizadas'})
    finally:
        db.close()


# ── ADMIN ─────────────────────────────────────────────────────────────────────

@app.route('/admin/produtos', methods=['GET', 'PUT', 'OPTIONS'])
def admin_produtos():
    uid, e = require_admin()
    if e:
        return e

    db = get_db()
    try:
        if request.method == 'GET':
            status = request.args.get('status', 'pendente')
            with db.cursor() as c:
                c.execute(
                    "SELECT p.id, p.titulo, p.preco, p.categoria, p.status, p.criado_em, u.nome as vendedor_nome, u.id as vendedor_id FROM produtos p JOIN usuarios u ON p.usuario_id=u.id WHERE p.status=%s ORDER BY p.criado_em DESC",
                    (status,)
                )
                produtos = c.fetchall()
            return ok({'produtos': [{**p, 'preco': float(p['preco']), 'criado_em': str(p['criado_em'])} for p in produtos]})

        body = get_body()
        pid = int(body.get('produto_id', 0))
        acao = body.get('acao', '')
        motivo = body.get('motivo', '')

        if not pid or acao not in ['aprovar', 'rejeitar', 'remover']:
            return err('produto_id e ação válida são obrigatórios')

        with db.cursor() as c:
            c.execute("SELECT usuario_id FROM produtos WHERE id=%s", (pid,))
            p = c.fetchone()
        if not p:
            return err('Produto não encontrado', 404)

        status_map = {'aprovar': 'disponivel', 'rejeitar': 'rejeitado', 'remover': 'removido'}
        with db.cursor() as c:
            c.execute("UPDATE produtos SET status=%s WHERE id=%s", (status_map[acao], pid))

        msgs = {'aprovar': 'Produto aprovado!', 'rejeitar': f'Produto rejeitado: {motivo}', 'remover': 'Produto removido por violação das regras.'}
        notificar(db, p['usuario_id'], 'moderacao', msgs[acao], '', '/Templates/meus-produtos.html')
        return ok({'message': f'Produto {acao}do com sucesso'})
    finally:
        db.close()


@app.route('/admin/usuarios', methods=['GET', 'PUT', 'OPTIONS'])
def admin_usuarios():
    uid, e = require_admin()
    if e:
        return e

    db = get_db()
    try:
        if request.method == 'GET':
            busca = request.args.get('busca', '')
            with db.cursor() as c:
                if busca:
                    c.execute("SELECT id, nome, email, papel, ativo, criado_em, bloco, apartamento FROM usuarios WHERE nome LIKE %s OR email LIKE %s ORDER BY criado_em DESC", (f'%{busca}%', f'%{busca}%'))
                else:
                    c.execute("SELECT id, nome, email, papel, ativo, criado_em, bloco, apartamento FROM usuarios ORDER BY criado_em DESC")
                users = c.fetchall()
            return ok({'usuarios': [{**u, 'ativo': bool(u['ativo']), 'criado_em': str(u['criado_em'])} for u in users]})

        body = get_body()
        target_id = int(body.get('usuario_id', 0))
        acao = body.get('acao', '')
        if not target_id or acao not in ['banir', 'desbanir', 'tornar_admin', 'tornar_usuario']:
            return err('usuario_id e ação válida são obrigatórios')

        with db.cursor() as c:
            if acao == 'banir':
                c.execute("UPDATE usuarios SET ativo=0 WHERE id=%s", (target_id,))
            elif acao == 'desbanir':
                c.execute("UPDATE usuarios SET ativo=1 WHERE id=%s", (target_id,))
            elif acao == 'tornar_admin':
                c.execute("UPDATE usuarios SET papel='admin' WHERE id=%s", (target_id,))
            elif acao == 'tornar_usuario':
                c.execute("UPDATE usuarios SET papel='usuario' WHERE id=%s", (target_id,))
        return ok({'message': 'Usuário atualizado com sucesso'})
    finally:
        db.close()


@app.route('/admin/stats', methods=['GET', 'OPTIONS'])
def admin_stats():
    _, e = require_admin()
    if e:
        return e

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT COUNT(*) as n FROM usuarios"); total_usuarios = c.fetchone()['n']
            c.execute("SELECT COUNT(*) as n FROM produtos"); total_produtos = c.fetchone()['n']
            c.execute("SELECT COUNT(*) as n FROM pedidos"); total_pedidos = c.fetchone()['n']
            c.execute("SELECT COUNT(*) as n FROM mensagens"); total_mensagens = c.fetchone()['n']
            c.execute("SELECT COUNT(*) as n FROM usuarios WHERE ativo=0"); banidos = c.fetchone()['n']
            c.execute(
                "SELECT r.id, r.tipo, r.motivo, r.criado_em, u.nome as autor FROM relatorios r JOIN usuarios u ON r.usuario_id=u.id WHERE r.status='pendente' ORDER BY r.criado_em DESC LIMIT 10"
            )
            relatorios = c.fetchall()

        return ok({
            'total_usuarios': total_usuarios, 'total_produtos': total_produtos,
            'total_pedidos': total_pedidos, 'total_mensagens': total_mensagens,
            'usuarios_banidos': banidos,
            'relatorios_pendentes': [{**r, 'criado_em': str(r['criado_em'])} for r in relatorios]
        })
    finally:
        db.close()


# ── RELATÓRIOS ────────────────────────────────────────────────────────────────

@app.route('/relatorios', methods=['POST', 'OPTIONS'])
def relatorios():
    uid, e = require_auth()
    if e:
        return e

    body = get_body()
    tipo = body.get('tipo', '')
    alvo_id = int(body.get('alvo_id', 0))
    motivo = (body.get('motivo') or '').strip()

    if tipo not in ['produto', 'usuario'] or not alvo_id or not motivo:
        return err('tipo, alvo_id e motivo são obrigatórios')

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("INSERT INTO relatorios (usuario_id, tipo, alvo_id, motivo) VALUES (%s,%s,%s,%s)", (uid, tipo, alvo_id, motivo))
        return ok({'message': 'Denúncia registrada com sucesso'}, 201)
    finally:
        db.close()


# ── CONTATO ───────────────────────────────────────────────────────────────────

@app.route('/contato', methods=['POST', 'OPTIONS'])
def contato():
    body = get_body()
    nome = (body.get('nome') or '').strip()
    email = (body.get('email') or '').strip()
    assunto = body.get('assunto', '')
    mensagem = (body.get('mensagem') or '').strip()

    if not nome or not email or not mensagem:
        return err('Preencha todos os campos obrigatórios.')
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return err('E-mail inválido.')

    assunto_labels = {'suporte': 'Suporte técnico', 'conta': 'Problema com minha conta',
                      'pedido': 'Problema com pedido', 'denuncia': 'Denúncia',
                      'sugestao': 'Sugestão de melhoria'}
    assunto_label = assunto_labels.get(assunto, 'Outro')

    corpo = email_layout('📩 Nova mensagem de contato',
        f"""<p style='color:#64748b;font-size:13px;margin-bottom:24px;'>Recebida pelo formulário do CondConnect</p>
        <table style='width:100%;border-collapse:collapse;font-size:14px;'>
          <tr><td style='padding:10px 0;color:#64748b;width:100px;'>Nome</td><td style='color:#1e293b;font-weight:600;'>{nome}</td></tr>
          <tr><td style='padding:10px 0;color:#64748b;'>E-mail</td><td style='color:#1e293b;font-weight:600;'>{email}</td></tr>
          <tr><td style='padding:10px 0;color:#64748b;'>Assunto</td><td style='color:#1e293b;font-weight:600;'>{assunto_label}</td></tr>
        </table>
        <hr style='border:none;border-top:1px solid #e2e8f0;margin:20px 0;'>
        <p style='color:#64748b;font-size:13px;margin-bottom:8px;font-weight:600;'>Mensagem:</p>
        <p style='color:#1e293b;font-size:15px;line-height:1.6;white-space:pre-wrap;'>{mensagem}</p>"""
    )

    enviado = send_email('condconnect2025@gmail.com', f'Contato CondConnect: {assunto_label}', corpo)
    if not enviado:
        return err('Erro ao enviar mensagem. Tente novamente mais tarde.', 500)
    return ok({'ok': True})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

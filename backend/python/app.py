import os
import re
import secrets
import bcrypt
import urllib.request
import urllib.parse
import json as _json
import pymysql
import pymysql.cursors
import boto3
from botocore.exceptions import ClientError
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
    if data is None:
        data = {}
    return jsonify(data), status

def err(msg, status=400):
    return jsonify({'error': msg}), status

def get_body():
    return request.get_json(silent=True) or {}

def require_auth():
    if 'user_id' not in session:
        return None, err('Não autenticado. Faça login para continuar.', 401)
    uid = session['user_id']
    sv_session = session.get('session_version')
    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT session_version FROM usuarios WHERE id=%s", (uid,))
            row = c.fetchone()
        if row and row['session_version'] != sv_session:
            session.clear()
            return None, err('Sessão expirada. Faça login novamente.', 401)
    finally:
        db.close()
    return uid, None

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

def fmt_price(v):
    return f"R$ {float(v):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

def moderar_imagem(image_bytes):
    access_key = os.environ.get('AWS_ACCESS_KEY_ID')
    secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY')
    region     = os.environ.get('AWS_REGION', 'us-east-1')
    if not access_key or not secret_key:
        return None  # credenciais não configuradas — deixa passar
    try:
        client = boto3.client(
            'rekognition',
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )
        response = client.detect_moderation_labels(
            Image={'Bytes': image_bytes},
            MinConfidence=70,
        )
        labels = [l['Name'] for l in response.get('ModerationLabels', [])]
        return labels if labels else None
    except ClientError as e:
        print(f'Rekognition ClientError: {e}')
        return None  # falha na API — não bloqueia o upload
    except Exception as e:
        print(f'Rekognition error: {e}')
        return None

RECAPTCHA_SECRET = '6LcuN-wsAAAAAN9Kw5TT-ewEqsdLgfEN-UWZA_AW'

def verificar_recaptcha(token):
    if not token:
        return False
    try:
        data = urllib.parse.urlencode({'secret': RECAPTCHA_SECRET, 'response': token}).encode()
        req = urllib.request.Request('https://www.google.com/recaptcha/api/siteverify', data=data)
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = _json.loads(resp.read())
        return result.get('success', False)
    except Exception as e:
        print(f'reCAPTCHA error: {e}')
        return False

def send_sms(phone, codigo):
    access_key = os.environ.get('AWS_ACCESS_KEY_ID')
    secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY')
    region = os.environ.get('AWS_REGION', 'us-east-1')
    if not access_key or not secret_key:
        return False
    try:
        digits = re.sub(r'\D', '', phone or '')
        if not digits:
            return False
        if not digits.startswith('55'):
            digits = '55' + digits
        client = boto3.client('sns', region_name=region,
            aws_access_key_id=access_key, aws_secret_access_key=secret_key)
        client.publish(
            PhoneNumber='+' + digits,
            Message=f'CondConnect: seu codigo de verificacao e {codigo}. Valido por 10 minutos.',
            MessageAttributes={'AWS.SNS.SMS.SMSType': {'DataType': 'String', 'StringValue': 'Transactional'}}
        )
        return True
    except Exception as e:
        print(f'SMS error: {e}')
        return False

@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        return ok(), 200


# ── DB INIT ───────────────────────────────────────────────────────────────────

def init_db():
    try:
        db = get_db()
        with db.cursor() as c:
            c.execute("""
                CREATE TABLE IF NOT EXISTS propostas (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    produto_id INT NOT NULL,
                    comprador_id INT NOT NULL,
                    vendedor_id INT NOT NULL,
                    valor_proposto DECIMAL(10,2) NOT NULL,
                    mensagem TEXT,
                    status ENUM('pendente','aceita','recusada','cancelada') DEFAULT 'pendente',
                    criado_em DATETIME DEFAULT NOW(),
                    atualizado_em DATETIME DEFAULT NOW() ON UPDATE NOW()
                )
            """)
            try:
                c.execute("ALTER TABLE itens_carrinho ADD COLUMN preco_negociado DECIMAL(10,2) NULL DEFAULT NULL")
            except Exception:
                pass  # column already exists
            try:
                c.execute("ALTER TABLE propostas ADD COLUMN quantidade INT NOT NULL DEFAULT 1")
            except Exception:
                pass
            try:
                c.execute("ALTER TABLE usuarios ADD COLUMN pix_key VARCHAR(255) NULL DEFAULT NULL")
            except Exception:
                pass
            try:
                c.execute("ALTER TABLE configuracoes_usuario ADD COLUMN metodo_2fa ENUM('email','sms') DEFAULT 'email'")
            except Exception:
                pass
            try:
                c.execute("ALTER TABLE usuarios ADD COLUMN cpf VARCHAR(14) NULL DEFAULT NULL")
            except Exception:
                pass
            try:
                c.execute("ALTER TABLE usuarios ADD COLUMN telefone VARCHAR(15) NULL DEFAULT NULL")
            except Exception:
                pass
            try:
                c.execute("ALTER TABLE usuarios ADD COLUMN cep VARCHAR(9) NULL DEFAULT NULL")
            except Exception:
                pass
            try:
                c.execute("ALTER TABLE usuarios ADD COLUMN logradouro VARCHAR(255) NULL DEFAULT NULL")
            except Exception:
                pass
            try:
                c.execute("ALTER TABLE usuarios ADD COLUMN numero VARCHAR(20) NULL DEFAULT NULL")
            except Exception:
                pass
            try:
                c.execute("ALTER TABLE usuarios ADD COLUMN bairro VARCHAR(100) NULL DEFAULT NULL")
            except Exception:
                pass
            try:
                c.execute("ALTER TABLE usuarios ADD COLUMN cidade VARCHAR(100) NULL DEFAULT NULL")
            except Exception:
                pass
            try:
                c.execute("ALTER TABLE usuarios ADD COLUMN estado VARCHAR(2) NULL DEFAULT NULL")
            except Exception:
                pass
            try:
                c.execute("ALTER TABLE produtos ADD COLUMN custo DECIMAL(10,2) NULL DEFAULT NULL")
            except Exception:
                pass
            try:
                c.execute("ALTER TABLE produtos ADD COLUMN visualizacoes INT NOT NULL DEFAULT 0")
            except Exception:
                pass
            c.execute("""
                CREATE TABLE IF NOT EXISTS produto_insumos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    produto_id INT NOT NULL,
                    nome VARCHAR(100) NOT NULL,
                    quantidade DECIMAL(10,3) NOT NULL DEFAULT 1,
                    unidade VARCHAR(20) NOT NULL DEFAULT 'un',
                    custo DECIMAL(10,2) NOT NULL DEFAULT 0,
                    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
                )
            """)
        db.close()
    except Exception as e:
        print(f'init_db error: {e}')

init_db()


# ── AUTH ──────────────────────────────────────────────────────────────────────

@app.route('/auth/login', methods=['POST', 'OPTIONS'])
def login():
    body = get_body()
    email = (body.get('email') or '').strip()
    senha = body.get('senha') or ''
    if not email or not senha:
        return err('E-mail e senha são obrigatórios')
    if not verificar_recaptcha(body.get('recaptcha_token', '')):
        return err('Verificação de segurança falhou. Tente novamente.')

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT id, nome, email, senha, papel, foto_url, apartamento, bloco, session_version FROM usuarios WHERE email=%s AND ativo=1", (email,))
            user = c.fetchone()
        if not user or not check_password(senha, user['senha']):
            return err('E-mail ou senha incorretos', 401)

        codigo = str(secrets.randbelow(900000) + 100000)
        expira = datetime.now() + timedelta(minutes=10)
        with db.cursor() as c:
            c.execute("UPDATE usuarios SET codigo_2fa=%s, codigo_2fa_expira=%s WHERE id=%s", (codigo, expira, user['id']))

        em = user['email']
        at = em.index('@')
        destino = (em[0] + '***' + em[at - 1] if at > 1 else em[0] + '***') + em[at:]

        corpo = email_layout('🔐 Código de verificação',
            f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'>Olá, <strong>{user['nome']}</strong>! Use o código abaixo para acessar o CondConnect.</p>
            <div style='background:#f0fafa;border:2px solid #00a6a6;border-radius:16px;padding:28px;text-align:center;margin-bottom:20px;'>
                <p style='margin:0 0 8px;color:#64748b;font-size:13px;'>Seu código de verificação</p>
                <p style='margin:0;font-size:42px;font-weight:800;color:#00a6a6;letter-spacing:12px;'>{codigo}</p>
            </div>
            <p style='color:#94a3b8;font-size:13px;text-align:center;'>Válido por <strong>10 minutos</strong>. Não compartilhe este código com ninguém.</p>"""
        )
        send_email(user['email'], '🔐 Seu código de verificação - CondConnect', corpo)

        session.clear()
        session['pending_2fa_uid'] = user['id']

        return ok({'requires_2fa': True, 'destino': destino})
    finally:
        db.close()


def salvar_insumos(db, produto_id, insumos):
    with db.cursor() as c:
        c.execute("DELETE FROM produto_insumos WHERE produto_id=%s", (produto_id,))
        total_custo = 0
        for item in insumos:
            nome  = str(item.get('nome', '')).strip()[:100]
            qtd   = float(item.get('quantidade', 1) or 1)
            unid  = str(item.get('unidade', 'un')).strip()[:20]
            custo = float(item.get('custo', 0) or 0)
            if not nome:
                continue
            c.execute("INSERT INTO produto_insumos (produto_id, nome, quantidade, unidade, custo) VALUES (%s,%s,%s,%s,%s)",
                      (produto_id, nome, qtd, unid, custo))
            total_custo += custo
        if insumos:
            c.execute("UPDATE produtos SET custo=%s WHERE id=%s", (total_custo, produto_id))
    return total_custo


def validar_cpf(cpf):
    cpf = re.sub(r'\D', '', cpf)
    if len(cpf) != 11 or re.match(r'^(\d)\1{10}$', cpf):
        return False
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    resto = (soma * 10) % 11
    if resto >= 10:
        resto = 0
    if resto != int(cpf[9]):
        return False
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    resto = (soma * 10) % 11
    if resto >= 10:
        resto = 0
    return resto == int(cpf[10])


@app.route('/auth/register', methods=['POST', 'OPTIONS'])
def register():
    body = get_body()
    nome       = (body.get('nome') or '').strip()
    email      = (body.get('email') or '').strip()
    senha      = body.get('senha') or ''
    apto       = (body.get('apartamento') or '').strip()
    bloco      = (body.get('bloco') or '').strip()
    cpf        = (body.get('cpf') or '').strip()
    telefone   = (body.get('telefone') or '').strip() or None
    cep        = (body.get('cep') or '').strip() or None
    logradouro = (body.get('logradouro') or '').strip() or None
    numero     = (body.get('numero') or '').strip() or None
    bairro     = (body.get('bairro') or '').strip() or None
    cidade     = (body.get('cidade') or '').strip() or None
    estado     = (body.get('estado') or '').strip() or None

    if not all([nome, email, senha, apto, bloco]):
        return err('Todos os campos são obrigatórios')
    if not verificar_recaptcha(body.get('recaptcha_token', '')):
        return err('Verificação de segurança falhou. Tente novamente.')
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return err('E-mail inválido')
    if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$', senha):
        return err('A senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula, número e símbolo')
    if cpf and not validar_cpf(cpf):
        return err('CPF inválido')

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT id FROM usuarios WHERE email=%s", (email,))
            if c.fetchone():
                return err('Este e-mail já está cadastrado')
            if cpf:
                cpf_digits = re.sub(r'\D', '', cpf)
                c.execute("SELECT id FROM usuarios WHERE cpf=%s", (cpf_digits,))
                if c.fetchone():
                    return err('CPF já cadastrado')

            hashed = hash_password(senha)
            cpf_store = re.sub(r'\D', '', cpf) if cpf else None
            c.execute(
                """INSERT INTO usuarios
                   (nome, email, senha, apartamento, bloco, cpf, telefone, cep, logradouro, numero, bairro, cidade, estado)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (nome, email, hashed, apto, bloco, cpf_store, telefone, cep, logradouro, numero, bairro, cidade, estado)
            )
            uid = c.lastrowid
            c.execute("INSERT INTO configuracoes_usuario (usuario_id) VALUES (%s)", (uid,))

        return ok({'message': 'Conta criada com sucesso'}, 201)
    finally:
        db.close()


@app.route('/auth/logout', methods=['POST', 'GET', 'OPTIONS'])
def logout():
    session.clear()
    return ok({'message': 'Logout realizado com sucesso'})


@app.route('/auth/verificar-2fa', methods=['POST', 'OPTIONS'])
def verificar_2fa():
    uid = session.get('pending_2fa_uid')
    if not uid:
        return err('Sessão expirada. Faça login novamente.', 401)

    body = get_body()
    codigo = (body.get('codigo') or '').strip()
    if not codigo:
        return err('Informe o código de verificação')

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT id, nome, email, papel, foto_url, apartamento, bloco, session_version, codigo_2fa, codigo_2fa_expira FROM usuarios WHERE id=%s", (uid,))
            user = c.fetchone()

        if not user:
            return err('Usuário não encontrado', 404)
        if not user['codigo_2fa'] or user['codigo_2fa'] != codigo:
            return err('Código incorreto')
        if not user['codigo_2fa_expira'] or datetime.now() > user['codigo_2fa_expira']:
            return err('Código expirado. Faça login novamente.')

        with db.cursor() as c:
            c.execute("UPDATE usuarios SET codigo_2fa=NULL, codigo_2fa_expira=NULL WHERE id=%s", (uid,))

        session.pop('pending_2fa_uid', None)
        session['user_id'] = user['id']
        session['user_role'] = user['papel']
        session['session_version'] = user['session_version']

        return ok({
            'id': user['id'], 'nome': user['nome'], 'email': user['email'],
            'papel': user['papel'], 'foto_url': user['foto_url'],
            'apartamento': user['apartamento'], 'bloco': user['bloco']
        })
    finally:
        db.close()


@app.route('/auth/reenviar-2fa', methods=['POST', 'OPTIONS'])
def reenviar_2fa():
    uid = session.get('pending_2fa_uid')
    if not uid:
        return err('Sessão expirada. Faça login novamente.', 401)

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT nome, email FROM usuarios WHERE id=%s", (uid,))
            user = c.fetchone()
        if not user:
            return err('Usuário não encontrado', 404)

        codigo = str(secrets.randbelow(900000) + 100000)
        expira = datetime.now() + timedelta(minutes=10)
        with db.cursor() as c:
            c.execute("UPDATE usuarios SET codigo_2fa=%s, codigo_2fa_expira=%s WHERE id=%s", (codigo, expira, uid))

        corpo = email_layout('🔐 Novo código de verificação',
            f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'>Olá, <strong>{user['nome']}</strong>! Aqui está seu novo código.</p>
            <div style='background:#f0fafa;border:2px solid #00a6a6;border-radius:16px;padding:28px;text-align:center;margin-bottom:20px;'>
                <p style='margin:0 0 8px;color:#64748b;font-size:13px;'>Seu código de verificação</p>
                <p style='margin:0;font-size:42px;font-weight:800;color:#00a6a6;letter-spacing:12px;'>{codigo}</p>
            </div>
            <p style='color:#94a3b8;font-size:13px;text-align:center;'>Válido por <strong>10 minutos</strong>.</p>"""
        )
        send_email(user['email'], '🔐 Novo código de verificação - CondConnect', corpo)
        return ok({'message': 'Código reenviado'})
    finally:
        db.close()


@app.route('/auth/logout-all', methods=['POST', 'OPTIONS'])
def logout_all():
    uid, e = require_auth()
    if e:
        return e
    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("UPDATE usuarios SET session_version = session_version + 1 WHERE id=%s", (uid,))
        session.clear()
        return ok({'message': 'Sessão encerrada em todos os dispositivos'})
    finally:
        db.close()


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

    if not token:
        return err('Dados inválidos')
    if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$', senha):
        return err('A senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula, número e símbolo')

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

@app.route('/me', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
def me():
    uid, e = require_auth()
    if e:
        return e

    db = get_db()
    try:
        if request.method == 'GET':
            with db.cursor() as c:
                c.execute(
                    "SELECT id,nome,email,telefone,apartamento,bloco,foto_url,bio,pix_key,rating,total_vendas,total_compras,papel,criado_em FROM usuarios WHERE id=%s",
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
                c.execute("SELECT COUNT(*) as n FROM pedidos WHERE comprador_id=%s AND status NOT IN ('entregue','cancelado')", (uid,))
                pedidos_ativos = c.fetchone()['n']
                c.execute("SELECT COUNT(*) as n FROM pedidos WHERE vendedor_id=%s AND status NOT IN ('entregue','cancelado')", (uid,))
                vendas_ativas = c.fetchone()['n']
                c.execute(
                    "SELECT COUNT(*) as n FROM propostas p JOIN produtos pr ON p.produto_id=pr.id WHERE pr.usuario_id=%s AND p.status='pendente'",
                    (uid,)
                )
                propostas_pendentes = c.fetchone()['n']

            return ok({**user, 'id': int(user['id']), 'rating': float(user['rating'] or 0),
                       'total_vendas': total_vendas, 'total_compras': int(user['total_compras'] or 0),
                       'total_produtos': total_produtos, 'total_favoritos': total_favoritos,
                       'total_pedidos': total_pedidos, 'faturamento': faturamento,
                       'notif_nao_lidas': notif, 'msg_nao_lidas': msg_nao_lidas,
                       'pedidos_ativos': int(pedidos_ativos), 'vendas_ativas': int(vendas_ativas),
                       'propostas_pendentes': int(propostas_pendentes)})

        if request.method == 'DELETE':
            with db.cursor() as c:
                c.execute("DELETE FROM usuarios WHERE id=%s", (uid,))
            session.clear()
            return ok({'message': 'Conta excluída com sucesso'})

        # PUT
        body = get_body()
        campos, valores = [], []
        for campo in ['nome', 'telefone', 'apartamento', 'bloco', 'bio', 'pix_key', 'foto_url']:
            if campo in body:
                campos.append(f"{campo}=%s")
                valores.append(body[campo].strip() if isinstance(body[campo], str) else body[campo])

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
            return ok({'message': 'Sem alterações'})

        valores.append(uid)
        with db.cursor() as c:
            c.execute(f"UPDATE usuarios SET {', '.join(campos)} WHERE id=%s", valores)

        return ok({'message': 'Perfil atualizado com sucesso'})
    finally:
        db.close()


# ── ANALYTICS ────────────────────────────────────────────────────────────────

@app.route('/me/analytics', methods=['GET', 'OPTIONS'])
def me_analytics():
    uid, e = require_auth()
    if e:
        return e

    dias = min(int(request.args.get('dias', 30)), 365)
    produto_id = request.args.get('produto_id')
    produto_id = int(produto_id) if produto_id and produto_id.isdigit() else None
    data_inicio = datetime.now() - timedelta(days=dias)

    db = get_db()
    try:
        filtro_produto = "AND pe.produto_id=%s" if produto_id else ""
        params_produto = (produto_id,) if produto_id else ()

        # Visão financeira
        with db.cursor() as c:
            c.execute(f"""
                SELECT COUNT(*) as total_pedidos,
                       COALESCE(SUM(preco_total), 0) as faturamento,
                       COALESCE(AVG(preco_total), 0) as ticket_medio
                FROM pedidos pe WHERE vendedor_id=%s AND status='entregue' AND criado_em >= %s {filtro_produto}
            """, (uid, data_inicio) + params_produto)
            financeiro = c.fetchone()

        with db.cursor() as c:
            c.execute(f"""
                SELECT COALESCE(SUM(pe.preco_total - (COALESCE(pr.custo, 0) * pe.quantidade)), 0) as lucro,
                       COALESCE(SUM(pe.preco_total), 0) as fat_com_custo
                FROM pedidos pe JOIN produtos pr ON pe.produto_id=pr.id
                WHERE pe.vendedor_id=%s AND pe.status='entregue' AND pe.criado_em >= %s
                  AND pr.custo IS NOT NULL AND pr.custo > 0 {filtro_produto}
            """, (uid, data_inicio) + params_produto)
            custo_row = c.fetchone()

        # Performance de produtos (top 10 por receita)
        with db.cursor() as c:
            c.execute("""
                SELECT pr.id, pr.titulo, pr.categoria, pr.preco, pr.custo, pr.visualizacoes,
                       COUNT(pe.id) as total_vendas,
                       COALESCE(SUM(pe.quantidade), 0) as unidades,
                       COALESCE(SUM(pe.preco_total), 0) as receita
                FROM produtos pr
                LEFT JOIN pedidos pe ON pe.produto_id=pr.id AND pe.status='entregue' AND pe.criado_em >= %s
                WHERE pr.usuario_id=%s
                GROUP BY pr.id ORDER BY receita DESC LIMIT 10
            """, (data_inicio, uid))
            produtos_perf = c.fetchall()

        with db.cursor() as c:
            c.execute("""
                SELECT COUNT(*) as n FROM produtos WHERE usuario_id=%s AND status='disponivel'
                AND id NOT IN (SELECT DISTINCT produto_id FROM pedidos WHERE status='entregue')
            """, (uid,))
            encalhados = int(c.fetchone()['n'])

        # Comportamento de clientes
        with db.cursor() as c:
            c.execute(f"""
                SELECT pe.comprador_id, COUNT(*) as pedidos
                FROM pedidos pe WHERE pe.vendedor_id=%s AND pe.status='entregue' AND pe.criado_em >= %s {filtro_produto}
                GROUP BY pe.comprador_id
            """, (uid, data_inicio) + params_produto)
            compradores = c.fetchall()

        total_compradores = len(compradores)
        recorrentes = sum(1 for r in compradores if r['pedidos'] > 1)
        novos = total_compradores - recorrentes

        with db.cursor() as c:
            c.execute(f"""
                SELECT COUNT(DISTINCT pe.comprador_id) as n, COALESCE(SUM(pe.preco_total),0) as fat
                FROM pedidos pe WHERE pe.vendedor_id=%s AND pe.status='entregue' {filtro_produto}
            """, (uid,) + params_produto)
            ltv_row = c.fetchone()
        ltv = float(ltv_row['fat']) / ltv_row['n'] if ltv_row['n'] else 0

        # Funil de conversão
        with db.cursor() as c:
            c.execute("SELECT COALESCE(SUM(visualizacoes),0) as v FROM produtos WHERE usuario_id=%s", (uid,))
            views = int(c.fetchone()['v'])

        with db.cursor() as c:
            c.execute("""
                SELECT COUNT(*) as n FROM favoritos f
                JOIN produtos pr ON f.produto_id=pr.id WHERE pr.usuario_id=%s
            """, (uid,))
            favoritos_total = int(c.fetchone()['n'])

        with db.cursor() as c:
            c.execute("SELECT COUNT(*) as n FROM pedidos WHERE vendedor_id=%s AND status!='cancelado'", (uid,))
            pedidos_iniciados = int(c.fetchone()['n'])

        with db.cursor() as c:
            c.execute("SELECT COUNT(*) as n FROM pedidos WHERE vendedor_id=%s AND status='entregue'", (uid,))
            pedidos_entregues = int(c.fetchone()['n'])

        # Temporal: vendas por dia da semana (MySQL: 1=Dom...7=Sáb)
        with db.cursor() as c:
            c.execute(f"""
                SELECT DAYOFWEEK(pe.criado_em) as dow, COUNT(*) as pedidos, COALESCE(SUM(pe.preco_total),0) as receita
                FROM pedidos pe WHERE pe.vendedor_id=%s AND pe.status='entregue' {filtro_produto}
                GROUP BY dow ORDER BY dow
            """, (uid,) + params_produto)
            por_dow = {r['dow']: r for r in c.fetchall()}

        nomes_dow = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        vendas_por_dia = [
            {'dia': nomes_dow[i], 'pedidos': int(por_dow.get(i+1, {}).get('pedidos', 0)),
             'receita': float(por_dow.get(i+1, {}).get('receita', 0))}
            for i in range(7)
        ]

        # Temporal: últimos 6 meses
        with db.cursor() as c:
            c.execute(f"""
                SELECT DATE_FORMAT(pe.criado_em,'%%Y-%%m') as mes,
                       COALESCE(SUM(pe.preco_total),0) as receita, COUNT(*) as pedidos
                FROM pedidos pe WHERE pe.vendedor_id=%s AND pe.status='entregue'
                  AND pe.criado_em >= DATE_SUB(NOW(), INTERVAL 6 MONTH) {filtro_produto}
                GROUP BY mes ORDER BY mes
            """, (uid,) + params_produto)
            por_mes = [{'mes': r['mes'], 'receita': float(r['receita']), 'pedidos': int(r['pedidos'])}
                       for r in c.fetchall()]

        return ok({
            'financeiro': {
                'faturamento': float(financeiro['faturamento']),
                'ticket_medio': float(financeiro['ticket_medio']),
                'total_pedidos': int(financeiro['total_pedidos']),
                'lucro_liquido': float(custo_row['lucro']),
                'has_custo': float(custo_row['fat_com_custo']) > 0,
            },
            'produtos': [{
                'id': p['id'], 'titulo': p['titulo'], 'categoria': p['categoria'],
                'preco': float(p['preco']),
                'custo': float(p['custo']) if p['custo'] else None,
                'visualizacoes': int(p['visualizacoes'] or 0),
                'total_vendas': int(p['total_vendas']),
                'unidades': int(p['unidades']),
                'receita': float(p['receita']),
                'margem_pct': round((1 - float(p['custo']) / float(p['preco'])) * 100, 1)
                             if p['custo'] and float(p['preco']) > 0 else None,
            } for p in produtos_perf],
            'encalhados': encalhados,
            'clientes': {
                'total': total_compradores,
                'novos': novos,
                'recorrentes': recorrentes,
                'ltv': round(ltv, 2),
                'pct_novos': round(novos / total_compradores * 100) if total_compradores else 0,
                'pct_recorrentes': round(recorrentes / total_compradores * 100) if total_compradores else 0,
            },
            'funil': {
                'views': views,
                'favoritos': favoritos_total,
                'pedidos_iniciados': pedidos_iniciados,
                'pedidos_entregues': pedidos_entregues,
            },
            'temporal': {
                'por_dia_semana': vendas_por_dia,
                'por_mes': por_mes,
            },
            'periodo_dias': dias,
            'produto_id_filtro': produto_id,
        })
    finally:
        db.close()


@app.route('/me/produtos-lista', methods=['GET', 'OPTIONS'])
def me_produtos_lista():
    uid, e = require_auth()
    if e:
        return e
    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT id, titulo, custo FROM produtos WHERE usuario_id=%s AND status != 'rejeitado' ORDER BY titulo", (uid,))
            rows = c.fetchall()
        return ok([{'id': r['id'], 'titulo': r['titulo'], 'custo': float(r['custo']) if r['custo'] else None} for r in rows])
    finally:
        db.close()


@app.route('/me/insumos/<int:produto_id>', methods=['GET', 'OPTIONS'])
def me_insumos(produto_id):
    uid, e = require_auth()
    if e:
        return e
    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("SELECT usuario_id FROM produtos WHERE id=%s", (produto_id,))
            p = c.fetchone()
        if not p or p['usuario_id'] != uid:
            return err('Produto não encontrado', 404)
        with db.cursor() as c:
            c.execute("SELECT id, nome, quantidade, unidade, custo FROM produto_insumos WHERE produto_id=%s ORDER BY id", (produto_id,))
            insumos = [{'id': r['id'], 'nome': r['nome'], 'quantidade': float(r['quantidade']),
                        'unidade': r['unidade'], 'custo': float(r['custo'])} for r in c.fetchall()]
        return ok(insumos)
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
                    where.append("(p.titulo LIKE %s OR p.descricao LIKE %s OR u.nome LIKE %s)")
                    params += [f'%{busca}%', f'%{busca}%', f'%{busca}%']
                if preco_min:
                    where.append("p.preco>=%s"); params.append(preco_min)
                if preco_max:
                    where.append("p.preco<=%s"); params.append(preco_max)

            sql = f"""SELECT p.id, p.titulo, p.preco, p.categoria, p.condicao, p.foto_principal, p.status, p.criado_em,
                             u.id as vendedor_id, u.nome as vendedor_nome, u.bloco as vendedor_bloco,
                             u.apartamento as vendedor_apto, u.rating as vendedor_rating, u.total_vendas as vendedor_vendas,
                             (SELECT ROUND(AVG(nota),1) FROM avaliacoes WHERE produto_id=p.id) as produto_rating,
                             (SELECT COUNT(*) FROM avaliacoes WHERE produto_id=p.id) as produto_avaliacoes,
                             (SELECT COUNT(*) FROM favoritos WHERE produto_id=p.id) as total_favoritos,
                             COALESCE((SELECT cu.privacidade_endereco FROM configuracoes_usuario cu WHERE cu.usuario_id=u.id LIMIT 1), 0) as privacidade_endereco
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
                privado = bool(p.get('privacidade_endereco'))
                localizacao = 'Localização privada' if privado else f"Bloco {p['vendedor_bloco']} - Apto {p['vendedor_apto']}"
                result.append({
                    'id': p['id'], 'titulo': p['titulo'],
                    'preco': float(p['preco']),
                    'preco_fmt': f"{float(p['preco']):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
                    'categoria': p['categoria'], 'condicao': p['condicao'],
                    'foto': p['foto_principal'], 'status': p['status'],
                    'criado_em': str(p['criado_em']), 'favorito': p['id'] in favs,
                    'produto_rating': float(p['produto_rating']) if p['produto_rating'] else None,
                    'produto_avaliacoes': int(p['produto_avaliacoes'] or 0),
                    'total_favoritos': int(p['total_favoritos'] or 0),
                    'vendedor': {
                        'id': p['vendedor_id'], 'nome': p['vendedor_nome'],
                        'localizacao': localizacao,
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
        titulo = (body.get('titulo') or '').strip()[:60]
        preco = body.get('preco')
        categoria = body.get('categoria', '')
        descricao = (body.get('descricao') or '')[:300]
        condicao = body.get('condicao', 'Usado')
        foto = body.get('foto_principal', '')
        quantidade = int(body.get('quantidade', 1))
        custo = body.get('custo')
        custo = float(custo) if custo not in (None, '', 0, '0') else None

        if not titulo or preco is None:
            return err('Título e preço são obrigatórios')

        imagens_extras = body.get('imagens_extras', [])

        with db.cursor() as c:
            c.execute(
                "INSERT INTO produtos (usuario_id, titulo, preco, categoria, descricao, condicao, foto_principal, quantidade, custo) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (uid, titulo, preco, categoria, descricao, condicao, foto, quantidade, custo)
            )
            pid = c.lastrowid

        if imagens_extras:
            with db.cursor() as c:
                for i, url in enumerate(imagens_extras):
                    if url:
                        c.execute("INSERT INTO imagens_produto (produto_id, url, ordem) VALUES (%s,%s,%s)", (pid, url, i))

        insumos = body.get('insumos', [])
        if insumos:
            salvar_insumos(db, pid, insumos)

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
                              u.apartamento as vapto, u.rating as vrating, u.total_vendas as vvendas,
                              u.bio as vbio, u.foto_url as vfoto_url, u.pix_key as vpix_key,
                              COALESCE((SELECT cu.privacidade_endereco FROM configuracoes_usuario cu WHERE cu.usuario_id=u.id LIMIT 1), 0) as privacidade_endereco
                       FROM produtos p JOIN usuarios u ON p.usuario_id=u.id WHERE p.id=%s""",
                    (pid,)
                )
                p = c.fetchone()
            if not p:
                return err('Produto não encontrado', 404)

            with db.cursor() as c:
                c.execute("UPDATE produtos SET visualizacoes = visualizacoes + 1 WHERE id=%s", (pid,))

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

            with db.cursor() as c:
                c.execute("SELECT url FROM imagens_produto WHERE produto_id=%s ORDER BY ordem ASC", (pid,))
                imgs_extras = [r['url'] for r in c.fetchall()]

            with db.cursor() as c:
                c.execute("SELECT COUNT(*) as n FROM pedidos WHERE produto_id=%s AND status='entregue'", (pid,))
                total_vendidos = c.fetchone()['n']

            with db.cursor() as c:
                c.execute("SELECT id, nome, quantidade, unidade, custo FROM produto_insumos WHERE produto_id=%s ORDER BY id", (pid,))
                insumos = [{'id': r['id'], 'nome': r['nome'], 'quantidade': float(r['quantidade']),
                            'unidade': r['unidade'], 'custo': float(r['custo'])} for r in c.fetchall()]

            return ok({
                'id': p['id'], 'titulo': p['titulo'], 'descricao': p['descricao'],
                'preco': float(p['preco']),
                'preco_fmt': f"{float(p['preco']):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
                'custo': float(p['custo']) if p.get('custo') else None,
                'insumos': insumos,
                'categoria': p['categoria'], 'condicao': p['condicao'],
                'foto': p['foto_principal'], 'imagens': imgs_extras,
                'status': p['status'],
                'quantidade': p['quantidade'], 'total_vendidos': total_vendidos, 'criado_em': str(p['criado_em']),
                'favorito': fav,
                'vendedor': {
                    'id': p['vid'], 'nome': p['vnome'],
                    'localizacao': 'Localização privada' if p.get('privacidade_endereco') else f"Bloco {p['vbloco']} - Apto {p['vapto']}",
                    'rating': float(p['vrating'] or 0), 'vendas': p['vvendas'], 'bio': p['vbio'],
                    'foto_url': p['vfoto_url'], 'pix_key': p['vpix_key']
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
            if 'custo' in body:
                custo_val = body.get('custo')
                custo_val = float(custo_val) if custo_val not in (None, '', 0, '0') else None
                campos.append("custo=%s"); valores.append(custo_val)
            if not campos:
                return err('Nenhum campo para atualizar')
            valores.append(pid)
            with db.cursor() as c:
                c.execute(f"UPDATE produtos SET {', '.join(campos)} WHERE id=%s", valores)

            if 'imagens_extras' in body:
                imagens_extras = body.get('imagens_extras', [])
                with db.cursor() as c:
                    c.execute("DELETE FROM imagens_produto WHERE produto_id=%s", (pid,))
                    for i, url in enumerate(imagens_extras):
                        if url:
                            c.execute("INSERT INTO imagens_produto (produto_id, url, ordem) VALUES (%s,%s,%s)", (pid, url, i))

            if 'insumos' in body:
                salvar_insumos(db, pid, body['insumos'])

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
                sql = """SELECT p.id, p.quantidade, p.preco_total, p.status, p.codigo_entrega, p.criado_em, p.atualizado_em,
                                pr.titulo as produto_titulo, pr.foto_principal as produto_foto,
                                u.nome as outro_nome
                         FROM pedidos p JOIN produtos pr ON p.produto_id=pr.id
                         JOIN usuarios u ON p.vendedor_id=u.id
                         WHERE p.comprador_id=%s ORDER BY p.criado_em DESC"""

            with db.cursor() as c:
                c.execute(sql, (uid,))
                pedidos = c.fetchall()

            chave = 'comprador' if tipo == 'vendas' else 'vendedor'
            result = []
            for p in pedidos:
                item = {
                    'id': p['id'], 'id_fmt': fmt_id(p['id']),
                    'quantidade': p['quantidade'], 'preco_total': float(p['preco_total']),
                    'preco_fmt': f"{float(p['preco_total']):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
                    'status': p['status'], 'status_label': status_labels.get(p['status'], p['status']),
                    'criado_em': str(p['criado_em']),
                    'produto': {'titulo': p['produto_titulo'], 'foto': p['produto_foto'] or '/static/assets/images/produto-placeholder.jpg'},
                    chave: p['outro_nome']
                }
                if tipo == 'compras':
                    codigo = p.get('codigo_entrega')
                    if not codigo and p['status'] not in ('entregue', 'cancelado'):
                        codigo = f"{secrets.randbelow(10000):04d}"
                        with db.cursor() as c2:
                            c2.execute("UPDATE pedidos SET codigo_entrega=%s WHERE id=%s", (codigo, p['id']))
                    item['codigo_entrega'] = codigo
                result.append(item)

            return ok({'pedidos': result, 'total': len(result)})

        # POST - criar pedido
        body = get_body()
        produto_ids = body.get('produto_ids', [])

        if not produto_ids:
            with db.cursor() as c:
                c.execute(
                    "SELECT ic.produto_id, ic.quantidade, COALESCE(ic.preco_negociado, p.preco) as preco, p.usuario_id as vendedor_id, p.status FROM itens_carrinho ic JOIN produtos p ON ic.produto_id=p.id WHERE ic.usuario_id=%s",
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

            codigo = f"{secrets.randbelow(10000):04d}"

            with db.cursor() as c:
                c.execute(
                    "INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, codigo_entrega) VALUES (%s,%s,%s,%s,%s,%s)",
                    (uid, item['vendedor_id'], item['produto_id'], item['quantidade'], total, codigo)
                )
                pedido_id = c.lastrowid
            pedidos_criados.append(pedido_id)

            with db.cursor() as c:
                c.execute("UPDATE produtos SET quantidade=GREATEST(0, quantidade-%s) WHERE id=%s", (item['quantidade'], item['produto_id']))
                c.execute("UPDATE produtos SET status='vendido' WHERE id=%s AND quantidade=0", (item['produto_id'],))
                c.execute("UPDATE usuarios SET total_vendas=total_vendas+1 WHERE id=%s", (item['vendedor_id'],))
                c.execute("UPDATE usuarios SET total_compras=total_compras+1 WHERE id=%s", (uid,))

            notificar(db, item['vendedor_id'], 'pedido', 'Novo Pedido!', 'Você recebeu um novo pedido.', '/Templates/meus-pedidos.html')

            try:
                with db.cursor() as c:
                    c.execute("SELECT nome, email FROM usuarios WHERE id=%s", (item['vendedor_id'],))
                    vend = c.fetchone()
                    c.execute("SELECT nome, email FROM usuarios WHERE id=%s", (uid,))
                    comp = c.fetchone()
                    c.execute("SELECT titulo FROM produtos WHERE id=%s", (item['produto_id'],))
                    prod = c.fetchone()
                if vend and comp and prod:
                    id_fmt = fmt_id(pedido_id)
                    preco_str = f"R$ {total:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

                    # Email para o vendedor
                    corpo_vend = email_layout('🛒 Você recebeu um novo pedido!',
                        f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'>Olá, <strong>{vend['nome']}</strong>! Você recebeu um novo pedido no CondConnect.</p>
                        <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
                          <p style='margin:0;color:#64748b;font-size:13px;'>Produto</p>
                          <p style='margin:4px 0 12px;color:#1e293b;font-weight:700;font-size:16px;'>{prod['titulo']}</p>
                          <p style='margin:0;color:#64748b;font-size:13px;'>ID: <strong>{id_fmt}</strong> &nbsp;•&nbsp; Valor: <strong>{preco_str}</strong></p>
                          <p style='margin:8px 0 0;color:#64748b;font-size:13px;'>Comprador: <strong>{comp['nome']}</strong></p>
                        </div>
                        <a href='http://54.242.139.170/Templates/meus-pedidos.html' style='display:block;background:#00a6a6;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:100px;font-weight:700;margin-bottom:16px;'>Ver Pedido</a>"""
                    )
                    send_email(vend['email'], f"Novo pedido {id_fmt} - CondConnect", corpo_vend)

                    # Email para o comprador com código de entrega
                    corpo_comp = email_layout('🔑 Seu código de entrega',
                        f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'>Olá, <strong>{comp['nome']}</strong>! Seu pedido foi realizado com sucesso.</p>
                        <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
                          <p style='margin:0;color:#64748b;font-size:13px;'>Produto</p>
                          <p style='margin:4px 0 12px;color:#1e293b;font-weight:700;font-size:16px;'>{prod['titulo']}</p>
                          <p style='margin:0;color:#64748b;font-size:13px;'>ID: <strong>{id_fmt}</strong> &nbsp;•&nbsp; Valor: <strong>{preco_str}</strong></p>
                        </div>
                        <p style='color:#64748b;font-size:14px;text-align:center;margin-bottom:12px;'>No momento da entrega, informe este código ao vendedor:</p>
                        <div style='background:#00a6a6;border-radius:16px;padding:24px;text-align:center;margin-bottom:20px;'>
                          <p style='margin:0;color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;letter-spacing:1px;'>CÓDIGO DE ENTREGA</p>
                          <p style='margin:8px 0 0;color:white;font-size:48px;font-weight:900;letter-spacing:12px;'>{codigo}</p>
                        </div>
                        <p style='color:#94a3b8;font-size:12px;text-align:center;'>Guarde este código. O valor só é liberado ao vendedor após a confirmação.</p>"""
                    )
                    send_email(comp['email'], f"Código de entrega {id_fmt} - CondConnect", corpo_comp)
            except Exception as ex:
                print(f'Email error: {ex}')

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

        with db.cursor() as c:
            c.execute(
                """SELECT p.comprador_id, p.vendedor_id, p.preco_total, p.status as status_atual,
                          p.codigo_entrega, pr.titulo as produto_titulo,
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

        # Confirmação de entrega via código
        codigo_informado = body.get('codigo_entrega', '').strip()
        if codigo_informado:
            if pedido['vendedor_id'] != uid:
                return err('Apenas o vendedor pode confirmar o código', 403)
            if pedido['status_atual'] != 'enviado':
                return err('O pedido precisa estar com status "enviado" para confirmar a entrega')
            if pedido['codigo_entrega'] != codigo_informado:
                return err('Código inválido. Verifique com o comprador.')
            with db.cursor() as c:
                c.execute("UPDATE pedidos SET status='entregue' WHERE id=%s", (pid,))
            notificar(db, pedido['comprador_id'], 'pedido', 'Entrega Confirmada!', 'O vendedor confirmou a entrega do seu pedido.', '/Templates/meus-pedidos.html')
            id_fmt = fmt_id(pid)
            preco_str = f"R$ {float(pedido['preco_total']):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
            corpo = email_layout('🎉 Entrega confirmada — pagamento liberado!',
                f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'>Olá, <strong>{pedido['vendedor_nome']}</strong>! A entrega foi confirmada com sucesso.</p>
                <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
                  <p style='margin:0;color:#64748b;font-size:13px;'>Produto vendido</p>
                  <p style='margin:4px 0 8px;color:#1e293b;font-weight:700;font-size:16px;'>{pedido['produto_titulo']}</p>
                  <p style='margin:0;color:#64748b;font-size:13px;'>ID: <strong>{id_fmt}</strong></p>
                  <p style='margin:8px 0 0;color:#00a6a6;font-weight:700;font-size:22px;'>{preco_str} liberados!</p>
                </div>
                <p style='color:#64748b;font-size:14px;text-align:center;'>Obrigado por vender no CondConnect!</p>"""
            )
            send_email(pedido['vendedor_email'], f"Pagamento liberado: {id_fmt} - CondConnect", corpo)
            return ok({'message': 'Entrega confirmada! Valor liberado ao vendedor.'})

        status = body.get('status', '')
        if status not in ['confirmado', 'enviado', 'cancelado']:
            return err('Status inválido')

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
                    """SELECT ic.id, ic.quantidade, ic.produto_id, p.titulo,
                              COALESCE(ic.preco_negociado, p.preco) as preco,
                              ic.preco_negociado,
                              p.foto_principal, p.status, p.quantidade as estoque, p.usuario_id as vendedor_id
                       FROM itens_carrinho ic JOIN produtos p ON ic.produto_id=p.id WHERE ic.usuario_id=%s""",
                    (uid,)
                )
                itens = c.fetchall()
            total = sum(float(i['preco']) * i['quantidade'] for i in itens)
            result = []
            for i in itens:
                preco = float(i['preco'])
                preco_fmt = fmt_price(preco)
                result.append({
                    'id': i['id'], 'quantidade': i['quantidade'],
                    'produto': {
                        'id': i['produto_id'], 'titulo': i['titulo'],
                        'preco': preco, 'preco_fmt': preco_fmt,
                        'foto': i['foto_principal'], 'status': i['status'],
                        'estoque': int(i['estoque'] or 0), 'localizacao': '',
                        'preco_negociado': bool(i['preco_negociado'])
                    },
                    'disponivel': i['status'] == 'disponivel' and i['vendedor_id'] != uid
                })
            total_fmt = f"R$ {total:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
            return ok({'itens': result, 'total': total, 'subtotal': total, 'total_fmt': total_fmt})

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
            item_id = int(body.get('item_id') or body.get('id') or 0)
            quantidade = int(body.get('quantidade', 1))
            if quantidade < 1:
                return err('Quantidade inválida')
            with db.cursor() as c:
                c.execute("SELECT p.quantidade as estoque, ic.preco_negociado FROM itens_carrinho ic JOIN produtos p ON ic.produto_id=p.id WHERE ic.id=%s AND ic.usuario_id=%s", (item_id, uid))
                row = c.fetchone()
            if not row:
                return err('Item não encontrado', 404)
            if row['preco_negociado']:
                return err('A quantidade de um item com preço negociado não pode ser alterada', 400)
            estoque = int(row['estoque'] or 0)
            if quantidade > estoque:
                return err(f'Quantidade máxima disponível: {estoque}', 400)
            with db.cursor() as c:
                c.execute("UPDATE itens_carrinho SET quantidade=%s WHERE id=%s AND usuario_id=%s", (quantidade, item_id, uid))
            return ok({'message': 'Quantidade atualizada'})

        if request.method == 'DELETE':
            item_id = request.args.get('item_id') or request.args.get('id')
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
                              u.nome as vendedor_nome, u.bloco as vendedor_bloco, u.apartamento as vendedor_apto, u.rating as vendedor_rating,
                              COALESCE((SELECT cu.privacidade_endereco FROM configuracoes_usuario cu WHERE cu.usuario_id=u.id LIMIT 1), 0) as privacidade_endereco
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
                             'localizacao': 'Localização privada' if f.get('privacidade_endereco') else f"Bloco {f['vendedor_bloco']} - Apto {f['vendedor_apto']}",
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

@app.route('/conversas', methods=['GET', 'POST', 'DELETE', 'OPTIONS'])
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

        if request.method == 'DELETE':
            conv_id = int(request.args.get('id', 0))
            if not conv_id:
                return err('id da conversa é obrigatório')
            with db.cursor() as c:
                c.execute("SELECT id FROM conversas WHERE id=%s AND (usuario1_id=%s OR usuario2_id=%s)", (conv_id, uid, uid))
                if not c.fetchone():
                    return err('Conversa não encontrada', 404)
                c.execute("DELETE FROM mensagens WHERE conversa_id=%s", (conv_id,))
                c.execute("DELETE FROM conversas WHERE id=%s", (conv_id,))
            return ok({'message': 'Conversa apagada'})

        # POST
        body = get_body()
        outro_id = int(body.get('usuario_id', 0))
        produto_id = body.get('produto_id')
        if not outro_id or outro_id == uid:
            return err('usuario_id inválido')

        with db.cursor() as c:
            c.execute("SELECT id FROM conversas WHERE (usuario1_id=%s AND usuario2_id=%s) OR (usuario1_id=%s AND usuario2_id=%s)", (uid, outro_id, outro_id, uid))
            existe = c.fetchone()

        if existe:
            return ok({'id': existe['id'], 'message': 'Conversa já existe'})

        with db.cursor() as c:
            c.execute("INSERT INTO conversas (usuario1_id, usuario2_id, produto_id) VALUES (%s,%s,%s)", (uid, outro_id, produto_id))
            conv_id = c.lastrowid
        return ok({'id': conv_id, 'message': 'Conversa criada'}, 201)
    finally:
        db.close()


@app.route('/conversas/mensagens', methods=['GET', 'POST', 'OPTIONS'])
def mensagens():
    uid, e = require_auth()
    if e:
        return e
    body = get_body()
    cid = int(request.args.get('conversa_id') or body.get('conversa_id') or 0)
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
            return ok([{'id': m['id'], 'texto': m['texto'], 'criado_em': str(m['criado_em']),
                        'lida': bool(m['lida']), 'tipo': 'sent' if m['rid'] == uid else 'received',
                        'remetente': {'id': m['rid'], 'nome': m['rnome'], 'foto': m['rfoto']}} for m in msgs])

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
            c.execute("SELECT id, nome, foto_url, bio, rating, total_vendas, total_compras, criado_em, bloco, apartamento, pix_key FROM usuarios WHERE id=%s AND ativo=1", (uid,))
            user = c.fetchone()
        if not user:
            return err('Usuário não encontrado', 404)

        with db.cursor() as c:
            c.execute("SELECT COALESCE(privacidade_endereco, 0) as privacidade_endereco FROM configuracoes_usuario WHERE usuario_id=%s", (uid,))
            cfg = c.fetchone()
            privado = bool(cfg['privacidade_endereco']) if cfg else False

        with db.cursor() as c:
            c.execute("SELECT COUNT(*) as n FROM produtos WHERE usuario_id=%s AND status='disponivel'", (uid,))
            total_produtos = c.fetchone()['n']
            c.execute("SELECT a.nota, a.comentario, a.criado_em, u.nome as avaliador FROM avaliacoes a JOIN usuarios u ON a.avaliador_id=u.id WHERE a.avaliado_id=%s ORDER BY a.criado_em DESC LIMIT 5", (uid,))
            avaliacoes = c.fetchall()
            c.execute("SELECT id, titulo, foto_principal, preco, condicao, criado_em FROM produtos WHERE usuario_id=%s AND status='disponivel' ORDER BY criado_em DESC", (uid,))
            produtos_v = c.fetchall()

        produtos_fmt = [{'id': p['id'], 'titulo': p['titulo'], 'foto': p['foto_principal'],
                         'preco': float(p['preco']),
                         'preco_fmt': fmt_price(p['preco']),
                         'condicao': p['condicao']} for p in produtos_v]

        user_data = dict(user)
        if privado:
            user_data['bloco'] = None
            user_data['apartamento'] = None
        return ok({**user_data, 'id': int(user['id']), 'rating': float(user['rating'] or 0),
                   'total_produtos': total_produtos,
                   'produtos': produtos_fmt,
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

    labels = moderar_imagem(data)
    if labels:
        return err('Imagem rejeitada: conteúdo inapropriado detectado. Por favor, envie uma imagem adequada.', 422)

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
        permitidos = ['notif_email', 'notif_sms', 'notif_marketing', 'tema', 'idioma', 'privacidade_endereco', 'metodo_2fa']
        campos, valores = [], []
        for campo in permitidos:
            if campo in body:
                campos.append(f"{campo}=%s"); valores.append(body[campo])
        if not campos:
            return ok({'message': 'Sem alterações'})
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


# ── PROPOSTAS ─────────────────────────────────────────────────────────────────

@app.route('/propostas', methods=['GET', 'POST', 'OPTIONS'])
def propostas_route():
    uid, e = require_auth()
    if e:
        return e

    db = get_db()
    try:
        if request.method == 'GET':
            tipo = request.args.get('tipo', 'recebidas')

            if tipo == 'enviadas':
                sql = """SELECT pr.id, pr.valor_proposto, pr.mensagem, pr.status, pr.criado_em,
                                p.titulo as produto_titulo, p.foto_principal as produto_foto, p.id as produto_id,
                                u.nome as outro_nome
                         FROM propostas pr
                         JOIN produtos p ON pr.produto_id=p.id
                         JOIN usuarios u ON pr.vendedor_id=u.id
                         WHERE pr.comprador_id=%s ORDER BY pr.criado_em DESC"""
            else:
                sql = """SELECT pr.id, pr.valor_proposto, pr.mensagem, pr.status, pr.criado_em,
                                p.titulo as produto_titulo, p.foto_principal as produto_foto, p.id as produto_id,
                                u.nome as outro_nome
                         FROM propostas pr
                         JOIN produtos p ON pr.produto_id=p.id
                         JOIN usuarios u ON pr.comprador_id=u.id
                         WHERE pr.vendedor_id=%s ORDER BY pr.criado_em DESC"""

            produto_id_filter = request.args.get('produto_id')
            params = [uid]
            if produto_id_filter:
                sql = sql.replace('ORDER BY', 'AND pr.produto_id=%s ORDER BY')
                params.append(produto_id_filter)

            with db.cursor() as c:
                c.execute(sql, params)
                rows = c.fetchall()

            result = [{
                'id': r['id'], 'valor_proposto': float(r['valor_proposto']),
                'valor_fmt': fmt_price(r['valor_proposto']),
                'mensagem': r['mensagem'] or '', 'status': r['status'],
                'criado_em': str(r['criado_em']),
                'produto': {'id': r['produto_id'], 'titulo': r['produto_titulo'], 'foto': r['produto_foto']},
                'outro_nome': r['outro_nome'], 'quantidade': int(r.get('quantidade') or 1)
            } for r in rows]
            return ok({'propostas': result, 'total': len(result)})

        # POST
        body = get_body()
        produto_id = int(body.get('produto_id', 0))
        valor_raw = body.get('valor_proposto')
        mensagem = (body.get('mensagem') or '').strip()
        quantidade = int(body.get('quantidade') or 1)

        if not produto_id or valor_raw is None:
            return err('produto_id e valor_proposto são obrigatórios')
        if quantidade < 1:
            return err('Quantidade deve ser pelo menos 1')

        valor = float(valor_raw)
        if valor <= 0:
            return err('Valor deve ser maior que zero')

        with db.cursor() as c:
            c.execute("SELECT usuario_id, titulo, preco, status FROM produtos WHERE id=%s", (produto_id,))
            produto = c.fetchone()

        if not produto:
            return err('Produto não encontrado', 404)
        if produto['usuario_id'] == uid:
            return err('Você não pode fazer proposta para o seu próprio produto')
        if produto['status'] != 'disponivel':
            return err('Produto não disponível para propostas')

        preco_produto = float(produto['preco'])
        valor_max = round(preco_produto * 0.70, 2)
        if valor > valor_max:
            return err(f'O valor máximo permitido é 70% do preço anunciado: {fmt_price(valor_max)}')

        vendedor_id = produto['usuario_id']

        with db.cursor() as c:
            c.execute("SELECT COUNT(*) as n FROM propostas WHERE produto_id=%s AND comprador_id=%s AND status='pendente'", (produto_id, uid))
            if c.fetchone()['n'] >= 3:
                return err('Você atingiu o limite de 3 propostas pendentes para este produto')

        with db.cursor() as c:
            c.execute(
                "INSERT INTO propostas (produto_id, comprador_id, vendedor_id, valor_proposto, mensagem, quantidade) VALUES (%s,%s,%s,%s,%s,%s)",
                (produto_id, uid, vendedor_id, valor, mensagem, quantidade)
            )
            nova_id = c.lastrowid

        valor_str = fmt_price(valor)
        preco_orig = fmt_price(float(produto['preco']))
        notificar(db, vendedor_id, 'proposta', 'Nova Proposta!',
                  f'Proposta de {valor_str} para "{produto["titulo"]}"',
                  '/Templates/meus-pedidos.html?tab=propostas')

        try:
            with db.cursor() as c:
                c.execute("SELECT nome, email FROM usuarios WHERE id=%s", (vendedor_id,))
                vend = c.fetchone()
                c.execute("SELECT nome FROM usuarios WHERE id=%s", (uid,))
                comp = c.fetchone()
            if vend and comp:
                corpo = email_layout('💰 Nova proposta recebida!',
                    f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'>Olá, <strong>{vend['nome']}</strong>! Você recebeu uma nova proposta.</p>
                    <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
                      <p style='margin:0;color:#64748b;font-size:13px;'>Produto</p>
                      <p style='margin:4px 0 12px;color:#1e293b;font-weight:700;font-size:16px;'>{produto['titulo']}</p>
                      <p style='margin:0;color:#64748b;font-size:13px;'>Preço anunciado: <strong>{preco_orig}</strong></p>
                      <p style='margin:4px 0 0;color:#00a6a6;font-size:20px;font-weight:700;'>Proposta: {valor_str} × {quantidade} un.</p>
                      {f'<p style="margin:12px 0 0;color:#64748b;font-size:13px;font-style:italic;">"{mensagem}"</p>' if mensagem else ''}
                    </div>
                    <p style='color:#64748b;font-size:13px;text-align:center;margin-bottom:16px;'>Enviada por: <strong>{comp['nome']}</strong></p>
                    <a href='http://54.242.139.170/Templates/meus-pedidos.html?tab=propostas' style='display:block;background:#00a6a6;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:100px;font-weight:700;margin-bottom:16px;'>Ver Proposta</a>"""
                )
                send_email(vend['email'], f'Nova proposta: {produto["titulo"]} - CondConnect', corpo)
        except Exception as ex:
            print(f'Email proposta error: {ex}')

        return ok({'id': nova_id, 'message': 'Proposta enviada com sucesso'}, 201)
    finally:
        db.close()


@app.route('/propostas/item', methods=['PUT', 'OPTIONS'])
def proposta_item():
    uid, e = require_auth()
    if e:
        return e

    body = get_body()
    pid = int(body.get('proposta_id', 0))
    acao = body.get('acao', '')

    if not pid or acao not in ['aceitar', 'recusar', 'cancelar']:
        return err('proposta_id e acao valida sao obrigatorios')

    db = get_db()
    try:
        with db.cursor() as c:
            c.execute("""SELECT pr.*, p.titulo as produto_titulo,
                                uc.nome as comprador_nome, uc.email as comprador_email,
                                uv.nome as vendedor_nome, uv.email as vendedor_email
                         FROM propostas pr
                         JOIN produtos p ON pr.produto_id=p.id
                         JOIN usuarios uc ON pr.comprador_id=uc.id
                         JOIN usuarios uv ON pr.vendedor_id=uv.id
                         WHERE pr.id=%s AND pr.status='pendente'""", (pid,))
            proposta = c.fetchone()

        if not proposta:
            return err('Proposta nao encontrada ou ja respondida', 404)

        if acao == 'cancelar' and proposta['comprador_id'] != uid:
            return err('Sem permissao', 403)
        if acao in ['aceitar', 'recusar'] and proposta['vendedor_id'] != uid:
            return err('Sem permissao', 403)

        status_map = {'aceitar': 'aceita', 'recusar': 'recusada', 'cancelar': 'cancelada'}
        novo_status = status_map[acao]

        with db.cursor() as c:
            c.execute("UPDATE propostas SET status=%s WHERE id=%s", (novo_status, pid))

        valor_str = fmt_price(float(proposta['valor_proposto']))
        titulo = proposta['produto_titulo']

        if acao == 'aceitar':
            # Adiciona ao carrinho do comprador com preço e quantidade negociados
            qtd_proposta = int(proposta.get('quantidade') or 1)
            with db.cursor() as c:
                c.execute("DELETE FROM itens_carrinho WHERE usuario_id=%s AND produto_id=%s", (proposta['comprador_id'], proposta['produto_id']))
                c.execute("INSERT INTO itens_carrinho (usuario_id, produto_id, quantidade, preco_negociado) VALUES (%s,%s,%s,%s)",
                          (proposta['comprador_id'], proposta['produto_id'], qtd_proposta, proposta['valor_proposto']))

            notificar(db, proposta['comprador_id'], 'proposta', 'Proposta Aceita!',
                      f'Sua proposta de {valor_str} para "{titulo}" foi aceita! O produto foi adicionado ao seu carrinho.',
                      '/Templates/carrinho.html')
            try:
                corpo = email_layout('🎉 Sua proposta foi aceita!',
                    f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'>Boa notícia, <strong>{proposta['comprador_nome']}</strong>! O vendedor aceitou sua proposta.</p>
                    <div style='background:#dcfce7;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #86efac;'>
                      <p style='margin:0;color:#15803d;font-size:13px;font-weight:600;'>✓ Proposta Aceita</p>
                      <p style='margin:8px 0 4px;color:#1e293b;font-weight:700;font-size:16px;'>{titulo}</p>
                      <p style='margin:0;color:#16a34a;font-size:20px;font-weight:700;'>{valor_str}</p>
                    </div>
                    <p style='color:#64748b;font-size:14px;text-align:center;margin-bottom:16px;'>Entre em contato com o vendedor <strong>{proposta['vendedor_nome']}</strong> para combinar os detalhes.</p>
                    <a href='http://54.242.139.170/Templates/mensagens.html' style='display:block;background:#00a6a6;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:100px;font-weight:700;'>Entrar em Contato</a>"""
                )
                send_email(proposta['comprador_email'], f'Proposta aceita: {titulo} - CondConnect', corpo)
            except Exception as ex:
                print(f'Email aceite error: {ex}')

        elif acao == 'recusar':
            notificar(db, proposta['comprador_id'], 'proposta', 'Proposta Recusada',
                      f'Sua proposta de {valor_str} para "{titulo}" foi recusada.',
                      '/Templates/meus-pedidos.html?tab=propostas')
            try:
                corpo = email_layout('❌ Proposta recusada',
                    f"""<p style='color:#64748b;text-align:center;margin-bottom:24px;'><strong>{proposta['comprador_nome']}</strong>, o vendedor não aceitou sua proposta desta vez.</p>
                    <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
                      <p style='margin:0;color:#64748b;font-size:13px;'>Produto</p>
                      <p style='margin:4px 0;color:#1e293b;font-weight:700;'>{titulo}</p>
                      <p style='margin:4px 0 0;color:#dc2626;font-size:14px;'>Proposta de {valor_str} recusada.</p>
                    </div>
                    <a href='http://54.242.139.170/Templates/marketplace.html' style='display:block;background:#00a6a6;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:100px;font-weight:700;'>Ver outros produtos</a>"""
                )
                send_email(proposta['comprador_email'], f'Proposta recusada: {titulo} - CondConnect', corpo)
            except Exception as ex:
                print(f'Email recusa error: {ex}')

        return ok({'message': f'Proposta {novo_status} com sucesso'})
    finally:
        db.close()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

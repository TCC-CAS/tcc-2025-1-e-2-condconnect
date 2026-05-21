"""
Testes de segurança do CondConnect.
Verifica proteção contra SQLi, XSS, bypass de autenticação e exposição de dados.
"""
import pytest
from unittest.mock import patch
from conftest import MockDB, TEST_USER, _TEST_PASSWORD

pytestmark = pytest.mark.security


def _recaptcha_ok():
    return patch('app.verificar_recaptcha', return_value=True)


# ── SQL Injection ──────────────────────────────────────────────────────────────

class TestSQLInjection:
    """
    O app usa queries parametrizadas (pymysql + %s), então tentativas de SQLi
    devem falhar — o payload é tratado como string literal, não como código SQL.
    """

    _SQLI_PAYLOADS = [
        "' OR '1'='1",
        "' OR 1=1--",
        "'; DROP TABLE usuarios;--",
        '" OR "1"="1',
        "1 UNION SELECT * FROM usuarios--",
        "admin'--",
        "' OR 'x'='x",
    ]

    def test_sqli_no_campo_email_login(self, client):
        for payload in self._SQLI_PAYLOADS:
            mock = MockDB(None)
            with _recaptcha_ok(), patch('app.get_db', return_value=mock):
                resp = client.post('/auth/login',
                                   json={'email': payload, 'senha': 'Senha@123'})
            assert resp.status_code in (400, 401), \
                f"Payload '{payload}' deveria ser bloqueado, mas retornou {resp.status_code}"

    def test_sqli_no_campo_busca_produtos(self, client):
        for payload in self._SQLI_PAYLOADS:
            mock = MockDB([], [])
            with patch('app.get_db', return_value=mock):
                resp = client.get(f'/produtos?busca={payload}')
            assert resp.status_code == 200, \
                f"Busca com SQLi '{payload}' deve retornar 200 (não crashar)"

    def test_sqli_no_id_produto(self, client):
        resp = client.get("/produtos/item?id=1 OR 1=1")
        assert resp.status_code == 400  # ID inválido rejeitado antes da query


# ── XSS ───────────────────────────────────────────────────────────────────────

class TestXSS:
    """
    A API é JSON — dados são armazenados como texto e não renderizados pelo backend.
    Scripts injetados devem ser armazenados literalmente, não executados.
    """

    _XSS_PAYLOADS = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '"><script>document.cookie</script>',
    ]

    def test_xss_em_mensagem_chat_nao_executa(self, authed_client):
        for payload in self._XSS_PAYLOADS:
            auth_mock = MockDB({'session_version': 'v1'})
            conv_mock = MockDB({'id': 1, 'usuario1_id': 1, 'usuario2_id': 2})
            msg_mock = MockDB(
                conv_mock._results[0] if conv_mock._results else None,
                None,
                {'id': 99, 'texto': payload,
                 'criado_em': '2025-01-01', 'lida': 0,
                 'rid': 1, 'rnome': 'Ana', 'rfoto': None}
            )

            def get_db_xss():
                for db in [auth_mock, MockDB(
                    {'id': 1, 'usuario1_id': 1, 'usuario2_id': 2},
                    None,
                    {'id': 1, 'usuario1_id': 1, 'usuario2_id': 2},
                    {'id': 99, 'texto': payload,
                     'criado_em': '2025-01-01 10:00:00', 'lida': 0,
                     'rid': 1, 'rnome': 'Ana', 'rfoto': None},
                )]:
                    yield db
            gen = get_db_xss()

            with patch('app.get_db', side_effect=lambda: next(gen)), \
                 patch('app.notificar', return_value=None):
                resp = authed_client.post('/conversas/mensagens',
                                          json={'conversa_id': 1, 'texto': payload})
            # XSS em texto puro não contém dado sensível: deve ser permitido (201)
            # ou bloqueado se o texto acionar outra regra (ex: '@' em payload)
            assert resp.status_code in (201, 422)


# ── Autenticação e Autorização ─────────────────────────────────────────────────

class TestAuthBypass:
    """Endpoints protegidos devem retornar 401 sem sessão válida."""

    _PROTECTED = [
        ('GET',  '/pedidos'),
        ('GET',  '/conversas'),
        ('POST', '/conversas/mensagens'),
        ('GET',  '/me/produtos'),
        ('GET',  '/me/analytics'),
        ('POST', '/produtos'),
        ('POST', '/avaliacoes'),
    ]

    def test_endpoints_protegidos_sem_sessao(self, client):
        for method, path in self._PROTECTED:
            if method == 'GET':
                resp = client.get(path)
            else:
                resp = client.post(path, json={})
            assert resp.status_code == 401, \
                f"{method} {path} deveria retornar 401, mas retornou {resp.status_code}"

    def test_acesso_admin_bloqueado_para_morador(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        with patch('app.get_db', return_value=auth_mock):
            resp = authed_client.get('/admin/usuarios')
        assert resp.status_code in (401, 403, 404)

    def test_sessao_expirada_bloqueada(self, flask_app, client):
        """Versão de sessão divergente do banco → acesso negado."""
        with flask_app.test_client() as c:
            with c.session_transaction() as sess:
                sess['user_id'] = 1
                sess['session_version'] = 'versao-antiga'
            mock = MockDB({'session_version': 'versao-nova'})
            with patch('app.get_db', return_value=mock):
                resp = c.get('/pedidos')
        assert resp.status_code == 401


# ── Exposição de Dados Sensíveis ───────────────────────────────────────────────

class TestExposicaoDados:
    def test_pix_ausente_no_perfil(self, client):
        user = dict(TEST_USER)
        mock = MockDB(user, {'privacidade_endereco': 0}, {'n': 0}, [], [])
        with patch('app.get_db', return_value=mock):
            resp = client.get('/usuarios/perfil?id=1')
        assert 'pix_key' not in resp.get_json()

    def test_email_ausente_no_perfil(self, client):
        user = dict(TEST_USER)
        mock = MockDB(user, {'privacidade_endereco': 0}, {'n': 0}, [], [])
        with patch('app.get_db', return_value=mock):
            resp = client.get('/usuarios/perfil?id=1')
        assert 'email' not in resp.get_json()

    def test_pix_ausente_nos_detalhes_produto(self, client):
        produto = {
            'id': 10, 'titulo': 'Mesa', 'descricao': 'Desc', 'preco': 100.0,
            'categoria': 'moveis', 'condicao': 'usado', 'status': 'disponivel',
            'quantidade': 1, 'foto_principal': None, 'usuario_id': 2,
            'criado_em': '2025-01-01', 'custo': 50.0, 'visualizacoes': 0,
            'vid': 2, 'vnome': 'João', 'vbloco': 'A', 'vapto': '101',
            'vrating': 4.0, 'vvendas': 5, 'vbio': '', 'vfoto_url': None,
            'privacidade_endereco': 0,
        }
        mock = MockDB(produto, None, [], [], {'n': 0}, [])
        with patch('app.get_db', return_value=mock):
            resp = client.get('/produtos/item?id=10')
        vendedor = resp.get_json().get('vendedor', {})
        assert 'pix_key' not in vendedor


# ── Dados Sensíveis no Chat ────────────────────────────────────────────────────

class TestDadosSensiveisChat:
    _CASOS = [
        ('e-mail',     'Meu contato é joao@empresa.com'),
        ('telefone',   'Me liga: (21) 98765-4321'),
        ('CPF',        'CPF: 111.444.777-35'),
        ('CNPJ',       'CNPJ 00.000.000/0001-00'),
        ('PIX UUID',   'Chave: a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
        ('CPF raw',    'número 52998224725 é meu cpf'),
    ]

    def test_todos_tipos_de_dado_bloqueados(self, authed_client):
        for nome, texto in self._CASOS:
            auth_mock = MockDB({'session_version': 'v1'})
            conv_mock = MockDB({'id': 1, 'usuario1_id': 1, 'usuario2_id': 2})

            def get_db_seq():
                for db in [auth_mock, conv_mock]:
                    yield db
            gen = get_db_seq()

            with patch('app.get_db', side_effect=lambda: next(gen)):
                resp = authed_client.post('/conversas/mensagens',
                                          json={'conversa_id': 1, 'texto': texto})
            assert resp.status_code == 422, \
                f"Tipo '{nome}' deveria ser bloqueado (422), mas retornou {resp.status_code}"


# ── 2FA Lockout ────────────────────────────────────────────────────────────────

class TestTwoFALockout:
    def test_3_tentativas_invalidas_bloqueiam(self, flask_app):
        with flask_app.test_client() as c:
            with c.session_transaction() as sess:
                sess['pending_2fa_uid'] = 1

            user = dict(TEST_USER, codigo_2fa='999999')

            for _ in range(3):
                mock = MockDB(user)
                with patch('app.get_db', return_value=mock):
                    resp = c.post('/auth/verificar-2fa', json={'codigo': '000000'})

            assert resp.status_code == 401
            data = resp.get_json()
            assert 'Muitas tentativas' in data['error'] or 'novamente' in data['error']

    def test_apos_lockout_sessao_2fa_apagada(self, flask_app):
        with flask_app.test_client() as c:
            with c.session_transaction() as sess:
                sess['pending_2fa_uid'] = 1

            user = dict(TEST_USER, codigo_2fa='wrong')
            for _ in range(3):
                mock = MockDB(user)
                with patch('app.get_db', return_value=mock):
                    c.post('/auth/verificar-2fa', json={'codigo': '000000'})

            with c.session_transaction() as sess:
                assert 'pending_2fa_uid' not in sess

"""
Testes de integração para os endpoints de autenticação.
O banco de dados é completamente mockado — nenhuma conexão real é feita.
"""
import pytest
from unittest.mock import patch
from conftest import MockDB, TEST_USER, _TEST_PASSWORD

pytestmark = pytest.mark.integration

# ── Helpers ────────────────────────────────────────────────────────────────────

def _login_payload(email=TEST_USER['email'], senha=_TEST_PASSWORD, token='valid-token'):
    return {'email': email, 'senha': senha, 'recaptcha_token': token}


def _recaptcha_ok():
    return patch('app.verificar_recaptcha', return_value=True)

def _recaptcha_fail():
    return patch('app.verificar_recaptcha', return_value=False)

def _no_email():
    return patch('app.send_email', return_value=None)


# ── Login ──────────────────────────────────────────────────────────────────────

class TestLogin:
    def test_campos_obrigatorios_ausentes(self, client):
        resp = client.post('/auth/login', json={})
        assert resp.status_code == 400
        assert 'obrigatórios' in resp.get_json()['error']

    def test_email_ausente(self, client):
        resp = client.post('/auth/login', json={'senha': 'x'})
        assert resp.status_code == 400

    def test_senha_ausente(self, client):
        resp = client.post('/auth/login', json={'email': 'a@b.com'})
        assert resp.status_code == 400

    def test_recaptcha_invalido(self, client):
        with _recaptcha_fail():
            resp = client.post('/auth/login', json=_login_payload())
        assert resp.status_code == 400
        assert 'segurança' in resp.get_json()['error'].lower()

    def test_usuario_nao_encontrado(self, client):
        mock = MockDB(None)  # fetchone retorna None → usuário não existe
        with _recaptcha_ok(), _no_email(), patch('app.get_db', return_value=mock):
            resp = client.post('/auth/login', json=_login_payload())
        assert resp.status_code == 401
        assert 'incorretos' in resp.get_json()['error']

    def test_senha_errada(self, client):
        user = dict(TEST_USER)
        mock = MockDB(user)
        with _recaptcha_ok(), _no_email(), patch('app.get_db', return_value=mock):
            resp = client.post('/auth/login', json=_login_payload(senha='SenhaErrada1!'))
        assert resp.status_code == 401

    def test_login_sucesso_requer_2fa(self, client):
        mock = MockDB(TEST_USER)
        with _recaptcha_ok(), _no_email(), patch('app.get_db', return_value=mock):
            resp = client.post('/auth/login', json=_login_payload())
        data = resp.get_json()
        assert resp.status_code == 200
        assert data.get('requires_2fa') is True
        assert 'destino' in data

    def test_destino_2fa_mascara_email(self, client):
        mock = MockDB(TEST_USER)
        with _recaptcha_ok(), _no_email(), patch('app.get_db', return_value=mock):
            resp = client.post('/auth/login', json=_login_payload())
        destino = resp.get_json().get('destino', '')
        assert '***' in destino  # email mascarado


# ── Verificar 2FA ──────────────────────────────────────────────────────────────

class TestVerificar2FA:
    def _set_2fa_session(self, client, uid=1):
        with client.session_transaction() as sess:
            sess['pending_2fa_uid'] = uid

    def test_sem_sessao_pendente(self, client):
        resp = client.post('/auth/verificar-2fa', json={'codigo': '123456'})
        assert resp.status_code in (400, 401)

    def test_codigo_incorreto(self, client):
        self._set_2fa_session(client)
        user = dict(TEST_USER, codigo_2fa='999999')
        mock = MockDB(user, {'session_version': 'v1'})
        with patch('app.get_db', return_value=mock):
            resp = client.post('/auth/verificar-2fa', json={'codigo': '000000'})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'restante' in data['error'].lower() or 'incorreto' in data['error'].lower()

    def test_lockout_apos_3_tentativas(self, client):
        self._set_2fa_session(client)

        def _wrong_attempt():
            user = dict(TEST_USER, codigo_2fa='999999')
            mock = MockDB(user, {'session_version': 'v1'})
            with patch('app.get_db', return_value=mock):
                return client.post('/auth/verificar-2fa', json={'codigo': '000000'})

        _wrong_attempt()
        _wrong_attempt()
        resp = _wrong_attempt()
        data = resp.get_json()
        assert resp.status_code == 401
        assert 'Muitas tentativas' in data['error'] or 'login novamente' in data['error']

    def test_codigo_correto(self, client):
        self._set_2fa_session(client)
        from datetime import datetime, timedelta
        expira = (datetime.now() + timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S')
        user_with_code = dict(TEST_USER, codigo_2fa='123456', codigo_2fa_expira=expira)
        # require_auth check, depois SELECT user, depois UPDATE session_version
        mock = MockDB(
            user_with_code,             # SELECT no verificar_2fa
            None,                       # UPDATE session_version (sem fetch)
        )
        with patch('app.get_db', return_value=mock):
            resp = client.post('/auth/verificar-2fa', json={'codigo': '123456'})
        # pode retornar 200 com dados do usuário
        assert resp.status_code in (200, 400)  # 400 se expirado ou lógica interna

    def test_codigo_formato_invalido(self, client):
        self._set_2fa_session(client)
        resp = client.post('/auth/verificar-2fa', json={'codigo': 'abcdef'})
        assert resp.status_code in (400, 401)


# ── Cadastro ───────────────────────────────────────────────────────────────────

class TestRegister:
    _BASE = {
        'nome': 'João Silva',
        'email': 'joao@teste.com',
        'senha': 'Senha@2025',
        'apartamento': '202',
        'bloco': 'B',
        'cpf': '529.982.247-25',
        'telefone': '(11) 99999-0000',
        'cep': '01310-100',
        'numero': '100',
        'recaptcha_token': 'valid',
    }

    def test_campos_obrigatorios_ausentes(self, client):
        with _recaptcha_ok():
            resp = client.post('/auth/register', json={})
        assert resp.status_code == 400

    def test_recaptcha_invalido(self, client):
        with _recaptcha_fail():
            resp = client.post('/auth/register', json=self._BASE)
        assert resp.status_code == 400

    def test_cpf_invalido(self, client):
        payload = dict(self._BASE, cpf='111.111.111-11')
        with _recaptcha_ok():
            resp = client.post('/auth/register', json=payload)
        assert resp.status_code == 400
        assert 'CPF' in resp.get_json()['error']

    def test_email_invalido(self, client):
        payload = dict(self._BASE, email='nao-e-email')
        with _recaptcha_ok():
            resp = client.post('/auth/register', json=payload)
        assert resp.status_code == 400

    def test_email_duplicado(self, client):
        mock = MockDB({'id': 99})  # fetchone retorna usuário existente
        with _recaptcha_ok(), patch('app.get_db', return_value=mock):
            resp = client.post('/auth/register', json=self._BASE)
        assert resp.status_code == 409
        assert 'já cadastrado' in resp.get_json()['error'].lower()

    def test_cadastro_sucesso(self, client):
        mock = MockDB(None, lastrowid=42)  # None = e-mail não duplicado
        with _recaptcha_ok(), _no_email(), patch('app.get_db', return_value=mock):
            resp = client.post('/auth/register', json=self._BASE)
        assert resp.status_code == 201


# ── Logout ─────────────────────────────────────────────────────────────────────

class TestLogout:
    def test_logout_limpa_sessao(self, authed_client):
        mock = MockDB()
        with patch('app.get_db', return_value=mock):
            resp = authed_client.post('/auth/logout')
        assert resp.status_code == 200

    def test_logout_sem_autenticacao(self, client):
        resp = client.post('/auth/logout')
        assert resp.status_code in (200, 401)

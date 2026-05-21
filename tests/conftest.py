"""
Fixtures compartilhadas entre todos os testes do CondConnect.
MockDB simula conexões ao banco sem acessar o servidor externo.
"""
import sys
import os
import pytest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend', 'python'))

try:
    import bcrypt
    _TEST_PASSWORD = 'Password1!'
    _TEST_HASH = bcrypt.hashpw(_TEST_PASSWORD.encode(), bcrypt.gensalt(4)).decode()
except ImportError:
    bcrypt = None
    _TEST_PASSWORD = 'Password1!'
    _TEST_HASH = '$2b$04$placeholder'

BASE_URL = os.getenv('CONDCONNECT_URL', 'https://condconnect.duckdns.org')

TEST_USER = {
    'id': 1,
    'nome': 'Ana Teste',
    'email': 'ana@teste.com',
    'senha': _TEST_HASH,
    'papel': 'morador',
    'foto_url': None,
    'apartamento': '101',
    'bloco': 'A',
    'session_version': 'v1',
    'ativo': 1,
    'dois_fatores': 0,
    'codigo_2fa': '123456',
    'codigo_2fa_expira': '2099-12-31 23:59:59',
    'rating': 4.5,
    'total_vendas': 10,
    'total_compras': 5,
    'bio': 'Testadora',
    'pix_key': None,
}

TEST_PRODUCT = {
    'id': 10,
    'titulo': 'Cadeira Gamer',
    'descricao': 'Ótima cadeira',
    'preco': 350.00,
    'categoria': 'moveis',
    'condicao': 'usado',
    'status': 'disponivel',
    'quantidade': 1,
    'foto_principal': None,
    'usuario_id': 2,
    'criado_em': '2025-01-01 10:00:00',
    'custo': 200.0,
    'visualizacoes': 5,
}


class MockCursor:
    """Cursor que consome resultados de uma fila compartilhada com a MockDB."""

    def __init__(self, db: 'MockDB'):
        self._db = db
        self.lastrowid = db._next_lastrowid

    def execute(self, query, params=None):
        pass

    def fetchone(self):
        return self._db._consume()

    def fetchall(self):
        result = self._db._consume()
        if result is None:
            return []
        return result if isinstance(result, list) else [result]

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class MockDB:
    """
    Simula pymysql.connect(...) retornando resultados pré-configurados.

    Uso:
        db = MockDB(result1, result2, ...)
        with patch('app.get_db', return_value=db):
            ...
    """

    def __init__(self, *results, lastrowid: int = 1):
        self._results = list(results)
        self._idx = 0
        self._next_lastrowid = lastrowid

    def _consume(self):
        if self._idx < len(self._results):
            val = self._results[self._idx]
            self._idx += 1
            return val
        return None

    def cursor(self):
        return MockCursor(self)

    def close(self):
        pass


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope='session')
def flask_app():
    """Flask app com dependências externas mockadas (sem DB real, sem boto3)."""
    with patch('pymysql.connect'), patch('boto3.client'):
        from app import app as _app
        _app.config.update({
            'TESTING': True,
            'SECRET_KEY': 'test-secret-condconnect',
            'SESSION_COOKIE_SECURE': False,
        })
        yield _app


@pytest.fixture
def client(flask_app):
    with flask_app.test_client() as c:
        yield c


@pytest.fixture
def authed_client(flask_app):
    """Cliente com sessão de usuário logado (id=1, role=morador)."""
    with flask_app.test_client() as c:
        with c.session_transaction() as sess:
            sess['user_id'] = 1
            sess['user_role'] = 'morador'
            sess['session_version'] = 'v1'
        yield c


@pytest.fixture
def admin_client(flask_app):
    """Cliente com sessão de administrador."""
    with flask_app.test_client() as c:
        with c.session_transaction() as sess:
            sess['user_id'] = 99
            sess['user_role'] = 'admin'
            sess['session_version'] = 'v1-admin'
        yield c


def db(*results, lastrowid=1):
    """Atalho para criar MockDB com resultados."""
    return MockDB(*results, lastrowid=lastrowid)

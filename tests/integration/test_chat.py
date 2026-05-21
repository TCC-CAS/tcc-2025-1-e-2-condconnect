"""
Testes de integração para o sistema de chat.
Foco em mensagens limpas, bloqueio de dados sensíveis e conversas.
"""
import pytest
from unittest.mock import patch
from conftest import MockDB, TEST_USER

pytestmark = pytest.mark.integration


def _auth_db():
    """Retorna MockDB com a verificação de sessão do require_auth."""
    return MockDB({'session_version': 'v1'})


class TestEnviarMensagem:
    # ── Caminho bom ──────────────────────────────────────────────────────────
    def test_mensagem_limpa_salva(self, authed_client):
        conversa = {'id': 1, 'usuario1_id': 1, 'usuario2_id': 2}
        auth_mock = MockDB(
            {'session_version': 'v1'},   # require_auth
        )
        msg_mock = MockDB(
            conversa,                    # SELECT conversa para verificar acesso
            None,                        # INSERT mensagem
            conversa,                    # SELECT usuario1/2 para notificação
            {                            # SELECT mensagem inserida
                'id': 10, 'texto': 'Quando pode entregar?',
                'criado_em': '2025-05-01 10:00:00', 'lida': 0,
                'rid': 1, 'rnome': 'Ana Teste', 'rfoto': None,
            },
        )

        def get_db_seq():
            for db in [auth_mock, msg_mock]:
                yield db
        gen = get_db_seq()

        with patch('app.get_db', side_effect=lambda: next(gen)):
            resp = authed_client.post('/conversas/mensagens',
                                      json={'conversa_id': 1, 'texto': 'Quando pode entregar?'})
        assert resp.status_code == 201
        data = resp.get_json()
        assert data['texto'] == 'Quando pode entregar?'

    def test_mensagem_vazia_rejeitada(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        conv_mock = MockDB({'id': 1, 'usuario1_id': 1, 'usuario2_id': 2})

        def get_db_seq():
            for db in [auth_mock, conv_mock]:
                yield db
        gen = get_db_seq()

        with patch('app.get_db', side_effect=lambda: next(gen)):
            resp = authed_client.post('/conversas/mensagens',
                                      json={'conversa_id': 1, 'texto': ''})
        assert resp.status_code == 400

    # ── Caminho ruim (dados sensíveis bloqueados) ─────────────────────────────
    def _enviar(self, authed_client, texto):
        auth_mock = MockDB({'session_version': 'v1'})
        conv_mock = MockDB({'id': 1, 'usuario1_id': 1, 'usuario2_id': 2})

        def get_db_seq():
            for db in [auth_mock, conv_mock]:
                yield db
        gen = get_db_seq()

        with patch('app.get_db', side_effect=lambda: next(gen)):
            return authed_client.post('/conversas/mensagens',
                                      json={'conversa_id': 1, 'texto': texto})

    def test_email_bloqueado(self, authed_client):
        resp = self._enviar(authed_client, 'Me manda no meu@email.com')
        assert resp.status_code == 422
        assert 'pessoais' in resp.get_json()['error'].lower()

    def test_telefone_bloqueado(self, authed_client):
        resp = self._enviar(authed_client, 'Meu fone: (11) 98888-7777')
        assert resp.status_code == 422

    def test_cpf_formatado_bloqueado(self, authed_client):
        resp = self._enviar(authed_client, 'CPF: 529.982.247-25')
        assert resp.status_code == 422

    def test_cpf_sem_formato_bloqueado(self, authed_client):
        resp = self._enviar(authed_client, 'CPF 52998224725')
        assert resp.status_code == 422

    def test_cnpj_bloqueado(self, authed_client):
        resp = self._enviar(authed_client, 'CNPJ: 12.345.678/0001-90')
        assert resp.status_code == 422

    def test_pix_uuid_bloqueado(self, authed_client):
        resp = self._enviar(authed_client, 'Pix: a1b2c3d4-e5f6-7890-abcd-ef1234567890')
        assert resp.status_code == 422

    # ── Autenticação ──────────────────────────────────────────────────────────
    def test_nao_autenticado_bloqueado(self, client):
        resp = client.post('/conversas/mensagens',
                           json={'conversa_id': 1, 'texto': 'Oi'})
        assert resp.status_code == 401


class TestListarConversas:
    def test_lista_conversas_autenticado(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        conv_mock = MockDB([])  # lista vazia

        def get_db_seq():
            for db in [auth_mock, conv_mock]:
                yield db
        gen = get_db_seq()

        with patch('app.get_db', side_effect=lambda: next(gen)):
            resp = authed_client.get('/conversas')
        assert resp.status_code == 200

    def test_lista_conversas_nao_autenticado(self, client):
        resp = client.get('/conversas')
        assert resp.status_code == 401

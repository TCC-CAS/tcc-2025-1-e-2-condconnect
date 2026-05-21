"""
Testes de integração para endpoints de produtos.
Cobre listagem, detalhes, criação e validações.
"""
import pytest
from unittest.mock import patch
from conftest import MockDB, TEST_PRODUCT, TEST_USER

pytestmark = pytest.mark.integration


class TestListarProdutos:
    def test_listagem_publica_ok(self, client):
        mock = MockDB([TEST_PRODUCT], [])  # produtos + favoritos vazio
        with patch('app.get_db', return_value=mock):
            resp = client.get('/produtos')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'produtos' in data

    def test_listagem_com_filtro_categoria(self, client):
        mock = MockDB([TEST_PRODUCT], [])
        with patch('app.get_db', return_value=mock):
            resp = client.get('/produtos?categoria=moveis')
        assert resp.status_code == 200

    def test_listagem_vazia_retorna_lista(self, client):
        mock = MockDB([], [])
        with patch('app.get_db', return_value=mock):
            resp = client.get('/produtos')
        assert resp.status_code == 200
        assert resp.get_json()['produtos'] == []


class TestDetalhesProduto:
    def test_produto_existente_retorna_dados(self, client):
        vendedor = dict(TEST_USER, id=2)
        produto_completo = dict(
            TEST_PRODUCT,
            vid=2, vnome='João Vendedor', vbloco='B', vapto='202',
            vrating=4.5, vvendas=10, vbio='Bio', vfoto_url=None,
            privacidade_endereco=0,
        )
        mock = MockDB(
            produto_completo,  # SELECT produto
            None,              # UPDATE visualizações
            [],                # SELECT avaliações
            [],                # SELECT imagens extras
            {'n': 5},          # SELECT total_vendidos
            [],                # SELECT insumos
        )
        with patch('app.get_db', return_value=mock):
            resp = client.get('/produtos/item?id=10')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['titulo'] == TEST_PRODUCT['titulo']
        assert 'pix_key' not in data.get('vendedor', {})  # PIX não exposto

    def test_produto_inexistente_retorna_404(self, client):
        mock = MockDB(None)  # fetchone → None
        with patch('app.get_db', return_value=mock):
            resp = client.get('/produtos/item?id=99999')
        assert resp.status_code == 404

    def test_id_invalido(self, client):
        resp = client.get('/produtos/item?id=abc')
        assert resp.status_code == 400

    def test_id_ausente(self, client):
        resp = client.get('/produtos/item')
        assert resp.status_code == 400


class TestCriarProduto:
    _PAYLOAD = {
        'titulo': 'Mesa de Escritório',
        'descricao': 'Mesa boa para home office',
        'preco': 450.0,
        'categoria': 'moveis',
        'condicao': 'usado',
        'quantidade': 1,
    }

    def test_criar_sem_autenticacao_bloqueado(self, client):
        resp = client.post('/produtos', json=self._PAYLOAD)
        assert resp.status_code == 401

    def test_criar_autenticado_ok(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        prod_mock = MockDB(None, lastrowid=55)  # INSERT → id=55
        with patch('app.get_db', side_effect=[auth_mock, prod_mock]):
            resp = authed_client.post('/produtos', json=self._PAYLOAD)
        assert resp.status_code == 201
        assert resp.get_json().get('id') == 55

    def test_criar_sem_titulo_rejeitado(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        payload = dict(self._PAYLOAD)
        del payload['titulo']
        with patch('app.get_db', return_value=auth_mock):
            resp = authed_client.post('/produtos', json=payload)
        assert resp.status_code == 400

    def test_preco_negativo_rejeitado(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        payload = dict(self._PAYLOAD, preco=-10)
        with patch('app.get_db', return_value=auth_mock):
            resp = authed_client.post('/produtos', json=payload)
        assert resp.status_code == 400


class TestPerfilVendedor:
    def test_perfil_nao_expoe_pix(self, client):
        user = dict(TEST_USER)
        mock = MockDB(
            user,
            {'privacidade_endereco': 0},
            {'n': 3},
            [],   # avaliações
            [],   # produtos
        )
        with patch('app.get_db', return_value=mock):
            resp = client.get(f'/usuarios/perfil?id=1')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'pix_key' not in data

    def test_perfil_nao_expoe_email(self, client):
        user = dict(TEST_USER)
        mock = MockDB(user, {'privacidade_endereco': 0}, {'n': 0}, [], [])
        with patch('app.get_db', return_value=mock):
            resp = client.get('/usuarios/perfil?id=1')
        data = resp.get_json()
        assert 'email' not in data

    def test_perfil_usuario_inexistente(self, client):
        mock = MockDB(None)
        with patch('app.get_db', return_value=mock):
            resp = client.get('/usuarios/perfil?id=99999')
        assert resp.status_code == 404

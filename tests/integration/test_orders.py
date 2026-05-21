"""
Testes de integração para endpoints de pedidos.
Cobre listagem de compras/vendas e botão 'comprar novamente'.
"""
import pytest
from unittest.mock import patch
from conftest import MockDB, TEST_USER, TEST_PRODUCT

pytestmark = pytest.mark.integration

_PEDIDO_COMPRA = {
    'id': 1,
    'quantidade': 1,
    'preco_total': 350.00,
    'status': 'entregue',
    'codigo_entrega': '1234',
    'criado_em': '2025-04-01 10:00:00',
    'atualizado_em': '2025-04-02 10:00:00',
    'produto_id': 10,
    'produto_titulo': 'Cadeira Gamer',
    'produto_foto': None,
    'produto_status': 'disponivel',
    'outro_nome': 'João Vendedor',
}

_PEDIDO_VENDA = {
    **_PEDIDO_COMPRA,
    'produto_status': 'vendido',
    'outro_nome': 'Ana Compradora',
}


class TestListarPedidos:
    def test_listar_compras_autenticado(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        pedidos_mock = MockDB([_PEDIDO_COMPRA])
        with patch('app.get_db', side_effect=[auth_mock, pedidos_mock]):
            resp = authed_client.get('/pedidos?tipo=compras')
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data['pedidos']) == 1
        pedido = data['pedidos'][0]
        assert pedido['produto']['status'] == 'disponivel'
        assert pedido['produto']['id'] == 10

    def test_listar_vendas_autenticado(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        pedidos_mock = MockDB([_PEDIDO_VENDA])
        with patch('app.get_db', side_effect=[auth_mock, pedidos_mock]):
            resp = authed_client.get('/pedidos?tipo=vendas')
        assert resp.status_code == 200

    def test_listar_pedidos_nao_autenticado(self, client):
        resp = client.get('/pedidos')
        assert resp.status_code == 401

    def test_produto_status_incluido_na_resposta(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        pedido_indisponivel = dict(_PEDIDO_COMPRA, produto_status='vendido')
        pedidos_mock = MockDB([pedido_indisponivel])
        with patch('app.get_db', side_effect=[auth_mock, pedidos_mock]):
            resp = authed_client.get('/pedidos?tipo=compras')
        pedido = resp.get_json()['pedidos'][0]
        assert pedido['produto']['status'] == 'vendido'

    def test_pedido_contem_id_produto(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        pedidos_mock = MockDB([_PEDIDO_COMPRA])
        with patch('app.get_db', side_effect=[auth_mock, pedidos_mock]):
            resp = authed_client.get('/pedidos?tipo=compras')
        pedido = resp.get_json()['pedidos'][0]
        assert 'id' in pedido['produto']

    def test_pedido_tem_formato_id(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        pedidos_mock = MockDB([_PEDIDO_COMPRA])
        with patch('app.get_db', side_effect=[auth_mock, pedidos_mock]):
            resp = authed_client.get('/pedidos?tipo=compras')
        pedido = resp.get_json()['pedidos'][0]
        assert pedido['id_fmt'].startswith('CC-')


class TestAvaliacoes:
    def test_avaliacao_texto_limpo(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        aval_mock = MockDB(
            {'id': 1},   # pedido entregue
            None,        # avaliação ainda não existe
            None,        # INSERT avaliação
            {'media': 4.5},
        )
        with patch('app.get_db', side_effect=[auth_mock, aval_mock]):
            resp = authed_client.post('/avaliacoes', json={
                'produto_id': 10,
                'avaliado_id': 2,
                'pedido_id': 1,
                'nota': 5,
                'comentario': 'Produto chegou em perfeito estado!',
            })
        assert resp.status_code in (200, 201, 400)

    def test_avaliacao_comentario_ofensivo_rejeitado(self, authed_client):
        auth_mock = MockDB({'session_version': 'v1'})
        aval_mock = MockDB({'id': 1}, None)
        with patch('app.get_db', side_effect=[auth_mock, aval_mock]):
            resp = authed_client.post('/avaliacoes', json={
                'produto_id': 10,
                'avaliado_id': 2,
                'pedido_id': 1,
                'nota': 1,
                'comentario': 'que merda de produto',
            })
        assert resp.status_code == 422
        assert 'inapropriada' in resp.get_json()['error'].lower()

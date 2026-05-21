"""Testes unitários das funções auxiliares puras do backend."""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'python'))

from unittest.mock import patch
with patch('pymysql.connect'), patch('boto3.client'):
    from app import fmt_id, fmt_price, hash_password, check_password


pytestmark = pytest.mark.unit


class TestFmtId:
    def test_formata_id_simples(self):
        assert fmt_id(1) == 'CC-00001'

    def test_formata_id_grande(self):
        assert fmt_id(99999) == 'CC-99999'

    def test_formata_id_zero(self):
        assert fmt_id(0) == 'CC-00000'

    def test_formata_id_cinco_digitos(self):
        assert fmt_id(12345) == 'CC-12345'

    def test_prefixo_correto(self):
        assert fmt_id(7).startswith('CC-')


class TestFmtPrice:
    def test_preco_simples(self):
        assert fmt_price(100) == 'R$ 100,00'

    def test_preco_com_centavos(self):
        assert fmt_price(49.99) == 'R$ 49,99'

    def test_preco_com_milhar(self):
        assert fmt_price(1234.56) == 'R$ 1.234,56'

    def test_preco_zero(self):
        assert fmt_price(0) == 'R$ 0,00'

    def test_preco_grande(self):
        resultado = fmt_price(9999.99)
        assert 'R$' in resultado
        assert '9.999,99' in resultado


class TestPasswords:
    def test_hash_nao_e_texto_plano(self):
        h = hash_password('MinhaSenha1!')
        assert h != 'MinhaSenha1!'

    def test_hash_comeca_com_bcrypt(self):
        h = hash_password('MinhaSenha1!')
        assert h.startswith('$2b$')

    def test_check_senha_correta(self):
        h = hash_password('Senha@2025')
        assert check_password('Senha@2025', h) is True

    def test_check_senha_errada(self):
        h = hash_password('Senha@2025')
        assert check_password('SenhaErrada', h) is False

    def test_check_senha_vazia_falha(self):
        h = hash_password('Senha@2025')
        assert check_password('', h) is False

    def test_hashes_diferentes_mesma_senha(self):
        h1 = hash_password('Igual1!')
        h2 = hash_password('Igual1!')
        assert h1 != h2  # salt diferente a cada chamada

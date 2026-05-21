"""Testes unitários das funções de moderação de conteúdo."""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'python'))

from unittest.mock import patch
with patch('pymysql.connect'), patch('boto3.client'):
    from app import verificar_toxicidade, contem_dado_sensivel

pytestmark = pytest.mark.unit


class TestVerificarToxicidade:
    # ── Caminho bom (texto limpo) ─────────────────────────────────────────────
    def test_texto_neutro(self):
        assert verificar_toxicidade('Produto de ótima qualidade!') == 0.0

    def test_texto_elogio(self):
        assert verificar_toxicidade('Vendedor muito educado e produto chegou rápido.') == 0.0

    def test_texto_vazio(self):
        assert verificar_toxicidade('') == 0.0

    def test_texto_none(self):
        assert verificar_toxicidade(None) == 0.0

    def test_texto_curto_limpo(self):
        assert verificar_toxicidade('Ok') == 0.0

    def test_texto_com_acentos_ok(self):
        assert verificar_toxicidade('Ótimo produto, recomendo!') == 0.0

    def test_texto_numeros(self):
        assert verificar_toxicidade('Chegou em 3 dias, 10/10') == 0.0

    # ── Caminho ruim (conteúdo ofensivo) ─────────────────────────────────────
    def test_palavra_ofensiva_simples(self):
        assert verificar_toxicidade('que merda de produto') == 1.0

    def test_palavra_ofensiva_maiuscula(self):
        assert verificar_toxicidade('QUE MERDA') == 1.0

    def test_ofensiva_com_acento(self):
        assert verificar_toxicidade('que bosta isso') == 1.0

    def test_ofensiva_leetspeak(self):
        assert verificar_toxicidade('m3rda esse produto') == 1.0

    def test_ofensiva_letras_repetidas(self):
        assert verificar_toxicidade('merrrda de produto') == 1.0

    def test_xingamento_composto(self):
        assert verificar_toxicidade('vendedor fdp') == 1.0

    def test_xingamento_com_espacos(self):
        assert verificar_toxicidade('filho da puta esse produto') == 1.0

    def test_insulto_comprador(self):
        assert verificar_toxicidade('que idiota esse vendedor') == 1.0

    def test_insulto_babaca(self):
        assert verificar_toxicidade('babaca total') == 1.0


class TestContemDadoSensivel:
    # ── Caminho bom (mensagem segura) ────────────────────────────────────────
    def test_mensagem_limpa(self):
        assert contem_dado_sensivel('Olá, quando você entrega?') is False

    def test_mensagem_com_preco(self):
        assert contem_dado_sensivel('Aceito por R$ 200,00') is False

    def test_mensagem_curta(self):
        assert contem_dado_sensivel('Ok!') is False

    def test_mensagem_com_data(self):
        assert contem_dado_sensivel('Posso entregar na quinta-feira, dia 22/05.') is False

    # ── Caminho ruim (dados sensíveis detectados) ─────────────────────────────
    def test_email_detectado(self):
        assert contem_dado_sensivel('Me manda no ana@gmail.com') is True

    def test_email_corporativo(self):
        assert contem_dado_sensivel('Contato: vendedor@empresa.com.br') is True

    def test_telefone_com_ddd(self):
        assert contem_dado_sensivel('Me liga no (11) 99999-8888') is True

    def test_telefone_sem_parenteses(self):
        assert contem_dado_sensivel('Whats: 11 98888-7777') is True

    def test_cpf_formatado(self):
        assert contem_dado_sensivel('Meu CPF é 529.982.247-25') is True

    def test_cpf_sem_mascara(self):
        assert contem_dado_sensivel('CPF: 52998224725') is True

    def test_cnpj_formatado(self):
        assert contem_dado_sensivel('CNPJ: 12.345.678/0001-90') is True

    def test_uuid_pix_aleatorio(self):
        uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
        assert contem_dado_sensivel(f'Minha chave pix: {uuid}') is True

    def test_numero_conta_bancaria(self):
        assert contem_dado_sensivel('Minha conta: 12345678901') is True

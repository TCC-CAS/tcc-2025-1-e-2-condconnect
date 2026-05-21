"""Testes unitários das funções de validação (CPF, senha, e-mail)."""
import sys
import os
import re
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'python'))

from unittest.mock import patch
with patch('pymysql.connect'), patch('boto3.client'):
    from app import validar_cpf

pytestmark = pytest.mark.unit

STRONG_PASSWORD = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$')
EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


class TestValidarCPF:
    # ── Caminho bom ──────────────────────────────────────────────────────────
    def test_cpf_valido_formatado(self):
        assert validar_cpf('529.982.247-25') is True

    def test_cpf_valido_sem_mascara(self):
        assert validar_cpf('52998224725') is True

    def test_cpf_valido_outro(self):
        assert validar_cpf('111.444.777-35') is True

    # ── Caminho ruim ─────────────────────────────────────────────────────────
    def test_cpf_todos_iguais(self):
        assert validar_cpf('111.111.111-11') is False

    def test_cpf_digito_verificador_errado(self):
        assert validar_cpf('529.982.247-00') is False

    def test_cpf_muito_curto(self):
        assert validar_cpf('123456') is False

    def test_cpf_vazio(self):
        assert validar_cpf('') is False

    def test_cpf_com_letras(self):
        assert validar_cpf('abc.def.ghi-jk') is False

    def test_cpf_zeros(self):
        assert validar_cpf('000.000.000-00') is False


class TestSenhaForte:
    # ── Caminho bom ──────────────────────────────────────────────────────────
    def test_senha_valida_completa(self):
        assert STRONG_PASSWORD.match('Senha@2025') is not None

    def test_senha_valida_simbolo_hash(self):
        assert STRONG_PASSWORD.match('MinhaS#nha1') is not None

    def test_senha_valida_com_underline(self):
        assert STRONG_PASSWORD.match('Teste_123') is not None

    # ── Caminho ruim ─────────────────────────────────────────────────────────
    def test_senha_sem_maiuscula(self):
        assert STRONG_PASSWORD.match('senha@2025') is None

    def test_senha_sem_minuscula(self):
        assert STRONG_PASSWORD.match('SENHA@2025') is None

    def test_senha_sem_numero(self):
        assert STRONG_PASSWORD.match('Senha@abc!') is None

    def test_senha_sem_simbolo(self):
        assert STRONG_PASSWORD.match('Senha12345') is None

    def test_senha_curta(self):
        assert STRONG_PASSWORD.match('S@1a') is None

    def test_senha_vazia(self):
        assert STRONG_PASSWORD.match('') is None


class TestEmailValido:
    # ── Caminho bom ──────────────────────────────────────────────────────────
    def test_email_simples(self):
        assert EMAIL_RE.match('ana@gmail.com') is not None

    def test_email_com_ponto(self):
        assert EMAIL_RE.match('ana.silva@empresa.com.br') is not None

    def test_email_com_mais(self):
        assert EMAIL_RE.match('ana+tag@gmail.com') is not None

    # ── Caminho ruim ─────────────────────────────────────────────────────────
    def test_email_sem_arroba(self):
        assert EMAIL_RE.match('anagmail.com') is None

    def test_email_sem_dominio(self):
        assert EMAIL_RE.match('ana@') is None

    def test_email_sem_tld(self):
        assert EMAIL_RE.match('ana@gmail') is None

    def test_email_vazio(self):
        assert EMAIL_RE.match('') is None

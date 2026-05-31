# CondConnect

Marketplace digital exclusivo para moradores de condomínios residenciais. Permite a compra e venda de produtos entre vizinhos com segurança, moderação automática de conteúdo e painel analítico de vendas.

> Trabalho de Conclusão de Curso — Sistemas de Informação · Centro Universitário Senac · 2025

---

## Acesso

**Produção:** https://condconnect.duckdns.org

**Admin padrão**
- E-mail: `admin@condconnect.com`
- Senha: `admin123`

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3, JavaScript ES6+ (sem frameworks) |
| Backend | Python 3 + Flask (API REST) |
| Servidor de aplicação | Gunicorn (WSGI) |
| Proxy reverso | Apache HTTP Server |
| Banco de dados | MySQL (host externo) |
| Hospedagem | AWS Lightsail (Ubuntu) |
| Moderação de imagens | AWS Rekognition |
| E-mail | Gmail SMTP (porta 465) |
| DNS | DuckDNS |
| SSL | Let's Encrypt / Certbot |

---

## Funcionalidades principais

- Autenticação obrigatória em dois fatores (2FA) com código por e-mail
- Marketplace isolado por condomínio — cada morador vê apenas produtos de vizinhos
- Cadastro, edição e remoção de anúncios com fotos e composição de custos
- Sistema de propostas de negociação (mínimo 70% do preço anunciado)
- Carrinho de compras e finalização de pedidos
- Confirmação de entrega presencial por código de 4 dígitos
- Chat interno com bloqueio automático de dados pessoais e palavras proibidas
- Avaliações de vendedores com detecção de toxicidade
- Denúncias manuais e automáticas com painel de moderação para admin
- Dashboard analítico de vendas com gráficos e filtros por período
- Relatório completo exportável em Excel (8 abas)
- Painel administrativo: aprovar/rejeitar produtos, suspender/banir usuários
- Recursos de acessibilidade: alto contraste, fonte grande, leitura em voz alta (WCAG)
- Conformidade com a LGPD

---

## Estrutura do projeto

```
/
├── Templates/          # Páginas HTML (frontend)
├── static/
│   ├── css/            # Estilos globais e por página
│   ├── js/             # Scripts por página
│   └── assets/         # Imagens estáticas e uploads
├── backend/
│   └── python/
│       ├── app.py           # API Flask (todas as rotas)
│       ├── email_helper.py  # Envio de e-mails via SMTP
│       └── requirements.txt
├── docs/               # Diagramas C4, DER, modelo físico, casos de uso
└── tests/              # Testes automatizados e gerador de relatório
```

---

## Instalação local

### Pré-requisitos

- Python 3.10+
- MySQL (local ou remoto)
- Git

### Passos

```bash
# 1. Clonar o repositório
git clone https://github.com/TCC-CAS/tcc-2025-1-e-2-condconnect.git
cd tcc-2025-1-e-2-condconnect

# 2. Criar e ativar ambiente virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# 3. Instalar dependências
pip install -r backend/python/requirements.txt

# 4. Configurar variáveis de ambiente
# Crie um arquivo .env ou exporte as variáveis abaixo

# 5. Executar
cd backend/python
python app.py
```

A API ficará disponível em `http://localhost:5000`.  
As páginas HTML podem ser abertas diretamente no navegador ou servidas por um servidor estático.

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DB_HOST` | Sim | Host do banco MySQL |
| `DB_USER` | Sim | Usuário do banco |
| `DB_PASSWORD` | Sim | Senha do banco |
| `DB_NAME` | Sim | Nome do banco |
| `FLASK_SECRET_KEY` | Sim | Chave secreta para sessões Flask |
| `AWS_ACCESS_KEY_ID` | Não | Credencial AWS (Rekognition) |
| `AWS_SECRET_ACCESS_KEY` | Não | Credencial AWS (Rekognition) |
| `AWS_REGION` | Não | Região AWS (padrão: us-east-1) |
| `PERSPECTIVE_API_KEY` | Não | API Google Perspective (moderação de texto) |

---

## Banco de dados

O schema completo está em:

- `backend/db_setup.sql` — criação completa (DROP + CREATE)
- `backend/db_setup_v2.sql` — criação incremental (IF NOT EXISTS)
- Migrations automáticas executadas pelo `init_db()` em `app.py` na inicialização

---

## Deploy (servidor)

```bash
# Atualizar código
cd /var/www/html/condconnect
git pull origin master

# Reiniciar o Flask (obrigatório apenas quando app.py mudar)
sudo systemctl restart condconnect-flask

# Verificar status
sudo systemctl status condconnect-flask
```

---

## Dependências Python

```
flask==3.0.3
flask-cors==4.0.1
PyMySQL==1.1.1
bcrypt==4.1.3
Pillow==10.3.0
gunicorn==22.0.0
```

---

## Diagramas (pasta `/docs`)

| Arquivo | Conteúdo |
|---|---|
| `c4_contexto.puml` | C4 Level 1 — Diagrama de Contexto |
| `c4_containers.puml` | C4 Level 2 — Diagrama de Contêineres |
| `c4_components.puml` | C4 Level 3 — Diagrama de Componentes |
| `c4_codigo.puml` | C4 Level 4 — Diagrama de Código |
| `der_condconnect.puml` | Diagrama Entidade-Relacionamento (DER) |
| `modelo_fisico.puml` | Modelo Físico do Banco de Dados |
| `uc_morador.puml` | Casos de Uso — Morador |
| `uc_vendedor.puml` | Casos de Uso — Vendedor |
| `uc_comprador.puml` | Casos de Uso — Comprador |
| `uc_administrador.puml` | Casos de Uso — Administrador |
| `swot.puml` | Análise SWOT |
| `gerar_diagramas.py` | Renderiza todos os `.puml` e gera PNGs automaticamente |

Para gerar todos os diagramas como imagem:

```bash
pip install Pillow
cd docs
python gerar_diagramas.py
```

---

## Testes

```bash
cd tests
pytest --tb=short
python generate_report.py   # gera relatório visual em PNG
```

---

## Licença

Projeto acadêmico — Centro Universitário Senac, 2025.  
Uso restrito a fins educacionais.

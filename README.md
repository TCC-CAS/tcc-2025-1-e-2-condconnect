# CondConnect

> Marketplace digital exclusivo para moradores de condomínios residenciais.

O **CondConnect** permite a compra e venda de produtos entre vizinhos do mesmo condomínio, com autenticação em dois fatores, moderação automática de conteúdo por inteligência artificial, sistema de propostas de negociação, confirmação de entrega presencial e painel analítico de vendas com exportação em Excel.

Desenvolvido como Trabalho de Conclusão de Curso — Sistemas de Informação · Centro Universitário Senac · 2025.

---

## Tecnologias

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0.3-000000?style=flat&logo=flask&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat&logo=mysql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![AWS](https://img.shields.io/badge/AWS_Lightsail-FF9900?style=flat&logo=amazonaws&logoColor=white)
![Gunicorn](https://img.shields.io/badge/Gunicorn-499848?style=flat&logo=gunicorn&logoColor=white)
![Apache](https://img.shields.io/badge/Apache-D22128?style=flat&logo=apache&logoColor=white)

---

## Pré-requisitos e Instalação

### Pré-requisitos

- Python 3.10 ou superior
- MySQL 8.0 (local ou remoto)
- Git

### Instalação local

```bash
# 1. Clonar o repositório
git clone https://github.com/TCC-CAS/tcc-2025-1-e-2-condconnect.git
cd tcc-2025-1-e-2-condconnect

# 2. Criar e ativar o ambiente virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# 3. Instalar as dependências
pip install -r backend/python/requirements.txt

# 4. Criar o banco de dados
mysql -u root -p < backend/db_setup.sql

# 5. Configurar variáveis de ambiente
# Crie o arquivo backend/python/.env com o conteúdo abaixo:
```

```env
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=condconnect
FLASK_SECRET_KEY=sua_chave_secreta
```

```bash
# 6. Iniciar o servidor
cd backend/python
python app.py
```

A API ficará disponível em `http://localhost:5000`.
Abra qualquer página da pasta `Templates/` no navegador para acessar o frontend.

### Deploy (produção)

```bash
cd /var/www/html/condconnect
git pull origin master

# Necessário apenas quando app.py for alterado
sudo systemctl restart condconnect-flask
```

---

## Exemplos de uso

### Cadastro e login com 2FA
O morador se cadastra informando nome, e-mail, senha, CPF, telefone e identificação no condomínio. Em cada login, um código de 6 dígitos é enviado ao e-mail com validade de 10 minutos.

### Publicar um anúncio
O vendedor acessa **Meus Produtos > Novo Anúncio**, preenche as informações e faz upload de fotos. O produto entra como **pendente** e só aparece no marketplace após aprovação do administrador.

### Negociar com proposta
O comprador pode enviar uma proposta de preço (mínimo 70% do valor anunciado). Se aceita, o produto é adicionado automaticamente ao carrinho com o preço negociado.

### Confirmar entrega
Ao entregar o produto, o vendedor informa ao comprador um código de 4 dígitos gerado pelo sistema. O comprador valida o código no app, confirmando o recebimento.

### Dashboard analítico
O vendedor acessa o painel com faturamento, ticket médio, funil de conversão e top produtos — filtráveis por ano e mês — e exporta os dados em Excel com 8 abas.

### Painel administrativo
O administrador aprova ou rejeita anúncios, suspende ou bane usuários e resolve denúncias em `/Templates/admin.html`.

---

## Contribuindo

1. Faça um **fork** do repositório
2. Crie uma branch para sua feature:
   ```bash
   git checkout -b feature/minha-feature
   ```
3. Faça commit das alterações:
   ```bash
   git commit -m "feat: descrição da feature"
   ```
4. Envie para o repositório remoto:
   ```bash
   git push origin feature/minha-feature
   ```
5. Abra um **Pull Request** descrevendo as mudanças

---

## Licença

Este projeto foi desenvolvido exclusivamente para fins acadêmicos como Trabalho de Conclusão de Curso no Centro Universitário Senac (2025).

O uso, cópia, modificação e distribuição do código são permitidos apenas para fins educacionais e não comerciais, com obrigatória atribuição de crédito aos autores originais.

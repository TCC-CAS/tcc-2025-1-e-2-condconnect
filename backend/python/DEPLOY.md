# CondConnect Flask Backend — Deploy no AWS Lightsail

## 1. Enviar arquivos para o servidor

```bash
# Do seu computador (Git push + pull no servidor, OU scp direto):
scp -r backend/python ubuntu@54.242.139.170:/tmp/flask-backend
```

## 2. No servidor (SSH)

```bash
ssh ubuntu@54.242.139.170
```

### Copiar arquivos e rodar setup

```bash
sudo cp -r /tmp/flask-backend/* /var/www/html/condconnect/backend/python/
sudo chmod +x /var/www/html/condconnect/backend/python/setup_server.sh
sudo /var/www/html/condconnect/backend/python/setup_server.sh
```

O script instala Python, cria venv, instala dependências, cria serviço systemd e ativa módulos Apache.

## 3. Configurar Apache para proxy

Edite o VirtualHost da porta 80:

```bash
sudo nano /etc/apache2/sites-available/condconnect.conf
```

Adicione **dentro** do bloco `<VirtualHost *:80>`, antes do `</VirtualHost>`:

```apache
ProxyPreserveHost On
ProxyPass /backend/api/ http://127.0.0.1:5000/
ProxyPassReverse /backend/api/ http://127.0.0.1:5000/
RequestHeader set X-Forwarded-For "%{REMOTE_ADDR}e"
```

Depois:

```bash
sudo systemctl reload apache2
```

## 4. Verificar serviço

```bash
sudo systemctl status condconnect-flask
# Ver logs em tempo real:
sudo journalctl -u condconnect-flask -f
```

## 5. Testar

```bash
curl http://localhost:5000/me.php
# Deve retornar: {"error": "Não autenticado"}
```

## Comandos úteis

```bash
# Reiniciar Flask após mudanças no código:
sudo systemctl restart condconnect-flask

# Ver últimos erros:
sudo journalctl -u condconnect-flask -n 50

# Parar serviço:
sudo systemctl stop condconnect-flask
```

## Estrutura de arquivos no servidor

```
/var/www/html/condconnect/
├── backend/
│   └── python/
│       ├── app.py          ← Flask app principal
│       ├── email_helper.py ← Envio de e-mail
│       ├── requirements.txt
│       └── venv/           ← criado pelo setup_server.sh
├── static/
├── Templates/
└── ...
```

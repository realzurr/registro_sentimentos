# Guia de Setup — Servidor Ubuntu 24.04

Guia passo a passo para configurar o servidor e fazer o deploy da Agenda de Virtudes.

## Pré-requisitos

- Servidor Ubuntu 24.04 LTS (mínimo 1 GB RAM, 10 GB disco)
- Acesso SSH com sudo
- Domínio apontando para o IP do servidor (ex: `agenda.seudominio.com.br`)
- Repositório git com o código-fonte

## Passo 1: Preparar o servidor (1ª vez)

### Conectar via SSH

```bash
ssh usuario@IP_DO_SERVIDOR
```

### Atualizar o sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar dependências do sistema

```bash
sudo apt install -y curl git ufw nginx certbot python3-certbot-nginx
```

### Instalar Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### Clonar o repositório

```bash
cd /home/deploy
git clone <URL_DO_REPO> agenda-virtudes
cd agenda-virtudes
bun install
```

### Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env  # Editar com os valores reais
```

### Rodar o setup do servidor

```bash
sudo ./scripts/setup-server.sh
```

Este script:
1. Cria o diretório de dados `/var/lib/agenda/`
2. Copia o `.env` para `/var/lib/agenda/.env`
3. Configura o firewall UFW (abre portas 22, 80, 443)
4. Configura o nginx com proxy reverso para o Node.js
5. Cria o serviço systemd `agenda.service`
6. Inicia o serviço
7. Configura certbot (SSL Let's Encrypt)

### Configurar o domínio (certbot)

```bash
sudo certbot --nginx -d agenda.seudominio.com.br
```

O certbot configura SSL automaticamente e adiciona redirect HTTP → HTTPS.

## Passo 2: Deploy (toda atualização)

### Opção A: Deploy manual

```bash
cd /home/deploy/agenda-virtudes
git pull origin main
sudo ./scripts/deploy.sh
```

### Opção B: Script de atualização (pull + deploy)

```bash
cd /home/deploy/agenda-virtudes
sudo ./scripts/update.sh
```

### Opção C: Deploy via SSH remoto

```bash
ssh deploy@IP_DO_SERVIDOR "cd /home/deploy/agenda-virtudes && sudo ./scripts/update.sh"
```

## Passo 3: Backup automático (cron)

O script `backup.sh` já é instalado com cron pelo `setup-server.sh`. Para verificar:

```bash
crontab -l | grep agenda
```

Saída esperada:

```
0 3 * * * /home/deploy/agenda-virtudes/scripts/backup.sh >> /var/log/agenda-backup.log 2>&1
```

Backups ficam em `/var/backups/agenda/` com retenção de 30 dias.

## Solução de problemas

### App não inicia

```bash
sudo journalctl -u agenda -n 50 --no-pager
```

### Erro de permissão no SQLite

```bash
sudo chown -R deploy:deploy /var/lib/agenda/
chmod 644 /var/lib/agenda/virtudes.db
```

### nginx 502 Bad Gateway

```bash
# Verificar se o serviço está rodando
sudo systemctl status agenda

# Reiniciar
sudo systemctl restart agenda
```

### Renovar SSL

```bash
sudo certbot renew --dry-run
```

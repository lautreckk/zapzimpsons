# 🔗 Configuração de Webhook para Desenvolvimento

## Problema Atual
A webhook está configurada como `http://localhost:8080/api/webhook/atendimento`, que não é acessível externamente.

## Soluções para Teste

### 1. 🚀 **ngrok (Recomendado)**

**Instalar ngrok:**
```bash
# Windows (via choco)
choco install ngrok

# Ou baixe de: https://ngrok.com/download
```

**Usar ngrok:**
```bash
# Em um terminal separado, execute:
ngrok http 8080

# Vai gerar uma URL como: https://abc123.ngrok.io
```

**Atualizar webhook no código:**
- Use a URL do ngrok + `/functions/v1/webhook-handler`
- Exemplo: `https://abc123.ngrok.io/functions/v1/webhook-handler`

### 2. 🌐 **Supabase Edge Function (Atual)**

Nossa Edge Function já está deployada:
```
https://your-supabase-url/functions/v1/webhook-handler
```

**Para usar:**
1. Configure a Evolution API com esta URL
2. A função já processa e salva no Supabase

### 3. 📡 **Localtunnel (Alternativa)**

```bash
# Instalar
npm install -g localtunnel

# Usar
lt --port 8080 --subdomain chatapp-webhook
```

### 4. 🔧 **Cloudflare Tunnel**

```bash
# Instalar cloudflared
# Usar
cloudflared tunnel --url http://localhost:8080
```

## 🎯 **Solução Recomendada Imediata**

Use a Edge Function do Supabase que já está deployada:

1. **Pega a URL do Supabase:**
   - `https://[seu-projeto].supabase.co/functions/v1/webhook-handler`

2. **Atualiza o código para usar esta URL:**
   - Modifica o `ConfigService.getWebhookUrl()`

3. **Recria a instância com a nova webhook**

## 🔄 **Para Testar Agora**

Vou atualizar o código para usar a Edge Function diretamente.
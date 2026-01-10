# 🔍 Zoom Meeting SDK - Troubleshooting Erro 3712

## ❌ Erro Atual
```
errorCode: 3712
reason: "Signature is invalid."
type: "JOIN_MEETING_FAILED"
```

## ✅ Checklist de Verificação

### 1. Tipo de App no Zoom Marketplace

**CRÍTICO**: Você deve usar **Meeting SDK App**, NÃO "JWT App"

📍 **Como verificar:**
1. Acesse: https://marketplace.zoom.us/
2. Faça login
3. Clique em **"Develop"** → **"Build App"**
4. Localize seu app ou crie um novo

**✅ CORRETO:**
- App Type: **"Meeting SDK"**
- Status: **"Activated"** (não "Development")

**❌ ERRADO:**
- App Type: "JWT" (deprecated desde v2.3.0)
- Status: "Inactive" ou "Development only"

---

### 2. Credenciais Corretas

Após criar/acessar seu **Meeting SDK App**:

1. Vá na aba **"App Credentials"**
2. Copie:
   - **Client ID** → Este é o `ZOOM_SDK_KEY`
   - **Client Secret** → Este é o `ZOOM_SDK_SECRET`

⚠️ **IMPORTANTE:**
- NÃO use "SDK Key" ou "SDK Secret" (deprecated)
- Use APENAS "Client ID" e "Client Secret"

---

### 3. Configurar no Vercel

Vá em: **Vercel Dashboard** → **Seu Projeto** → **Settings** → **Environment Variables**

Adicione/Verifique:
```
ZOOM_SDK_KEY = [Seu Client ID aqui]
ZOOM_SDK_SECRET = [Seu Client Secret aqui]
```

Após alterar, faça **Redeploy** do projeto!

---

### 4. Ativar o App

No Zoom Marketplace, seu app deve estar:
- ✅ **Activated** (Production)
- ❌ Não apenas "Development"

**Como ativar:**
1. No seu app, vá em **"App Credentials"** ou **"Activation"**
2. Se houver botão **"Activate Your App"**, clique nele
3. Siga os passos de ativação

---

### 5. Scopes e Permissões

Verifique se seu Meeting SDK App tem as permissões necessárias:

1. Vá em **"Scopes"** no seu app
2. Certifique-se de ter pelo menos:
   - `meeting:write` (se for host)
   - `meeting:read` (para participantes)

---

### 6. Testar Meeting Number

O Meeting Number deve:
- ✅ Existir e estar ativo
- ✅ Não ter expirado
- ✅ Ter senha correta (se houver)

**Teste com uma reunião recém-criada:**
1. Crie uma nova reunião no Zoom
2. Use o Meeting ID dela (apenas números, sem espaços)
3. Se tiver senha, use exatamente como está

---

### 7. Verificar Logs do Backend (Vercel)

No Vercel, veja os logs do backend:

```
[Zoom] Payload completo: { appKey: '...', mn: '...', role: 0, iat: ..., exp: ..., tokenExp: ... }
[Zoom] JWT Header: { alg: 'HS256', typ: 'JWT' }
```

Verifique:
- `appKey` tem o Client ID correto?
- `iat` e `exp` estão em **segundos** (não milissegundos)?
- `exp` é 2 horas após `iat`?

---

### 8. Comparar com Exemplo Oficial

Nosso payload JWT atual:
```json
{
  "appKey": "REdV2kLWR5aoC3VXWpFkQg",
  "mn": "88420561093",
  "role": 0,
  "iat": 1768022278,
  "exp": 1768029478,
  "tokenExp": 1768029478
}
```

Exemplo da documentação oficial:
```json
{
  "appKey": "ZOOM_CLIENT_ID",
  "mn": "ZOOM_MEETING_NUMBER",
  "role": 0,
  "iat": 1646937553,
  "exp": 1646944753,
  "tokenExp": 1646944753
}
```

✅ Formato idêntico!

---

## 🎯 Solução Mais Provável

**90% dos casos de erro 3712 são causados por:**

1. **Usar JWT App em vez de Meeting SDK App**
   - Solução: Criar novo app do tipo "Meeting SDK"

2. **Client Secret incorreto**
   - Solução: Copiar novamente do Zoom Marketplace

3. **App não ativado**
   - Solução: Ativar app em Production no Zoom Marketplace

---

## 📚 Referências

- [Meeting SDK Auth](https://developers.zoom.us/docs/meeting-sdk/auth/)
- [Component View Docs](https://marketplacefront.zoom.us/sdk/meeting/web/components/index.html)
- [Zoom Marketplace](https://marketplace.zoom.us/)

---

## 🆘 Se Nada Funcionar

Tente criar um **novo Meeting SDK App** do zero:

1. https://marketplace.zoom.us/ → "Build App"
2. Escolha **"Meeting SDK"**
3. Preencha informações básicas
4. Copie **Client ID** e **Client Secret**
5. **Ative o app**
6. Atualize as variáveis no Vercel
7. Faça redeploy

---

**Criado por Claude Code** 🤖

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = 3000;

// Configurar CORS e JSON parsing
app.use(cors());
app.use(express.json());

// Configurar Supabase - usar anon key temporariamente para teste
const supabaseUrl = 'https://bcbootnozntaomsysdpa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYm9vdG5vem50YW9tc3lzZHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNDg1MzAsImV4cCI6MjA2ODgyNDUzMH0.wtMTJQ0afytLRD4AtTs3NetUNzb8C-VdC2lTy8SVwbk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Endpoint para receber webhooks da Evolution API
app.post('/api/webhook', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`🚀 ${timestamp} - Webhook recebida:`, JSON.stringify(req.body, null, 2));

  try {
    // Evolution API pode enviar array ou objeto único
    const webhookDataArray = Array.isArray(req.body) ? req.body : [req.body];
    
    // Se o webhook vier no formato direto (sem wrapper), ajustar
    const processedArray = webhookDataArray.map(item => {
      if (item.event && item.instance && item.data) {
        // Formato direto da Evolution API
        return { body: item };
      }
      return item; // Formato com wrapper
    });
    
    const results = [];
    
    for (let i = 0; i < processedArray.length; i++) {
      const webhookData = processedArray[i];
      console.log(`📨 ${timestamp} - Processando webhook ${i + 1}/${processedArray.length}`);
      
      // Verificar se é evento de mensagem
      if (webhookData.body?.event === 'messages.upsert') {
        const messageData = webhookData.body.data;
        const rawPhone = messageData.key.remoteJid;
        const phone = rawPhone.replace('@s.whatsapp.net', '').replace('@c.us', '');
        const isFromMe = messageData.key.fromMe;
        const instanceName = webhookData.body.instance;
        
        console.log(`💬 ${timestamp} - Mensagem: de=${phone}, paraEu=${isFromMe}, instancia=${instanceName}`);
        
        // Buscar instância no banco
        let { data: instance } = await supabase
          .from('whatsapp_instances')
          .select('*')
          .eq('instance_name', instanceName)
          .single();
        
        if (!instance) {
          // Tentar buscar por evolution_instance_id
          const { data: instanceById } = await supabase
            .from('whatsapp_instances')
            .select('*')
            .eq('evolution_instance_id', messageData.instanceId)
            .single();
          
          if (instanceById) {
            instance = instanceById;
          } else {
            // Usar qualquer instância ativa como fallback
            const { data: activeInstances } = await supabase
              .from('whatsapp_instances')
              .select('*')
              .eq('connection_status', 'open')
              .limit(1);
            
            if (activeInstances && activeInstances.length > 0) {
              instance = activeInstances[0];
              console.log(`✅ ${timestamp} - Usando instância fallback: ${instance.instance_name}`);
            }
          }
        }
        
        if (!instance) {
          console.error(`❌ ${timestamp} - Nenhuma instância encontrada`);
          results.push({ success: false, reason: 'Instância não encontrada' });
          continue;
        }
        
        console.log(`✅ ${timestamp} - Instância encontrada: ${instance.instance_name}`);
        
        // Processar mensagem
        await processMessage(supabase, instance, messageData, phone, isFromMe, timestamp, results);
      } else {
        console.log(`ℹ️ ${timestamp} - Evento não processado: ${webhookData.body?.event}`);
        results.push({ success: true, reason: 'Evento não processado', event: webhookData.body?.event });
      }
    }
    
    console.log(`🏁 ${timestamp} - Processamento concluído:`, {
      total: processedArray.length,
      sucessos: results.filter(r => r.success).length,
      falhas: results.filter(r => !r.success).length
    });
    
    res.json({
      success: true,
      message: `Processados ${processedArray.length} webhooks`,
      timestamp,
      results
    });
    
  } catch (error) {
    console.error(`💥 ${timestamp} - Erro fatal:`, error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message,
      timestamp
    });
  }
});

// Função para processar mensagens
async function processMessage(supabase, instance, messageData, phone, isFromMe, timestamp, results) {
  try {
    console.log(`👤 ${timestamp} - Buscando contato: ${phone}`);
    
    // Buscar ou criar contato
    let { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phone)
      .eq('instance_id', instance.id)
      .single();
    
    if (!contact) {
      console.log(`➕ ${timestamp} - Criando contato: ${phone} (${messageData.pushName || 'Sem nome'})`);
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          phone_number: phone,
          name: messageData.pushName || phone,
          instance_id: instance.id
        })
        .select()
        .single();
      
      if (contactError) {
        console.error(`❌ ${timestamp} - Erro ao criar contato:`, contactError);
        results.push({ success: false, reason: 'Falha ao criar contato', error: contactError });
        return;
      }
      contact = newContact;
    }
    
    console.log(`💭 ${timestamp} - Buscando conversa com contato: ${contact.id}`);
    
    // Buscar ou criar conversa
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('instance_id', instance.id)
      .single();
    
    if (!conversation) {
      console.log(`➕ ${timestamp} - Criando conversa`);
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          contact_id: contact.id,
          instance_id: instance.id,
          status: 'active',
          last_message_at: new Date(messageData.messageTimestamp * 1000).toISOString()
        })
        .select()
        .single();
      
      if (conversationError) {
        console.error(`❌ ${timestamp} - Erro ao criar conversa:`, conversationError);
        results.push({ success: false, reason: 'Falha ao criar conversa', error: conversationError });
        return;
      }
      conversation = newConversation;
    }
    
    // Verificar mensagem duplicada
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('message_id', messageData.key.id)
      .eq('instance_id', instance.id)
      .single();
    
    if (existingMessage) {
      console.log(`⚠️ ${timestamp} - Mensagem já existe: ${messageData.key.id}`);
      results.push({ success: true, reason: 'Mensagem já existe', messageId: messageData.key.id });
      return;
    }
    
    // Extrair conteúdo da mensagem
    let content = '';
    let messageType = 'text';
    let mediaUrl = null;
    
    if (messageData.message.conversation) {
      content = messageData.message.conversation;
    } else if (messageData.message.imageMessage) {
      content = messageData.message.imageMessage.caption || 'Imagem';
      messageType = 'image';
      mediaUrl = messageData.message.imageMessage.url;
    } else if (messageData.message.audioMessage) {
      content = 'Áudio';
      messageType = 'audio';
      mediaUrl = messageData.message.audioMessage.url;
    } else if (messageData.message.videoMessage) {
      content = messageData.message.videoMessage.caption || 'Vídeo';
      messageType = 'video';
      mediaUrl = messageData.message.videoMessage.url;
    } else if (messageData.message.documentMessage) {
      content = messageData.message.documentMessage.title || 'Documento';
      messageType = 'document';
      mediaUrl = messageData.message.documentMessage.url;
    } else {
      content = `Mensagem ${messageData.messageType}`;
    }
    
    console.log(`💾 ${timestamp} - Salvando mensagem: "${content.substring(0, 30)}..." (${messageType})`);
    
    // Salvar mensagem
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        instance_id: instance.id,
        message_id: messageData.key.id,
        sender_phone: isFromMe ? (instance.phone_number || '') : phone,
        recipient_phone: isFromMe ? phone : (instance.phone_number || ''),
        message_type: messageType,
        content,
        media_url: mediaUrl,
        is_from_me: isFromMe,
        timestamp: new Date(messageData.messageTimestamp * 1000).toISOString(),
        status: 'sent'
      });
    
    if (messageError) {
      console.error(`❌ ${timestamp} - Erro ao salvar mensagem:`, messageError);
      results.push({ success: false, reason: 'Falha ao salvar mensagem', error: messageError });
      return;
    }
    
    // Atualizar conversa
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date(messageData.messageTimestamp * 1000).toISOString(),
        unread_count: isFromMe ? conversation.unread_count : conversation.unread_count + 1
      })
      .eq('id', conversation.id);
    
    console.log(`🎉 ${timestamp} - ✅ Mensagem salva com sucesso!`);
    
    results.push({
      success: true,
      messageId: messageData.key.id,
      phone,
      content: content.substring(0, 50),
      type: messageType,
      contactName: contact.name
    });
    
  } catch (error) {
    console.error(`💥 ${timestamp} - Erro ao processar mensagem:`, error);
    results.push({ success: false, reason: 'Erro no processamento da mensagem', error: error.message });
  }
}

// Endpoint de teste
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Servidor webhook funcionando!', 
    timestamp: new Date().toISOString(),
    ngrokUrl: 'Disponível via ngrok'
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor webhook iniciado na porta ${port}`);
  console.log(`📡 URL do ngrok: https://d0cddd7995a6.ngrok-free.app`);
  console.log(`🔗 URL da webhook para Evolution API: https://d0cddd7995a6.ngrok-free.app/api/webhook`);
  console.log(`🧪 Teste: https://d0cddd7995a6.ngrok-free.app/api/test`);
});
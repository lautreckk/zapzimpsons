import { createClient } from '@supabase/supabase-js';

// Configurar Supabase
const supabaseUrl = 'https://bcbootnozntaomsysdpa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYm9vdG5vem50YW9tc3lzZHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNDg1MzAsImV4cCI6MjA2ODgyNDUzMH0.wtMTJQ0afytLRD4AtTs3NetUNzb8C-VdC2lTy8SVwbk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const handler = async (event, context) => {
  const timestamp = new Date().toISOString();
  
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  console.log(`🚀 ${timestamp} - Netlify Webhook: ${event.httpMethod} ${event.path}`);
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const webhookData = JSON.parse(event.body);
    console.log(`📨 ${timestamp} - Webhook recebida:`, JSON.stringify(webhookData, null, 2));

    // Evolution API pode enviar formato direto
    const processedData = webhookData.event && webhookData.instance && webhookData.data 
      ? { body: webhookData } 
      : webhookData;

    // Verificar se é evento de mensagem
    if (processedData.body?.event === 'messages.upsert') {
      const messageData = processedData.body.data;
      const rawPhone = messageData.key.remoteJid;
      const phone = rawPhone.replace('@s.whatsapp.net', '').replace('@c.us', '');
      const isFromMe = messageData.key.fromMe;
      const instanceName = processedData.body.instance;
      
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
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Instância não encontrada' })
        };
      }
      
      console.log(`✅ ${timestamp} - Instância encontrada: ${instance.instance_name}`);
      
      // Processar mensagem
      const result = await processMessage(supabase, instance, messageData, phone, isFromMe, timestamp);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Webhook processada com sucesso',
          timestamp,
          result
        })
      };
    } else {
      console.log(`ℹ️ ${timestamp} - Evento não processado: ${processedData.body?.event}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Evento não processado',
          event: processedData.body?.event
        })
      };
    }
    
  } catch (error) {
    console.error(`💥 ${timestamp} - Erro fatal:`, error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro interno do servidor',
        details: error.message,
        timestamp
      })
    };
  }
};

// Função para processar mensagens
async function processMessage(supabase, instance, messageData, phone, isFromMe, timestamp) {
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
        throw new Error('Falha ao criar contato');
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
        throw new Error('Falha ao criar conversa');
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
      return { success: true, reason: 'Mensagem já existe', messageId: messageData.key.id };
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
      throw new Error('Falha ao salvar mensagem');
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
    
    return {
      success: true,
      messageId: messageData.key.id,
      phone,
      content: content.substring(0, 50),
      type: messageType,
      contactName: contact.name
    };
    
  } catch (error) {
    console.error(`💥 ${timestamp} - Erro ao processar mensagem:`, error);
    throw error;
  }
}
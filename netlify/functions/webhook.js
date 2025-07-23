import { createClient } from '@supabase/supabase-js';

// Configurar Supabase
const supabaseUrl = 'https://bcbootnozntaomsysdpa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYm9vdG5vem50YW9tc3lzZHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNDg1MzAsImV4cCI6MjA2ODgyNDUzMH0.wtMTJQ0afytLRD4AtTs3NetUNzb8C-VdC2lTy8SVwbk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para baixar mídia e converter para base64
async function downloadMediaBase64(instanceName, messageId) {
  try {
    const response = await fetch(`https://api.gruposena.club/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '3ac318ab976bc8c75dfe827e865a576c'
      },
      body: JSON.stringify({
        message: {
          key: {
            id: messageId
          }
        },
        convertToMp4: false
      })
    });

    if (!response.ok) {
      console.error(`❌ Erro ao baixar mídia: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.base64 || null;
  } catch (error) {
    console.error('❌ Erro ao fazer download da mídia:', error);
    return null;
  }
}

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

    // Verificar se é array (novo formato)
    let processedData;
    if (Array.isArray(webhookData) && webhookData.length > 0) {
      // Novo formato: array com body
      const firstItem = webhookData[0];
      processedData = { body: firstItem.body };
    } else if (webhookData.event && webhookData.instance && webhookData.data) {
      // Formato direto
      processedData = { body: webhookData };
    } else {
      // Formato antigo
      processedData = webhookData;
    }

    // Verificar se é evento de mensagem
    if (processedData.body?.event === 'messages.upsert') {
      const messageData = processedData.body.data;
      const rawPhone = messageData.key.remoteJid;
      const isFromMe = messageData.key.fromMe;
      const instanceName = processedData.body.instance;
      
      // Identificar se é grupo ou chat individual
      const isGroup = rawPhone.includes('@g.us');
      const isIndividual = rawPhone.includes('@s.whatsapp.net') || rawPhone.includes('@c.us');
      
      let contactPhone, contactName, chatIdentifier;
      
      if (isGroup) {
        // Para grupos: usar o ID do grupo como identificador
        chatIdentifier = rawPhone; // Manter o ID completo do grupo
        contactPhone = rawPhone.replace('@g.us', '');
        
        // Nome do contato será o nome do participante ou do grupo
        if (messageData.key.participant && !isFromMe) {
          // Mensagem de um participante específico no grupo
          const participantPhone = messageData.key.participant.replace('@s.whatsapp.net', '').replace('@c.us', '');
          contactName = messageData.pushName ? `${messageData.pushName} (Grupo)` : `${participantPhone} (Grupo)`;
        } else {
          // Mensagem do próprio grupo ou de mim
          contactName = `Grupo ${contactPhone}`;
        }
        
        console.log(`👥 ${timestamp} - Mensagem de GRUPO: grupo=${contactPhone}, participante=${messageData.key.participant || 'próprio'}, nome=${contactName}`);
      } else if (isIndividual) {
        // Para chats individuais: usar o número da pessoa
        contactPhone = rawPhone.replace('@s.whatsapp.net', '').replace('@c.us', '');
        chatIdentifier = contactPhone;
        contactName = messageData.pushName || contactPhone;
        
        console.log(`👤 ${timestamp} - Mensagem INDIVIDUAL: de=${contactPhone}, nome=${contactName}`);
      } else {
        console.log(`❓ ${timestamp} - Tipo de chat desconhecido: ${rawPhone}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Tipo de chat não reconhecido',
            chatType: rawPhone
          })
        };
      }
      
      console.log(`💬 ${timestamp} - Processando: tipo=${isGroup ? 'GRUPO' : 'INDIVIDUAL'}, identificador=${chatIdentifier}, instancia=${instanceName}`);
      
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
      const result = await processMessage(supabase, instance, messageData, chatIdentifier, contactName, isFromMe, isGroup, instanceName, timestamp);
      
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
async function processMessage(supabase, instance, messageData, chatIdentifier, contactName, isFromMe, isGroup, instanceName, timestamp) {
  try {
    console.log(`${isGroup ? '👥' : '👤'} ${timestamp} - Buscando contato: ${chatIdentifier} (${isGroup ? 'GRUPO' : 'INDIVIDUAL'})`);
    
    // Buscar ou criar contato
    let { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', chatIdentifier)
      .eq('instance_id', instance.id)
      .single();
    
    if (!contact) {
      console.log(`➕ ${timestamp} - Criando contato: ${chatIdentifier} - ${contactName}`);
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          phone_number: chatIdentifier,
          name: contactName,
          instance_id: instance.id
        })
        .select()
        .single();
      
      if (contactError) {
        console.error(`❌ ${timestamp} - Erro ao criar contato:`, contactError);
        throw new Error('Falha ao criar contato');
      }
      contact = newContact;
    } else if (contact.name !== contactName) {
      // Atualizar nome do contato se mudou
      console.log(`🔄 ${timestamp} - Atualizando nome do contato de '${contact.name}' para '${contactName}'`);
      await supabase
        .from('contacts')
        .update({ name: contactName })
        .eq('id', contact.id);
      contact.name = contactName;
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
    let mediaBase64 = null;
    
    if (messageData.message.conversation) {
      content = messageData.message.conversation;
    } else if (messageData.message.imageMessage) {
      content = messageData.message.imageMessage.caption || 'Imagem';
      messageType = 'image';
      mediaUrl = messageData.message.imageMessage.url;
      // Verificar se já tem base64 na mensagem
      mediaBase64 = messageData.message.base64 || null;
    } else if (messageData.message.audioMessage) {
      content = 'Áudio';
      messageType = 'audio';
      mediaUrl = messageData.message.audioMessage.url;
      // Verificar se já tem base64 na mensagem
      mediaBase64 = messageData.message.base64 || null;
    } else if (messageData.message.videoMessage) {
      content = messageData.message.videoMessage.caption || 'Vídeo';
      messageType = 'video';
      mediaUrl = messageData.message.videoMessage.url;
      // Verificar se já tem base64 na mensagem
      mediaBase64 = messageData.message.base64 || null;
    } else if (messageData.message.documentMessage) {
      content = messageData.message.documentMessage.title || 'Documento';
      messageType = 'document';
      mediaUrl = messageData.message.documentMessage.url;
      // Verificar se já tem base64 na mensagem
      mediaBase64 = messageData.message.base64 || null;
    } else {
      content = `Mensagem ${messageData.messageType}`;
    }
    
    // Baixar mídia apenas se não tiver base64 e tiver URL
    if (messageType !== 'text' && mediaUrl && !mediaBase64) {
      console.log(`🔽 ${timestamp} - Baixando mídia (${messageType}): ${messageData.key.id}`);
      mediaBase64 = await downloadMediaBase64(instanceName, messageData.key.id);
      if (mediaBase64) {
        console.log(`✅ ${timestamp} - Mídia baixada com sucesso (${mediaBase64?.length || 0} chars)`);
      } else {
        console.log(`⚠️ ${timestamp} - Falhou ao baixar mídia, continuando sem base64`);
      }
    } else if (mediaBase64) {
      console.log(`🎯 ${timestamp} - Base64 já disponível na mensagem (${mediaBase64?.length || 0} chars)`);
    }
    
    console.log(`💾 ${timestamp} - Salvando mensagem: "${content.substring(0, 30)}..." (${messageType})`);
    
    // Preparar dados para salvar mensagem
    let senderPhone, recipientPhone, senderName;
    
    if (isGroup) {
      if (isFromMe) {
        senderPhone = instance.phone_number || '';
        recipientPhone = chatIdentifier; // ID do grupo
        senderName = instance.profile_name || 'Você';
      } else {
        // Mensagem de participante do grupo
        senderPhone = messageData.key.participant ? 
          messageData.key.participant.replace('@s.whatsapp.net', '').replace('@c.us', '') : 
          chatIdentifier;
        recipientPhone = chatIdentifier; // ID do grupo
        senderName = messageData.pushName || senderPhone;
      }
    } else {
      // Chat individual
      senderPhone = isFromMe ? (instance.phone_number || '') : chatIdentifier;
      recipientPhone = isFromMe ? chatIdentifier : (instance.phone_number || '');
      senderName = isFromMe ? 'Você' : (messageData.pushName || chatIdentifier);
    }
    
    // Salvar mensagem
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        instance_id: instance.id,
        message_id: messageData.key.id,
        sender_phone: senderPhone,
        sender_name: senderName,
        recipient_phone: recipientPhone,
        message_type: messageType,
        content,
        media_url: mediaUrl,
        media_base64: mediaBase64,
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
      chatIdentifier,
      chatType: isGroup ? 'grupo' : 'individual',
      content: content.substring(0, 50),
      type: messageType,
      contactName: contact.name,
      participant: isGroup && messageData.key.participant ? 
        messageData.key.participant.replace('@s.whatsapp.net', '').replace('@c.us', '') : 
        null
    };
    
  } catch (error) {
    console.error(`💥 ${timestamp} - Erro ao processar mensagem:`, error);
    throw error;
  }
}
import { supabase } from '@/lib/supabase';
import { Conversation, Message, Contact } from '@/types/whatsapp';

export class MessageService {
  static async getConversations(instanceId?: string): Promise<(Conversation & { contact: Contact })[]> {
    let query = supabase
      .from('conversations')
      .select(`
        *,
        contact:contacts(*)
      `)
      .order('last_message_at', { ascending: false });

    if (instanceId) {
      query = query.eq('instance_id', instanceId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }

    return data || [];
  }

  static async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return data || [];
  }

  static async sendMessage(
    instanceName: string,
    phone: string,
    content: string,
    conversationId: string,
    instanceId: string
  ): Promise<void> {
    // Send message via WhatsApp API
    const response = await fetch('https://api.gruposena.club/message/sendText/' + instanceName, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '3ac318ab976bc8c75dfe827e865a576c'
      },
      body: JSON.stringify({
        number: phone,
        text: content
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    // Save message to database
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        instance_id: instanceId,
        sender_phone: 'system', // Will be updated with actual phone
        recipient_phone: phone,
        message_type: 'text',
        content,
        is_from_me: true,
        timestamp: new Date().toISOString(),
        status: 'sent'
      });

    if (error) {
      throw new Error(`Failed to save message: ${error.message}`);
    }

    // Update conversation last message time
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversationId);
  }

  static async sendAudio(
    instanceName: string,
    phone: string,
    audioBase64: string,
    conversationId: string,
    instanceId: string,
    duration?: number
  ): Promise<void> {
    // Send audio via WhatsApp API
    const response = await fetch(`https://api.gruposena.club/message/sendWhatsAppAudio/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '3ac318ab976bc8c75dfe827e865a576c'
      },
      body: JSON.stringify({
        number: phone,
        audio: audioBase64,
        delay: 0
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send audio: ${response.statusText}`);
    }

    // Save message to database
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        instance_id: instanceId,
        sender_phone: 'system',
        recipient_phone: phone,
        message_type: 'audio',
        content: duration ? `Áudio ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` : 'Áudio',
        media_base64: audioBase64,
        is_from_me: true,
        timestamp: new Date().toISOString(),
        status: 'sent'
      });

    if (error) {
      throw new Error(`Failed to save audio message: ${error.message}`);
    }

    // Update conversation last message time
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversationId);
  }

  static async sendMedia(
    instanceName: string,
    phone: string,
    mediaBase64: string,
    mediaType: 'image' | 'video' | 'document',
    mimeType: string,
    fileName: string,
    caption: string,
    conversationId: string,
    instanceId: string
  ): Promise<void> {
    // Testar se o base64 precisa do prefixo data URI
    let mediaToSend = mediaBase64;
    
    // Se não começa com data:, adicionar o prefixo
    if (!mediaBase64.startsWith('data:')) {
      mediaToSend = `data:${mimeType};base64,${mediaBase64}`;
    }

    const payload = {
      number: phone,
      mediatype: mediaType.charAt(0).toUpperCase() + mediaType.slice(1),
      mimetype: mimeType,
      caption: caption || '',
      media: mediaToSend,
      fileName: fileName,
      delay: 0,
      linkPreview: true
    };

    // Log detalhado para debug
    console.log('=== SENDMEDIA DEBUG ===');
    console.log('URL:', `https://api.gruposena.club/message/sendMedia/${instanceName}`);
    console.log('Original mediaBase64 length:', mediaBase64.length);
    console.log('Original starts with:', mediaBase64.substring(0, 30));
    console.log('Processed media starts with:', mediaToSend.substring(0, 50));
    console.log('Payload:', {
      ...payload,
      media: `${mediaToSend.substring(0, 50)}...` // Log apenas os primeiros 50 chars
    });
    console.log('MediaType original:', mediaType);
    console.log('MediaType capitalized:', mediaType.charAt(0).toUpperCase() + mediaType.slice(1));
    console.log('MimeType:', mimeType);
    console.log('FileName:', fileName);
    console.log('Caption:', caption);
    console.log('Phone:', phone);
    console.log('Instance:', instanceName);

    // Send media via WhatsApp API
    const response = await fetch(`https://api.gruposena.club/message/sendMedia/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '3ac318ab976bc8c75dfe827e865a576c'
      },
      body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);

    if (!response.ok) {
      const responseText = await response.text();
      console.log('Response body:', responseText);
      throw new Error(`Failed to send media: ${response.statusText} - ${responseText}`);
    }

    const responseData = await response.text();
    console.log('Success response:', responseData);
    console.log('=== END DEBUG ===');

    // Save message to database
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        instance_id: instanceId,
        sender_phone: 'system',
        recipient_phone: phone,
        message_type: mediaType,
        content: caption || fileName,
        media_base64: mediaBase64,
        is_from_me: true,
        timestamp: new Date().toISOString(),
        status: 'sent'
      });

    if (error) {
      throw new Error(`Failed to save media message: ${error.message}`);
    }

    // Update conversation last message time
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversationId);
  }

  static async sendSticker(
    instanceName: string,
    phone: string,
    stickerBase64: string,
    conversationId: string,
    instanceId: string
  ): Promise<void> {
    // Send sticker via WhatsApp API
    const response = await fetch(`https://api.gruposena.club/message/sendSticker/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '3ac318ab976bc8c75dfe827e865a576c'
      },
      body: JSON.stringify({
        number: phone,
        sticker: stickerBase64,
        delay: 0
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send sticker: ${response.statusText}`);
    }

    // Save message to database
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        instance_id: instanceId,
        sender_phone: 'system',
        recipient_phone: phone,
        message_type: 'image', // Stickers são tratados como imagens
        content: 'Sticker',
        media_base64: stickerBase64,
        is_from_me: true,
        timestamp: new Date().toISOString(),
        status: 'sent'
      });

    if (error) {
      throw new Error(`Failed to save sticker message: ${error.message}`);
    }

    // Update conversation last message time
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversationId);
  }

  static async markAsRead(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    if (error) {
      throw new Error(`Failed to mark conversation as read: ${error.message}`);
    }
  }

  static async updateConversationStatus(
    conversationId: string, 
    status: 'active' | 'closed' | 'waiting'
  ): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ status })
      .eq('id', conversationId);

    if (error) {
      throw new Error(`Failed to update conversation status: ${error.message}`);
    }
  }

  static async addConversationTag(conversationId: string, tag: string): Promise<void> {
    // First get current tags
    const { data: conversation } = await supabase
      .from('conversations')
      .select('tags')
      .eq('id', conversationId)
      .single();

    if (conversation) {
      const currentTags = conversation.tags || [];
      if (!currentTags.includes(tag)) {
        const { error } = await supabase
          .from('conversations')
          .update({ tags: [...currentTags, tag] })
          .eq('id', conversationId);

        if (error) {
          throw new Error(`Failed to add tag: ${error.message}`);
        }
      }
    }
  }

  static async removeConversationTag(conversationId: string, tag: string): Promise<void> {
    // First get current tags
    const { data: conversation } = await supabase
      .from('conversations')
      .select('tags')
      .eq('id', conversationId)
      .single();

    if (conversation) {
      const currentTags = conversation.tags || [];
      const { error } = await supabase
        .from('conversations')
        .update({ tags: currentTags.filter(t => t !== tag) })
        .eq('id', conversationId);

      if (error) {
        throw new Error(`Failed to remove tag: ${error.message}`);
      }
    }
  }

  static async updateConversationNotes(conversationId: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ notes })
      .eq('id', conversationId);

    if (error) {
      throw new Error(`Failed to update notes: ${error.message}`);
    }
  }

  static subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();
  }

  static subscribeToConversations(callback: (conversation: any) => void) {
    return supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  }

  static async updateContactProfilePicture(phoneNumber: string, profilePictureUrl: string): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .update({ profile_picture: profilePictureUrl })
      .eq('phone_number', phoneNumber);

    if (error) {
      throw new Error(`Failed to update contact profile picture: ${error.message}`);
    }
  }

  static async fetchAndUpdateProfilePictures(instanceName: string, conversations: (Conversation & { contact: Contact })[]): Promise<void> {
    const { WhatsAppService } = await import('./whatsappService');
    
    // Processar em lotes para não sobrecarregar a API
    const batchSize = 5;
    for (let i = 0; i < conversations.length; i += batchSize) {
      const batch = conversations.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (conversation) => {
          try {
            // Só buscar se não tem foto de perfil ainda
            if (!conversation.contact.profile_picture) {
              const profilePictureUrl = await WhatsAppService.fetchProfilePicture(
                instanceName,
                conversation.contact.phone_number
              );
              
              if (profilePictureUrl) {
                await this.updateContactProfilePicture(
                  conversation.contact.phone_number,
                  profilePictureUrl
                );
              }
            }
          } catch (error) {
            console.error(`Failed to fetch profile picture for ${conversation.contact.phone_number}:`, error);
          }
        })
      );
      
      // Pequena pausa entre lotes
      if (i + batchSize < conversations.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}
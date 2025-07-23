export interface WhatsAppInstance {
  id: string;
  instance_name: string;
  instance_id?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  qr_code?: string;
  webhook_url?: string;
  phone_number?: string;
  profile_name?: string;
  profile_pic_url?: string;
  owner_jid?: string;
  connection_status: 'open' | 'close' | 'connecting';
  token?: string;
  evolution_instance_id?: string;
  last_sync_at: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  phone_number: string;
  name?: string;
  profile_picture?: string;
  instance_id: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  instance_id: string;
  status: 'active' | 'closed' | 'waiting';
  last_message_at: string;
  unread_count: number;
  tags: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  contact?: Contact;
}

export interface Message {
  id: string;
  conversation_id: string;
  instance_id: string;
  message_id?: string;
  sender_phone: string;
  sender_name?: string;
  recipient_phone: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
  content?: string;
  media_url?: string;
  media_base64?: string;
  is_from_me: boolean;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
}

export interface CreateInstanceRequest {
  instanceName: string;
  integration: string;
  qrcode: boolean;
  rejectCall: boolean;
  msgCall?: string;
  groupsIgnore: boolean;
  alwaysOnline: boolean;
  readMessages: boolean;
  readStatus: boolean;
  syncFullHistory: boolean;
  webhook: {
    byEvents: boolean;
    base64: boolean;
    url: string;
    events: string[];
  };
}

export interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    integration: string;
    webhookWaBusiness: string | null;
    accessTokenWaBusiness: string;
    status: string;
  };
  hash: string;
  webhook: {
    webhookUrl: string;
    webhookByEvents: boolean;
    webhookBase64: boolean;
  };
  websocket: Record<string, any>;
  rabbitmq: Record<string, any>;
  nats: Record<string, any>;
  sqs: Record<string, any>;
  settings: {
    rejectCall: boolean;
    msgCall: string;
    groupsIgnore: boolean;
    alwaysOnline: boolean;
    readMessages: boolean;
    readStatus: boolean;
    syncFullHistory: boolean;
    wavoipToken: string;
  };
  qrcode: {
    pairingCode: string | null;
    code: string;
    base64: string;
    count: number;
  };
}

export interface WebhookMessage {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
      participant?: string;
    };
    messageType: string;
    message: {
      conversation?: string;
      imageMessage?: {
        url: string;
        mimetype: string;
        caption?: string;
      };
      audioMessage?: {
        url: string;
        mimetype: string;
      };
      videoMessage?: {
        url: string;
        mimetype: string;
        caption?: string;
      };
      documentMessage?: {
        url: string;
        mimetype: string;
        title: string;
      };
    };
    messageTimestamp: number;
    source: string;
  };
}

export interface EvolutionAPIConfig {
  id: string;
  api_url: string;
  api_key: string;
  is_active: boolean;
  connection_status: 'connected' | 'disconnected' | 'error';
  last_tested_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InstanceStatusResponse {
  id: string;
  name: string;
  connectionStatus: 'open' | 'close' | 'connecting';
  ownerJid?: string;
  profileName?: string;
  profilePicUrl?: string;
  integration: string;
  number?: string;
  businessId?: string;
  token: string;
  clientName: string;
  disconnectionReasonCode?: string;
  disconnectionObject?: any;
  disconnectionAt?: string;
  createdAt: string;
  updatedAt: string;
  Setting: {
    id: string;
    rejectCall: boolean;
    msgCall: string;
    groupsIgnore: boolean;
    alwaysOnline: boolean;
    readMessages: boolean;
    readStatus: boolean;
    syncFullHistory: boolean;
    wavoipToken: string;
    createdAt: string;
    updatedAt: string;
    instanceId: string;
  };
  _count: {
    Message: number;
    Contact: number;
    Chat: number;
  };
}

// Tipos para o sistema de Kanban
export interface KanbanColumn {
  id: string;
  title: string;
  description?: string;
  color: string;
  position: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  value?: number;
  priority: 'low' | 'medium' | 'high';
  source?: string;
  kanban_column_id?: string;
  conversation_id?: string;
  position: number;
  tags: string[];
  notes?: string;
  last_contact_at?: string;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumnWithLeads extends KanbanColumn {
  leads: Lead[];
  count: number;
}
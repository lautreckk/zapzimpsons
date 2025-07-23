import { supabase } from '@/lib/supabase';
import { CreateInstanceRequest, CreateInstanceResponse, WhatsAppInstance, InstanceStatusResponse } from '@/types/whatsapp';
import { ConfigService } from './configService';

export class WhatsAppService {
  static async getApiConfig() {
    const config = await ConfigService.getActiveConfig();
    if (!config) {
      throw new Error('Nenhuma configuração Evolution API ativa encontrada. Configure a API primeiro.');
    }
    return config;
  }

  static async createInstance(instanceName: string): Promise<CreateInstanceResponse> {
    const config = await this.getApiConfig();
    const webhookUrl = ConfigService.getWebhookUrl(config.api_url);
    
    const requestData: CreateInstanceRequest = {
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      rejectCall: false,
      msgCall: 'Esta é uma linha comercial. Não atendemos ligações.',
      groupsIgnore: false,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: true,
      webhook: {
        byEvents: false,
        base64: true,
        url: webhookUrl,
        events: ['MESSAGES_UPSERT']
      }
    };

    const response = await fetch(`${config.api_url}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create instance: ${response.statusText}`);
    }

    return response.json();
  }

  static async saveInstanceToDatabase(instanceData: CreateInstanceResponse): Promise<WhatsAppInstance> {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        instance_name: instanceData.instance.instanceName,
        instance_id: instanceData.instance.instanceId,
        status: instanceData.instance.status as 'connecting' | 'connected' | 'disconnected' | 'error',
        qr_code: instanceData.qrcode.base64,
        webhook_url: instanceData.webhook.webhookUrl,
        connection_status: 'connecting',
        token: instanceData.hash,
        evolution_instance_id: instanceData.instance.instanceId,
        last_sync_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save instance to database: ${error.message}`);
    }

    return data;
  }

  static async getInstances(): Promise<WhatsAppInstance[]> {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch instances: ${error.message}`);
    }

    return data || [];
  }

  static async updateInstanceStatus(instanceId: string, status: WhatsAppInstance['status'], phoneNumber?: string): Promise<void> {
    const updateData: any = { status };
    if (phoneNumber) {
      updateData.phone_number = phoneNumber;
    }

    const { error } = await supabase
      .from('whatsapp_instances')
      .update(updateData)
      .eq('instance_id', instanceId);

    if (error) {
      throw new Error(`Failed to update instance status: ${error.message}`);
    }
  }

  static async deleteInstance(id: string): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete instance: ${error.message}`);
    }
  }

  static async sendMessage(instanceName: string, phone: string, message: string): Promise<void> {
    const config = await this.getApiConfig();
    
    const response = await fetch(`${config.api_url}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key
      },
      body: JSON.stringify({
        number: phone,
        text: message
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
  }

  static async fetchAllInstancesFromAPI(): Promise<InstanceStatusResponse[]> {
    const config = await this.getApiConfig();
    
    const response = await fetch(`${config.api_url}/instance/fetchInstances`, {
      headers: {
        'apikey': config.api_key
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch instances: ${response.statusText}`);
    }

    return response.json();
  }

  static async getInstanceInfo(instanceName: string): Promise<InstanceStatusResponse | undefined> {
    const instances = await this.fetchAllInstancesFromAPI();
    return instances.find((instance) => instance.name === instanceName);
  }

  static async syncInstanceStatus(instanceName: string): Promise<void> {
    try {
      const instanceInfo = await this.getInstanceInfo(instanceName);
      
      if (!instanceInfo) {
        // Instance not found in API, mark as disconnected
        await supabase
          .from('whatsapp_instances')
          .update({
            connection_status: 'close',
            status: 'disconnected',
            last_sync_at: new Date().toISOString()
          })
          .eq('instance_name', instanceName);
        return;
      }

      // Extract phone number from ownerJid (format: 5584999999999@s.whatsapp.net)
      const phoneNumber = instanceInfo.ownerJid 
        ? instanceInfo.ownerJid.replace('@s.whatsapp.net', '')
        : null;

      // Update instance with latest info from API
      await supabase
        .from('whatsapp_instances')
        .update({
          connection_status: instanceInfo.connectionStatus,
          status: instanceInfo.connectionStatus === 'open' ? 'connected' : 'disconnected',
          phone_number: phoneNumber,
          profile_name: instanceInfo.profileName,
          profile_pic_url: instanceInfo.profilePicUrl,
          owner_jid: instanceInfo.ownerJid,
          token: instanceInfo.token,
          evolution_instance_id: instanceInfo.id,
          last_sync_at: new Date().toISOString()
        })
        .eq('instance_name', instanceName);

    } catch (error) {
      console.error(`Failed to sync instance ${instanceName}:`, error);
      
      // Mark as error status
      await supabase
        .from('whatsapp_instances')
        .update({
          connection_status: 'close',
          status: 'error',
          last_sync_at: new Date().toISOString()
        })
        .eq('instance_name', instanceName);
    }
  }

  static async syncAllInstances(): Promise<void> {
    try {
      const dbInstances = await this.getInstances();
      
      for (const instance of dbInstances) {
        await this.syncInstanceStatus(instance.instance_name);
      }
    } catch (error) {
      console.error('Failed to sync all instances:', error);
    }
  }

  static async fetchProfilePicture(instanceName: string, phoneNumber: string): Promise<string | null> {
    try {
      const config = await this.getApiConfig();
      
      const response = await fetch(`${config.api_url}/chat/fetchProfilePictureUrl/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.api_key
        },
        body: JSON.stringify({
          number: phoneNumber
        })
      });

      if (!response.ok) {
        console.warn(`Failed to fetch profile picture for ${phoneNumber}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      
      // A API pode retornar diferentes formatos, vamos tratar os possíveis retornos
      if (data && typeof data === 'object') {
        // Possíveis campos onde a URL pode estar
        const possibleFields = ['profilePictureUrl', 'url', 'picture', 'profilePicUrl', 'profileUrl'];
        
        for (const field of possibleFields) {
          if (data[field] && typeof data[field] === 'string') {
            return data[field];
          }
        }
        
        // Se não encontrou nos campos esperados, log para debug
        console.log('Profile picture response format:', data);
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching profile picture for ${phoneNumber}:`, error);
      return null;
    }
  }
}
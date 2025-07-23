import { supabase } from '@/lib/supabase';
import { EvolutionAPIConfig } from '@/types/whatsapp';

export class ConfigService {
  static async getActiveConfig(): Promise<EvolutionAPIConfig | null> {
    const { data, error } = await supabase
      .from('evolution_api_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to get active config: ${error.message}`);
    }

    return data;
  }

  static async getAllConfigs(): Promise<EvolutionAPIConfig[]> {
    const { data, error } = await supabase
      .from('evolution_api_settings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get configs: ${error.message}`);
    }

    return data || [];
  }

  static async createConfig(config: {
    api_url: string;
    api_key: string;
  }): Promise<EvolutionAPIConfig> {
    // First, deactivate all existing configs
    await supabase
      .from('evolution_api_settings')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    // Create new config
    const { data, error } = await supabase
      .from('evolution_api_settings')
      .insert({
        api_url: config.api_url.replace(/\/$/, ''), // Remove trailing slash
        api_key: config.api_key,
        is_active: true,
        connection_status: 'disconnected'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create config: ${error.message}`);
    }

    return data;
  }

  static async updateConfig(id: string, updates: Partial<EvolutionAPIConfig>): Promise<EvolutionAPIConfig> {
    const { data, error } = await supabase
      .from('evolution_api_settings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update config: ${error.message}`);
    }

    return data;
  }

  static async deleteConfig(id: string): Promise<void> {
    const { error } = await supabase
      .from('evolution_api_settings')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete config: ${error.message}`);
    }
  }

  static async testConnection(apiUrl: string, apiKey: string): Promise<boolean> {
    try {
      const cleanUrl = apiUrl.replace(/\/$/, '');
      const response = await fetch(`${cleanUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Try to parse response to ensure it's valid JSON
      await response.json();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  static async updateConnectionStatus(id: string, status: 'connected' | 'disconnected' | 'error'): Promise<void> {
    await supabase
      .from('evolution_api_settings')
      .update({
        connection_status: status,
        last_tested_at: new Date().toISOString()
      })
      .eq('id', id);
  }

  static async activateConfig(id: string): Promise<void> {
    // Deactivate all configs first
    await supabase
      .from('evolution_api_settings')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Activate the selected config
    const { error } = await supabase
      .from('evolution_api_settings')
      .update({ is_active: true })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to activate config: ${error.message}`);
    }
  }

  static getWebhookUrl(baseUrl?: string): string {
    // Use the Netlify Function for webhook processing
    return 'https://gchatsena.netlify.app/api/webhook';
  }
}
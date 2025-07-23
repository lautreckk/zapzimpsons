import { supabase } from '@/lib/supabase';
import { KanbanColumn, Lead, KanbanColumnWithLeads } from '@/types/whatsapp';

export class KanbanService {
  static async getKanbanColumns(): Promise<KanbanColumnWithLeads[]> {
    const { data: columns, error: columnsError } = await supabase
      .from('kanban_columns')
      .select('*')
      .order('position', { ascending: true });

    if (columnsError) {
      throw new Error(`Failed to fetch kanban columns: ${columnsError.message}`);
    }

    // Buscar leads para cada coluna
    const columnsWithLeads = await Promise.all(
      (columns || []).map(async (column) => {
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('*')
          .eq('kanban_column_id', column.id)
          .order('position', { ascending: true });

        if (leadsError) {
          console.error(`Failed to fetch leads for column ${column.id}:`, leadsError);
        }

        return {
          ...column,
          leads: leads || [],
          count: (leads || []).length
        };
      })
    );

    return columnsWithLeads;
  }

  static async createKanbanColumn(
    title: string,
    description?: string,
    color: string = 'bg-blue-500'
  ): Promise<KanbanColumn> {
    // Buscar a próxima posição
    const { data: columns } = await supabase
      .from('kanban_columns')
      .select('position')
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = (columns && columns.length > 0) ? columns[0].position + 1 : 0;

    const { data, error } = await supabase
      .from('kanban_columns')
      .insert({
        title,
        description,
        color,
        position: nextPosition,
        is_default: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create kanban column: ${error.message}`);
    }

    return data;
  }

  static async updateKanbanColumn(
    id: string,
    updates: Partial<Pick<KanbanColumn, 'title' | 'description' | 'color' | 'position'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('kanban_columns')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update kanban column: ${error.message}`);
    }
  }

  static async deleteKanbanColumn(id: string): Promise<void> {
    // Primeiro, mover todos os leads desta coluna para a primeira coluna padrão
    const { data: firstColumn } = await supabase
      .from('kanban_columns')
      .select('id')
      .eq('is_default', true)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (firstColumn) {
      await supabase
        .from('leads')
        .update({ kanban_column_id: firstColumn.id })
        .eq('kanban_column_id', id);
    }

    // Deletar a coluna
    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete kanban column: ${error.message}`);
    }
  }

  static async createLead(leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
    // Se não especificado kanban_column_id, usar a primeira coluna
    let kanbanColumnId = leadData.kanban_column_id;
    
    if (!kanbanColumnId) {
      const { data: firstColumn } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('is_default', true)
        .order('position', { ascending: true })
        .limit(1)
        .single();

      if (firstColumn) {
        kanbanColumnId = firstColumn.id;
      }
    }

    // Buscar a próxima posição na coluna
    const { data: leads } = await supabase
      .from('leads')
      .select('position')
      .eq('kanban_column_id', kanbanColumnId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = (leads && leads.length > 0) ? leads[0].position + 1 : 0;

    const { data, error } = await supabase
      .from('leads')
      .insert({
        ...leadData,
        kanban_column_id: kanbanColumnId,
        position: nextPosition
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create lead: ${error.message}`);
    }

    return data;
  }

  static async updateLead(
    id: string,
    updates: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update lead: ${error.message}`);
    }
  }

  static async moveLead(
    leadId: string,
    targetColumnId: string,
    targetPosition: number
  ): Promise<void> {
    const { error } = await supabase
      .from('leads')
      .update({
        kanban_column_id: targetColumnId,
        position: targetPosition
      })
      .eq('id', leadId);

    if (error) {
      throw new Error(`Failed to move lead: ${error.message}`);
    }
  }

  static async deleteLead(id: string): Promise<void> {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete lead: ${error.message}`);
    }
  }

  static async createLeadFromConversation(
    conversationId: string,
    contactName: string,
    contactPhone: string,
    additionalData?: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'conversation_id'>>
  ): Promise<Lead> {
    const leadData = {
      name: contactName,
      phone: contactPhone,
      conversation_id: conversationId,
      priority: 'medium' as const,
      tags: ['WhatsApp'],
      source: 'WhatsApp Chat',
      position: 0,
      ...additionalData
    };

    return this.createLead(leadData);
  }

  static subscribeToKanbanChanges(callback: (payload: any) => void) {
    return supabase
      .channel('kanban-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_columns'
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        callback
      )
      .subscribe();
  }
}
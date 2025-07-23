import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WhatsAppService } from '@/services/whatsappService';
import { toast } from 'sonner';

export function useInstanceSync(enabled: boolean = true, interval: number = 30000) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const syncInstances = async () => {
      try {
        // Get current instances from database
        const instances = await WhatsAppService.getInstances();
        
        if (instances.length === 0) return;

        // Sync all instances
        await WhatsAppService.syncAllInstances();

        // Invalidate queries to update UI
        queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });

        // Check for status changes and show notifications
        const updatedInstances = await WhatsAppService.getInstances();
        
        updatedInstances.forEach(instance => {
          const previousStatus = previousStatusRef.current.get(instance.instance_name);
          const currentStatus = instance.connection_status;
          
          if (previousStatus && previousStatus !== currentStatus) {
            if (currentStatus === 'open' && previousStatus === 'close') {
              toast.success(`${instance.instance_name} conectado!`, {
                description: `Número: ${instance.phone_number || 'Não identificado'}`
              });
            } else if (currentStatus === 'close' && previousStatus === 'open') {
              toast.error(`${instance.instance_name} desconectado!`, {
                description: 'Verifique a conexão do WhatsApp'
              });
            }
          }
          
          // Update previous status
          previousStatusRef.current.set(instance.instance_name, currentStatus);
        });

      } catch (error) {
        console.error('Instance sync error:', error);
        // Don't show error toast on every sync failure to avoid spam
      }
    };

    // Initial sync
    syncInstances();

    // Set up interval
    intervalRef.current = setInterval(syncInstances, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, queryClient]);

  const forcSync = async () => {
    try {
      await WhatsAppService.syncAllInstances();
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Sincronização realizada com sucesso!');
    } catch (error) {
      toast.error('Erro na sincronização');
    }
  };

  return { forcSync };
}
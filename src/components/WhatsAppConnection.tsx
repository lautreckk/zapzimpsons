import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Smartphone, 
  QrCode, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  Settings
} from "lucide-react";
import { WhatsAppService } from "@/services/whatsappService";
import { ConfigService } from "@/services/configService";
import { WhatsAppInstance } from "@/types/whatsapp";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useInstanceSync } from "@/hooks/useInstanceSync";
import { toast } from "sonner";

export function WhatsAppConnection() {
  const [instanceName, setInstanceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: WhatsAppService.getInstances,
  });

  const { data: activeConfig } = useQuery({
    queryKey: ['evolution-api-active-config'],
    queryFn: ConfigService.getActiveConfig,
  });

  // Auto-sync instances every 30 seconds
  const { forcSync } = useInstanceSync(true, 30000);

  const createInstanceMutation = useMutation({
    mutationFn: async (name: string) => {
      const instanceData = await WhatsAppService.createInstance(name);
      await WhatsAppService.saveInstanceToDatabase(instanceData);
      return instanceData;
    },
    onSuccess: (data) => {
      setQrCodeData(data.qrcode.base64);
      setShowQrDialog(true);
      setInstanceName("");
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success("Instância criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar instância: ${error.message}`);
    },
    onSettled: () => {
      setIsCreating(false);
    }
  });

  const deleteInstanceMutation = useMutation({
    mutationFn: WhatsAppService.deleteInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success("Instância removida com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover instância: ${error.message}`);
    }
  });

  const handleCreateInstance = async () => {
    if (!instanceName.trim()) {
      toast.error("Por favor, insira um nome para a instância");
      return;
    }

    setIsCreating(true);
    createInstanceMutation.mutate(instanceName.trim());
  };

  const handleDeleteInstance = (id: string) => {
    if (confirm("Tem certeza que deseja remover esta instância?")) {
      deleteInstanceMutation.mutate(id);
    }
  };

  const getStatusIcon = (connectionStatus: WhatsAppInstance['connection_status']) => {
    switch (connectionStatus) {
      case 'open':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'connecting':
        return <Loader2 className="w-4 h-4 text-warning animate-spin" />;
      case 'close':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (connectionStatus: WhatsAppInstance['connection_status']) => {
    switch (connectionStatus) {
      case 'open':
        return { label: 'Conectado', variant: 'default' as const };
      case 'connecting':
        return { label: 'Conectando', variant: 'secondary' as const };
      case 'close':
        return { label: 'Desconectado', variant: 'outline' as const };
      default:
        return { label: 'Desconhecido', variant: 'outline' as const };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Conexões WhatsApp</h2>
          <p className="text-muted-foreground">Gerencie suas instâncias do WhatsApp</p>
          {activeConfig && (
            <p className="text-sm text-muted-foreground mt-1">
              API: {activeConfig.api_url}
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={forcSync}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sincronizar
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-primary hover:opacity-90"
                disabled={!activeConfig}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Instância WhatsApp</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="instanceName">Nome da Instância</Label>
                  <Input
                    id="instanceName"
                    placeholder="Ex: Atendimento-01"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                
                {!activeConfig ? (
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      Configure primeiro uma Evolution API para criar instâncias.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <Smartphone className="h-4 w-4" />
                    <AlertDescription>
                      Após criar a instância, um QR Code será gerado para conectar seu WhatsApp.
                    </AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  onClick={handleCreateInstance} 
                  disabled={isCreating || !instanceName.trim() || !activeConfig}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando Instância...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Instância
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!activeConfig && (
        <Card className="p-6 bg-gradient-card border-border border-destructive/50">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-destructive" />
            <div>
              <h3 className="font-medium text-foreground">Configuração necessária</h3>
              <p className="text-sm text-muted-foreground">
                Configure uma Evolution API antes de criar instâncias WhatsApp
              </p>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Carregando instâncias...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map((instance) => {
            const statusInfo = getStatusLabel(instance.connection_status);
            return (
              <Card key={instance.id} className="p-4 bg-gradient-card border-border">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground">{instance.instance_name}</h3>
                      {instance.phone_number ? (
                        <div className="space-y-1">
                          <p className="text-sm text-foreground font-medium">
                            {instance.phone_number}
                          </p>
                          {instance.profile_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {instance.profile_name}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Aguardando conexão
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(instance.connection_status)}
                        <Badge variant={statusInfo.variant} className="text-xs">
                          {statusInfo.label}
                        </Badge>
                      </div>
                      {instance.profile_pic_url && (
                        <img 
                          src={instance.profile_pic_url} 
                          alt="Profile" 
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {instance.qr_code && instance.connection_status === 'connecting' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1">
                            <QrCode className="w-4 h-4 mr-2" />
                            Ver QR Code
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Conectar WhatsApp</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex justify-center">
                              <img 
                                src={instance.qr_code} 
                                alt="QR Code WhatsApp" 
                                className="max-w-full h-auto border rounded"
                              />
                            </div>
                            <Alert>
                              <Smartphone className="h-4 w-4" />
                              <AlertDescription>
                                1. Abra o WhatsApp no seu celular<br/>
                                2. Toque em Menu (⋮) ou Configurações<br/>
                                3. Toque em "Aparelhos conectados"<br/>
                                4. Toque em "Conectar um aparelho"<br/>
                                5. Aponte a câmera para este QR code
                              </AlertDescription>
                            </Alert>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteInstance(instance.id)}
                      disabled={deleteInstanceMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Criado em: {new Date(instance.created_at).toLocaleDateString('pt-BR')}</div>
                    <div>Última sync: {new Date(instance.last_sync_at).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {instances.length === 0 && !isLoading && activeConfig && (
        <Card className="p-8 text-center bg-gradient-card border-border">
          <Smartphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhuma instância criada
          </h3>
          <p className="text-muted-foreground mb-4">
            Crie sua primeira instância WhatsApp para começar a receber mensagens
          </p>
        </Card>
      )}

      {/* QR Code Dialog for new instances */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
          </DialogHeader>
          {qrCodeData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img 
                  src={qrCodeData} 
                  alt="QR Code WhatsApp" 
                  className="max-w-full h-auto border rounded"
                />
              </div>
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  1. Abra o WhatsApp no seu celular<br/>
                  2. Toque em Menu (⋮) ou Configurações<br/>
                  3. Toque em "Aparelhos conectados"<br/>
                  4. Toque em "Conectar um aparelho"<br/>
                  5. Aponte a câmera para este QR code
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
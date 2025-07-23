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
  Settings, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Plus,
  Trash2,
  TestTube,
  Power,
  AlertTriangle
} from "lucide-react";
import { ConfigService } from "@/services/configService";
import { EvolutionAPIConfig } from "@/types/whatsapp";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function EvolutionAPISettings() {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['evolution-api-configs'],
    queryFn: ConfigService.getAllConfigs,
  });

  const createConfigMutation = useMutation({
    mutationFn: async ({ api_url, api_key }: { api_url: string; api_key: string }) => {
      return ConfigService.createConfig({ api_url, api_key });
    },
    onSuccess: () => {
      setApiUrl("");
      setApiKey("");
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ['evolution-api-configs'] });
      toast.success("Configuração criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar configuração: ${error.message}`);
    }
  });

  const deleteConfigMutation = useMutation({
    mutationFn: ConfigService.deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-api-configs'] });
      toast.success("Configuração removida com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover configuração: ${error.message}`);
    }
  });

  const activateConfigMutation = useMutation({
    mutationFn: ConfigService.activateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-api-configs'] });
      toast.success("Configuração ativada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao ativar configuração: ${error.message}`);
    }
  });

  const handleTestConnection = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) {
      toast.error("Por favor, preencha a URL da API e a chave");
      return;
    }

    setIsTestingConnection(true);
    try {
      const isConnected = await ConfigService.testConnection(apiUrl.trim(), apiKey.trim());
      if (isConnected) {
        toast.success("Conexão testada com sucesso!");
      } else {
        toast.error("Falha ao conectar com a API. Verifique a URL e a chave.");
      }
    } catch (error) {
      toast.error("Erro ao testar conexão");
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleCreateConfig = () => {
    if (!apiUrl.trim() || !apiKey.trim()) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    createConfigMutation.mutate({
      api_url: apiUrl.trim(),
      api_key: apiKey.trim()
    });
  };

  const getStatusIcon = (status: EvolutionAPIConfig['connection_status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: EvolutionAPIConfig['connection_status']) => {
    switch (status) {
      case 'connected':
        return { label: 'Conectado', variant: 'default' as const };
      case 'disconnected':
        return { label: 'Desconectado', variant: 'outline' as const };
      case 'error':
        return { label: 'Erro', variant: 'destructive' as const };
      default:
        return { label: 'Desconhecido', variant: 'outline' as const };
    }
  };

  const activeConfig = configs.find(config => config.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configurações da Evolution API</h2>
          <p className="text-muted-foreground">Configure a URL e chave da API Evolution</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Nova Configuração
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Configurar Evolution API</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="apiUrl">URL da API</Label>
                <Input
                  id="apiUrl"
                  placeholder="https://api.gruposena.club"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  disabled={createConfigMutation.isPending}
                />
              </div>
              <div>
                <Label htmlFor="apiKey">Chave da API</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sua-api-key-aqui"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={createConfigMutation.isPending}
                />
              </div>
              
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Esta será a configuração padrão para criar e gerenciar suas instâncias WhatsApp.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !apiUrl.trim() || !apiKey.trim()}
                  className="flex-1"
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4 mr-2" />
                      Testar
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleCreateConfig}
                  disabled={createConfigMutation.isPending || !apiUrl.trim() || !apiKey.trim()}
                  className="flex-1"
                >
                  {createConfigMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Configuration Status */}
      {activeConfig && (
        <Card className="p-4 bg-gradient-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-foreground">Configuração Ativa</h3>
              <p className="text-sm text-muted-foreground">{activeConfig.api_url}</p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(activeConfig.connection_status)}
              <Badge variant={getStatusLabel(activeConfig.connection_status).variant}>
                {getStatusLabel(activeConfig.connection_status).label}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Carregando configurações...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map((config) => {
            const statusInfo = getStatusLabel(config.connection_status);
            return (
              <Card key={config.id} className="p-4 bg-gradient-card border-border">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{config.api_url}</h3>
                      <p className="text-sm text-muted-foreground">
                        API Key: ****{config.api_key.slice(-4)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {config.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Ativa
                        </Badge>
                      )}
                      {getStatusIcon(config.connection_status)}
                      <Badge variant={statusInfo.variant} className="text-xs">
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!config.is_active && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => activateConfigMutation.mutate(config.id)}
                        disabled={activateConfigMutation.isPending}
                        className="flex-1"
                      >
                        <Power className="w-4 h-4 mr-2" />
                        Ativar
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteConfigMutation.mutate(config.id)}
                      disabled={deleteConfigMutation.isPending || config.is_active}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {config.last_tested_at && (
                    <div className="text-xs text-muted-foreground">
                      Último teste: {new Date(config.last_tested_at).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {configs.length === 0 && !isLoading && (
        <Card className="p-8 text-center bg-gradient-card border-border">
          <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhuma configuração encontrada
          </h3>
          <p className="text-muted-foreground mb-4">
            Configure sua primeira Evolution API para começar a usar o sistema
          </p>
        </Card>
      )}
    </div>
  );
}
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MoreVertical, User, Calendar, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KanbanService } from "@/services/kanbanService";
import { KanbanColumnWithLeads } from "@/types/whatsapp";
import { toast } from "sonner";

const COLUMN_COLORS = [
  'bg-blue-500',
  'bg-yellow-500',
  'bg-orange-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500'
];

export function KanbanBoard() {
  const [draggedCard, setDraggedCard] = useState<any>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isCreateColumnOpen, setIsCreateColumnOpen] = useState(false);
  const queryClient = useQueryClient();

  // Get kanban columns with leads
  const { data: columns = [], isLoading } = useQuery({
    queryKey: ['kanban-columns'],
    queryFn: KanbanService.getKanbanColumns,
  });

  // Create column mutation
  const createColumnMutation = useMutation({
    mutationFn: async (title: string) => {
      const colorIndex = columns.length % COLUMN_COLORS.length;
      const color = COLUMN_COLORS[colorIndex];
      return KanbanService.createKanbanColumn(title, undefined, color);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-columns'] });
      setNewColumnTitle('');
      setIsCreateColumnOpen(false);
      toast.success('Nova coluna criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar coluna: ${error.message}`);
    }
  });

  // Move lead mutation
  const moveLeadMutation = useMutation({
    mutationFn: async ({ leadId, targetColumnId, targetPosition }: {
      leadId: string;
      targetColumnId: string;
      targetPosition: number;
    }) => {
      return KanbanService.moveLead(leadId, targetColumnId, targetPosition);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-columns'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao mover lead: ${error.message}`);
    }
  });

  const handleDragStart = (e: React.DragEvent, lead: any, columnId: string) => {
    setDraggedCard({ ...lead, sourceColumnId: columnId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    if (!draggedCard || draggedCard.sourceColumnId === targetColumnId) {
      setDraggedCard(null);
      return;
    }

    const targetColumn = columns.find(col => col.id === targetColumnId);
    const targetPosition = targetColumn ? targetColumn.leads.length : 0;

    moveLeadMutation.mutate({
      leadId: draggedCard.id,
      targetColumnId,
      targetPosition
    });
    
    setDraggedCard(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "border-l-4 border-l-red-500";
      case "medium": return "border-l-4 border-l-yellow-500";
      case "low": return "border-l-4 border-l-green-500";
      default: return "";
    }
  };

  const handleCreateColumn = () => {
    if (!newColumnTitle.trim()) return;
    createColumnMutation.mutate(newColumnTitle.trim());
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funil de Vendas</h1>
          <p className="text-muted-foreground">Gerencie seus leads e oportunidades</p>
        </div>
        <Dialog open={isCreateColumnOpen} onOpenChange={setIsCreateColumnOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Nova Coluna
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Coluna</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título da Coluna</label>
                <Input
                  placeholder="Ex: Novo Status"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateColumn();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateColumnOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateColumn}
                  disabled={!newColumnTitle.trim() || createColumnMutation.isPending}
                >
                  {createColumnMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Criar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className="min-w-[300px] bg-card rounded-lg border border-border"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <h3 className="font-medium text-foreground">{column.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {column.count}
                  </Badge>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Leads */}
            <div className="p-4 space-y-3 min-h-[400px]">
              {column.leads.map((lead) => (
                <Card
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead, column.id)}
                  className={`p-4 cursor-move hover:shadow-md transition-all ${getPriorityColor(lead.priority)} bg-gradient-card`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{lead.name}</h4>
                        <p className="text-sm text-muted-foreground">{lead.company || lead.phone}</p>
                      </div>
                      {lead.value && (
                        <span className="text-sm font-medium text-green-600">
                          R$ {lead.value.toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {lead.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {lead.source || 'WhatsApp'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleDateString('pt-BR') : 'Hoje'}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              
              <Button 
                variant="ghost" 
                className="w-full border-2 border-dashed border-muted-foreground/20 h-12 text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Lead
              </Button>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
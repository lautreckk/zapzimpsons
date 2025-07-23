import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, User, Calendar } from "lucide-react";
import { useState } from "react";

const initialColumns = [
  {
    id: "novo",
    title: "Novo Lead",
    color: "bg-blue-500",
    count: 8,
    cards: [
      {
        id: 1,
        name: "Maria Silva",
        company: "Tech Solutions",
        value: "R$ 15.000",
        tags: ["WhatsApp", "Empresa"],
        lastContact: "2h",
        priority: "high"
      },
      {
        id: 2,
        name: "João Santos", 
        company: "StartupXYZ",
        value: "R$ 8.000",
        tags: ["WebChat", "Startup"],
        lastContact: "1d",
        priority: "medium"
      }
    ]
  },
  {
    id: "qualificado",
    title: "Qualificado",
    color: "bg-yellow-500", 
    count: 5,
    cards: [
      {
        id: 3,
        name: "Ana Costa",
        company: "Consultoria ABC",
        value: "R$ 25.000",
        tags: ["WhatsApp", "Premium"],
        lastContact: "3h",
        priority: "high"
      }
    ]
  },
  {
    id: "proposta",
    title: "Proposta Enviada",
    color: "bg-orange-500",
    count: 3,
    cards: [
      {
        id: 4,
        name: "Carlos Oliveira",
        company: "Indústria DEF",
        value: "R$ 45.000",
        tags: ["WhatsApp", "Indústria"],
        lastContact: "1d",
        priority: "high"
      }
    ]
  },
  {
    id: "fechamento",
    title: "Fechamento",
    color: "bg-green-500",
    count: 2,
    cards: [
      {
        id: 5,
        name: "Lucia Fernandes",
        company: "Comercio GHI",
        value: "R$ 12.000",
        tags: ["WebChat", "Comércio"],
        lastContact: "2h",
        priority: "high"
      }
    ]
  }
];

export function KanbanBoard() {
  const [columns, setColumns] = useState(initialColumns);
  const [draggedCard, setDraggedCard] = useState<any>(null);

  const handleDragStart = (e: React.DragEvent, card: any, columnId: string) => {
    setDraggedCard({ ...card, sourceColumnId: columnId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    if (!draggedCard || draggedCard.sourceColumnId === targetColumnId) return;

    setColumns(prev => {
      const newColumns = [...prev];
      
      // Remove from source column
      const sourceCol = newColumns.find(col => col.id === draggedCard.sourceColumnId);
      if (sourceCol) {
        sourceCol.cards = sourceCol.cards.filter(card => card.id !== draggedCard.id);
        sourceCol.count = sourceCol.cards.length;
      }
      
      // Add to target column
      const targetCol = newColumns.find(col => col.id === targetColumnId);
      if (targetCol) {
        targetCol.cards.push({
          id: draggedCard.id,
          name: draggedCard.name,
          company: draggedCard.company,
          value: draggedCard.value,
          tags: draggedCard.tags,
          lastContact: draggedCard.lastContact,
          priority: draggedCard.priority
        });
        targetCol.count = targetCol.cards.length;
      }
      
      return newColumns;
    });
    
    setDraggedCard(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "border-l-4 border-l-destructive";
      case "medium": return "border-l-4 border-l-warning";
      case "low": return "border-l-4 border-l-success";
      default: return "";
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funil de Vendas</h1>
          <p className="text-muted-foreground">Gerencie seus leads e oportunidades</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lead
        </Button>
      </div>

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

            {/* Cards */}
            <div className="p-4 space-y-3 min-h-[400px]">
              {column.cards.map((card) => (
                <Card
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, card, column.id)}
                  className={`p-4 cursor-move hover:shadow-md transition-all ${getPriorityColor(card.priority)} bg-gradient-card`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{card.name}</h4>
                        <p className="text-sm text-muted-foreground">{card.company}</p>
                      </div>
                      <span className="text-sm font-medium text-success">{card.value}</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {card.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Último contato: {card.lastContact}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Hoje
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
    </div>
  );
}
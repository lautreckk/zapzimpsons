import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock,
  Plus,
  ArrowUp,
  ArrowDown,
  Circle
} from "lucide-react";

const stats = [
  {
    title: "Conversas Ativas",
    value: "24",
    change: "+12%",
    trend: "up",
    icon: MessageSquare,
    color: "text-primary"
  },
  {
    title: "Atendentes Online",
    value: "3/5",
    change: "60%",
    trend: "up", 
    icon: Users,
    color: "text-success"
  },
  {
    title: "Taxa Conversão",
    value: "68%",
    change: "+5%",
    trend: "up",
    icon: TrendingUp,
    color: "text-info"
  },
  {
    title: "Tempo Médio",
    value: "2.5min",
    change: "-15%",
    trend: "down",
    icon: Clock,
    color: "text-warning"
  }
];

const recentChats = [
  {
    id: 1,
    name: "Maria Silva",
    message: "Olá, gostaria de saber sobre os planos...",
    time: "2min",
    channel: "WhatsApp",
    status: "active",
    unread: 3
  },
  {
    id: 2,
    name: "João Santos", 
    message: "Preciso de ajuda com o pagamento",
    time: "5min",
    channel: "WebChat",
    status: "waiting",
    unread: 1
  },
  {
    id: 3,
    name: "Ana Costa",
    message: "Muito obrigada pelo atendimento!",
    time: "15min", 
    channel: "WhatsApp",
    status: "closed",
    unread: 0
  }
];

const funnelData = [
  { stage: "Novo Lead", count: 45, color: "bg-blue-500" },
  { stage: "Qualificado", count: 32, color: "bg-yellow-500" },
  { stage: "Proposta", count: 18, color: "bg-orange-500" },
  { stage: "Fechamento", count: 12, color: "bg-green-500" }
];

export function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da sua operação</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4 mr-2" />
          Nova Conversa
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6 bg-gradient-card border-border shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trend === "up" ? (
                      <ArrowUp className="w-3 h-3 text-success" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-destructive" />
                    )}
                    <span className={`text-xs ${stat.trend === "up" ? "text-success" : "text-destructive"}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Chats */}
        <Card className="lg:col-span-2 p-6 bg-gradient-card border-border shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Conversas Recentes</h3>
            <Button variant="outline" size="sm">Ver Todas</Button>
          </div>
          <div className="space-y-4">
            {recentChats.map((chat) => (
              <div key={chat.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="relative">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">
                      {chat.name.charAt(0)}
                    </span>
                  </div>
                  <Circle 
                    className={`w-3 h-3 absolute -bottom-1 -right-1 ${
                      chat.status === "active" ? "text-success fill-success" :
                      chat.status === "waiting" ? "text-warning fill-warning" :
                      "text-muted-foreground fill-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{chat.name}</p>
                    <Badge variant="secondary" className="text-xs">
                      {chat.channel}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{chat.message}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{chat.time}</p>
                  {chat.unread > 0 && (
                    <Badge className="mt-1 bg-primary text-primary-foreground">
                      {chat.unread}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Funnel Overview */}
        <Card className="p-6 bg-gradient-card border-border shadow-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Funil de Vendas</h3>
          <div className="space-y-4">
            {funnelData.map((stage, index) => (
              <div key={stage.stage} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground">{stage.stage}</span>
                  <span className="text-sm font-medium text-foreground">{stage.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${stage.color} transition-all duration-500`}
                    style={{ width: `${(stage.count / 45) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            Ver Kanban Completo
          </Button>
        </Card>
      </div>
    </div>
  );
}
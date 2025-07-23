import { 
  MessageCircle, 
  BarChart3, 
  Users, 
  Settings, 
  Bot, 
  Kanban,
  Bell,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "dashboard", icon: BarChart3, label: "Dashboard" },
  { id: "chat", icon: MessageCircle, label: "Chat Inbox" },
  { id: "kanban", icon: Kanban, label: "Funil Kanban" },
  { id: "bot", icon: Bot, label: "Chatbot IA" },
  { id: "contacts", icon: Users, label: "Contatos" },
  { id: "settings", icon: Settings, label: "Configurações" },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">ChatPro</h1>
            <p className="text-xs text-muted-foreground">Empresa Demo</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input 
            placeholder="Buscar conversas..." 
            className="pl-10 bg-sidebar-accent border-sidebar-border"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11",
                  activeTab === item.id 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary-foreground">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              Admin User
            </p>
            <p className="text-xs text-muted-foreground">admin@empresa.com</p>
          </div>
          <Button size="sm" variant="ghost" className="w-8 h-8 p-0">
            <Bell className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
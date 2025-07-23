import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { ChatInbox } from "@/components/ChatInbox";
import { KanbanBoard } from "@/components/KanbanBoard";
import { WhatsAppConnection } from "@/components/WhatsAppConnection";
import { EvolutionAPISettings } from "@/components/EvolutionAPISettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "chat":
        return <ChatInbox />;
      case "kanban":
        return <KanbanBoard />;
      case "bot":
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-4">Chatbot IA</h1>
            <p className="text-muted-foreground">Em desenvolvimento...</p>
          </div>
        );
      case "contacts":
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-4">Contatos</h1>
            <p className="text-muted-foreground">Em desenvolvimento...</p>
          </div>
        );
      case "settings":
        return (
          <div className="p-6">
            <Tabs defaultValue="evolution-api" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="evolution-api">Evolution API</TabsTrigger>
                <TabsTrigger value="instances">Instâncias WhatsApp</TabsTrigger>
              </TabsList>
              
              <TabsContent value="evolution-api" className="space-y-6">
                <EvolutionAPISettings />
              </TabsContent>
              
              <TabsContent value="instances" className="space-y-6">
                <WhatsAppConnection />
              </TabsContent>
            </Tabs>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;

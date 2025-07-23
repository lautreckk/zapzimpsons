import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Phone, 
  MoreVertical, 
  Send, 
  Paperclip, 
  Smile,
  Filter,
  Archive,
  UserPlus,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageService } from "@/services/messageService";
import { WhatsAppService } from "@/services/whatsappService";
import { Conversation, Message, Contact, WhatsAppInstance } from "@/types/whatsapp";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ChatInbox() {
  const [selectedConversation, setSelectedConversation] = useState<(Conversation & { contact: Contact }) | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Get WhatsApp instances
  const { data: instances = [] } = useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: WhatsAppService.getInstances,
  });

  // Get conversations for selected instance
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', selectedInstance?.id],
    queryFn: () => MessageService.getConversations(selectedInstance?.id),
    enabled: !!selectedInstance?.id,
  });

  // Get messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: () => MessageService.getMessages(selectedConversation!.id),
    enabled: !!selectedConversation?.id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!selectedConversation || !selectedInstance) return;
      
      await MessageService.sendMessage(
        selectedInstance.instance_name,
        selectedConversation.contact.phone_number,
        content,
        selectedConversation.id,
        selectedInstance.id
      );
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations', selectedInstance?.id] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    }
  });

  // Auto-select first connected instance
  useEffect(() => {
    if (instances.length > 0 && !selectedInstance) {
      const connectedInstance = instances.find(i => i.status === 'connected') || instances[0];
      setSelectedInstance(connectedInstance);
    }
  }, [instances, selectedInstance]);

  // Auto-select first conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations, selectedConversation]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = MessageService.subscribeToMessages(selectedConversation.id, (newMessage) => {
      queryClient.setQueryData(['messages', selectedConversation.id], (old: Message[] = []) => {
        return [...old, newMessage];
      });
      queryClient.invalidateQueries({ queryKey: ['conversations', selectedInstance?.id] });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [selectedConversation, queryClient, selectedInstance]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({ content: newMessage.trim() });
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Ontem';
    } else {
      return format(date, 'dd/MM', { locale: ptBR });
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.contact.phone_number.includes(searchTerm)
  );

  if (!selectedInstance) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhuma instância WhatsApp encontrada
          </h3>
          <p className="text-muted-foreground">
            Crie uma instância WhatsApp para começar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-80 border-r border-border bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Conversas</h2>
            <div className="flex items-center gap-2">
              <Badge variant={selectedInstance.status === 'connected' ? 'default' : 'secondary'}>
                {selectedInstance.instance_name}
              </Badge>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input 
              placeholder="Buscar conversas..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="overflow-y-auto">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div 
                key={conversation.id}
                onClick={() => {
                  setSelectedConversation(conversation);
                  MessageService.markAsRead(conversation.id);
                }}
                className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedConversation?.id === conversation.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-foreground">
                        {(conversation.contact.name || conversation.contact.phone_number).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {conversation.status === "active" && (
                      <div className="w-3 h-3 bg-success rounded-full absolute -bottom-1 -right-1 border-2 border-card" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground truncate">
                        {conversation.contact.name || conversation.contact.phone_number}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(conversation.last_message_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        WhatsApp
                      </Badge>
                      {conversation.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {conversation.contact.phone_number}
                    </p>
                    
                    {conversation.unread_count > 0 && (
                      <Badge className="mt-2 bg-primary text-primary-foreground">
                        {conversation.unread_count} nova{conversation.unread_count > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedConversation ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-muted-foreground">
                Escolha uma conversa para visualizar as mensagens
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">
                      {(selectedConversation.contact.name || selectedConversation.contact.phone_number).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {selectedConversation.contact.name || selectedConversation.contact.phone_number}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.contact.phone_number}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Archive className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  Nenhuma mensagem ainda
                </div>
              ) : (
                messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.is_from_me ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${
                      message.is_from_me 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-foreground"
                    }`}>
                      {!message.is_from_me && message.sender_name && (
                        <p className="text-xs font-semibold mb-1 opacity-80">
                          {message.sender_name}
                        </p>
                      )}
                      {message.message_type !== 'text' && (
                        <p className="text-xs opacity-70 mb-1 capitalize">
                          {message.message_type}
                        </p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.is_from_me 
                          ? "text-primary-foreground/70" 
                          : "text-muted-foreground"
                      }`}>
                        {formatMessageTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex items-end gap-2">
                <Button size="sm" variant="outline" className="mb-2">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <Textarea 
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[40px] max-h-32 resize-none"
                    disabled={sendMessageMutation.isPending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <Button size="sm" variant="outline" className="mb-2">
                  <Smile className="w-4 h-4" />
                </Button>
                <Button 
                  className="mb-2 bg-gradient-primary hover:opacity-90"
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || !newMessage.trim()}
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Contact Info Panel */}
      {selectedConversation && (
        <div className="w-80 border-l border-border bg-card p-4">
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-medium text-primary-foreground">
                  {(selectedConversation.contact.name || selectedConversation.contact.phone_number).charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="font-medium text-foreground">
                {selectedConversation.contact.name || 'Sem nome'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedConversation.contact.phone_number}
              </p>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {selectedConversation.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
                <Button size="sm" variant="outline" className="h-6">
                  <UserPlus className="w-3 h-3 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-2">Status</h4>
              <Badge 
                variant={
                  selectedConversation.status === 'active' ? 'default' :
                  selectedConversation.status === 'waiting' ? 'secondary' : 'outline'
                }
              >
                {selectedConversation.status === 'active' ? 'Ativo' :
                 selectedConversation.status === 'waiting' ? 'Aguardando' : 'Fechado'}
              </Badge>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-2">Notas</h4>
              <Textarea 
                placeholder="Adicione notas sobre este contato..."
                className="min-h-[100px]"
                defaultValue={selectedConversation.notes || ''}
                onBlur={(e) => {
                  if (e.target.value !== selectedConversation.notes) {
                    MessageService.updateConversationNotes(selectedConversation.id, e.target.value);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
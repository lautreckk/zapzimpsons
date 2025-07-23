import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Info,
  VideoIcon,
  MessageCircle
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageService } from "@/services/messageService";
import { WhatsAppService } from "@/services/whatsappService";
import { Conversation, Message, Contact, WhatsAppInstance } from "@/types/whatsapp";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNotificationSound } from "@/hooks/useNotificationSound";

export function ChatInbox() {
  const [selectedConversation, setSelectedConversation] = useState<(Conversation & { contact: Contact }) | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { playNotificationSound, soundEnabled, setSoundEnabled } = useNotificationSound();

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

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedInstance) {
        queryClient.invalidateQueries({ queryKey: ['conversations', selectedInstance.id] });
      }
      if (selectedConversation) {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation.id] });
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [selectedInstance, selectedConversation, queryClient]);

  // Subscribe to real-time updates for messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = MessageService.subscribeToMessages(selectedConversation.id, (newMessage) => {
      queryClient.setQueryData(['messages', selectedConversation.id], (old: Message[] = []) => {
        // Evitar duplicatas
        const exists = old.some(msg => msg.id === newMessage.id);
        if (exists) return old;
        
        const updated = [...old, newMessage];
        
        // Tocar som se for mensagem recebida
        if (!newMessage.is_from_me) {
          playNotificationSound();
        }
        
        return updated;
      });
      // Atualizar lista de conversas
      queryClient.invalidateQueries({ queryKey: ['conversations', selectedInstance?.id] });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [selectedConversation, queryClient, selectedInstance, playNotificationSound]);

  // Subscribe to real-time updates for conversations
  useEffect(() => {
    if (!selectedInstance) return;

    const channel = MessageService.subscribeToConversations((payload) => {
      // Invalidar queries para atualizar a lista de conversas
      queryClient.invalidateQueries({ queryKey: ['conversations', selectedInstance.id] });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [selectedInstance, queryClient]);

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
    <div className="flex h-screen bg-[#f0f2f5]">
      {/* Conversations List */}
      <div className="w-80 border-r border-gray-300 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-[#f0f2f5] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Chats</h2>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-200"
                title={soundEnabled ? "Desativar som" : "Ativar som"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Badge variant={selectedInstance.status === 'connected' ? 'default' : 'secondary'} className="text-xs">
                {selectedInstance.instance_name}
              </Badge>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input 
              placeholder="Pesquisar..." 
              className="pl-10 bg-white rounded-lg border-gray-300 focus:border-[#25d366] focus:ring-[#25d366]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
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
                className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedConversation?.id === conversation.id ? "bg-[#f0f2f5]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={conversation.contact.profile_picture} />
                    <AvatarFallback className="bg-[#25d366] text-white font-medium">
                      {(conversation.contact.name || conversation.contact.phone_number).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {conversation.contact.name || conversation.contact.phone_number}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {formatMessageTime(conversation.last_message_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-600 truncate flex-1">
                        Última mensagem...
                      </p>
                      {conversation.unread_count > 0 && (
                        <Badge className="bg-[#25d366] text-white text-xs px-2 py-1 min-w-[20px] h-5 rounded-full">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#efeae2]">
        {!selectedConversation ? (
          <div className="flex items-center justify-center h-full bg-[#f0f2f5]">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#25d366] rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                WhatsApp Chat
              </h3>
              <p className="text-gray-600">
                Selecione uma conversa para começar a conversar
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-[#f0f2f5] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConversation.contact.profile_picture} />
                    <AvatarFallback className="bg-[#25d366] text-white font-medium">
                      {(selectedConversation.contact.name || selectedConversation.contact.phone_number).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedConversation.contact.name || selectedConversation.contact.phone_number}
                    </h3>
                    <p className="text-sm text-gray-600">
                      online
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-200">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-200">
                    <VideoIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-200">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxkZWZzPgogICAgICAgIDxwYXR0ZXJuIGlkPSJkaWFnb25hbC1saW5lcyIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIj4KICAgICAgICAgICAgPHBhdGggZD0iTTAsMTBMMTAsMCIgc3Ryb2tlPSJyZ2JhKDAsIDAsIDAsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz4KICAgICAgICA8L3BhdHRlcm4+CiAgICA8L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNkaWFnb25hbC1saW5lcykiLz4KPC9zdmc+')] opacity-20">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma mensagem ainda
                </div>
              ) : (
                messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.is_from_me ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-sm lg:max-w-2xl p-3 rounded-lg shadow-sm ${
                      message.is_from_me 
                        ? "bg-[#dcf8c6] text-gray-900 rounded-br-sm" 
                        : "bg-white text-gray-900 rounded-bl-sm border border-gray-200"
                    }`}>
                      {!message.is_from_me && message.sender_name && (
                        <p className="text-xs font-semibold mb-1 text-[#25d366]">
                          {message.sender_name}
                        </p>
                      )}
                      {message.message_type !== 'text' && (
                        <p className="text-xs text-gray-500 mb-1 capitalize">
                          {message.message_type}
                        </p>
                      )}
                      
                      {/* Renderizar mídia se disponível */}
                      {message.message_type === 'image' && message.media_base64 && (
                        <img 
                          src={`data:image/jpeg;base64,${message.media_base64}`}
                          alt="Imagem enviada"
                          className="w-full max-w-md max-h-96 rounded-lg mb-2 cursor-pointer object-cover"
                          onClick={() => window.open(`data:image/jpeg;base64,${message.media_base64}`, '_blank')}
                        />
                      )}
                      
                      {message.message_type === 'audio' && message.media_base64 && (
                        <div className="bg-gray-100 rounded-lg p-4 mb-2 min-w-[320px]">
                          <audio 
                            controls 
                            className="w-full h-12"
                            src={`data:audio/ogg;base64,${message.media_base64}`}
                            style={{
                              filter: 'sepia(20%) saturate(70%) hue-rotate(88deg) brightness(95%) contrast(86%)'
                            }}
                          />
                        </div>
                      )}
                      
                      {message.message_type === 'video' && message.media_base64 && (
                        <video 
                          controls 
                          className="w-full max-w-md max-h-96 rounded-lg mb-2"
                          src={`data:video/mp4;base64,${message.media_base64}`}
                        />
                      )}
                      
                      {message.message_type === 'document' && message.media_base64 && (
                        <div className="bg-gray-100 rounded-lg p-3 mb-2">
                          <a 
                            href={`data:application/octet-stream;base64,${message.media_base64}`}
                            download={message.content || 'documento'}
                            className="inline-flex items-center gap-2 text-[#25d366] hover:text-[#1ea952]"
                          >
                            <span>📎</span>
                            {message.content || 'Documento'}
                          </a>
                        </div>
                      )}
                      
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <p className="text-xs text-gray-500">
                          {formatMessageTime(message.timestamp)}
                        </p>
                        {message.is_from_me && (
                          <span className="text-xs text-[#25d366]">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-[#f0f2f5] flex-shrink-0">
              <div className="flex items-end gap-3">
                <Button size="sm" variant="ghost" className="mb-2 h-8 w-8 p-0 text-gray-600 hover:bg-gray-200">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <Textarea 
                    placeholder="Digite uma mensagem"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[40px] max-h-32 resize-none bg-white border-gray-300 rounded-3xl px-4 py-2 focus:border-[#25d366] focus:ring-[#25d366]"
                    disabled={sendMessageMutation.isPending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <Button size="sm" variant="ghost" className="mb-2 h-8 w-8 p-0 text-gray-600 hover:bg-gray-200">
                  <Smile className="w-4 h-4" />
                </Button>
                <Button 
                  className="mb-2 bg-[#25d366] hover:bg-[#1ea952] text-white rounded-full h-10 w-10 p-0"
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
        <div className="w-80 border-l border-gray-300 bg-white flex flex-col">
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="space-y-6">
              <div className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-3">
                  <AvatarImage src={selectedConversation.contact.profile_picture} />
                  <AvatarFallback className="bg-[#25d366] text-white text-xl font-medium">
                    {(selectedConversation.contact.name || selectedConversation.contact.phone_number).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-medium text-gray-900">
                  {selectedConversation.contact.name || 'Sem nome'}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedConversation.contact.phone_number}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedConversation.tags.map((tag) => (
                    <Badge key={tag} className="bg-[#25d366] text-white">{tag}</Badge>
                  ))}
                  <Button size="sm" variant="outline" className="h-6 border-[#25d366] text-[#25d366] hover:bg-[#25d366] hover:text-white">
                    <UserPlus className="w-3 h-3 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                <Badge 
                  className={
                    selectedConversation.status === 'active' ? 'bg-green-100 text-green-800' :
                    selectedConversation.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }
                >
                  {selectedConversation.status === 'active' ? 'Ativo' :
                   selectedConversation.status === 'waiting' ? 'Aguardando' : 'Fechado'}
                </Badge>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Notas</h4>
                <Textarea 
                  placeholder="Adicione notas sobre este contato..."
                  className="min-h-[100px] border-gray-300 focus:border-[#25d366] focus:ring-[#25d366]"
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
        </div>
      )}
    </div>
  );
}
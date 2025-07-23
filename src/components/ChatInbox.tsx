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
  MessageCircle,
  Mic
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageService } from "@/services/messageService";
import { WhatsAppService } from "@/services/whatsappService";
import { KanbanService } from "@/services/kanbanService";
import { Conversation, Message, Contact, WhatsAppInstance } from "@/types/whatsapp";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { AudioRecorder } from "@/components/AudioRecorder";
import { MediaUpload } from "@/components/MediaUpload";
import { EmojiPicker } from "@/components/EmojiPicker";

export function ChatInbox() {
  const [selectedConversation, setSelectedConversation] = useState<(Conversation & { contact: Contact }) | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { playNotificationSound, soundEnabled, setSoundEnabled } = useNotificationSound();

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!selectedConversation) return;
      
      const contactName = selectedConversation.contact.name || 'Sem nome';
      const contactPhone = selectedConversation.contact.phone_number;
      
      return KanbanService.createLeadFromConversation(
        conversationId,
        contactName,
        contactPhone,
        {
          source: 'WhatsApp Chat',
          tags: ['WhatsApp'],
          priority: 'medium'
        }
      );
    },
    onSuccess: () => {
      toast.success('Lead criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['kanban-columns'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar lead: ${error.message}`);
    }
  });

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

  // Fetch profile pictures when conversations load
  useEffect(() => {
    if (conversations.length > 0 && selectedInstance) {
      // Executar em background, sem bloquear a UI
      MessageService.fetchAndUpdateProfilePictures(selectedInstance.instance_name, conversations)
        .then(() => {
          // Invalidar query para recarregar com as fotos atualizadas
          queryClient.invalidateQueries({ queryKey: ['conversations', selectedInstance.id] });
        })
        .catch(error => {
          console.error('Failed to fetch profile pictures:', error);
        });
    }
  }, [conversations.length, selectedInstance?.instance_name, queryClient]);

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

  // Send audio mutation
  const sendAudioMutation = useMutation({
    mutationFn: async ({ audioBase64, duration }: { audioBase64: string, duration: number }) => {
      if (!selectedConversation || !selectedInstance) return;
      
      await MessageService.sendAudio(
        selectedInstance.instance_name,
        selectedConversation.contact.phone_number,
        audioBase64,
        selectedConversation.id,
        selectedInstance.id,
        duration
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations', selectedInstance?.id] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar áudio: ${error.message}`);
    }
  });

  // Send media mutation
  const sendMediaMutation = useMutation({
    mutationFn: async ({ 
      mediaBase64, 
      mediaType, 
      mimeType, 
      fileName, 
      caption 
    }: { 
      mediaBase64: string,
      mediaType: 'image' | 'video' | 'document',
      mimeType: string,
      fileName: string,
      caption: string
    }) => {
      if (!selectedConversation || !selectedInstance) return;
      
      await MessageService.sendMedia(
        selectedInstance.instance_name,
        selectedConversation.contact.phone_number,
        mediaBase64,
        mediaType,
        mimeType,
        fileName,
        caption,
        selectedConversation.id,
        selectedInstance.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations', selectedInstance?.id] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar mídia: ${error.message}`);
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

  const handleSendAudio = async (audioBase64: string, duration: number) => {
    await sendAudioMutation.mutateAsync({ audioBase64, duration });
  };

  const handleSendMedia = async (
    mediaBase64: string,
    mediaType: 'image' | 'video' | 'document',
    mimeType: string,
    fileName: string,
    caption: string
  ) => {
    await sendMediaMutation.mutateAsync({
      mediaBase64,
      mediaType,
      mimeType,
      fileName,
      caption
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
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
    <div className="flex h-screen bg-background">
      {/* Conversations List */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Chats</h2>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 w-8 p-0"
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
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar..." 
              className="pl-10"
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
                className={`p-3 cursor-pointer hover:bg-accent transition-colors border-b border-border ${
                  selectedConversation?.id === conversation.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={conversation.contact.profile_picture} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                      {(conversation.contact.name || conversation.contact.phone_number).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground truncate">
                        {conversation.contact.name || conversation.contact.phone_number}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(conversation.last_message_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-muted-foreground truncate flex-1">
                        Última mensagem...
                      </p>
                      {conversation.unread_count > 0 && (
                        <Badge className="text-xs px-2 py-1 min-w-[20px] h-5 rounded-full">
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
      <div className="flex-1 flex flex-col bg-background">
        {!selectedConversation ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-medium text-foreground mb-2">
                WhatsApp Chat
              </h3>
              <p className="text-muted-foreground">
                Selecione uma conversa para começar a conversar
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConversation.contact.profile_picture} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                      {(selectedConversation.contact.name || selectedConversation.contact.phone_number).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {selectedConversation.contact.name || selectedConversation.contact.phone_number}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      online
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <VideoIcon className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => createLeadMutation.mutate(selectedConversation.id)}
                    disabled={createLeadMutation.isPending}
                    title="Criar Lead"
                  >
                    {createLeadMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma mensagem ainda
                </div>
              ) : (
                messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.is_from_me ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-sm lg:max-w-2xl p-3 rounded-lg ${
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
                        <div className="bg-accent rounded-lg p-4 mb-2 min-w-[320px]">
                          <audio 
                            controls 
                            className="w-full h-12"
                            src={`data:audio/ogg;base64,${message.media_base64}`}
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
                        <div className="bg-accent rounded-lg p-3 mb-2">
                          <a 
                            href={`data:application/octet-stream;base64,${message.media_base64}`}
                            download={message.content || 'documento'}
                            className="inline-flex items-center gap-2 text-primary hover:text-primary/80"
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
                        <p className={`text-xs ${
                          message.is_from_me 
                            ? "text-primary-foreground/70" 
                            : "text-muted-foreground"
                        }`}>
                          {formatMessageTime(message.timestamp)}
                        </p>
                        {message.is_from_me && (
                          <span className="text-xs text-primary-foreground/70">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-border bg-card flex-shrink-0">
              {/* Media Upload Area */}
              {showMediaUpload && (
                <div className="p-4 border-b border-border">
                  <MediaUpload
                    onSendMedia={handleSendMedia}
                    onCancel={() => setShowMediaUpload(false)}
                    disabled={sendMediaMutation.isPending}
                  />
                </div>
              )}

              {/* Audio Recorder Area */}
              {showAudioRecorder && (
                <div className="p-4 border-b border-border">
                  <AudioRecorder
                    onSendAudio={handleSendAudio}
                    onCancel={() => setShowAudioRecorder(false)}
                    disabled={sendAudioMutation.isPending}
                  />
                </div>
              )}

              {/* Main Input Area */}
              <div className="p-4 relative">
                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <EmojiPicker
                    onEmojiSelect={handleEmojiSelect}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}

                <div className="flex items-end gap-2">
                  {/* Media Upload Button */}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mb-2"
                    onClick={() => {
                      setShowMediaUpload(!showMediaUpload);
                      setShowAudioRecorder(false);
                    }}
                    disabled={sendMessageMutation.isPending || sendMediaMutation.isPending || sendAudioMutation.isPending}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>

                  {/* Audio Recorder Button */}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mb-2"
                    onClick={() => {
                      setShowAudioRecorder(!showAudioRecorder);
                      setShowMediaUpload(false);
                    }}
                    disabled={sendMessageMutation.isPending || sendMediaMutation.isPending || sendAudioMutation.isPending}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>

                  {/* Text Input */}
                  <div className="flex-1">
                    <Textarea 
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[40px] max-h-32 resize-none"
                      disabled={sendMessageMutation.isPending || sendMediaMutation.isPending || sendAudioMutation.isPending}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                  </div>

                  {/* Emoji Button */}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mb-2"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={sendMessageMutation.isPending || sendMediaMutation.isPending || sendAudioMutation.isPending}
                  >
                    <Smile className="w-4 h-4" />
                  </Button>

                  {/* Send Button */}
                  <Button 
                    className="mb-2"
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending || sendMediaMutation.isPending || sendAudioMutation.isPending || !newMessage.trim()}
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Contact Info Panel */}
      {selectedConversation && (
        <div className="w-80 border-l border-border bg-card flex flex-col">
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="space-y-6">
              <div className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-3">
                  <AvatarImage src={selectedConversation.contact.profile_picture} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
                    {(selectedConversation.contact.name || selectedConversation.contact.phone_number).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
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
        </div>
      )}
    </div>
  );
}
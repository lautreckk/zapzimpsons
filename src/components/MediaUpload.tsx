import { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, 
  X, 
  Send, 
  Loader2, 
  Image as ImageIcon,
  Video,
  FileText,
  Music
} from "lucide-react";
import { MediaUtils, MediaFile } from "@/utils/mediaUtils";
import { toast } from "sonner";

interface MediaUploadProps {
  onSendMedia: (
    mediaBase64: string,
    mediaType: 'image' | 'video' | 'document',
    mimeType: string,
    fileName: string,
    caption: string
  ) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
}

export function MediaUpload({ onSendMedia, onCancel, disabled }: MediaUploadProps) {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [caption, setCaption] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    try {
      const processedFile = await MediaUtils.processFile(file, true);
      setMediaFile(processedFile);
      
      // Para documentos, usar o nome do arquivo como caption padrão
      if (processedFile.type === 'document') {
        setCaption(processedFile.fileName);
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  const handleSend = useCallback(async () => {
    if (!mediaFile) return;

    setIsSending(true);
    try {
      await onSendMedia(
        mediaFile.base64,
        mediaFile.type === 'audio' ? 'document' : mediaFile.type, // Áudio vai como documento
        mediaFile.mimeType,
        mediaFile.fileName,
        caption
      );
      
      setMediaFile(null);
      setCaption('');
      onCancel();
    } catch (error) {
      console.error('Erro ao enviar mídia:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setIsSending(false);
    }
  }, [mediaFile, caption, onSendMedia, onCancel]);

  const handleRemoveFile = useCallback(() => {
    setMediaFile(null);
    setCaption('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-8 h-8" />;
      case 'video': return <Video className="w-8 h-8" />;
      case 'audio': return <Music className="w-8 h-8" />;
      default: return <FileText className="w-8 h-8" />;
    }
  };

  return (
    <div className="p-4 bg-card border rounded-lg space-y-4">
      {!mediaFile ? (
        // Upload Area
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Processando arquivo...</p>
            </div>
          ) : (
            <div className="space-y-4"> 
              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Enviar arquivo</p>
                <p className="text-sm text-muted-foreground">
                  Arraste e solte ou{' '}
                  <button 
                    className="text-primary hover:underline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                  >
                    clique aqui
                  </button>
                </p>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Imagens:</strong> JPG, PNG, GIF, WebP (até 16MB)</p>
                <p><strong>Vídeos:</strong> MP4, WebM, MOV (até 64MB)</p>
                <p><strong>Áudios:</strong> MP3, WAV, OGG (até 16MB)</p>
                <p><strong>Documentos:</strong> PDF, DOC, XLS, ZIP (até 100MB)</p>
              </div>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleInputChange}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv"
            disabled={disabled || isUploading}
          />
        </div>
      ) : (
        // Preview Area
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex-shrink-0">
              {mediaFile.preview ? (
                <img 
                  src={mediaFile.preview} 
                  alt="Preview" 
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                  {getMediaIcon(mediaFile.type)}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{mediaFile.fileName}</p>
              <p className="text-sm text-muted-foreground">
                {MediaUtils.formatFileSize(mediaFile.size)} • {mediaFile.type}
              </p>
              {mediaFile.type === 'image' && mediaFile.preview && (
                <p className="text-xs text-muted-foreground mt-1">
                  Imagem otimizada para envio
                </p>
              )}
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemoveFile}
              disabled={disabled || isSending}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Caption Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {mediaFile.type === 'document' ? 'Nome do arquivo' : 'Legenda (opcional)'}
            </label>
            {mediaFile.type === 'document' ? (
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Nome do arquivo"
                disabled={disabled || isSending}
              />
            ) : (
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Adicione uma legenda..."
                className="resize-none"
                rows={2}
                disabled={disabled || isSending}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={disabled || isSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={disabled || isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
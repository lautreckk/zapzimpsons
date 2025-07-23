export interface MediaFile {
  file: File;
  base64: string;
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  fileName: string;
  size: number;
  preview?: string;
}

export class MediaUtils {
  // Tipos MIME suportados por categoria
  static readonly MIME_TYPES = {
    image: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml'
    ],
    video: [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv'
    ],
    audio: [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      'audio/mp4',
      'audio/aac'
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-zip-compressed',
      'application/json',
      'application/xml'
    ]
  };

  // Tamanhos máximos (em bytes)
  static readonly MAX_SIZES = {
    image: 16 * 1024 * 1024, // 16MB
    video: 64 * 1024 * 1024, // 64MB
    audio: 16 * 1024 * 1024, // 16MB
    document: 100 * 1024 * 1024 // 100MB
  };

  /**
   * Determina o tipo de mídia baseado no MIME type
   */
  static getMediaType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
    if (this.MIME_TYPES.image.includes(mimeType)) return 'image';
    if (this.MIME_TYPES.video.includes(mimeType)) return 'video';
    if (this.MIME_TYPES.audio.includes(mimeType)) return 'audio';
    return 'document';
  }

  /**
   * Verifica se o arquivo é suportado
   */
  static isSupported(file: File): boolean {
    const allTypes = [
      ...this.MIME_TYPES.image,
      ...this.MIME_TYPES.video,
      ...this.MIME_TYPES.audio,
      ...this.MIME_TYPES.document
    ];
    return allTypes.includes(file.type);
  }

  /**
   * Verifica se o tamanho do arquivo está dentro do limite
   */
  static isValidSize(file: File): boolean {
    const mediaType = this.getMediaType(file.type);
    return file.size <= this.MAX_SIZES[mediaType];
  }

  /**
   * Converte arquivo para base64 (apenas dados, sem prefixo)
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove o prefixo data:type;base64,
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Converte arquivo para data URI completo
   */
  static async fileToDataURI(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Cria preview para imagens
   */
  static async createImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Comprime imagem se necessário
   */
  static async compressImage(file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> {
    if (!file.type.startsWith('image/')) return file;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcular novas dimensões mantendo proporção
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Desenhar imagem redimensionada
        ctx?.drawImage(img, 0, 0, width, height);

        // Converter para blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Processa arquivo completo
   */
  static async processFile(file: File, compressImages = true): Promise<MediaFile> {
    // Validações
    if (!this.isSupported(file)) {
      throw new Error(`Tipo de arquivo não suportado: ${file.type}`);
    }

    if (!this.isValidSize(file)) {
      const mediaType = this.getMediaType(file.type);
      const maxSizeMB = this.MAX_SIZES[mediaType] / (1024 * 1024);
      throw new Error(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
    }

    // Comprimir imagem se necessário
    let processedFile = file;
    if (compressImages && file.type.startsWith('image/')) {
      processedFile = await this.compressImage(file);
    }

    // Converter para base64
    const base64 = await this.fileToBase64(processedFile);
    
    // Criar preview para imagens
    let preview: string | undefined;
    if (file.type.startsWith('image/')) {
      preview = await this.createImagePreview(processedFile);
    }

    return {
      file: processedFile,
      base64,
      type: this.getMediaType(file.type),
      mimeType: file.type,
      fileName: file.name,
      size: processedFile.size,
      preview
    };
  }

  /**
   * Formata tamanho do arquivo
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obtém ícone baseado no tipo de arquivo
   */
  static getFileIcon(mimeType: string): string {
    const mediaType = this.getMediaType(mimeType);
    
    switch (mediaType) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      default:
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('word')) return '📝';
        if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
        if (mimeType.includes('zip')) return '🗜️';
        return '📎';
    }
  }

  /**
   * Valida múltiplos arquivos
   */
  static validateFiles(files: FileList | File[]): { valid: File[], invalid: Array<{ file: File, reason: string }> } {
    const filesArray = Array.from(files);
    const valid: File[] = [];
    const invalid: Array<{ file: File, reason: string }> = [];

    filesArray.forEach(file => {
      if (!this.isSupported(file)) {
        invalid.push({ file, reason: 'Tipo de arquivo não suportado' });
      } else if (!this.isValidSize(file)) {
        const mediaType = this.getMediaType(file.type);
        const maxSizeMB = this.MAX_SIZES[mediaType] / (1024 * 1024);
        invalid.push({ file, reason: `Arquivo muito grande (máx: ${maxSizeMB}MB)` });
      } else {
        valid.push(file);
      }
    });

    return { valid, invalid };
  }
}
import { jsonDatabaseService, VideoData } from './JSONDatabaseService';
import { wasabiService } from './WasabiService';

// Video interface - mantém compatibilidade com o frontend
export interface Video {
  $id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  videoFileId?: string;
  video_id?: string;
  thumbnailFileId?: string;
  thumbnail_id?: string;
  thumbnailUrl?: string;
  isPurchased?: boolean;
  createdAt: string;
  views: number;
  product_link?: string;
}

// Sort options
export enum SortOption {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  VIEWS_DESC = 'views_desc',
  DURATION_DESC = 'duration_desc'
}

export class VideoService {
  // Cache para vídeos para melhorar performance
  private static videosCache: Video[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 30 * 1000; // 30 segundos (reduzido para produção)

  // Método para limpar o cache
  private static clearCache(): void {
    this.videosCache = null;
    this.cacheTimestamp = 0;
    console.log('Video cache cleared');
  }

  // Método público para limpar o cache (para uso externo)
  public static clearCachePublic(): void {
    this.clearCache();
  }

  // Método para forçar atualização do cache
  private static async forceRefreshCache(): Promise<Video[]> {
    this.clearCache();
    return await this.getAllVideos();
  }

  // Verificar se o cache é válido
  private static isCacheValid(): boolean {
    return this.videosCache !== null && 
           this.cacheTimestamp > 0 && 
           (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
  }

  // Método para converter VideoData para Video (compatibilidade com frontend)
  private static convertVideoData(videoData: VideoData): Video {
    // Converter duration (inteiro em segundos) para formato string (MM:SS ou HH:MM:SS)
    let formattedDuration = '00:00';
    if (typeof videoData.duration === 'string') {
      formattedDuration = videoData.duration;
    } else if (typeof videoData.duration === 'number') {
      const totalSeconds = videoData.duration;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      if (minutes < 60) {
        formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        formattedDuration = `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    
    return {
      $id: videoData.id,
      title: videoData.title,
      description: videoData.description,
      price: videoData.price,
      duration: formattedDuration,
      videoFileId: videoData.videoFileId,
      video_id: videoData.videoFileId, // Para compatibilidade
      thumbnailFileId: videoData.thumbnailFileId,
      thumbnail_id: videoData.thumbnailFileId, // Para compatibilidade
      thumbnailUrl: videoData.thumbnailUrl,
      isPurchased: videoData.isPurchased || false,
      createdAt: videoData.createdAt,
      views: videoData.views,
      product_link: videoData.productLink || ''
    };
  }

  // Get all videos with sorting options
  static async getAllVideos(sortOption: SortOption = SortOption.NEWEST, searchQuery: string = ''): Promise<Video[]> {
    try {
      // Se não há busca e o cache é válido, usar cache
      if (!searchQuery && this.isCacheValid()) {
        console.log('Usando cache de vídeos');
        return this.sortVideos([...this.videosCache!], sortOption);
      }

      console.log('Buscando todos os vídeos do SQLite database');
      
      // Buscar vídeos do SQLite database
      const videoDataList = await jsonDatabaseService.getAllVideos();
      
      // Converter para formato do frontend
      let videos = videoDataList.map(videoData => this.convertVideoData(videoData));
      
      // Aplicar pesquisa do lado do cliente se a consulta for fornecida
      if (searchQuery && searchQuery.trim() !== '') {
        const trimmedQuery = searchQuery.trim().toLowerCase();
        videos = videos.filter(video => 
          video.title.toLowerCase().includes(trimmedQuery) || 
          video.description.toLowerCase().includes(trimmedQuery)
        );
      }

      // Obter URLs de miniaturas para cada vídeo
      for (const video of videos) {
        const thumbnailId = video.thumbnailFileId || video.thumbnail_id;
        
        if (thumbnailId) {
          try {
            video.thumbnailUrl = await wasabiService.getThumbnailUrl(thumbnailId);
          } catch (error) {
            console.error(`Erro ao obter miniatura para o vídeo ${video.$id}:`, error);
            // Usar placeholder se a miniatura não estiver disponível
            video.thumbnailUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5WaWRlbyBUaHVtYm5haWw8L3RleHQ+PC9zdmc+';
          }
        } else {
          // Usar placeholder se não houver ID de miniatura
          video.thumbnailUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5WaWRlbyBUaHVtYm5haWw8L3RleHQ+PC9zdmc+';
        }
      }

      // Atualizar cache se não há busca
      if (!searchQuery) {
        this.videosCache = [...videos];
        this.cacheTimestamp = Date.now();
        console.log('Cache atualizado com', videos.length, 'vídeos');
      }
      
      // Ordenar vídeos
      return this.sortVideos(videos, sortOption);
    } catch (error) {
      console.error('Erro ao obter vídeos:', error);
      throw error;
    }
  }

  // Método para ordenar vídeos
  private static sortVideos(videos: Video[], sortOption: SortOption): Video[] {
    switch (sortOption) {
      case SortOption.NEWEST:
        return videos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case SortOption.PRICE_ASC:
        return videos.sort((a, b) => a.price - b.price);
      case SortOption.PRICE_DESC:
        return videos.sort((a, b) => b.price - a.price);
      case SortOption.VIEWS_DESC:
        return videos.sort((a, b) => (b.views || 0) - (a.views || 0));
      case SortOption.DURATION_DESC:
        return videos.sort((a, b) => {
          const getDurationInSeconds = (duration: string) => {
            try {
              const parts = duration.split(':').map(Number);
              if (parts.length === 2) {
                return parts[0] * 60 + parts[1]; // formato MM:SS
              } else if (parts.length === 3) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2]; // formato HH:MM:SS
              }
            } catch (error) {
              console.error('Erro ao analisar duração:', error);
            }
            return 0;
          };
          return getDurationInSeconds(b.duration) - getDurationInSeconds(a.duration);
        });
      default:
        return videos;
    }
  }
  
  // Get a single video by ID
  static async getVideo(videoId: string): Promise<Video | null> {
    try {
      const videoData = await jsonDatabaseService.getVideo(videoId);
      
      if (!videoData) {
        return null;
      }
      
      const video = this.convertVideoData(videoData);
      
      // Get thumbnail URL
      const thumbnailId = video.thumbnailFileId || video.thumbnail_id;
      
      if (thumbnailId) {
        try {
          video.thumbnailUrl = await wasabiService.getThumbnailUrl(thumbnailId);
        } catch (error) {
          console.error(`Error getting thumbnail for video ${video.$id}:`, error);
          // Use placeholder if thumbnail not available
          video.thumbnailUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5WaWRlbyBUaHVtYm5haWw8L3RleHQ+PC9zdmc+';
        }
      } else {
        // Use placeholder if no thumbnail ID
        video.thumbnailUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5WaWRlbyBUaHVtYm5haWw8L3RleHQ+PC9zdmc+';
      }
      
      return video;
    } catch (error) {
      console.error(`Error getting video ${videoId}:`, error);
      return null;
    }
  }
  
  // Increment view count for a video
  static async incrementViews(videoId: string): Promise<void> {
    try {
      await jsonDatabaseService.incrementVideoViews(videoId);
    } catch (error) {
      console.error(`Error incrementing views for video ${videoId}:`, error);
    }
  }
  
  // Get videos with pagination
  static async getVideosWithPagination(
    page: number = 1, 
    perPage: number = 12, 
    sortOption: SortOption = SortOption.NEWEST,
    searchQuery: string = ''
  ): Promise<{videos: Video[], totalPages: number}> {
    try {
      // Get all videos first (with sorting and filtering)
      const allVideos = await this.getAllVideos(sortOption, searchQuery);
      
      // Calculate total pages
      const totalPages = Math.ceil(allVideos.length / perPage);
      
      // Get videos for the requested page
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const paginatedVideos = allVideos.slice(startIndex, endIndex);
      
      return {
        videos: paginatedVideos,
        totalPages
      };
    } catch (error) {
      console.error('Error getting paginated videos:', error);
      throw error;
    }
  }
  
  // Get video file URL for streaming
  static async getVideoFileUrl(videoId: string): Promise<string | null> {
    try {
      console.log(`Getting video file URL for video ${videoId}`);
      
      // Get video details first
      const video = await this.getVideo(videoId);
      if (!video) {
        console.error(`Video ${videoId} not found`);
        return null;
      }
      
      // Verificando todos os possíveis campos onde o ID do vídeo pode estar
      const videoFileId = video.video_id || video.videoFileId;
      
      if (!videoFileId) {
        console.error(`Video ${videoId} has no video file ID (checked both video_id and videoFileId)`);
        return null;
      }
      
      console.log(`Attempting to get file URL for video ID: ${videoFileId}`);
      
      // Get video file URL
      try {
        const fileUrl = await wasabiService.getFileUrl(videoFileId);
        console.log(`Video URL obtained: ${fileUrl}`);
        return fileUrl;
      } catch (error) {
        console.error(`Error getting file URL:`, error);
        console.error(`Video File ID: ${videoFileId}`);
        return null;
      }
    } catch (error) {
      console.error(`Error getting video file URL for ${videoId}:`, error);
      return null;
    }
  }

  // Criar novo vídeo (para uso no admin)
  static async createVideo(videoData: {
    title: string;
    description: string;
    price: number;
    duration: number;
    videoFileId: string;
    thumbnailFileId: string;
    productLink?: string;
  }): Promise<Video | null> {
    try {
      // Limpar cache antes da operação para evitar inconsistências
      this.clearCache();

      const newVideo = await jsonDatabaseService.createVideo({
        title: videoData.title,
        description: videoData.description,
        price: videoData.price,
        duration: videoData.duration.toString(),
        videoFileId: videoData.videoFileId,
        thumbnailFileId: videoData.thumbnailFileId,
        productLink: videoData.productLink || '',
        isActive: true,
        isPurchased: false
      });

      // Forçar atualização do cache após criação
      await this.forceRefreshCache();

      return this.convertVideoData(newVideo);
    } catch (error) {
      console.error('Error creating video:', error);
      return null;
    }
  }

  // Atualizar vídeo (para uso no admin)
  static async updateVideo(videoId: string, updates: {
    title?: string;
    description?: string;
    price?: number;
    duration?: number;
    videoFileId?: string;
    thumbnailFileId?: string;
    productLink?: string;
  }): Promise<Video | null> {
    try {
      // Limpar cache antes da operação para evitar inconsistências
      this.clearCache();

      const updateData: any = { ...updates };
      if (updateData.duration) {
        updateData.duration = updateData.duration.toString();
      }

      const updatedVideo = await jsonDatabaseService.updateVideo(videoId, updateData);
      
      if (!updatedVideo) {
        return null;
      }

      // Forçar atualização do cache após atualização
      await this.forceRefreshCache();

      return this.convertVideoData(updatedVideo);
    } catch (error) {
      console.error('Error updating video:', error);
      return null;
    }
  }

  // Deletar vídeo (para uso no admin)
  static async deleteVideo(videoId: string): Promise<boolean> {
    try {
      // Limpar cache antes da operação para evitar inconsistências
      this.clearCache();

      // Primeiro, obter os dados do vídeo para deletar os arquivos
      const video = await this.getVideo(videoId);
      if (video) {
        const videoFileId = video.video_id || video.videoFileId;
        const thumbnailFileId = video.thumbnail_id || video.thumbnailFileId;

        // Deletar arquivos do Wasabi
        if (videoFileId) {
          await wasabiService.deleteFile(videoFileId);
        }
        if (thumbnailFileId) {
          await wasabiService.deleteFile(thumbnailFileId);
        }
      }

      // Deletar do JSON database
      const success = await jsonDatabaseService.deleteVideo(videoId);
      
      if (success) {
        // Forçar atualização do cache após exclusão
        await this.forceRefreshCache();
      }

      return success;
    } catch (error) {
      console.error('Error deleting video:', error);
      return false;
    }
  }
}
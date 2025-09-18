import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import { Chip } from '@mui/material';
import Box from '@mui/material/Box';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LockIcon from '@mui/icons-material/Lock';
import Skeleton from '@mui/material/Skeleton';
import { VideoService } from '../services/VideoService';

interface VideoCardProps {
  video: {
    $id: string;
    title: string;
    description: string;
    price: number;
    thumbnailUrl?: string;
    isPurchased?: boolean;
    duration?: string | number;
    views?: number;
    createdAt?: string;
    created_at?: string;
  };
}

const VideoCard: FC<VideoCardProps> = ({ video }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  
  const handleCardClick = async () => {
    try {
      // Increment view count
      await VideoService.incrementViews(video.$id);
      
      // Navigate to video page
      navigate(`/video/${video.$id}`);
    } catch (error) {
      console.error('Error handling video card click:', error);
      // Navigate anyway even if incrementing views fails
      navigate(`/video/${video.$id}`);
    }
  };

  // Format the duration nicely
  const formatDuration = (duration?: string | number) => {
    if (duration === undefined || duration === null) return '00:00';
    
    // If duration is a number (seconds), convert to string format
    if (typeof duration === 'number') {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      return `${minutes}min ${seconds}s`;
    }
    
    // If duration is already a string, check format
    if (typeof duration === 'string') {
      try {
        // Check if duration is in format MM:SS or HH:MM:SS
        const parts = duration.split(':');
        if (parts.length === 2) {
          return `${parts[0]}min ${parts[1]}s`;
        } else if (parts.length === 3) {
          return `${parts[0]}h ${parts[1]}m ${parts[2]}s`;
        }
      } catch (error) {
        console.error('Error formatting duration:', error);
        // Return the original string if split fails
        return duration;
      }
    }
    
    // Return as is if we can't parse it
    return String(duration);
  };

  // Format view count with K, M, etc.
  const formatViews = (views?: number) => {
    if (views === undefined) return '0 views';
    if (views < 1000) return `${views} views`;
    if (views < 1000000) return `${(views / 1000).toFixed(1)}K views`;
    return `${(views / 1000000).toFixed(1)}M views`;
  };

  // Format date to relative time
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Ajuste para lidar com formato created_at ou createdAt
  const createdAtField = video.createdAt || video.created_at;

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: theme => `0 8px 20px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}`,
        cursor: 'pointer',
        backgroundColor: theme => theme.palette.mode === 'dark' ? '#121212' : '#ffffff',
        border: '1px solid rgba(255,15,80,0.1)',
        '&:hover': {
          transform: 'translateY(-10px) scale(1.02)',
          boxShadow: '0 16px 30px rgba(0,0,0,0.25)',
          borderColor: '#FF0F50',
        }
      }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box sx={{ position: 'relative', paddingTop: '56.25%' /* 16:9 aspect ratio */ }}>
        {video.thumbnailUrl ? (
          <CardMedia
            component="img"
            image={video.thumbnailUrl}
            alt={video.title}
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              backgroundColor: '#0A0A0A',
              filter: 'brightness(0.9)',
            }}
            onError={(e) => {
              // Fallback if image fails to load
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5BZHVsdCBDb250ZW50PC90ZXh0Pjwvc3ZnPg==';
            }}
          />
        ) : (
          <Skeleton 
            variant="rectangular" 
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: '#0A0A0A',
            }} 
            animation="wave" 
          />
        )}
        
        {/* Adult content indicator */}
        <Chip 
          label="18+" 
          size="small" 
          sx={{ 
            position: 'absolute', 
            top: 8, 
            left: 8, 
            backgroundColor: '#FF0F50',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.7rem',
            height: '22px',
            zIndex: 2,
          }}
        />
        
        {/* Hover overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.3) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isHovered ? 1 : 0.4,
            transition: 'all 0.3s ease',
          }}
        >
          <Box
            sx={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,15,80,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isHovered ? 'scale(1.1)' : 'scale(0.9)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            {video.isPurchased ? (
              <PlayArrowIcon sx={{ fontSize: 45, color: 'white' }} />
            ) : (
              <LockIcon sx={{ fontSize: 35, color: 'white' }} />
            )}
          </Box>
        </Box>
        
        {/* Duration badge */}
        {video.duration && (
          <Chip 
            label={formatDuration(video.duration)} 
            size="small" 
            sx={{ 
              position: 'absolute', 
              bottom: 8, 
              right: 8, 
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              fontWeight: 'bold',
              height: '24px',
              '& .MuiChip-label': {
                px: 1,
              }
            }}
            icon={<AccessTimeIcon sx={{ color: 'white', fontSize: '14px' }} />}
          />
        )}
        
        {/* Price badge - Enhanced visibility */}
        <Chip 
          label={`$${video.price.toFixed(2)}`} 
          color="primary" 
          size="medium" 
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            fontWeight: 'bold',
            fontSize: '0.9rem',
            height: '32px',
            boxShadow: '0 4px 12px rgba(255, 15, 80, 0.4)',
            backgroundColor: '#FF0F50',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            '& .MuiChip-label': {
              color: 'white',
              fontWeight: 'bold',
              px: 1.5
            },
            '&:hover': {
              backgroundColor: '#D10D42',
              transform: 'scale(1.05)',
              transition: 'all 0.2s ease'
            }
          }}
        />
      </Box>
      
      <CardContent sx={{ flexGrow: 1, p: 2, pt: 1.5 }}>
        <Typography gutterBottom variant="h6" component="div" sx={{
          fontWeight: 'bold',
          fontSize: '1rem',
          lineHeight: 1.2,
          mb: 1,
          height: '2.4rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          color: theme => theme.palette.mode === 'dark' ? 'white' : 'text.primary',
        }}>
          {video.title}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: theme => theme.palette.mode === 'dark' ? '#FF69B4' : 'text.secondary' }}>
            <VisibilityIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption">
              {formatViews(video.views)}
            </Typography>
          </Box>
          
          {createdAtField && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {formatDate(createdAtField)}
            </Typography>
          )}
        </Box>

        {/* Price display at bottom */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          mt: 1,
          p: 1,
          backgroundColor: 'rgba(255, 15, 80, 0.1)',
          borderRadius: 1,
          border: '1px solid rgba(255, 15, 80, 0.2)'
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#FF0F50',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              textAlign: 'center'
            }}
          >
            ${video.price.toFixed(2)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default VideoCard; 
import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Fade from '@mui/material/Fade';
import Grow from '@mui/material/Grow';
import Pagination from '@mui/material/Pagination';
import Button from '@mui/material/Button';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SettingsIcon from '@mui/icons-material/Settings';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import Paper from '@mui/material/Paper';
import { Chip } from '@mui/material';
import { useAuth } from '../services/Auth';
import VideoCard from '../components/VideoCard';
import { VideoService, Video, SortOption } from '../services/VideoService';
import { useSiteConfig } from '../context/SiteConfigContext';
import FeaturedBanner from '../components/FeaturedBanner';
import DatabaseSetupModal from '../components/DatabaseSetupModal';
import CredentialsStatus from '../components/CredentialsStatus';
import ContactSection from '../components/ContactSection';

// Skeleton card component for loading state
const VideoCardSkeleton: FC = () => {
  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      bgcolor: 'background.paper'
    }}>
      <Skeleton 
        variant="rectangular" 
        sx={{ width: '100%', paddingTop: '56.25%' }} 
        animation="wave" 
      />
      <CardContent>
        <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 1 }} />
        <Skeleton variant="text" sx={{ fontSize: '1rem', width: '60%' }} />
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton variant="text" sx={{ width: '30%' }} />
          <Skeleton variant="text" sx={{ width: '20%' }} />
        </Box>
      </CardContent>
    </Card>
  );
};

const Home: FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [showSetupButton, setShowSetupButton] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  
  const { user } = useAuth();
  const { videoListTitle } = useSiteConfig();
  const navigate = useNavigate();
  const videosPerPage = 24; // Aumentar de 12 para 24 vídeos por página

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { videos: videoList, totalPages: pages } = await VideoService.getVideosWithPagination(
          page,
          videosPerPage,
          SortOption.NEWEST
        );
        
        setVideos(videoList);
        setTotalPages(pages);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load videos. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
    
    // Sempre mostrar o botão de configuração (não dependemos mais do Appwrite)
    setShowSetupButton(false);
  }, [user, page]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    // Scroll to top with enhanced smooth behavior
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
    
    // Add a small delay to ensure smooth transition
    setTimeout(() => {
      const headerElement = document.querySelector('header');
      if (headerElement) {
        headerElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  };

  // Render skeleton loaders during loading state
  const renderSkeletons = () => {
    return Array(videosPerPage).fill(0).map((_, index) => (
      <Grid item key={`skeleton-${index}`} xs={12} sm={6} md={4} lg={3}>
        <VideoCardSkeleton />
      </Grid>
    ));
  };

  const handleBannerError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleQuickSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (quickSearchQuery.trim()) {
      navigate(`/videos?search=${encodeURIComponent(quickSearchQuery.trim())}`);
    }
  };

  const handleQuickSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuickSearchQuery(event.target.value);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Banner de destaque */}
      <FeaturedBanner onError={handleBannerError} />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Status das Credenciais */}
        <CredentialsStatus />
        
        {/* Barra de Pesquisa Rápida */}
        <Paper 
          elevation={2}
          sx={{ 
            p: 2, 
            mb: 3, 
            background: 'linear-gradient(135deg, rgba(255, 15, 80, 0.08) 0%, rgba(209, 13, 66, 0.08) 100%)',
            borderRadius: 1.5,
            border: '1px solid rgba(255, 15, 80, 0.1)'
          }}
        >
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 1.5, fontSize: '1rem' }}>
            🔍 Find Your Perfect Video
          </Typography>
          <Box 
            component="form" 
            onSubmit={handleQuickSearch}
            sx={{ 
              display: 'flex', 
              gap: 1.5, 
              alignItems: 'center',
              flexDirection: { xs: 'column', sm: 'row' }
            }}
          >
            <TextField
              placeholder="Search by title, category, or description..."
              size="small"
              value={quickSearchQuery}
              onChange={handleQuickSearchChange}
              sx={{ 
                flexGrow: 1,
                minWidth: { xs: '100%', sm: '280px' },
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                  height: '40px',
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.9rem',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" sx={{ fontSize: '20px' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button 
              type="submit"
              variant="contained"
              color="primary"
              size="small"
              sx={{ 
                minWidth: { xs: '100%', sm: '100px' },
                py: 1,
                px: 2,
                fontWeight: 600,
                height: '40px'
              }}
              disabled={!quickSearchQuery.trim()}
            >
              Search
            </Button>
          </Box>
        </Paper>

        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          mb: 3
        }}>
          <Box>
            <Typography variant="h4" component="h2" gutterBottom>
              {videoListTitle || 'Featured Videos'}
            </Typography>
            {!loading && videos.length > 0 && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                <Chip 
                  label={`From $${Math.min(...videos.map(v => v.price)).toFixed(2)}`}
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255, 15, 80, 0.1)',
                    color: '#FF0F50',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255, 15, 80, 0.3)'
                  }}
                />
                <Chip 
                  label={`Up to $${Math.max(...videos.map(v => v.price)).toFixed(2)}`}
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255, 15, 80, 0.1)',
                    color: '#FF0F50',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255, 15, 80, 0.3)'
                  }}
                />
                <Chip 
                  label={`Avg: $${(videos.reduce((sum, v) => sum + v.price, 0) / videos.length).toFixed(2)}`}
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255, 15, 80, 0.1)',
                    color: '#FF0F50',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255, 15, 80, 0.3)'
                  }}
                />
              </Box>
            )}
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            alignItems: 'center',
            alignSelf: { xs: 'flex-start', md: 'center' }
          }}>
            {showSetupButton && (
              <Tooltip title="Configurar Armazenamento Wasabi">
                <Button
                  onClick={() => setSetupModalOpen(true)}
                  variant="outlined"
                  color="secondary"
                  size="small"
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1.5,
                    opacity: 0.7,
                    '&:hover': { opacity: 1 }
                  }}
                >
                  <SettingsIcon fontSize="small" />
                </Button>
              </Tooltip>
            )}
            
            <Button 
              component={RouterLink}
              to="/videos"
              variant="outlined"
              color="primary"
              endIcon={<ArrowForwardIcon />}
            >
              View All Videos
            </Button>
          </Box>
        </Box>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setSetupModalOpen(true)}
                startIcon={<SettingsIcon />}
              >
                Configurar Base de Dados
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        
        <Fade in={!loading} timeout={500}>
          <Box>
            {loading ? (
              <Grid container spacing={3}>
                {renderSkeletons()}
              </Grid>
            ) : videos.length === 0 ? (
              <Grow in={true} timeout={1000}>
                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      fontSize: '1.5rem'
                    }
                  }}
                >
                  No videos available at the moment. Please check back later.
                </Alert>
              </Grow>
            ) : (
              <>
                <Grid container spacing={3}>
                  {videos.map((video, index) => (
                    <Grow
                      key={video.$id}
                      in={true}
                      timeout={500 + index * 100}
                    >
                      <Grid item xs={12} sm={6} md={4} lg={3}>
                        <VideoCard video={video} />
                      </Grid>
                    </Grow>
                  ))}
                </Grid>
                
                {totalPages > 1 && (
                  <Fade in={true} timeout={800}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      mt: 5,
                      pt: 3,
                      borderTop: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Pagination 
                        count={totalPages} 
                        page={page} 
                        onChange={handlePageChange}
                        color="primary"
                        size="large"
                        showFirstButton
                        showLastButton
                        sx={{
                          '& .MuiPaginationItem-root': {
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'scale(1.1)',
                              bgcolor: 'primary.main',
                              color: 'white'
                            }
                          }
                        }}
                      />
                    </Box>
                  </Fade>
                )}
              </>
            )}
          </Box>
        </Fade>
      </Container>
      
      <ContactSection />
      
      {/* Modal de setup da base de dados */}
      <DatabaseSetupModal 
        open={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
      />
    </Box>
  );
};

export default Home;

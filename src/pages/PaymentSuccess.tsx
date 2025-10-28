import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TelegramIcon from '@mui/icons-material/Telegram';
import jsPDF from 'jspdf';
import { useTheme } from '@mui/material/styles';
import { VideoService, Video } from '../services/VideoService';
import { useSiteConfig } from '../context/SiteConfigContext';

const PaymentSuccess: FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { telegramUsername, siteName } = useSiteConfig();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);
  const [linkStatus, setLinkStatus] = useState<'checking' | 'working' | 'broken' | 'unknown'>('unknown');
  const theme = useTheme();

  useEffect(() => {
    const loadVideo = async () => {
      if (!id) {
        setError('Invalid video ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const videoData = await VideoService.getVideo(id);
        if (!videoData) {
          setError('Video not found');
          setLoading(false);
          return;
        }
        
        setVideo(videoData);
      } catch (err) {
        console.error('Error loading video:', err);
        setError('Failed to load video. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [id]);

  useEffect(() => {
    if (video?.product_link) {
      checkProductLink(video.product_link);
    }
  }, [video?.product_link]);

  const handleBack = () => {
    navigate('/');
  };

  const handleTelegramRedirect = () => {
    if (telegramUsername) {
      window.open(`https://t.me/${telegramUsername}`, '_blank');
    }
  };

  const copyIndividualLink = (link: string, index: number) => {
    navigator.clipboard.writeText(link.trim())
      .then(() => {
        setCopiedLinkIndex(index);
        setTimeout(() => setCopiedLinkIndex(null), 3000);
      })
      .catch(err => console.error('Failed to copy: ', err));
  };

  const copyToClipboard = () => {
    if (video?.product_link) {
      navigator.clipboard.writeText(video.product_link)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        })
        .catch(err => console.error('Failed to copy: ', err));
    }
  };

  const getProductLinks = () => {
    if (!video?.product_link) return [];
    return video.product_link.split(/\s+/).filter(link => link.trim().length > 0);
  };

  const checkProductLink = async (url: string) => {
    if (!url) {
      setLinkStatus('unknown');
      return;
    }

    setLinkStatus('checking');
    
    try {
      if (!isValidUrl(url)) {
        setLinkStatus('broken');
        return;
      }

      setTimeout(() => {
        if (url.includes('http://') || url.includes('https://')) {
          setLinkStatus('working');
        } else if (url.includes('@') || url.includes('t.me/')) {
          setLinkStatus('working');
        } else if (url.length < 5) {
          setLinkStatus('broken');
        } else {
          setLinkStatus('unknown');
        }
      }, 1000);
    } catch (error) {
      console.error('Error checking link:', error);
      setLinkStatus('unknown');
    }
  };

  const isValidUrl = (string: string): boolean => {
    try {
      if (string.startsWith('http://') || string.startsWith('https://')) {
        new URL(string);
        return true;
      }
      
      if (string.includes('t.me/') || string.includes('@')) {
        return true;
      }
      
      if (string.includes('.') && string.length > 3) {
        return true;
      }
      
      return false;
    } catch (_) {
      return false;
    }
  };

  const generatePDF = () => {
    if (!video) return;
    
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(229, 9, 20);
      doc.text(`${siteName || 'ADULTFLIX'}`, 105, 20, { align: "center" });
    
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Purchase Receipt", 105, 30, { align: "center" });
    
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 35, 190, 35);
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Video: ${video.title}`, 20, 50);
      doc.text(`Purchase Date: ${formatDate(new Date())}`, 20, 60);
      doc.text(`Price: $${video.price.toFixed(2)}`, 20, 70);
    
      doc.setFontSize(14);
      doc.text("Your Product Link:", 20, 90);
      
      doc.setDrawColor(229, 9, 20);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(20, 95, 170, 20, 3, 3, 'FD');
    
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      if (video.product_link) {
        doc.text(video.product_link, 25, 107);
      } else {
        doc.text("Contact support via Telegram for access", 25, 107);
      }
    
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.text("Instructions:", 20, 130);
      
      if (video.product_link) {
        doc.text("1. Copy the link above and paste it in your browser", 25, 140);
        doc.text("2. The link will take you to your purchased content", 25, 150);
        doc.text("3. This link is for your personal use only", 25, 160);
        doc.text("4. Do not share this link with others", 25, 170);
      } else {
        doc.text("1. Contact support via Telegram to get access to your content", 25, 140);
        doc.text("2. Provide your purchase details when contacting support", 25, 150);
        doc.text("3. Support will provide you with access instructions", 25, 160);
      }
    
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("Thank you for your purchase!", 105, 200, { align: "center" });
      doc.text(`© ${siteName || 'ADULTFLIX'} - All Rights Reserved`, 105, 206, { align: "center" });
    
      doc.save(`${siteName || 'ADULTFLIX'}-Receipt-${video.title.replace(/\s+/g, '-')}.pdf`);
      setPdfGenerated(true);
      setTimeout(() => setPdfGenerated(false), 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '500px' 
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !video) {
    return (
      <Box sx={{ py: 4, px: 2 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Home
        </Button>
        
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Video not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      bgcolor: theme.palette.mode === 'dark' ? '#141414' : '#f5f5f5', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      width: '100%',
      minHeight: '100vh',
      py: 4
    }}>
      <Box sx={{ 
        width: '100%', 
        maxWidth: '1200px', 
        px: { xs: 2, md: 4 } 
      }}>
        {/* Success Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
            Payment Successful!
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Thank you for your purchase!
          </Typography>
        </Box>

        {/* Video Info Card */}
        <Box sx={{ 
          bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
          borderRadius: 2,
          p: 3,
          mb: 4,
          boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
            {video.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {video.description}
          </Typography>
          <Typography variant="h6" sx={{ color: '#E50914', fontWeight: 'bold' }}>
            Price Paid: ${video.price.toFixed(2)}
          </Typography>
        </Box>

        {/* Product Links Section */}
        {video.product_link ? (
          <Box sx={{ 
            bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
            borderRadius: 2,
            p: 3,
            mb: 4
          }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Your Product {getProductLinks().length > 1 ? 'Links' : 'Link'}
            </Typography>

            {/* Link Status */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              {linkStatus === 'checking' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Checking link...
                  </Typography>
                </Box>
              )}
              {linkStatus === 'working' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                  <Typography variant="body2" color="success.main">
                    Link is working correctly
                  </Typography>
                </Box>
              )}
              {linkStatus === 'broken' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle sx={{ color: 'error.main', fontSize: 20 }} />
                  <Typography variant="body2" color="error.main">
                    Link not working - Notification sent to support
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Individual Links */}
            {getProductLinks().map((link, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Link {index + 1}:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    flex: 1, 
                    p: 2, 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderRadius: 1,
                    wordBreak: 'break-all',
                    fontFamily: 'monospace'
                  }}>
                    {link.trim()}
                  </Box>
                  <Button
                    variant="contained"
                    color={copiedLinkIndex === index ? "success" : "primary"}
                    onClick={() => copyIndividualLink(link, index)}
                    startIcon={copiedLinkIndex === index ? <CheckCircleIcon /> : <ContentCopyIcon />}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {copiedLinkIndex === index ? 'Copied!' : 'Copy'}
                  </Button>
                </Box>
              </Box>
            ))}

            {/* Copy All Links Button */}
            {getProductLinks().length > 1 && (
              <Button
                variant="outlined"
                fullWidth
                onClick={copyToClipboard}
                startIcon={copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
                sx={{ 
                  mt: 2,
                  borderColor: '#E50914',
                  color: '#E50914',
                  '&:hover': {
                    borderColor: '#E50914',
                    color: '#fff',
                    background: '#E50914',
                  }
                }}
              >
                {copied ? 'All Links Copied!' : 'Copy All Links'}
              </Button>
            )}
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 4 }}>
            Your purchase was successful! The admin will need to update the product link. 
            Please contact support through Telegram for immediate access.
          </Alert>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
          {video.product_link && (
            <Button
              variant="contained"
              color={pdfGenerated ? "success" : "secondary"}
              fullWidth
              startIcon={pdfGenerated ? <CheckCircleIcon /> : <PictureAsPdfIcon />}
              onClick={generatePDF}
              sx={{ py: 1.5 }}
            >
              {pdfGenerated ? 'PDF Downloaded!' : 'Download Receipt PDF'}
            </Button>
          )}
          
          {telegramUsername && (
            <Button
              variant="outlined"
              fullWidth
              startIcon={<TelegramIcon />}
              onClick={handleTelegramRedirect}
              sx={{ 
                py: 1.5,
                borderColor: '#229ED9',
                color: '#229ED9',
                '&:hover': {
                  borderColor: '#229ED9',
                  color: '#fff',
                  background: '#229ED9',
                }
              }}
            >
              Contact on Telegram
            </Button>
          )}

          <Button
            variant="outlined"
            fullWidth
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ py: 1.5 }}
          >
            Back to Home
          </Button>
        </Box>

        {/* Instructions */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" component="div">
            <strong>Important:</strong> Please save your product {getProductLinks().length > 1 ? 'links' : 'link'} and download the receipt PDF. 
            {video.product_link && getProductLinks().length === 1 && (
              ' If the link does not work, please contact us via Telegram.'
            )}
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default PaymentSuccess;

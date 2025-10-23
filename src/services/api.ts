/**
 * API routes for the application
 */

import { useSiteConfig } from '../context/SiteConfigContext';
import { jsonDatabaseService } from './JSONDatabaseService';

// Base API URL - configurado para desenvolvimento local ou produção
const isDev = import.meta.env.DEV;

// Função para determinar a URL da API baseada no ambiente
const getApiBaseUrl = () => {
  if (isDev) {
    return 'http://localhost:3000';
  }
  
  // Se VITE_API_URL estiver configurada, usar ela
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Se estivermos em um domínio Render, usar o mesmo domínio para a API
  if (window.location.hostname.includes('.onrender.com')) {
    return `https://${window.location.hostname}`;
  }
  
  // Fallback para qualquer outro domínio
  return window.location.origin;
};

const API_BASE_URL = getApiBaseUrl();

// Helper function to get Stripe secret key from JSON database
export const getStripeSecretKey = async (): Promise<string> => {
  try {
    const config = await jsonDatabaseService.getSiteConfig();
    
    if (config) {
      return config.stripeSecretKey || '';
    }
    return '';
  } catch (error) {
    console.error('Error fetching Stripe secret key from JSON database:', error);
    throw error;
  }
};

/**
 * Create a Stripe checkout session
 */
export const createStripeCheckoutSession = async (
  amount: number, 
  currency: string = 'usd',
  productName: string,
  successUrl: string,
  cancelUrl: string
): Promise<{sessionId: string}> => {
  console.log('Creating Stripe checkout session:', {
    amount: Math.round(amount * 100),
    currency,
    name: productName,
    success_url: successUrl,
    cancel_url: cancelUrl,
    apiUrl: API_BASE_URL
  });
  
  const fullUrl = `${API_BASE_URL}/api/create-checkout-session`;
  console.log('Making request to:', fullUrl);
  
  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      name: productName,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Failed to create checkout session:', {
      status: response.status,
      statusText: response.statusText,
      errorData,
      url: fullUrl
    });
    throw new Error(`Failed to create checkout session: ${response.status} ${response.statusText}`);
  }

  return response.json();
}; 
import { getWeb3Provider } from '@/services/wallet';
import { 
  connectWalletOnly, 
  disconnectWalletOnly,
  web3Onboard 
} from '@/services/wallet';
import type { WalletState } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { SiweMessage } from 'siwe';

export const connectWallet = async (): Promise<WalletState | null> => {
  let connectedWallet: WalletState | null = null;
  
  try {
    // First connect the wallet
    connectedWallet = await connectWalletOnly();
    if (!connectedWallet) return null;

    // Ensure we have a wallet address
    const walletAddress = connectedWallet.accounts?.[0]?.address;
    if (!walletAddress) {
      console.error('No wallet address available');
      throw new Error('No wallet address available');
    }

    // Get the nonce from Supabase
    const { data: { nonce }, error: nonceError } = await supabase.auth.signInWithOAuth({
      provider: 'siwe',
      options: {
        skipBrowserRedirect: true
      }
    });

    if (nonceError) {
      console.error('Failed to get nonce:', nonceError);
      throw nonceError;
    }

    // Create and sign SIWE message
    const web3Provider = getWeb3Provider();
    const signer = web3Provider.getSigner();
    
    const message = new SiweMessage({
      domain: window.location.host,
      address: walletAddress,
      statement: 'Sign in with Ethereum to TACo',
      uri: window.location.origin,
      version: '1',
      chainId: 1,
      nonce
    });

    const messageToSign = message.prepareMessage();
    const signature = await signer.signMessage(messageToSign);

    // Complete the OAuth flow with the signed message
    const { data, error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'siwe',
      options: {
        skipBrowserRedirect: true,
        queryParams: {
          message: messageToSign,
          signature,
          redirect_to: window.location.origin
        }
      }
    });

    if (signInError) {
      console.error('Failed to sign in:', signInError);
      throw signInError;
    }

    console.log('Successfully signed in with SIWE:', data);
    return connectedWallet;

  } catch (error) {
    console.error('Connection error:', error);
    // Clean up on error
    if (connectedWallet) {
      await disconnectWalletOnly(connectedWallet);
    }
    await supabase.auth.signOut();
    throw error;
  }
};

export const disconnectWallet = async (wallet: WalletState) => {
  await disconnectWalletOnly(wallet);
  await supabase.auth.signOut();
};

export default web3Onboard;
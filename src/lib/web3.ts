import { getWeb3Provider } from '@/services/wallet';
import { 
  connectWalletOnly, 
  disconnectWalletOnly,
  web3Onboard 
} from '@/services/wallet';
import type { WalletState } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';

export const connectWallet = async (): Promise<WalletState | null> => {
  let connectedWallet: WalletState | null = null;
  
  try {
    console.log('Starting wallet connection process...');
    
    // First connect the wallet
    connectedWallet = await connectWalletOnly();
    if (!connectedWallet) {
      console.log('No wallet connected during connectWalletOnly');
      return null;
    }

    // Ensure we have a wallet address
    const walletAddress = connectedWallet.accounts?.[0]?.address;
    if (!walletAddress) {
      console.error('No wallet address available after connection');
      throw new Error('No wallet address available');
    }

    // Convert to checksum address before creating message
    const checksumAddress = ethers.utils.getAddress(walletAddress);
    console.log('Using checksum address for SIWE:', checksumAddress);

    // Get nonce from edge function
    console.log('Requesting nonce from edge function...');
    const { data: nonce, error: nonceError } = await supabase.functions.invoke('nonce');
    
    if (nonceError || !nonce) {
      console.error('Failed to get nonce:', nonceError);
      throw new Error('Failed to get nonce for authentication');
    }
    
    console.log('Received nonce from edge function:', nonce);

    // Create and sign SIWE message
    const web3Provider = getWeb3Provider();
    const signer = web3Provider.getSigner();
    
    const message = new SiweMessage({
      domain: window.location.host,
      address: checksumAddress,
      statement: 'Sign in with TACo',
      uri: window.location.origin,
      version: '1',
      chainId: 1,
      nonce: nonce
    });

    const messageToSign = message.prepareMessage();
    console.log('Prepared SIWE message:', messageToSign);
    
    console.log('Requesting signature from wallet...');
    const signature = await signer.signMessage(messageToSign);
    console.log('Got signature:', signature);

    // Call the SIWE auth edge function
    console.log('Calling SIWE auth edge function...');
    const { data: authData, error: authError } = await supabase.functions.invoke('siwe-auth', {
      body: { 
        address: checksumAddress,
        message: messageToSign,
        signature 
      }
    });

    if (authError || !authData) {
      console.error('Failed to authenticate with SIWE:', authError);
      throw new Error(`SIWE authentication failed: ${authError?.message || 'Unknown error'}`);
    }

    console.log('SIWE auth successful, received data:', authData);

    // Use the action_link from the session data to complete authentication
    if (authData.session?.action_link) {
      console.log('Redirecting to action link for authentication...');
      window.location.href = authData.session.action_link;
    } else {
      console.error('No action link received from server');
      throw new Error('Authentication failed: No action link received');
    }

    return connectedWallet;

  } catch (error) {
    console.error('Wallet connection error:', error);
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
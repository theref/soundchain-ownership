import init from '@web3-onboard/core';
import injectedModule from '@web3-onboard/injected-wallets';
import walletConnectModule from '@web3-onboard/walletconnect';
import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';
import { supabase } from '@/integrations/supabase/client';

const injected = injectedModule();
const walletConnect = walletConnectModule({
  projectId: 'c5d90293c2ddcb8e467deb6484b19f9b'
});

interface WalletState {
  label: string;
  accounts: { address: string }[];
}

const web3Onboard = init({
  wallets: [injected, walletConnect],
  chains: [
    {
      id: '0x1',
      token: 'ETH',
      label: 'Ethereum Mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/',
    },
    {
      id: '0xaa36a7',
      token: 'ETH',
      label: 'Sepolia',
      rpcUrl: 'https://sepolia.infura.io/v3/',
    },
  ],
  appMetadata: {
    name: 'TACo',
    icon: '/favicon.ico',
    description: 'Decentralized Music Platform',
    recommendedInjectedWallets: [
      { name: 'MetaMask', url: 'https://metamask.io' },
    ],
  }
});

const generateNonce = () => {
  return Math.floor(Math.random() * 1000000).toString();
};

export const createSiweMessage = (address: string, chainId: number, nonce: string) => {
  const now = new Date();
  const message = new SiweMessage({
    domain: window.location.host,
    address,
    statement: 'Sign in with Ethereum to TACo',
    uri: window.location.origin,
    version: '1',
    chainId,
    nonce,
    issuedAt: now.toISOString(),
    expirationTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  });
  return message.prepareMessage();
};

export const connectWallet = async (): Promise<WalletState | null> => {
  try {
    const wallets = await web3Onboard.connectWallet();
    if (!wallets[0]) return null;

    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = web3Provider.getSigner();
    const address = await signer.getAddress();
    const chainId = (await web3Provider.getNetwork()).chainId;
    
    // Generate new nonce
    const nonce = generateNonce();

    // Create and sign SIWE message
    const message = createSiweMessage(address, chainId, nonce);
    const signature = await signer.signMessage(message);

    // Sign in with the signature
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
      email: `${address.toLowerCase()}@ethereum.org`,
      password: signature,
    });

    if (signInError || !session) {
      console.error('Sign in error:', signInError);
      throw signInError || new Error('No session created');
    }

    // Check if user exists and get their data
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('address', address.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      // Update existing user's auth data
      await supabase
        .from('users')
        .update({ 
          auth: { 
            lastAuth: new Date().toISOString(),
            lastAuthStatus: 'success',
            genNonce: generateNonce() // Generate new nonce for next login
          }
        })
        .eq('address', address.toLowerCase());
    } else {
      // Create new user
      await supabase
        .from('users')
        .insert({
          id: crypto.randomUUID(),
          address: address.toLowerCase(),
          auth: {
            lastAuth: new Date().toISOString(),
            lastAuthStatus: 'success',
            genNonce: generateNonce() // Generate new nonce for next login
          }
        });
    }

    return wallets[0];
  } catch (error) {
    console.error('Connection error:', error);
    throw error;
  }
};

export const disconnectWallet = async (wallet: WalletState) => {
  await web3Onboard.disconnectWallet(wallet);
  await supabase.auth.signOut();
};

export default web3Onboard;
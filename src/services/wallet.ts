import init from '@web3-onboard/core';
import injectedModule from '@web3-onboard/injected-wallets';
import walletConnectModule from '@web3-onboard/walletconnect';
import { ethers } from 'ethers';
import { WalletState } from '@/types/auth';

const injected = injectedModule();
const walletConnect = walletConnectModule({
  projectId: 'c5d90293c2ddcb8e467deb6484b19f9b'
});

export const web3Onboard = init({
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

export const getWeb3Provider = (): ethers.providers.Web3Provider => {
  return new ethers.providers.Web3Provider(window.ethereum);
};

export const connectWalletOnly = async (): Promise<WalletState | null> => {
  const wallets = await web3Onboard.connectWallet();
  if (!wallets[0]) return null;
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  return wallets[0];
};

export const disconnectWalletOnly = async (wallet: WalletState) => {
  await web3Onboard.disconnectWallet(wallet);
};
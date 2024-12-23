import { Button } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "@/contexts/WalletContext";
import { Link } from "react-router-dom";
import { formatWalletAddress } from "@/utils/format";
import { useAuth } from "@/contexts/AuthContext";

export const WalletButton = () => {
  const { login, ready } = usePrivy();
  const { wallet } = useWallet();
  const { isAuthenticated, isLoading, logout } = useAuth();

  // Add logging for component state
  console.log('WalletButton state:', { 
    wallet, 
    ready,
    isAuthenticated,
    isLoading,
    connectedAddress: wallet?.accounts?.[0]?.address 
  });

  // Show loading state while initializing
  if (isLoading || !ready) {
    return (
      <Button 
        variant="default"
        disabled
        className="rounded-full font-medium whitespace-nowrap text-sm"
      >
        Loading...
      </Button>
    );
  }

  // Show profile/logout if authenticated and wallet connected
  if (isAuthenticated && wallet) {
    const connectedAddress = wallet.accounts?.[0]?.address;
    const truncatedAddress = connectedAddress ? formatWalletAddress(connectedAddress) : '';

    return (
      <div className="flex items-center gap-2">
        <Link to="/profile">
          <Button variant="secondary" className="rounded-full font-medium">
            {truncatedAddress}
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          onClick={logout}
          className="rounded-full font-medium"
        >
          Logout
        </Button>
      </div>
    );
  }

  // Show connect button if not authenticated
  return (
    <Button 
      variant="default"
      onClick={() => login()}
      className="rounded-full font-medium whitespace-nowrap text-sm"
    >
      Connect Wallet
    </Button>
  );
};
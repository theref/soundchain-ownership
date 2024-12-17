import { Search, Upload, User } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { connectWallet, disconnectWallet } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { UploadTrackForm } from "./UploadTrackForm";
import { supabase } from "@/integrations/supabase/client";

export const Header = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      const connectedWallet = await connectWallet();
      
      if (!connectedWallet) {
        throw new Error('Failed to connect wallet');
      }

      const walletAddress = connectedWallet.accounts[0].address;

      // First check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw fetchError;
      }

      if (!existingUser) {
        // Create new user if they don't exist
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            wallet_address: walletAddress,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        
        if (!newUser) {
          throw new Error('Failed to create user');
        }
      }

      setWallet(connectedWallet);
      toast({
        title: "Connected",
        description: "Wallet connected successfully",
      });
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      if (wallet) {
        await disconnectWallet(wallet);
        setWallet(null);
        toast({
          title: "Disconnected",
          description: "Wallet disconnected successfully",
        });
      }
    } catch (error) {
      console.error('Disconnection error:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect wallet",
        variant: "destructive",
      });
    }
  };

  const handleUploadClick = () => {
    if (!wallet) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to upload tracks",
        variant: "destructive",
      });
      return;
    }
    setShowUploadDialog(true);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-[2px] border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold tracking-tight">D-Sound</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tracks..."
              className="pl-10 bg-secondary rounded-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleUploadClick} className="rounded-sm">
            <Upload className="h-5 w-5" />
          </Button>
          {wallet ? (
            <Button variant="outline" onClick={handleDisconnect} className="rounded-sm font-medium">
              {wallet.accounts[0].address.slice(0, 6)}...{wallet.accounts[0].address.slice(-4)}
            </Button>
          ) : (
            <Button onClick={handleConnect} className="rounded-sm font-medium">
              Connect Wallet
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[600px] rounded-sm">
          <DialogHeader>
            <DialogTitle>Upload Track</DialogTitle>
          </DialogHeader>
          <UploadTrackForm 
            onSuccess={() => setShowUploadDialog(false)} 
            wallet={wallet}
          />
        </DialogContent>
      </Dialog>
    </header>
  );
};
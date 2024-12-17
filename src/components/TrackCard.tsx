import { Play, Pause, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioPlayer } from "@/App";
import { conditions, decrypt, domains, initialize } from '@nucypher/taco';
import { EIP4361AuthProvider, USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';
import { ethers } from "ethers";
import { useState } from "react";

interface TrackCardProps {
  title: string;
  artist: string;
  coverUrl: string;
  trackId: string;
  ipfsCid: string | null;
}

export const TrackCard = ({ 
  title, 
  artist, 
  coverUrl, 
  ipfsCid
}: TrackCardProps) => {
  const { toast } = useToast();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const [isDecrypting, setIsDecrypting] = useState(false);

  const getTrackUrl = (cid: string | null) => {
    if (!cid) return null;
    return `https://gateway.lighthouse.storage/ipfs/${cid}`;
  };

  const handlePlay = async () => {
    const trackUrl = getTrackUrl(ipfsCid);
    if (!trackUrl) {
      toast({
        title: 'Error',
        description: 'Track not available',
        variant: 'destructive',
      });
      return;
    }

    if (currentTrack?.audioUrl === trackUrl) {
      togglePlayPause();
      return;
    }

    try {
      setIsDecrypting(true);
      
      // Initialize TACo
      await initialize();
      
      // Setup Web3 provider
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);

      // Fetch the encrypted content
      const response = await fetch(trackUrl);
      const encryptedData = await response.arrayBuffer();
      const messageKit = ThresholdMessageKit.fromBytes(new Uint8Array(encryptedData));

      // Setup condition context and auth provider
      const conditionContext = conditions.context.ConditionContext.fromMessageKit(messageKit);
      const authProvider = new EIP4361AuthProvider(
        web3Provider,
        web3Provider.getSigner()
      );
      conditionContext.addAuthProvider(USER_ADDRESS_PARAM_DEFAULT, authProvider);

      // Decrypt the content
      const decryptedData = await decrypt(
        web3Provider,
        domains.TESTNET,
        messageKit,
        conditionContext
      );

      // Create a blob URL from the decrypted data
      const blob = new Blob([decryptedData], { type: 'audio/mpeg' });
      const decryptedUrl = URL.createObjectURL(blob);

      // Play the decrypted track
      playTrack({
        title,
        artist,
        coverUrl,
        audioUrl: decryptedUrl,
      });

      toast({
        title: 'Playing Track',
        description: `Now playing ${title} by ${artist}`,
      });
    } catch (error) {
      console.error('Decryption error:', error);
      toast({
        title: 'Access Denied',
        description: 'You do not meet the required conditions to play this track',
        variant: 'destructive',
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const isThisTrackPlaying = currentTrack?.audioUrl === getTrackUrl(ipfsCid) && isPlaying;

  return (
    <div className="group relative overflow-hidden rounded-sm border border-border hover-scale">
      <img
        src={coverUrl}
        alt={`${title} by ${artist}`}
        className="w-full aspect-square object-cover"
      />
      <div className="absolute inset-0 glass-overlay opacity-0 group-hover:opacity-100 flex items-center justify-center">
        <div 
          onClick={handlePlay}
          className="p-3 rounded-full bg-background/80 hover:bg-background/90 cursor-pointer transition-colors"
        >
          {isDecrypting ? (
            <Lock className="h-6 w-6 animate-pulse" />
          ) : isThisTrackPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 glass-overlay">
        <h3 className="font-medium text-sm truncate">{title}</h3>
        <p className="text-sm text-muted-foreground truncate">{artist}</p>
      </div>
    </div>
  );
};
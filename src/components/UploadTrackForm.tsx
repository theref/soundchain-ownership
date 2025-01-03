import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { conditions, initialize } from '@nucypher/taco';
import { ethers } from "ethers";
import { encryptAudioFile } from "@/utils/encryption";
import { saveTrackMetadata, uploadTrackToLighthouse } from "@/utils/upload-track";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { UploadFormFields } from "./upload/UploadFormFields";
import { TacoConditionsForm } from "./TacoConditionsForm";

interface UploadTrackFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export const UploadTrackForm = ({ onSuccess, onClose }: UploadTrackFormProps) => {
  const [title, setTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [condition, setCondition] = useState<conditions.condition.Condition | null>(null);
  const { toast: useToastHook } = useToast();
  const { isAuthenticated, privyUser } = useAuth();
  const { wallet } = useWallet();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Upload form submitted');
    console.log('Auth state:', { isAuthenticated, privyUser });
    console.log('Current wallet state:', wallet);

    if (!isAuthenticated || !wallet?.accounts?.[0]?.address) {
      console.log('Auth check failed:', { isAuthenticated, wallet });
      useToastHook({
        title: "Authentication Required",
        description: "Please ensure you are signed in and your wallet is connected",
        variant: "destructive",
      });
      return;
    }

    if (!title || !audioFile) {
      useToastHook({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!condition) {
      useToastHook({
        title: "Missing Conditions",
        description: "Please set access conditions",
        variant: "destructive",
      });
      return;
    }

    try {
      onClose?.();

      const toastId = toast.loading(`Uploading ${title}...`, {
        description: "Initializing...",
      });

      console.log('🚀 Starting upload process...');

      await initialize();
      console.log('✅ TACo initialized successfully');
      toast.loading(`Uploading ${title}...`, {
        description: "TACo initialized",
        id: toastId,
      });

      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      console.log('✅ Web3 provider ready');

      let coverArtBuffer: ArrayBuffer | null = null;

      const audioBuffer = await audioFile!.arrayBuffer();
      console.log('✅ Audio file read, size:', audioBuffer.byteLength / 1024, 'KB');
      toast.loading(`Uploading ${title}...`, {
        description: "Encrypting audio...",
        id: toastId,
      });

      const encryptedAudioData = await encryptAudioFile(audioBuffer, condition, web3Provider);
      console.log('✅ Audio encrypted, size:', encryptedAudioData.byteLength / 1024, 'KB');

      if (coverArt) {
        coverArtBuffer = await coverArt.arrayBuffer();
        console.log('✅ Cover art read, size:', coverArtBuffer.byteLength / 1024, 'KB');
      }

      toast.loading(`Uploading ${title}...`, {
        description: "Uploading to IPFS...",
        id: toastId,
      });

      const { audioCid, coverArtCid } = await uploadTrackToLighthouse(
        encryptedAudioData,
        coverArtBuffer
      );
      console.log('✅ Upload successful:', { audioCid, coverArtCid });

      toast.loading(`Uploading ${title}...`, {
        description: "Saving metadata...",
        id: toastId,
      });

      await saveTrackMetadata(
        title,
        privyUser!.id,
        audioCid,
        coverArtCid
      );
      console.log('✅ Track metadata saved successfully');

      // Invalidate and refetch tracks query
      await queryClient.invalidateQueries({ queryKey: ['tracks'] });

      toast.success(`${title} uploaded successfully`, {
        id: toastId,
      });

      setTitle("");
      setAudioFile(null);
      setCoverArt(null);
      setCondition(null);
      onSuccess?.();
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      toast.error(`Failed to upload ${title}`, {
        description: error.message || "An unexpected error occurred",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <UploadFormFields
        title={title}
        setTitle={setTitle}
        setAudioFile={setAudioFile}
        setCoverArt={setCoverArt}
      />

      <TacoConditionsForm
        onChange={setCondition}
      />

      <Button type="submit" className="w-full">
        Upload Track
      </Button>
    </form>
  );
};
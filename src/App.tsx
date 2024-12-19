import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, createContext, useContext } from "react";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import { AudioPlayer } from "./components/AudioPlayer";
import { AuthProvider } from "./contexts/AuthContext";
import { WalletProvider } from "./contexts/WalletContext";
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

interface CurrentTrack {
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
}

interface AudioPlayerContextType {
  currentTrack: CurrentTrack | null;
  isPlaying: boolean;
  playTrack: (track: CurrentTrack) => void;
  togglePlayPause: () => void;
  stopPlayback: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider");
  }
  return context;
};

const App = () => {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioPlayerValue = {
    currentTrack,
    isPlaying,
    playTrack: (track: CurrentTrack) => {
      setCurrentTrack(track);
      setIsPlaying(true);
    },
    togglePlayPause: () => setIsPlaying(!isPlaying),
    stopPlayback: () => {
      setCurrentTrack(null);
      setIsPlaying(false);
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider supabaseClient={supabase}>
        <AuthProvider>
          <WalletProvider>
            <AudioPlayerContext.Provider value={audioPlayerValue}>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <div className="pb-24">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/profile" element={<Profile />} />
                    </Routes>
                  </div>
                  {currentTrack && (
                    <AudioPlayer
                      title={currentTrack.title}
                      artist={currentTrack.artist}
                      coverUrl={currentTrack.coverUrl}
                      audioUrl={currentTrack.audioUrl}
                      isPlaying={isPlaying}
                      onPlayPause={audioPlayerValue.togglePlayPause}
                      onClose={audioPlayerValue.stopPlayback}
                    />
                  )}
                </BrowserRouter>
              </TooltipProvider>
            </AudioPlayerContext.Provider>
          </WalletProvider>
        </AuthProvider>
      </SessionContextProvider>
    </QueryClientProvider>
  );
};

export default App;
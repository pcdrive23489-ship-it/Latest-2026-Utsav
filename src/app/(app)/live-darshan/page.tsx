
"use client";

import { useEffect, useState } from "react";
import { onLiveStreamStatusChange, setLiveStreamStatus } from "@/services/database";
import { useAuth } from "@/contexts/auth-context";
import type { IAgoraRTC, IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/validation";
import PageHeader from "@/components/page-header";


const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || "YOUR_AGORA_APP_ID";
const CHANNEL_NAME = "live_darshan_channel";
const TOKEN = null; // Use null for testing or a token server for production

// ==========================
// Admin / SuperAdmin Streamer
// ==========================
const AdminLiveStreamer = ({ AgoraRTC }: { AgoraRTC: IAgoraRTC }) => {
  const { toast } = useToast();
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const rtcClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    setClient(rtcClient);

    return () => {
      localVideoTrack?.close();
      localAudioTrack?.close();
      client?.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startStreaming = async () => {
    if (!client) return;
    if (APP_ID === "YOUR_AGORA_APP_ID") {
        toast({
          variant: "destructive",
          title: "Streaming is not configured",
          description: "Set NEXT_PUBLIC_AGORA_APP_ID in .env.local before broadcasting.",
        });
        return;
    }
    setIsPublishing(true);
    try {
      client.setClientRole("host");
      await client.join(APP_ID, CHANNEL_NAME, TOKEN, null);

      const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const camTrack = await AgoraRTC.createCameraVideoTrack();

      setLocalAudioTrack(micTrack);
      setLocalVideoTrack(camTrack);

      await client.publish([micTrack, camTrack]);

      const videoContainer = document.getElementById("local-player");
      if (videoContainer) {
        camTrack.play(videoContainer);
      }

      setIsStreaming(true);
      await setLiveStreamStatus(true);
    } catch (err) {
      console.error("Failed to start live stream", err);
      toast({
        variant: "destructive",
        title: "Failed to start stream",
        description: getErrorMessage(err, "Check your Agora App ID, camera permissions, and network."),
      });
    } finally {
        setIsPublishing(false);
    }
  };

  const stopStreaming = async () => {
    try {
      localVideoTrack?.close();
      localAudioTrack?.close();
      setLocalVideoTrack(null);
      setLocalAudioTrack(null);
      await client?.leave();
      setIsStreaming(false);
      await setLiveStreamStatus(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to stop stream",
        description: getErrorMessage(err, "Please refresh and try again."),
      });
    }
  };

  return (
    <Card className="w-full">
        <CardHeader>
            <CardTitle>Broadcast Controls</CardTitle>
            <CardDescription>Start or stop the live stream for all users.</CardDescription>
        </CardHeader>
        <CardContent>
            <div id="local-player" className="w-full aspect-video bg-black mb-4 rounded-md border" />
            <div className="flex justify-between items-center">
                {!isStreaming ? (
                    <Button onClick={startStreaming} disabled={isPublishing} size="lg">
                    {isPublishing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Video className="mr-2 h-4 w-4" />
                    )}
                    Start Live Stream
                    </Button>
                ) : (
                    <Button onClick={stopStreaming} variant="destructive" size="lg">
                    <VideoOff className="mr-2 h-4 w-4" />
                    Stop Live Stream
                    </Button>
                )}
            </div>
        </CardContent>
    </Card>
  );
};

// ==========================
// Member Viewer
// ==========================
const LiveViewer = ({ AgoraRTC }: { AgoraRTC: IAgoraRTC }) => {
  const { toast } = useToast();
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);

  useEffect(() => {
    const rtcClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    setClient(rtcClient);

    const unsubscribe = onLiveStreamStatusChange((status) => {
        setIsLive(status?.isLive || false);
        setIsLoading(false);
        if (!status?.isLive) {
            rtcClient.leave();
            setIsJoined(false);
        }
    });

    return () => {
      unsubscribe();
      rtcClient.leave();
    };
  }, [AgoraRTC]);

  useEffect(() => {
    if (isLive && !isJoined && client) {
      client.setClientRole("audience");
      client.join(APP_ID, CHANNEL_NAME, TOKEN, null).then(() => {
        setIsJoined(true);
      }).catch((err) => {
        toast({
          variant: "destructive",
          title: "Could not join stream",
          description: getErrorMessage(err, "Please check your connection and try again."),
        });
      });

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video") {
          const remoteContainer = document.getElementById("remote-player");
          if (remoteContainer) {
            remoteContainer.innerHTML = '';
            user.videoTrack?.play(remoteContainer);
          }
        }
        if (mediaType === "audio") {
          user.audioTrack?.play();
        }
      });

      client.on("user-unpublished", () => {
         const remoteContainer = document.getElementById("remote-player");
         if (remoteContainer) remoteContainer.innerHTML = '';
      });
    }
  }, [isLive, isJoined, client, AgoraRTC]);

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center p-8 h-full aspect-video bg-muted/30 rounded-lg">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Connecting to the stream...</p>
        </div>
    )
  }

  return (
    <Card>
        <CardHeader>
             <CardTitle>Live Darshan</CardTitle>
            <CardDescription>Watch the live broadcast from the festival.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLive ? (
                <div id="remote-player" className="w-full aspect-video bg-black rounded-md border" />
            ) : (
                <div className="flex flex-col items-center justify-center p-8 h-full aspect-video bg-muted/30 rounded-lg">
                    <VideoOff className="h-12 w-12 text-muted-foreground"/>
                    <p className="mt-4 text-muted-foreground text-center">The live stream is currently offline. Please check back later.</p>
                </div>
            )}
        </CardContent>
    </Card>
  );
};

// ==========================
// Main Live Darshan Page
// ==========================
export default function LiveDarshanPage() {
  const { user, status } = useAuth();
  const [AgoraRTC, setAgoraRTC] = useState<IAgoraRTC | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    import('agora-rtc-sdk-ng').then(module => {
        setAgoraRTC(module.default);
    });
  }, []);

  if (!isClient || !AgoraRTC || status === 'loading') {
    return (
        <div className="flex items-center justify-center p-8 h-full">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  const isAdmin = user?.role === "admin" || user?.role === "super-admin";

  return (
    <div className="mx-auto w-full max-w-4xl animate-fade-in">
      <PageHeader title="Live Darshan" subtitle="Experience the divine presence, live from the event." />

       {isAdmin ? (
        <AdminLiveStreamer AgoraRTC={AgoraRTC} />
      ) : (
        <LiveViewer AgoraRTC={AgoraRTC} />
      )}
    </div>
  );
}

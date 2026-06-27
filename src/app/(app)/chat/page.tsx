
"use client";

import { useState, useEffect, useRef, Fragment } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, Trash2, Loader2, Smile, MessageSquareReply, Pencil, X, Paperclip, Mic, File as FileIcon, Play, Pause, Trash } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { getChatMessages, sendTextMessage, editMessage, deleteMessage, toggleReaction, sendMediaMessage } from '@/services/database';
import type { ChatMessage } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { cn, compressImage } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😯', '😢', '🙏'];

export default function ChatPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);

    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    const [editedText, setEditedText] = useState('');
    
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const unsubscribe = getChatMessages((newMessages) => {
            setMessages(newMessages);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const getInitials = (name?: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
    }
    
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 150 * 1024 * 1024) { // 150MB limit
                toast({ variant: 'destructive', title: 'File Too Large', description: 'Please select a file smaller than 150MB.' });
                return;
            }

            let fileToProcess = file;
            // Compress image files before uploading
            if (file.type.startsWith('image/')) {
                try {
                    fileToProcess = await compressImage(file);
                } catch (error) {
                    console.error("Failed to compress image:", error);
                    toast({ variant: 'destructive', title: 'Image Compression Failed', description: 'Could not process the image. Please try another file.' });
                    return;
                }
            }

            setMediaFile(fileToProcess);
            
            if (fileToProcess.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setMediaPreview(reader.result as string);
                };
                reader.readAsDataURL(fileToProcess);
            } else {
                 setMediaPreview(null);
            }
        }
    }
    
    const cancelMediaUpload = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const uploadAndSend = async (fileToSend: File | Blob, isVoiceMessage = false) => {
            setIsUploading(true);
            try {
                let finalFile: File;
                if (isVoiceMessage) {
                    finalFile = new File([fileToSend], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
                } else {
                    finalFile = fileToSend as File;
                }

                await sendMediaMessage(user.uid, `${user.firstName} ${user.lastName}`, user.photoURL, finalFile);
                
                if (isVoiceMessage) {
                    setAudioBlob(null);
                } else {
                    cancelMediaUpload();
                }

            } catch (err: any) {
                console.error(err);
                toast({ 
                    variant: 'destructive', 
                    title: 'Upload Failed', 
                    description: err.message || 'Could not send the file.'
                });
            } finally {
                setIsUploading(false);
            }
        };

        if (mediaFile) {
            await uploadAndSend(mediaFile);
        } else if (audioBlob) {
            await uploadAndSend(audioBlob, true);
        } else if (newMessage.trim()) {
            let messageToSend: Partial<ChatMessage> = {
                text: newMessage,
                senderId: user.uid,
                userName: `${user.firstName} ${user.lastName}`,
                userAvatar: user.photoURL || '',
            };

            if (replyingTo) {
                messageToSend.replyTo = replyingTo.id;
                messageToSend.replyToContent = {
                    text: replyingTo.text || `Media: ${replyingTo.fileName}`,
                    userName: replyingTo.userName || 'User',
                };
            }
            
            try {
                await sendTextMessage(messageToSend);
                setNewMessage('');
                setReplyingTo(null);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error sending message' });
                console.error(error);
            }
        }
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            const chunks: BlobPart[] = [];
            mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Recording Error', description: 'Could not access microphone.'});
        }
    };
    
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            // Stop the tracks to turn off the microphone indicator
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    const handleMicClick = () => {
        if(isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }
    
    const handleStartReply = (message: ChatMessage) => {
        setReplyingTo(message);
        inputRef.current?.focus();
    }
    
    const handleStartEdit = (message: ChatMessage) => {
        setEditingMessage(message);
        setEditedText(message.text);
    }
    
    const handleCancelEdit = () => {
        setEditingMessage(null);
        setEditedText('');
    }

    const handleSaveEdit = async () => {
        if (!editingMessage || !editedText.trim()) return;
        
        try {
            await editMessage(editingMessage.id, editedText);
            handleCancelEdit();
            toast({ title: "Message Edited" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Failed to edit message' });
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;
        try {
            await deleteMessage(id);
            toast({ title: "Message Deleted" });
        } catch(error) {
            toast({ variant: 'destructive', title: 'Failed to delete message' });
        }
    };
    
    const handleReaction = async (messageId: string, emoji: string) => {
        if (!user) return;
        try {
            await toggleReaction(messageId, emoji, user.uid);
        } catch (error) {
            console.error("Failed to toggle reaction:", error);
            toast({ variant: 'destructive', title: "Couldn't save reaction" });
        }
    }
    
    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewMessage(prevInput => prevInput + emojiData.emoji);
    };

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center p-8 h-full">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full max-h-[calc(100vh-10rem)]">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold font-headline text-primary">Community Chat</h1>
                <p className="text-lg text-muted-foreground mt-2">Share memories and celebrate together in real-time.</p>
            </div>

            <Card className="w-full flex-1 flex flex-col shadow-2xl">
                <CardHeader>
                    <CardTitle>#utsav-connect</CardTitle>
                    <CardDescription>A space for all devotees to connect.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div className="flex-1 space-y-4 overflow-y-auto p-4 border rounded-lg bg-background/50">
                        {messages.length === 0 && !loading && (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Be the first to say something!
                            </div>
                        )}
                        {messages.map(msg => (
                             <div key={msg.id} className="group flex items-start gap-3" style={{ flexDirection: msg.senderId === user.uid ? 'row-reverse' : 'row' }}>
                                <Avatar className="border-2 border-primary/20">
                                    <AvatarImage src={msg.userAvatar} alt={msg.userName} />
                                    <AvatarFallback>{getInitials(msg.userName)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 max-w-xl">
                                    <div className={`relative p-3 rounded-lg shadow-md ${msg.senderId === user.uid ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card rounded-tl-none'}`}>
                                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-background/20"><Smile className="h-4 w-4" /></Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="p-1 w-auto flex gap-1 bg-card/80 backdrop-blur-sm rounded-full">
                                                    {EMOJI_REACTIONS.map(emoji => (
                                                        <Button key={emoji} variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleReaction(msg.id, emoji)}>{emoji}</Button>
                                                    ))}
                                                </PopoverContent>
                                            </Popover>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-background/20" onClick={() => handleStartReply(msg)}><MessageSquareReply className="h-4 w-4" /></Button>
                                            {(msg.senderId === user.uid || isAdmin) && (
                                                <Fragment>
                                                    {msg.senderId === user.uid && msg.type === 'text' && <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-background/20" onClick={() => handleStartEdit(msg)}><Pencil className="h-4 w-4" /></Button>}
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/80" onClick={() => handleDelete(msg.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </Fragment>
                                            )}
                                        </div>
                                        
                                        <p className="font-semibold text-sm">{msg.userName}</p>
                                        
                                        {msg.replyTo && msg.replyToContent && (
                                            <div className="p-2 text-sm bg-black/10 rounded-md my-1 border-l-2 border-primary/50">
                                                <p className="font-bold text-xs">{msg.replyToContent.userName}</p>
                                                <p className="text-xs opacity-80 truncate">{msg.replyToContent.text}</p>
                                            </div>
                                        )}

                                        {editingMessage?.id === msg.id ? (
                                            <div className="flex items-center gap-2 mt-2">
                                                <Input value={editedText} onChange={(e) => setEditedText(e.target.value)} className="h-8 bg-background/80" />
                                                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                                                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                                            </div>
                                        ) : (
                                            <>
                                             {msg.type === 'text' && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                                             {msg.type === 'image' && msg.mediaUrl && <Image src={msg.mediaUrl} alt="uploaded content" width={300} height={200} className="rounded-md mt-2 max-w-full h-auto" />}
                                             {msg.type === 'video' && msg.mediaUrl && <video src={msg.mediaUrl} controls className="rounded-md mt-2 max-w-full" />}
                                             {msg.type === 'audio' && msg.mediaUrl && <audio src={msg.mediaUrl} controls className="rounded-md mt-2 w-full" />}
                                             {msg.type === 'file' && msg.mediaUrl && (
                                                <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-background/50 rounded-md mt-2 hover:bg-background/80">
                                                    <FileIcon className="h-6 w-6" />
                                                    <span>{msg.fileName || 'Download File'}</span>
                                                </a>
                                             )}
                                            </>
                                        )}
                                        
                                        {msg.isEdited && <p className="text-xs opacity-70 mt-1">(edited)</p>}

                                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                            <div className="flex gap-1 mt-1">
                                                {Object.entries(msg.reactions).map(([emoji, uids]) => (
                                                    <div key={emoji} onClick={() => handleReaction(msg.id, emoji)}
                                                        className={cn("text-xs px-1.5 py-0.5 rounded-full cursor-pointer flex items-center gap-1",
                                                        uids.includes(user.uid) ? 'bg-primary/30 border border-primary' : 'bg-background/20'
                                                        )}>
                                                        {emoji} {uids.length}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <p className={`text-xs text-muted-foreground mt-1 ${msg.senderId === user.uid ? 'text-right' : 'text-left'}`}>
                                        {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : 'sending...'}
                                    </p>
                                </div>
                            </div>
                        ))}
                         <div ref={messagesEndRef} />
                    </div>
                    
                    {replyingTo && (
                        <div className="p-2 border-l-4 border-primary bg-accent/50 rounded-md flex justify-between items-center">
                            <div>
                               <p className="text-sm font-bold">Replying to {replyingTo.userName}</p>
                               <p className="text-xs text-muted-foreground truncate">{replyingTo.text}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)}><X className="h-4 w-4" /></Button>
                        </div>
                    )}
                    
                    {isUploading && <Progress value={undefined} className="w-full h-2" />}

                    {mediaPreview && (
                        <div className="p-2 border rounded-md relative">
                            <Image src={mediaPreview} alt="media preview" width={100} height={100} className="rounded-md" />
                            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={cancelMediaUpload}><X className="h-4 w-4"/></Button>
                        </div>
                    )}

                    {audioBlob && (
                         <div className="p-2 border rounded-md flex items-center gap-2">
                             <audio src={URL.createObjectURL(audioBlob)} controls />
                             <Button variant="destructive" size="icon" onClick={() => setAudioBlob(null)}><Trash className="h-4 w-4"/></Button>
                         </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="outline" size="icon" disabled={isRecording}>
                                    <Smile className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-none">
                                <EmojiPicker onEmojiClick={onEmojiClick} />
                            </PopoverContent>
                        </Popover>
                        
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isRecording}>
                            <Paperclip className="h-5 w-5" />
                        </Button>
                        
                        <Input 
                            ref={inputRef}
                            placeholder={isRecording ? "Recording..." : "Type your message..."}
                            className="flex-1"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={isRecording || !!mediaFile || !!audioBlob}
                         />

                        <Button type="button" variant={isRecording ? 'destructive' : 'outline'} size="icon" onClick={handleMicClick}>
                           <Mic className="h-5 w-5" />
                        </Button>

                        <Button type="submit" disabled={(!newMessage.trim() && !mediaFile && !audioBlob) || isRecording || isUploading}>
                            {isUploading ? <Loader2 className="animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

    
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { motion } from 'framer-motion';

const VoiceRecorder = ({ onRecordingComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check your browser permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Cancel recording
  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    onCancel();
  };

  // Send recording
  const handleSend = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="p-4 border-t flex flex-col space-y-3" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
      {!audioUrl ? (
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center">
            {isRecording ? (
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-3 h-3 bg-red-500 rounded-full"
                />
                <span style={{ color: 'var(--text-primary)' }}>Recording... {formatTime(recordingTime)}</span>
              </div>
            ) : (
              <span style={{ color: 'var(--text-primary)' }}>Tap to start recording</span>
            )}
          </div>
          
          <div className="flex space-x-2">
            {isRecording ? (
              <Button onClick={stopRecording} variant="outline">
                Stop
              </Button>
            ) : (
              <Button onClick={startRecording} variant="outline">
                Record
              </Button>
            )}
            <Button onClick={handleCancel} variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-3">
          <audio src={audioUrl} controls className="w-full" />
          <div className="flex justify-end space-x-2">
            <Button onClick={handleCancel} variant="ghost">
              Cancel
            </Button>
            <Button onClick={handleSend}>
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;

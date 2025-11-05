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
    <div className="p-4 border-t flex flex-col space-y-3 bg-white">
      {!audioUrl ? (
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-medium mb-1">Record a voice message</h3>
          <p className="text-sm text-gray-500 mb-6">Tap the button below to start recording</p>

          {isRecording ? (
            <div className="w-full">
              {/* Recording UI */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="22" />
                        </svg>
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Recording time */}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-100 px-3 py-1 rounded-full">
                    <div className="flex items-center space-x-1">
                      <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-2 h-2 rounded-full bg-red-500"
                      />
                      <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Waveform */}
              <div className="mt-10 mb-4 bg-gray-50 rounded-xl p-3">
                <div className="flex items-center h-12">
                  <div className="flex-1 flex items-end space-x-0.5 h-full">
                    {Array.from({ length: 50 }).map((_, i) => {
                      // Create a more random pattern with some structure
                      let height;

                      if (i % 3 === 0) {
                        // Every third bar is taller
                        height = 40 + Math.random() * 40;
                      } else if (i % 5 === 0) {
                        // Every fifth bar is shorter
                        height = 15 + Math.random() * 15;
                      } else {
                        // Other bars have medium height
                        height = 20 + Math.random() * 30;
                      }

                      return (
                        <motion.div
                          key={i}
                          animate={{
                            height: [
                              `${Math.max(10, height - 10 + (Math.random() * 10))}%`,
                              `${Math.max(10, height + (Math.random() * 20))}%`
                            ]
                          }}
                          transition={{
                            duration: 0.4,
                            repeat: Infinity,
                            repeatType: "reverse",
                            delay: i * 0.01
                          }}
                          className="waveform-bar"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.5)',
                            borderRadius: '1px'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={handleCancel}
                  className="rounded-full px-6"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={stopRecording}
                  className="rounded-full px-6 bg-blue-500 hover:bg-blue-600"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Record button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center shadow-lg mb-8 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </motion.button>

              <Button
                onClick={handleCancel}
                className="rounded-full px-6"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-medium mb-1">Voice message</h3>
          <p className="text-sm text-gray-500 mb-4">{formatTime(recordingTime)} • Ready to send</p>

          {/* Preview waveform */}
          <div className="w-full bg-blue-50 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const audio = new Audio(audioUrl);
                  audio.play();
                }}
                className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-sm focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="7 4 19 12 7 20 7 4"></polygon>
                </svg>
              </motion.button>

              <div className="flex-1 flex items-end space-x-0.5 h-12">
                {Array.from({ length: 50 }).map((_, i) => {
                  // Create a more random pattern with some structure
                  let height;

                  if (i % 3 === 0) {
                    // Every third bar is taller
                    height = 40 + Math.random() * 40;
                  } else if (i % 5 === 0) {
                    // Every fifth bar is shorter
                    height = 15 + Math.random() * 15;
                  } else {
                    // Other bars have medium height
                    height = 20 + Math.random() * 30;
                  }

                  return (
                    <div
                      key={i}
                      className="waveform-bar"
                      style={{
                        height: `${height}%`,
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderRadius: '1px'
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <Button
              onClick={handleCancel}
              className="rounded-full px-6"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              className="rounded-full px-6 bg-blue-500 hover:bg-blue-600"
            >
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;

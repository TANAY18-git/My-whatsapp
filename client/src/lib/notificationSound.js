// Simple notification sound solution
// Instead of using base64 or external files, we'll use the Web Audio API
// to generate a simple beep sound programmatically

// Create a simple beep sound using Web Audio API
export const createNotificationSound = () => {
  try {
    // Create a dummy audio element that won't actually be used for playback
    // This is just to maintain compatibility with the existing code
    const dummyAudio = new Audio();

    // Add a play method that uses Web Audio API instead
    dummyAudio.play = () => {
      try {
        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
          console.warn('AudioContext not supported in this browser');
          return Promise.resolve(); // Return resolved promise to maintain API compatibility
        }

        const audioContext = new AudioContext();

        // Create oscillator for a simple beep
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Configure the beep sound
        oscillator.type = 'sine'; // Sine wave - smooth sound
        oscillator.frequency.value = 880; // A5 note - pleasant frequency
        gainNode.gain.value = 0.1; // Low volume

        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Start and stop the beep
        oscillator.start();

        // Fade out for a smoother sound
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

        // Stop after 0.5 seconds
        setTimeout(() => {
          oscillator.stop();
          // Close the audio context to free resources
          if (audioContext.state !== 'closed') {
            audioContext.close();
          }
        }, 500);

        return Promise.resolve(); // Return resolved promise to maintain API compatibility
      } catch (error) {
        console.error('Error creating notification sound:', error);
        return Promise.resolve(); // Return resolved promise even on error
      }
    };

    return dummyAudio;
  } catch (error) {
    console.error('Error setting up notification sound:', error);
    // Return a dummy audio object that does nothing when played
    return {
      play: () => Promise.resolve(),
      volume: 0.5
    };
  }
};


import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, Check } from 'lucide-react';

interface CameraCaptureProps {
  title: string;
  onCapture: (imageData: string, location: string) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ title, onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [location, setLocation] = useState('Fetching location...');
  const [captured, setCaptured] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    fetchLocation();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      alert("Error accessing camera: " + err);
      onClose();
    }
  };

  const fetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        () => setLocation('Location Unavailable')
      );
    }
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add overlay info
        ctx.fillStyle = 'rgba(124, 58, 237, 0.7)'; // Purple transparent
        ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
        
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        const now = new Date();
        ctx.fillText(`Drivebuddy: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 20, canvas.height - 45);
        ctx.fillText(`Loc: ${location}`, 20, canvas.height - 15);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPreview(dataUrl);
        setCaptured(true);
      }
    }
  };

  const confirm = () => {
    if (preview) {
      onCapture(preview, location);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-purple-400">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative bg-black aspect-video flex items-center justify-center">
          {!captured ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <img src={preview!} className="w-full h-full object-cover" alt="Captured Selfie" />
          )}
          
          <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-lg text-white text-[10px] uppercase font-bold tracking-widest text-center border border-white/10">
            {location}
          </div>
        </div>

        <div className="p-8 flex justify-center gap-4">
          {!captured ? (
            <button 
              onClick={capture}
              className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center border-8 border-purple-900/50 hover:scale-110 transition-transform active:scale-95"
            >
              <Camera className="w-8 h-8 text-white" />
            </button>
          ) : (
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setCaptured(false)}
                className="flex-1 py-4 border border-slate-700 rounded-xl font-bold hover:bg-slate-800 transition-all"
              >
                Retake
              </button>
              <button 
                onClick={confirm}
                className="flex-1 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 flex items-center justify-center gap-2 transition-all"
              >
                <Check className="w-5 h-5" /> Submit
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 text-slate-500 text-sm">Verify your ID before starting the trip</p>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;

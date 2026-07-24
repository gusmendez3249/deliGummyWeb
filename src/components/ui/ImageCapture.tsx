import { useState, useRef } from 'react';
import { Upload, Camera, Trash2, Eye, RefreshCw } from 'lucide-react';
import Modal from './Modal';

interface ImageCaptureProps {
  imagePreview: string | null;
  onImageSelected: (file: File | null, previewUrl: string | null) => void;
  aspectRatio?: 'square' | 'any';
  captureMode?: 'user' | 'environment';
}

export default function ImageCapture({
  imagePreview,
  onImageSelected,
  captureMode = 'environment',
}: ImageCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState<number>(-1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelected(file, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startWebcam = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWebcamError(null);
    setWebcamOpen(true);
    
    try {
      // 1. Obtener stream inicial usando facingMode para pedir permisos
      const initialStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: captureMode === 'user' ? 'user' : 'environment' },
        audio: false,
      });

      // Dar un pequeño tiempo al navegador para registrar los permisos y poblar las etiquetas (crucial en Android/Samsung)
      await new Promise(resolve => setTimeout(resolve, 350));

      // 2. Enlistar todos los dispositivos de video disponibles
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
      
      // Filtrar dispositivos duplicados por label
      const uniqueInputs = videoInputs.filter((v, i, a) => 
        v.label ? a.findIndex(t => t.label === v.label) === i : true
      );

      // Comprobar si existen alternativas 1x (no ultra-wide/0.6x/macro) para trasera y frontal
      const hasBack1x = uniqueInputs.some(d => {
        const label = d.label.toLowerCase();
        const isBack = label.includes('back') || label.includes('rear') || label.includes('trasera') || label.includes('facing 0');
        return isBack && !label.includes('wide') && !label.includes('ultra') && !label.includes('0.6') && !label.includes('macro');
      });

      const hasFront1x = uniqueInputs.some(d => {
        const label = d.label.toLowerCase();
        const isFront = label.includes('front') || label.includes('user') || label.includes('delantera') || label.includes('facing 1');
        return isFront && !label.includes('wide') && !label.includes('ultra') && !label.includes('0.6') && !label.includes('macro');
      });

      // Filtrar lentes de 0.6x/ultra-wide/macro si ya disponemos de la versión 1x
      const filteredInputs = uniqueInputs.filter(d => {
        const label = d.label.toLowerCase();
        const isBack = label.includes('back') || label.includes('rear') || label.includes('trasera') || label.includes('facing 0');
        const isFront = label.includes('front') || label.includes('user') || label.includes('delantera') || label.includes('facing 1');

        // Regla específica para Samsung (donde camera 1 front es 0.6x y camera 2 back es 0.6x)
        if (label.includes('camera 1') && isFront) {
          return false; // Descartar frontal 0.6x
        }
        if (label.includes('camera 2') && isBack) {
          return false; // Descartar trasera 0.6x
        }

        if (isBack && hasBack1x) {
          return !label.includes('wide') && !label.includes('ultra') && !label.includes('0.6') && !label.includes('macro');
        }
        if (isFront && hasFront1x) {
          return !label.includes('wide') && !label.includes('ultra') && !label.includes('0.6') && !label.includes('macro');
        }
        return true;
      });

      setVideoDevices(filteredInputs);

      // 3. Buscar la cámara más idónea para iniciar en la lista filtrada
      let selectedIndex = 0;
      if (captureMode === 'environment') {
        // Buscar cámara trasera 1x en la lista filtrada
        const backCameraIndex = filteredInputs.findIndex(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') || 
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('facing 0')
        );
        if (backCameraIndex !== -1) {
          selectedIndex = backCameraIndex;
        } else {
          selectedIndex = filteredInputs.length > 1 ? filteredInputs.length - 1 : 0;
        }
      } else {
        // Buscar cámara frontal 1x en la lista filtrada
        const frontCameraIndex = filteredInputs.findIndex(d => 
          d.label.toLowerCase().includes('front') || 
          d.label.toLowerCase().includes('user') ||
          d.label.toLowerCase().includes('delantera')
        );
        if (frontCameraIndex !== -1) {
          selectedIndex = frontCameraIndex;
        }
      }

      setCurrentDeviceIndex(selectedIndex);

      // Detener stream inicial e iniciar el específico de la cámara seleccionada
      initialStream.getTracks().forEach(track => track.stop());

      const specificStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: filteredInputs[selectedIndex].deviceId } },
        audio: false,
      });

      setStream(specificStream);
      if (videoRef.current) {
        videoRef.current.srcObject = specificStream;
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      // Fallback a cámara nativa si la API de webcam falla
      setWebcamOpen(false);
      cameraInputRef.current?.click();
    }
  };

  const toggleCamera = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoDevices.length <= 1) return;

    const nextIndex = (currentDeviceIndex + 1) % videoDevices.length;
    setCurrentDeviceIndex(nextIndex);

    // Detener stream actual
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: videoDevices[nextIndex].deviceId } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error al alternar cámara:', err);
      setWebcamError('No se pudo acceder a la cámara seleccionada.');
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setWebcamOpen(false);
  };

  const capturePhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const previewUrl = canvas.toDataURL('image/jpeg');
            onImageSelected(file, previewUrl);
          }
        }, 'image/jpeg', 0.85);
      }
      stopWebcam();
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageSelected(null, null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden native capture input (Fallback for mobiles) */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture={captureMode}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Preview Container */}
        <div className="relative w-24 h-24 rounded-lg border border-border bg-surface flex items-center justify-center overflow-hidden flex-shrink-0 group">
          {imagePreview ? (
            <>
              <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
              {/* Permanent floating actions for mobile/desktop touch screens */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setZoomOpen(true); }}
                className="absolute top-1 right-1 p-1 bg-primary text-white rounded-full shadow-md hover:bg-primary-hover transition-colors"
                title="Ver en grande"
              >
                <Eye size={14} />
              </button>
              <button
                type="button"
                onClick={removeImage}
                className="absolute bottom-1 right-1 p-1 bg-danger text-white rounded-full shadow-md hover:bg-red-700 transition-colors"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <span className="text-text-muted text-xs">Sin imagen</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInputRef.current?.click(); }}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium border border-border rounded-md hover:bg-surface text-text-primary"
          >
            <Upload size={15} />
            Subir archivo
          </button>
          
          <button
            type="button"
            onClick={startWebcam}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary-hover"
          >
            <Camera size={15} />
            Tomar foto
          </button>
        </div>
      </div>

      {/* Webcam modal */}
      <Modal
        isOpen={webcamOpen}
        onClose={stopWebcam}
        title="Tomar foto con cámara"
        size="md"
      >
        <div className="space-y-4">
          {webcamError ? (
            <p className="text-danger text-sm">{webcamError}</p>
          ) : (
            <div className="relative h-[60vh] sm:h-80 w-full bg-black rounded-lg overflow-hidden border border-border flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              {videoDevices.length > 0 && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white font-medium">
                  {videoDevices[currentDeviceIndex]?.label || `Cámara ${currentDeviceIndex + 1}`}
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={toggleCamera}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md hover:bg-surface text-text-primary mr-auto"
            >
              <RefreshCw size={14} />
              Voltear cámara
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); stopWebcam(); }}
              className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-success text-white rounded-md hover:bg-green-700"
            >
              <Camera size={16} />
              Capturar
            </button>
          </div>
        </div>
      </Modal>

      {/* Image Zoom Modal */}
      <Modal
        isOpen={zoomOpen}
        onClose={() => setZoomOpen(false)}
        title="Vista previa de la imagen"
        size="lg"
      >
        <div className="flex flex-col items-center justify-center p-2">
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Vista previa grande"
              className="max-h-[60vh] max-w-full rounded-md border border-border object-contain shadow-md"
            />
          )}
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="mt-4 px-5 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover"
          >
            Cerrar vista previa
          </button>
        </div>
      </Modal>
    </div>
  );
}

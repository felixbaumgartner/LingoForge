import { useEffect, useRef, useState } from "react";

/** Audio stays in this mounted component; there is deliberately no upload path. */
export function useLocalRecording() {
  const [url, setUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objectUrl = useRef<string | null>(null);
  const alive = useRef(true);
  const startPending = useRef(false);

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stop();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  async function start() {
    if (startPending.current || recorder.current?.state === "recording") return;
    setError(null);
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Recording is unavailable in this browser. Type your response below.",
      );
      return;
    }
    startPending.current = true;
    setRequesting(true);
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (!alive.current) {
        microphone.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = microphone;
      const next = new MediaRecorder(microphone);
      recorder.current = next;
      const chunks: Blob[] = [];
      next.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      next.onstop = () => {
        microphone.getTracks().forEach((track) => track.stop());
        if (!alive.current) return;
        setRecording(false);
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        if (chunks.length) {
          objectUrl.current = URL.createObjectURL(
            new Blob(chunks, { type: next.mimeType }),
          );
          setUrl(objectUrl.current);
        } else {
          objectUrl.current = null;
          setUrl(null);
          setError("No audio was captured. Try again or type your response.");
        }
      };
      next.onerror = () => {
        stop();
        if (alive.current)
          setError(
            "Recording stopped unexpectedly. You can type your response.",
          );
      };
      next.start();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
      setUrl(null);
      setRecording(true);
      timer.current = setTimeout(stop, 90000);
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      if (alive.current)
        setError(
          "Microphone access was unavailable. Type your response to continue.",
        );
    } finally {
      startPending.current = false;
      if (alive.current) setRequesting(false);
    }
  }
  return { url, recording, requesting, error, start, stop };
}

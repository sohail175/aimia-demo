"""
diarization.py
────────────────────────────────────────────────────────────────
AIMIA — Free, self-hosted transcription + speaker diarization.
Models lazy-load on first audio chunk — server starts instantly.
────────────────────────────────────────────────────────────────
"""

from dotenv import load_dotenv
load_dotenv()

import os
import subprocess
import torch
import soundfile as sf

_whisper_model = None
_diarization_pipeline = None


def _get_whisper():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        print("Loading Whisper model (first chunk — ~30s)...")
        _whisper_model = whisper.load_model("base")
        print("Whisper ready.")
    return _whisper_model


def _get_pipeline():
    global _diarization_pipeline
    if _diarization_pipeline is None:
        from pyannote.audio import Pipeline
        token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
        print("Loading pyannote pipeline (first chunk — ~60s)...")
        _diarization_pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            token=token,
        )
        print("pyannote ready.")
    return _diarization_pipeline


def _convert_to_wav(input_path: str) -> str:
    output_path = input_path + "_converted.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", output_path],
        check=True,
        capture_output=True,
    )
    return output_path


def transcribe_and_label_speakers(audio_file_path: str) -> list[dict]:
    wav_path = _convert_to_wav(audio_file_path)

    try:
        audio_data, sample_rate = sf.read(wav_path, dtype="float32")

        if audio_data.ndim > 1:
            audio_data = audio_data.mean(axis=1)

        waveform = torch.tensor(audio_data).unsqueeze(0)

        # ── Diarization ──────────────────────────────────────────────────────
        pipeline = _get_pipeline()
        diarization_result = pipeline({
            "waveform": waveform,
            "sample_rate": sample_rate,
        })

        # pyannote 4.x returns DiarizeOutput — Annotation is in .speaker_diarization
        diarization_output = diarization_result.speaker_diarization

        speaker_segments = []
        for turn, _, speaker_label in diarization_output.itertracks(yield_label=True):
            speaker_segments.append({
                "start": turn.start,
                "end": turn.end,
                "speaker": f"Speaker {speaker_label}",
            })

        # ── Transcription ─────────────────────────────────────────────────────
        whisper_model = _get_whisper()
        whisper_result = whisper_model.transcribe(wav_path, word_timestamps=True)

        # ── Align speakers to transcript via best-overlap matching ─────────────
        labeled_segments = []
        for segment in whisper_result["segments"]:
            seg_start = segment["start"]
            seg_end = segment["end"]
            seg_text = segment["text"].strip()

            if not seg_text:
                continue

            best_overlap = 0
            matching_speaker = "Unknown Speaker"
            for s in speaker_segments:
                overlap = max(0, min(seg_end, s["end"]) - max(seg_start, s["start"]))
                if overlap > best_overlap:
                    best_overlap = overlap
                    matching_speaker = s["speaker"]

            labeled_segments.append({
                "speaker": matching_speaker,
                "text": seg_text,
            })

        return labeled_segments

    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)


def merge_consecutive_same_speaker(segments: list[dict]) -> list[dict]:
    if not segments:
        return []

    merged = [segments[0].copy()]
    for seg in segments[1:]:
        if seg["speaker"] == merged[-1]["speaker"]:
            merged[-1]["text"] += " " + seg["text"]
        else:
            merged.append(seg.copy())

    return merged
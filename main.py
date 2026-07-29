from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from models import CallRecord, NudgeFeedback, Comment
import json
import os
import tempfile
import subprocess
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AIMIA Backend API")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
HAIKU_MODEL  = "claude-haiku-4-5-20251001"
SONNET_MODEL = "claude-sonnet-4-6"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "data/calls.json"

def read_calls():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def write_calls(calls):
    with open(DATA_FILE, "w") as f:
        json.dump(calls, f, indent=2)

FRAMEWORKS = {
    "Sales discovery": """Apply CI's sales methodology:
- Discovery order: POGO — People (personal goals) → Organisation → Goals & Objectives
- Qualifying: BANT/WANT — Budget, Authority, Need + emotional Want
- Multi-month cycle — do NOT nudge toward closing or pricing on early calls
- Best deepening question: "Tell me more"
- Flag deal risks: nice-to-have vs need-to-have, no ROI stated, long approval chains, DEI sensitivity""",

    "Requirements": """Focus on requirements gathering:
- Clarify ambiguous requirements before moving on
- Confirm scope boundaries — what is IN and what is OUT
- Surface hidden dependencies or assumptions
- Push for measurable success criteria
- Flag conflicting requirements between stakeholders""",

    "Internal": """Focus on internal meeting effectiveness:
- Track action items — who owns what by when
- Flag decisions that were made vs still open
- Nudge toward clear next steps before the call ends
- Highlight if discussion is going off-agenda
- Flag if key stakeholders are missing from the conversation""",

    "General": """Focus on general conversation coaching:
- Encourage active listening and summarising back
- Flag if one party is dominating the conversation
- Nudge toward clarifying vague statements
- Track open questions that have not been answered
- Suggest next steps if conversation is wrapping up""",
}

@app.get("/")
def root():
    return {"message": "AIMIA Backend is running"}

@app.post("/save-call")
def save_call(call: CallRecord):
    calls = read_calls()
    calls.append(call.dict())
    write_calls(calls)
    return {"message": "Call saved successfully", "call_id": call.call_id}

@app.post("/add-comment/{call_id}")
def add_comment(call_id: str, comment: Comment):
    calls = read_calls()
    for call in calls:
        if call["call_id"] == call_id:
            if "comments" not in call:
                call["comments"] = []
            call["comments"].append(comment.dict())
            write_calls(calls)
            return {"message": "Comment added successfully"}
    raise HTTPException(status_code=404, detail="Call not found")

@app.post("/save-feedback")
def save_feedback(call_id: str, feedback: NudgeFeedback):
    calls = read_calls()
    for call in calls:
        if call["call_id"] == call_id:
            call["nudges"].append(feedback.dict())
            write_calls(calls)
            return {"message": "Feedback saved successfully"}
    raise HTTPException(status_code=404, detail="Call not found")

@app.get("/get-calls")
def get_calls():
    return read_calls()

@app.get("/get-call/{call_id}")
def get_call(call_id: str):
    calls = read_calls()
    for call in calls:
        if call["call_id"] == call_id:
            return call
    raise HTTPException(status_code=404, detail="Call not found")

@app.post("/generate-nudges")
async def generate_nudges(payload: dict):
    transcript = payload.get("transcript", [])
    call_type = payload.get("call_type", "Sales discovery")
    pre_call_context = payload.get("pre_call_context", "")

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty")

    transcript_text = "\n".join(
        f"{line['speaker']}: {line['text']}"
        for line in transcript[-6:]
    )
    framework = FRAMEWORKS.get(call_type, FRAMEWORKS["General"])
    context_block = f"\n\nPre-call context about this prospect/meeting:\n{pre_call_context}" if pre_call_context else ""

    prompt = f"""You are AIMIA, an AI Meeting Intelligence Assistant for a {call_type} call at Cultural Infusion.
{context_block}

Coaching framework for this call type:
{framework}

Analyse this transcript and return ONLY a JSON array with exactly 3 nudges.
Each nudge: nudge_id, nudge_type (warn/ask/flag), nudge_message (max 15 words, specific and tactical — never generic like "build rapport"), helpful (null)

TRANSCRIPT:
{transcript_text}

CRITICAL: Your entire response must be ONLY the raw JSON array. No markdown code fences, no explanation before or after. First character must be [ and last must be ]."""

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": HAIKU_MODEL,
        "max_tokens": 500,
        "messages": [{"role": "user", "content": prompt}]
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=body
            )
            response.raise_for_status()
            data = response.json()
            raw = data["content"][0]["text"].strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                raw = raw.replace("json", "", 1).strip()
            start = raw.find("[")
            end = raw.rfind("]") + 1
            if start != -1 and end != -1:
                raw = raw[start:end]
            nudges = json.loads(raw)
            return {"nudges": nudges, "model_used": HAIKU_MODEL}
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"Claude returned invalid JSON. Raw: {raw}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-summary")
async def generate_summary(payload: dict):
    transcript = payload.get("transcript", [])
    call_type = payload.get("call_type", "Sales discovery")
    nudges = payload.get("nudges", [])

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty")

    transcript_text = "\n".join(
        f"{line['speaker']}: {line['text']}"
        for line in transcript
    )
    nudge_text = "\n".join(
        f"- [{n.get('nudge_type','').upper()}] {n.get('nudge_message','')}"
        for n in nudges
    )
    framework = FRAMEWORKS.get(call_type, FRAMEWORKS["General"])

    prompt = f"""You are AIMIA, an AI Meeting Intelligence Assistant for Cultural Infusion's sales team.

Analyse this {call_type} call using the following framework:
{framework}

TRANSCRIPT:
{transcript_text}

AI NUDGES GENERATED DURING CALL:
{nudge_text}

Write a concise professional summary (5-7 sentences) covering:
1. Main topics discussed
2. Framework coverage — how well did the conversation follow the coaching framework? Note any gaps.
3. Key outcomes or decisions made
4. Risks or concerns flagged
5. Next steps or action items
6. Overall call sentiment

Return ONLY the summary text, no headings, no bullet points."""

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": SONNET_MODEL,
        "max_tokens": 300,
        "messages": [{"role": "user", "content": prompt}]
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=body
            )
            response.raise_for_status()
            data = response.json()
            summary = data["content"][0]["text"].strip()
            return {"summary": summary, "model_used": SONNET_MODEL}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Whisper tiny — fast customer audio transcription (no diarization) ─────────

_whisper_tiny_model = None

def _get_whisper_tiny():
    global _whisper_tiny_model
    if _whisper_tiny_model is None:
        import whisper
        print("Loading Whisper tiny model...")
        _whisper_tiny_model = whisper.load_model("tiny")
        print("Whisper tiny ready.")
    return _whisper_tiny_model

@app.post("/transcribe-chunk")
async def transcribe_chunk(audio: UploadFile = File(...)):
    """
    Fast endpoint for customer audio chunks (5s).
    Just Whisper tiny — no diarization. Speaker label assigned by frontend.
    """
    suffix = os.path.splitext(audio.filename or "chunk.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name
    wav_path = tmp_path + "_16k.wav"
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_path, "-ar", "16000", "-ac", "1", wav_path],
            capture_output=True, check=True
        )
        model = _get_whisper_tiny()
        result = model.transcribe(wav_path, fp16=False)
        return {"text": result["text"].strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for p in [tmp_path, wav_path]:
            if os.path.exists(p): os.unlink(p)


# ── Legacy diarization endpoint (kept for reference) ─────────────────────────

@app.post("/transcribe-diarize")
async def transcribe_diarize(audio: UploadFile = File(...)):
    from diarization import transcribe_and_label_speakers, merge_consecutive_same_speaker
    suffix = os.path.splitext(audio.filename or "chunk.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        segments = transcribe_and_label_speakers(tmp_path)
        merged = merge_consecutive_same_speaker(segments)
        return {"segments": merged}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
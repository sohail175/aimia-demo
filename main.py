from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import CallRecord, NudgeFeedback
import json
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AIMIA Backend API")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# ── Model Strategy ──
HAIKU_MODEL  = "claude-haiku-4-5-20251001"  # Fast + cheap → live nudges
SONNET_MODEL = "claude-sonnet-4-6"          # High quality → call summary

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

@app.get("/")
def root():
    return {"message": "AIMIA Backend is running"}

@app.post("/save-call")
def save_call(call: CallRecord):
    calls = read_calls()
    calls.append(call.dict())
    write_calls(calls)
    return {"message": "Call saved successfully", "call_id": call.call_id}

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

# ── HAIKU — Fast live nudges every 30 seconds ──
@app.post("/generate-nudges")
async def generate_nudges(payload: dict):
    transcript = payload.get("transcript", [])
    call_type = payload.get("call_type", "sales discovery")

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty")

    transcript_text = "\n".join(
        f"{line['speaker']}: {line['text']}"
        for line in transcript[-6:]
    )

    prompt = f"""You are AIMIA, an AI Meeting Intelligence Assistant for a {call_type} call.
Analyse this transcript and return ONLY a JSON array with exactly 3 nudges.
Each nudge: nudge_id, nudge_type (warn/ask/flag), nudge_message (max 15 words), helpful (null)
TRANSCRIPT:
{transcript_text}
Return ONLY raw JSON array, no markdown, no explanation."""

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
            nudges = json.loads(raw)
            return {"nudges": nudges, "model_used": HAIKU_MODEL}

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Claude returned invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── SONNET — High quality summary on End Call ──
@app.post("/generate-summary")
async def generate_summary(payload: dict):
    transcript = payload.get("transcript", [])
    call_type = payload.get("call_type", "sales discovery")
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

    prompt = f"""You are AIMIA, an AI Meeting Intelligence Assistant.

Analyse this {call_type} call and generate a professional summary.

TRANSCRIPT:
{transcript_text}

AI NUDGES GENERATED DURING CALL:
{nudge_text}

Write a concise professional summary (3-5 sentences) covering:
1. Main topics discussed
2. Key client pain points identified
3. Next steps or action items
4. Overall call sentiment

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
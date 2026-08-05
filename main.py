from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from models import CallRecord, NudgeFeedback, Comment
import json
import os
import asyncio
import httpx
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AIMIA Backend API")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GROQ_API_KEY      = os.getenv("GROQ_API_KEY")
DEEPGRAM_API_KEY  = os.getenv("DEEPGRAM_API_KEY")
RECALL_API_KEY    = os.getenv("RECALL_API_KEY")
RECALL_BASE_URL   = "https://api.ap-northeast-1.recall.ai"
HAIKU_MODEL       = "claude-haiku-4-5-20251001"
SONNET_MODEL      = "claude-sonnet-4-6"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "https://aimia-demo.vercel.app",
    ],
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

# ── WebSocket connections: session_id → WebSocket ────────────────────────────
transcript_connections: dict = {}
polling_tasks: dict = {}

@app.websocket("/ws/{session_id}")
async def transcript_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    transcript_connections[session_id] = websocket
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        transcript_connections.pop(session_id, None)
        task = polling_tasks.pop(session_id, None)
        if task:
            task.cancel()

# ── Recall.ai bot endpoints ───────────────────────────────────────────────────
@app.post("/create-bot")
async def create_bot(payload: dict):
    meeting_url = payload.get("meeting_url")
    session_id  = payload.get("session_id")
    bot_name    = payload.get("bot_name", "AIMIA Assistant")

    if not meeting_url or not session_id:
        raise HTTPException(status_code=400, detail="meeting_url and session_id required")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{RECALL_BASE_URL}/api/v1/bot/",
                headers={
                    "Authorization": f"Token {RECALL_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "meeting_url": meeting_url,
                    "bot_name": bot_name,
                    "transcription_options": {
                        "provider": "deepgram",
                        "deepgram": {
                            "api_key": DEEPGRAM_API_KEY,
                            "model":   "nova-2",
                            "smart_format": True,
                            "diarize": True,
                        }
                    }
                }
            )
            response.raise_for_status()
            bot_id = response.json()["id"]
            task = asyncio.create_task(poll_transcript(session_id, bot_id))
            polling_tasks[session_id] = task
            return {"bot_id": bot_id, "status": "joining"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def poll_transcript(session_id: str, bot_id: str):
    seen_count = 0
    for _ in range(1200):
        await asyncio.sleep(3)
        ws = transcript_connections.get(session_id)
        if not ws:
            break
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{RECALL_BASE_URL}/api/v1/bot/{bot_id}/transcript/",
                    headers={"Authorization": f"Token {RECALL_API_KEY}"}
                )
                if resp.status_code == 200:
                    entries     = resp.json()
                    new_entries = entries[seen_count:]
                    for entry in new_entries:
                        speaker = entry.get("speaker", "Unknown")
                        words   = entry.get("words", [])
                        text    = " ".join(
                            w.get("text", "") for w in (words if isinstance(words, list) else [])
                        ).strip()
                        if text:
                            await ws.send_json({"speaker": speaker, "text": text})
                    seen_count = len(entries)
        except Exception as e:
            print(f"Poll error [{session_id}]: {e}")


@app.post("/stop-bot")
async def stop_bot(payload: dict):
    bot_id     = payload.get("bot_id")
    session_id = payload.get("session_id")
    task = polling_tasks.pop(session_id, None)
    if task:
        task.cancel()
    transcript_connections.pop(session_id, None)
    if bot_id:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    f"{RECALL_BASE_URL}/api/v1/bot/{bot_id}/leave_call/",
                    headers={"Authorization": f"Token {RECALL_API_KEY}"}
                )
        except Exception:
            pass
    return {"status": "stopped"}


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
    transcript       = payload.get("transcript", [])
    call_type        = payload.get("call_type", "Sales discovery")
    pre_call_context = payload.get("pre_call_context", "")

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty")

    transcript_text = "\n".join(
        f"{line['speaker']}: {line['text']}"
        for line in transcript[-6:]
    )
    framework     = FRAMEWORKS.get(call_type, FRAMEWORKS["General"])
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
            raw  = data["content"][0]["text"].strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                raw = raw.replace("json", "", 1).strip()
            start = raw.find("[")
            end   = raw.rfind("]") + 1
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
    call_type  = payload.get("call_type", "Sales discovery")
    nudges     = payload.get("nudges", [])

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
            data    = response.json()
            summary = data["content"][0]["text"].strip()
            return {"summary": summary, "model_used": SONNET_MODEL}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/transcribe-chunk")
async def transcribe_chunk(audio: UploadFile = File(...)):
    content  = await audio.read()
    filename = audio.filename or "chunk.webm"
    try:
        client = Groq(api_key=GROQ_API_KEY)
        transcription = client.audio.transcriptions.create(
            model="whisper-large-v3-turbo",
            file=(filename, content, "audio/webm"),
            response_format="text",
            language="en",
        )
        text = transcription if isinstance(transcription, str) else transcription.text
        return {"text": text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
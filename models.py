from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TranscriptLine(BaseModel):
    speaker: str
    text: str

class NudgeFeedback(BaseModel):
    nudge_id: str
    nudge_type: str
    nudge_message: str
    helpful: bool

class CallRecord(BaseModel):
    call_id: str
    call_type: str
    timestamp: str
    transcript: List[TranscriptLine]
    nudges: List[NudgeFeedback] = []
    summary: Optional[str] = None
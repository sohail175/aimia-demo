from pydantic import BaseModel
from typing import List, Optional

class TranscriptLine(BaseModel):
    speaker: str
    text: str

class NudgeFeedback(BaseModel):
    nudge_id: str
    nudge_type: str
    nudge_message: str
    helpful: bool

class Comment(BaseModel):
    commenter_name: str
    comment_text: str
    timestamp: str

class CallRecord(BaseModel):
    call_id: str
    call_type: str
    agent_name: Optional[str] = "Unknown"
    timestamp: str
    transcript: List[TranscriptLine]
    nudges: List[NudgeFeedback] = []
    summary: Optional[str] = None
    comments: List[Comment] = []
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class NoteStatus(str, Enum):
    PENDING = "pending"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class OCRResult(BaseModel):
    id: str
    text: str
    bbox: List[float]
    confidence: float
    corrected: Optional[str] = None


class Annotation(BaseModel):
    id: str
    type: str
    bbox: List[float]
    label: str
    content: str


class CollaborationNote(BaseModel):
    id: str
    result_id: str
    text: str
    comment: str
    author: str
    status: NoteStatus
    created_at: str
    resolved_at: Optional[str] = None
    resolver: Optional[str] = None


class Document(BaseModel):
    id: str
    name: str
    image_url: str
    results: List[OCRResult]
    annotations: List[Annotation] = []
    notes: List[CollaborationNote] = []
    created_at: str

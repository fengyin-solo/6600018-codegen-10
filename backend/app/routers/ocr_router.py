import uuid
import time
from datetime import datetime
from typing import Dict, List
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.services.ocr_service import run_ocr
from app.models.schemas import CollaborationNote, NoteStatus

router = APIRouter()

_documents: Dict[str, List[CollaborationNote]] = {}


class NoteCreate(BaseModel):
    document_id: str
    result_id: str
    text: str
    comment: str
    author: str


class NoteUpdate(BaseModel):
    status: NoteStatus
    resolver: str


@router.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(...)):
    """Upload an image and run OCR."""
    content = await file.read()
    results = run_ocr(content, file.filename or "unknown")
    doc_id = str(uuid.uuid4())
    _documents[doc_id] = []
    return {
        "id": doc_id,
        "filename": file.filename,
        "results": results,
        "timestamp": time.time(),
    }


@router.get("/ocr/variants")
def get_variants():
    """Get variant character dictionary."""
    from app.services.ocr_service import VARIANT_DICT
    return VARIANT_DICT


@router.post("/ocr/search")
def search_text(query: str):
    """Search across all OCR results."""
    return {"query": query, "results": []}


@router.post("/notes", response_model=CollaborationNote)
def create_note(note: NoteCreate):
    """Create a new collaboration note."""
    if note.document_id not in _documents:
        _documents[note.document_id] = []
    new_note = CollaborationNote(
        id=str(uuid.uuid4()),
        result_id=note.result_id,
        text=note.text,
        comment=note.comment,
        author=note.author,
        status=NoteStatus.PENDING,
        created_at=datetime.now().isoformat(),
    )
    _documents[note.document_id].append(new_note)
    return new_note


@router.get("/notes/{document_id}", response_model=List[CollaborationNote])
def get_notes(document_id: str):
    """Get all notes for a document."""
    return _documents.get(document_id, [])


@router.patch("/notes/{document_id}/{note_id}", response_model=CollaborationNote)
def update_note_status(document_id: str, note_id: str, update: NoteUpdate):
    """Update note status."""
    if document_id not in _documents:
        raise HTTPException(status_code=404, detail="Document not found")
    for note in _documents[document_id]:
        if note.id == note_id:
            note.status = update.status
            if update.status != NoteStatus.PENDING:
                note.resolved_at = datetime.now().isoformat()
                note.resolver = update.resolver
            return note
    raise HTTPException(status_code=404, detail="Note not found")


@router.delete("/notes/{document_id}/{note_id}")
def delete_note(document_id: str, note_id: str):
    """Delete a note."""
    if document_id not in _documents:
        raise HTTPException(status_code=404, detail="Document not found")
    _documents[document_id] = [n for n in _documents[document_id] if n.id != note_id]
    return {"status": "success"}


@router.get("/notes/{document_id}/pending/count")
def get_pending_notes_count(document_id: str):
    """Get count of pending notes for a document."""
    notes = _documents.get(document_id, [])
    count = sum(1 for n in notes if n.status == NoteStatus.PENDING)
    return {"document_id": document_id, "pending_count": count}

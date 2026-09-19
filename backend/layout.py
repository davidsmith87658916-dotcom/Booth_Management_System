from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session
from database import get_db
from auth import current_user, require_admin, audit
import models
import json
from typing import Literal

router=APIRouter(prefix='/api')
class Placement(BaseModel):
    id:int
    x:int|None=Field(default=None,ge=0)
    y:int|None=Field(default=None,ge=0)
    w:int=Field(default=120,ge=40,le=1000)
    h:int=Field(default=120,ge=40,le=1000)
    @model_validator(mode='after')
    def pair(self):
        if (self.x is None) != (self.y is None): raise ValueError('Both x and y must be set or empty')
        return self

class VenueElement(BaseModel):
    id:str=Field(min_length=1,max_length=80,pattern=r'^[A-Za-z0-9_-]+$')
    type:Literal['entrance','exit','pathway','stage','restroom','food','lounge','seating','plant','info','emergency','wall','text']
    label:str=Field(min_length=1,max_length=80)
    x:int=Field(ge=0)
    y:int=Field(ge=0)
    w:int=Field(ge=20,le=2000)
    h:int=Field(ge=20,le=2000)
    rotation:int=0

    @model_validator(mode='after')
    def supported_rotation(self):
        if self.rotation not in (0,90,180,270):
            raise ValueError('Rotation must be 0, 90, 180, or 270 degrees')
        return self

class LayoutSave(BaseModel):
    revision:int=Field(ge=0)
    width:int=Field(ge=400,le=5000)
    height:int=Field(ge=300,le=5000)
    placements:list[Placement]=Field(max_length=2000)
    elements:list[VenueElement]=Field(default_factory=list,max_length=500)
    grid_layout:list[list[str|None]]|None=None

def layout_view(event,booths):
    grid_layout = None
    try:
        raw = json.loads(event.layout_elements or '[]')
        if isinstance(raw, dict):
            elements = raw.get('elements', [])
            grid_layout = raw.get('grid_layout', None)
        elif isinstance(raw, list):
            elements = raw
        else:
            elements = []
    except (TypeError,json.JSONDecodeError):
        elements=[]
    return {
        'revision':event.layout_revision,
        'width':event.canvas_width,
        'height':event.canvas_height,
        'placements':[{'id':b.id,'x':b.pos_x,'y':b.pos_y,'w':b.size_w,'h':b.size_h} for b in booths],
        'elements':elements,
        'grid_layout':grid_layout
    }

@router.get('/events/{event_id}/layout')
def get_layout(event_id:int,user=Depends(current_user),db:Session=Depends(get_db)):
    event=db.get(models.Event,event_id)
    if not event: raise HTTPException(404,'Event not found')
    return layout_view(event,db.query(models.Booth).filter_by(event_id=event_id).all())

@router.put('/events/{event_id}/layout')
def save_layout(event_id:int,data:LayoutSave,user=Depends(require_admin),db:Session=Depends(get_db)):
    changed=db.query(models.Event).filter(models.Event.id==event_id,models.Event.layout_revision==data.revision).update({'layout_revision':models.Event.layout_revision+1},synchronize_session=False)
    if not changed: raise HTTPException(409,'The plan changed in another session. Reload the latest plan before saving.')
    booths=db.query(models.Booth).filter_by(event_id=event_id).all()
    ids=[p.id for p in data.placements]
    if len(set(ids)) != len(ids) or set(ids) != {b.id for b in booths}: raise HTTPException(409,'Booth inventory changed. Reload the latest plan.')
    placed=[p for p in data.placements if p.x is not None]
    for i,p in enumerate(placed):
        if p.x+p.w>data.width or p.y+p.h>data.height: raise HTTPException(422,'A booth extends beyond the floor boundary')
        for q in placed[:i]:
            if p.x<q.x+q.w and p.x+p.w>q.x and p.y<q.y+q.h and p.y+p.h>q.y: raise HTTPException(422,'Booths cannot overlap. Leave room for each booth.')
    if len({element.id for element in data.elements}) != len(data.elements):
        raise HTTPException(422,'Venue element IDs must be unique')
    for element in data.elements:
        eff_w = element.h if element.rotation in (90, 270) else element.w
        eff_h = element.w if element.rotation in (90, 270) else element.h
        if element.x + eff_w > data.width or element.y + eff_h > data.height:
            raise HTTPException(422, 'A venue element extends beyond the floor boundary')
    by_id={p.id:p for p in data.placements}
    for b in booths:
        p=by_id[b.id]; b.pos_x=p.x; b.pos_y=p.y; b.size_w=p.w; b.size_h=p.h
    event=db.get(models.Event,event_id); event.canvas_width=data.width;event.canvas_height=data.height
    elements_payload = [element.model_dump() for element in data.elements]
    if data.grid_layout is not None:
        event.layout_elements=json.dumps({'elements': elements_payload, 'grid_layout': data.grid_layout}, separators=(',',':'))
    else:
        event.layout_elements=json.dumps(elements_payload, separators=(',',':'))
    audit(db,user,'layout.saved',event_id);db.commit();db.refresh(event)
    return layout_view(event,booths)
